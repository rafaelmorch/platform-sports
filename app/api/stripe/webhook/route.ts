import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
}

if (!stripeWebhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET in environment variables.");
}

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL in environment variables.");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
}

const stripe = new Stripe(stripeSecretKey);
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function mapSubscriptionStatusToMembershipStatus(subscriptionStatus?: string | null) {
  if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
    return "active";
  }

  if (subscriptionStatus === "canceled" || subscriptionStatus === "unpaid" || subscriptionStatus === "incomplete_expired") {
    return "pending";
  }

  if (subscriptionStatus === "past_due" || subscriptionStatus === "incomplete") {
    return "pending";
  }

  return "pending";
}

function toIsoDate(unixSeconds?: number | null) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (error: any) {
    console.error("Stripe webhook signature verification failed:", error?.message);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "subscription") {
        const communityId = session.metadata?.community_id;
        const userId = session.metadata?.user_id;
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        if (!communityId || !userId || !stripeSubscriptionId) {
          console.error("Missing subscription metadata on checkout.session.completed", {
            sessionId: session.id,
            metadata: session.metadata,
            customer: session.customer,
            subscription: session.subscription,
          });

          return NextResponse.json(
            { error: "Missing checkout metadata." },
            { status: 400 }
          );
        }

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        const { error: updateError } = await supabase
          .from("app_membership_requests")
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            subscription_status: subscription.status,
            current_period_end: toIsoDate(subscription.current_period_end),
            status: mapSubscriptionStatusToMembershipStatus(subscription.status),
          })
          .eq("community_id", communityId)
          .eq("user_id", userId);

        if (updateError) {
          console.error("Supabase update error on checkout.session.completed:", updateError);

          return NextResponse.json(
            { error: "Failed to update membership after checkout." },
            { status: 500 }
          );
        }

        console.log("Subscription linked via checkout.session.completed.", {
          sessionId: session.id,
          communityId,
          userId,
          stripeCustomerId,
          stripeSubscriptionId,
          subscriptionStatus: subscription.status,
        });
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;

      const communityId = subscription.metadata?.community_id;
      const userId = subscription.metadata?.user_id;

      if (!communityId || !userId) {
        console.error("Missing subscription metadata on subscription event.", {
          subscriptionId: subscription.id,
          metadata: subscription.metadata,
          eventType: event.type,
        });

        return NextResponse.json(
          { error: "Missing subscription metadata." },
          { status: 400 }
        );
      }

      const stripeCustomerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || null;

      const { error: updateError } = await supabase
        .from("app_membership_requests")
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          current_period_end: toIsoDate(subscription.current_period_end),
          status: mapSubscriptionStatusToMembershipStatus(subscription.status),
        })
        .eq("community_id", communityId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Supabase update error on subscription event:", updateError);

        return NextResponse.json(
          { error: "Failed to sync subscription status." },
          { status: 500 }
        );
      }

      console.log("Subscription synced.", {
        eventType: event.type,
        subscriptionId: subscription.id,
        communityId,
        userId,
        subscriptionStatus: subscription.status,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;

      const { error: updateError } = await supabase
        .from("app_membership_requests")
        .update({
          subscription_status: "canceled",
          current_period_end: toIsoDate(subscription.current_period_end),
          status: "pending",
        })
        .eq("stripe_subscription_id", subscription.id);

      if (updateError) {
        console.error("Supabase update error on customer.subscription.deleted:", updateError);

        return NextResponse.json(
          { error: "Failed to cancel membership." },
          { status: 500 }
        );
      }

      console.log("Subscription canceled via webhook.", {
        subscriptionId: subscription.id,
      });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id || null;

      if (stripeSubscriptionId) {
        const { error: updateError } = await supabase
          .from("app_membership_requests")
          .update({
            subscription_status: "past_due",
            status: "pending",
          })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        if (updateError) {
          console.error("Supabase update error on invoice.payment_failed:", updateError);

          return NextResponse.json(
            { error: "Failed to mark subscription as past due." },
            { status: 500 }
          );
        }

        console.log("Subscription marked past_due after invoice failure.", {
          stripeSubscriptionId,
          invoiceId: invoice.id,
        });
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id || null;

      if (stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        const { error: updateError } = await supabase
          .from("app_membership_requests")
          .update({
            subscription_status: subscription.status,
            current_period_end: toIsoDate(subscription.current_period_end),
            status: mapSubscriptionStatusToMembershipStatus(subscription.status),
          })
          .eq("stripe_subscription_id", stripeSubscriptionId);

        if (updateError) {
          console.error("Supabase update error on invoice.paid:", updateError);

          return NextResponse.json(
            { error: "Failed to refresh subscription after paid invoice." },
            { status: 500 }
          );
        }

        console.log("Subscription refreshed after invoice paid.", {
          stripeSubscriptionId,
          invoiceId: invoice.id,
          subscriptionStatus: subscription.status,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook handling error:", error?.message);

    return NextResponse.json(
      { error: "Webhook handler failed." },
      { status: 500 }
    );
  }
}
