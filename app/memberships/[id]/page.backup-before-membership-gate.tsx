"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type MembershipCommunity = {
  id: string;
  name: string | null;
  full_description: string | null;
  full_description_rich: any;
  price_cents: number | null;
  billing_interval: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  gallery_urls: string[] | null;
  checkout_url: string | null;
  checkout_button_text: string | null;
};

function formatPrice(priceCents: number | null, billingInterval: string | null): string {
  const cents = priceCents ?? 0;
  const interval = (billingInterval ?? "month").toLowerCase();

  if (cents <= 0) return "Coming soon";

  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

  if (interval === "year") return `${price}/year`;
  if (interval === "week") return `${price}/week`;

  return `${price}/month`;
}

export default function MembershipCommunityPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser, []);

  const [community, setCommunity] = useState<MembershipCommunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

      const { data: membership } = await supabase
        .from("app_membership_requests")
        .select("status, subscription_status")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        membership &&
        membership.status === "active" &&
        membership.subscription_status === "active"
      ) {
        router.replace(`/memberships/${id}/inside`);
        return;
      }

      const { data } = await supabase
        .from("app_membership_communities")
        .select("*")
        .eq("id", id)
        .single();

      setCommunity(data);
      setLoading(false);
    }

    load();
  }, [params, supabase]);

  async function handleJoin() {


    try {
      setJoining(true);
      setJoinError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        const msg = userError.message || "Failed to get user.";
        console.error("auth.getUser error:", userError);
        setJoinError(msg);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: existingRequest } = await supabase
        .from("app_membership_requests")
        .select("id,status")
        .eq("community_id", community!.id)
        .eq("user_id", user.id)
        .maybeSingle();

      let data: any = existingRequest;
      let error: any = null;

      if (!existingRequest) {
        const payload = {
          community_id: community!.id,
          user_id: user.id,
          status: "pending",
        };

        const result = await supabase
          .from("app_membership_requests")
          .insert(payload)
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) {
        const msg =
          error.message ||
          error.details ||
          error.hint ||
          JSON.stringify(error) ||
          "Unknown Supabase error";
        console.error("membership request insert error:", error);
        setJoinError(msg);
        return;
      }

      console.log("membership request upsert success:", data);

      router.push(`/memberships/pending?community_id=${community!.id}`);
    } catch (err: any) {
      const msg =
        err?.message ||
        err?.details ||
        err?.hint ||
        JSON.stringify(err) ||
        "Unexpected error";
      console.error("handleJoin unexpected error:", err);
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  }

  if (loading) return null;
  if (!community) return null;

  const banner = community.banner_image_url || community.cover_image_url;
  const priceLabel = formatPrice(community.price_cents, community.billing_interval);

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "720px", marginBottom: "16px" }}>
          <BackArrow />
        </div>

        <div style={{ width: "100%", maxWidth: "720px", marginBottom: "32px" }}>
          <img src="/logo-sports-platform.png" alt="Platform Sports" style={{ width: "100%" }} />
        </div>

        <div style={{ width: "100%", maxWidth: "720px", marginBottom: "24px" }}>
          <img
            src={banner || ""}
            alt={community.name || "Membership banner"}
            style={{ width: "100%", display: "block", borderRadius: "4px" }}
          />
        </div>

        {(
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              width: "100%",
              maxWidth: "720px",
              border: 0,
              background: "transparent",
              padding: 0,
              cursor: joining ? "not-allowed" : "pointer",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                padding: "2px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #ff2d55, #ff9500, #ffd60a)",
              }}
            >
              <div
                style={{
                  padding: "18px 0",
                  borderRadius: "12px",
                  background: "black",
                  color: "white",
                  textAlign: "center",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {joining
                  ? "PROCESSING..."
                  : community.checkout_button_text || "JOIN MEMBERSHIP"}
              </div>
            </div>
          </button>
        )}

        {joinError && (
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              marginBottom: "20px",
              background: "#fff7ed",
              color: "#9a3412",
              border: "1px solid #fdba74",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "14px",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {joinError}
          </div>
        )}

        <div
          style={{
            maxWidth: "720px",
            width: "100%",
            background: "#f5f5f5",
            color: "#000",
            padding: "28px",
            borderRadius: "4px",
            lineHeight: "1.8",
            borderTop: "3px solid #ffffff",
            borderLeft: "3px solid #ffffff",
            borderRight: "3px solid #5a5a5a",
            borderBottom: "3px solid #5a5a5a",
            boxShadow: "inset -1px -1px 0 #00000030, inset 1px 1px 0 #ffffff",
            fontFamily: "Calibri, Arial, sans-serif",
          }}
        >
          <h2 style={{ color: "#ff3b30", textAlign: "center" }}>
            {community.name}
          </h2>

          <p style={{ textAlign: "center", fontWeight: 700 }}>
            {priceLabel}
          </p>

          <div
            dangerouslySetInnerHTML={{
              __html:
                community.full_description_rich?.html ||
                community.full_description ||
                "",
            }}
          />
        </div>
      </main>
    </>
  );
}










