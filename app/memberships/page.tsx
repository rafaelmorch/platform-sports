"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type MembershipCommunity = {
  id: string;
  name: string | null;
  slug: string | null;
  short_description: string | null;
  full_description: string | null;
  price_cents: number | null;
  billing_interval: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  card_highlight: string | null;
  is_active: boolean;
  created_at: string | null;
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

function getInitials(name: string | null): string {
  if (!name) return "MS";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export default function MembershipsPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [communities, setCommunities] = useState<MembershipCommunity[]>([]);
  const [approvedIds, setApprovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setWarning(null);

      try {
        const { data: communityData, error: communityError } = await supabase
          .from("app_membership_communities")
          .select(
            "id,name,slug,short_description,full_description,price_cents,billing_interval,cover_image_url,banner_image_url,card_highlight,is_active,created_at"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (communityError) {
          console.error("Error loading memberships:", communityError);
          setWarning("I couldn't load the memberships right now.");
          setCommunities([]);
          setApprovedIds([]);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const rows = (communityData as MembershipCommunity[]) ?? [];
        setCommunities(rows);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          const [{ data: requestData, error: requestError }, { data: profileData, error: profileError }] =
            await Promise.all([
              supabase
                .from("app_membership_requests")
                .select("community_id")
                .eq("user_id", user.id)
                .eq("status", "approved"),
              supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", user.id)
                .maybeSingle(),
            ]);

          if (!requestError && requestData) {
            setApprovedIds(requestData.map((row) => row.community_id));
          } else {
            setApprovedIds([]);
          }

          if (!profileError && profileData?.is_admin === true) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setApprovedIds([]);
          setIsAdmin(false);
        }

        if (rows.length === 0) {
          setWarning("There are no active memberships yet.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        if (!cancelled) {
          setWarning("Failed to connect to Supabase.");
          setCommunities([]);
          setApprovedIds([]);
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #020617 !important;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        #__next {
          height: 100%;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          width: "100%",
          overflowX: "hidden",
          background:
            "radial-gradient(circle at top, rgba(37,99,235,0.18) 0%, rgba(2,6,23,1) 42%)",
          color: "#e5e7eb",
          padding: 16,
          paddingBottom: 92,
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <header
            style={{
              marginBottom: 18,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              textAlign: "center",
            }}
          >
            <img
              src="/Platform_Logo.png"
              alt="Platform Sports"
              style={{
                height: 56,
                width: "auto",
                display: "block",
                opacity: 0.95,
              }}
            />

            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>
                Communities
              </h1>

              <p style={{ fontSize: 13, color: "#94a3b8", margin: "8px 0 0 0", maxWidth: 540 }}>
                Join premium communities, unlock exclusive access, and build your journey with the right tribe.
              </p>
            </div>
          </header>

          <section
            style={{
              marginBottom: 18,
              borderRadius: 24,
              padding: 18,
              border: "1px solid rgba(59,130,246,0.18)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.82))",
              boxShadow: "0 28px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "6px 10px",
                background: "rgba(37,99,235,0.16)",
                border: "1px solid rgba(96,165,250,0.22)",
                fontSize: 11,
                fontWeight: 900,
                color: "#bfdbfe",
                marginBottom: 10,
              }}
            >
              Exclusive access
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "#facc15",
                marginBottom: 8,
              }}
            >
              Your next level starts inside the right community.
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5, color: "#cbd5e1", maxWidth: 720 }}>
              Training, accountability, rankings, internal feed, check-ins and premium interaction in one place.
            </div>
          </section>

          {warning && (
            <div
              style={{
                marginBottom: 12,
                borderRadius: 14,
                padding: "10px 12px",
                background: "rgba(245,158,11,0.14)",
                border: "1px solid rgba(245,158,11,0.22)",
                color: "#fde68a",
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              {warning}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 24,
                    overflow: "hidden",
                    border: "1px solid rgba(30,41,59,0.9)",
                    background:
                      "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.90))",
                    boxShadow: "0 24px 70px rgba(0,0,0,0.70)",
                  }}
                >
                  <div style={{ height: 180, background: "rgba(148,163,184,0.10)" }} />
                  <div style={{ padding: 14 }} />
                </div>
              ))
            ) : (
              communities.map((community) => {
                const image = community.cover_image_url || community.banner_image_url || null;
                const priceLabel = formatPrice(community.price_cents, community.billing_interval);
                const isApproved = approvedIds.includes(community.id);
                const href = isApproved
                  ? `/memberships/${community.id}/inside`
                  : `/memberships/${community.id}`;

                return (
                  <div
                    key={community.id}
                    style={{
                      position: "relative",
                    }}
                  >
                    <Link
                      href={href}
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    >
                      <div
                        style={{
                          borderRadius: 24,
                          overflow: "hidden",
                          border: "1px solid rgba(30,41,59,0.92)",
                          background:
                            "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
                          boxShadow: "0 26px 80px rgba(0,0,0,0.72)",
                          transform: "translateY(0px)",
                          transition: "transform 0.18s ease, box-shadow 0.18s ease",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "16 / 10",
                            background:
                              "linear-gradient(135deg, rgba(30,41,59,0.96), rgba(37,99,235,0.30))",
                          }}
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={community.name ?? "Membership"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 42,
                                fontWeight: 900,
                                color: "rgba(255,255,255,0.92)",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {getInitials(community.name)}
                            </div>
                          )}

                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background:
                                "linear-gradient(to top, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.20) 45%, rgba(2,6,23,0.08) 100%)",
                            }}
                          />

                          <div
                            style={{
                              position: "absolute",
                              left: 12,
                              top: 12,
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 900,
                              background: "rgba(2,6,23,0.68)",
                              border: "1px solid rgba(148,163,184,0.18)",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            {isApproved ? "MEMBER AREA" : "MEMBERSHIP"}
                          </div>

                          <div
                            style={{
                              position: "absolute",
                              right: 12,
                              top: 12,
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 900,
                              background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                              color: "#eff6ff",
                              boxShadow: "0 8px 24px rgba(37,99,235,0.38)",
                            }}
                          >
                            {priceLabel}
                          </div>

                          {community.card_highlight && (
                            <div
                              style={{
                                position: "absolute",
                                left: 12,
                                bottom: 12,
                                padding: "7px 11px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 900,
                                background: "rgba(255,255,255,0.10)",
                                color: "#f8fafc",
                                border: "1px solid rgba(255,255,255,0.14)",
                                backdropFilter: "blur(8px)",
                                maxWidth: "calc(100% - 24px)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {community.card_highlight}
                            </div>
                          )}
                        </div>

                        <div style={{ padding: 16 }}>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 900,
                              lineHeight: 1.1,
                              marginBottom: 8,
                            }}
                          >
                            {community.name ?? "Membership"}
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#cbd5e1",
                              lineHeight: 1.45,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              minHeight: 56,
                              marginBottom: 14,
                            }}
                          >
                            {community.short_description || "Exclusive community access with premium experience inside the app."}
                          </div>

                          {isAdmin && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginBottom: 10,
                              }}
                            >
                              <Link
                                href={`/memberships/${community.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  textDecoration: "none",
                                }}
                              >
                                <div
                                  style={{
                                    borderRadius: 999,
                                    padding: "10px 14px",
                                    fontSize: 12,
                                    fontWeight: 900,
                                    background: "rgba(15,23,42,0.92)",
                                    color: "#f8fafc",
                                    border: "1px solid rgba(148,163,184,0.22)",
                                    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
                                    whiteSpace: "nowrap",
                                    backdropFilter: "blur(8px)",
                                  }}
                                >
                                  Edit
                                </div>
                              </Link>
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div style={{ fontSize: 12, color: "#93c5fd", fontWeight: 700 }}>
                              {isApproved ? "Tap to enter community →" : "Tap to explore membership →"}
                            </div>

                            <div
                              style={{
                                borderRadius: 999,
                                padding: "10px 14px",
                                fontSize: 12,
                                fontWeight: 900,
                                background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
                                color: "#eff6ff",
                                boxShadow: "0 10px 28px rgba(37,99,235,0.32)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isApproved ? "Enter" : "View"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isAdmin && (
          <Link
            href="/memberships/new"
            style={{
              position: "fixed",
              right: 18,
              bottom: 108,
              width: 58,
              height: 58,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              color: "#eff6ff",
              fontSize: 34,
              fontWeight: 700,
              boxShadow: "0 16px 40px rgba(37,99,235,0.40)",
              zIndex: 20,
            }}
            aria-label="Create community"
            title="Create community"
          >
            +
          </Link>
        )}

        <BottomNavbar />
      </main>
    </>
  );
}
