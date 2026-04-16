import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Missing STRIPE_SECRET_KEY in environment variables." },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const body = await req.json();
    const { community_id, user_id } = body;

    if (!community_id || !user_id) {
      return NextResponse.json(
        { error: "Missing community_id or user_id" },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        community_id,
        user_id,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe create-payment-intent error:", error);

    return NextResponse.json(
      { error: "Failed to create payment intent." },
      { status: 500 }
    );
  }
}
