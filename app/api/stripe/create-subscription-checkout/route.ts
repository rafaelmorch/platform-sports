import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  if (!supabaseUrl) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL" },
      { status: 500 }
    );
  }

  if (!supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const body = await req.json();
    const { community_id, user_id } = body;

    if (!community_id || !user_id) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      );
    }

    const { data: community, error: communityError } = await supabase
      .from("app_membership_communities")
      .select("stripe_price_id")
      .eq("id", community_id)
      .maybeSingle();

    if (communityError) {
      console.error("Community fetch error:", communityError.message);

      return NextResponse.json(
        { error: "Failed to load community pricing." },
        { status: 500 }
      );
    }

    if (!community?.stripe_price_id) {
      return NextResponse.json(
        { error: "This membership does not have a Stripe price configured yet." },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: community.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: `https://platformsports.app/memberships/${community_id}/inside`,
      cancel_url: `https://platformsports.app/memberships/pending?community_id=${community_id}`,
      metadata: {
        community_id,
        user_id,
      },
      subscription_data: {
        metadata: {
          community_id,
          user_id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err.message);

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
