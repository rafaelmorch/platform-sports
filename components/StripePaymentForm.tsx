"use client";

import { FormEvent, useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

export default function StripePaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Stripe is still loading.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("");

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "Payment failed.");
        return;
      }

      setMessage("Payment confirmed. Your access is being released automatically.");
    } catch (err: any) {
      setMessage(err?.message || "Unexpected payment error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
      <div
        style={{
          border: "1px solid #d6dbe4",
          borderRadius: 18,
          padding: 14,
          background: "#ffffff",
          boxSizing: "border-box",
        }}
      >
        <PaymentElement />
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        style={{
          width: "100%",
          marginTop: 14,
          border: "1px solid #cbd5e1",
          borderRadius: 999,
          padding: "14px 18px",
          fontSize: 13,
          fontWeight: 700,
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          color: "#f8fafc",
          cursor: !stripe || !elements || submitting ? "not-allowed" : "pointer",
          opacity: !stripe || !elements || submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Processing..." : "Confirm card payment"}
      </button>

      {!!message && (
        <div
          style={{
            marginTop: 12,
            fontSize: 13,
            lineHeight: 1.6,
            color:
              message.toLowerCase().includes("confirmed") ||
              message.toLowerCase().includes("automatically")
                ? "#166534"
                : "#9a3412",
            background:
              message.toLowerCase().includes("confirmed") ||
              message.toLowerCase().includes("automatically")
                ? "#f0fdf4"
                : "#fff7ed",
            border:
              "1px solid " +
              (message.toLowerCase().includes("confirmed") ||
              message.toLowerCase().includes("automatically")
                ? "#86efac"
                : "#fdba74"),
            borderRadius: 14,
            padding: "10px 12px",
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}
