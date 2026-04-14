"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

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
  created_by?: string | null;
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
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setWarning(null);

      try {
        const { data: communityData, error: communityError } = await supabase
          .from("app_membership_communities")
          .select(
            "id,name,slug,short_description,full_description,price_cents,billing_interval,cover_image_url,banner_image_url,card_highlight,is_active,created_at,created_by"
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
          setUserId(user.id);

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
          setUserId(null);
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
          setUserId(null);
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
          background: #fff !important;
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
          background: "#ffffff",
          color: "#000000",
          padding: 16,
          paddingBottom: 92,
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <header
            style={{
              marginBottom: 18,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-start",
              gap: 0,
              textAlign: "left",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  fontFamily: "Montserrat, sans-serif",
                  margin: 0,
                }}
              >
                Communities
              </h1>

              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  fontFamily: "Arial, sans-serif",
                  margin: "8px 0 0 0",
                  maxWidth: 540,
                }}
              >
                Join premium communities, unlock exclusive access, and build your journey with the
                right tribe.
              </p>
            </div>
          </header>

          <section
            style={{
              marginBottom: 18,
              borderRadius: 8,
              padding: 18,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 6,
                padding: "6px 10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "Montserrat, sans-serif",
                color: "#1e3a8a",
                marginBottom: 10,
              }}
            >
              Exclusive access
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "#1e3a8a",
                marginBottom: 8,
              }}
            >
              Your next level starts inside the right community.
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: "#374151",
                fontFamily: "Arial, sans-serif",
                maxWidth: 720,
              }}
            >
              Training, accountability, rankings, internal feed, check-ins and premium interaction
              in one place.
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
                color: "#92400e",
                fontSize: 12,
                lineHeight: 1.35,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {warning}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ aspectRatio: "16 / 10", background: "#f8fafc" }} />
                  <div style={{ height: 56, background: "#1e3a8a" }} />
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
                const canEdit = isAdmin || (!!userId && community.created_by === userId);

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
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid #e5e7eb",
                          background: "#ffffff",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            aspectRatio: "16 / 10",
                            background: "#f8fafc",
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
                                display: "block",
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
                                fontWeight: 700,
                                fontFamily: "Montserrat, sans-serif",
                                color: "#94a3b8",
                                letterSpacing: "0.06em",
                              }}
                            >
                              {getInitials(community.name)}
                            </div>
                          )}

                          <div
                            style={{
                              position: "absolute",
                              left: 8,
                              top: 8,
                              padding: "clamp(4px, 1.4vw, 6px) clamp(7px, 2vw, 10px)",
                              borderRadius: 6,
                              fontSize: "clamp(9px, 2vw, 11px)",
                              fontWeight: 700,
                              fontFamily: "Montserrat, sans-serif",
                              background: "#1e3a8a",
                              border: "1px solid #1e3a8a",
                              color: "#ffffff",
                              lineHeight: 1.1,
                            }}
                          >
                            {isApproved ? "MEMBER AREA" : "MEMBERSHIP"}
                          </div>

                          <div
                            style={{
                              position: "absolute",
                              right: 8,
                              top: 8,
                              padding: "clamp(4px, 1.4vw, 6px) clamp(7px, 2vw, 10px)",
                              borderRadius: 6,
                              fontSize: "clamp(9px, 2vw, 11px)",
                              fontWeight: 700,
                              fontFamily: "Montserrat, sans-serif",
                              background: "#ffffff",
                              color: "#000000",
                              border: "1px solid #e5e7eb",
                              lineHeight: 1.1,
                            }}
                          >
                            {priceLabel}
                          </div>

                          {community.card_highlight && (
                            <div
                              style={{
                                position: "absolute",
                                left: 8,
                                bottom: 8,
                                padding: "clamp(5px, 1.6vw, 7px) clamp(8px, 2.2vw, 11px)",
                                borderRadius: 6,
                                fontSize: "clamp(9px, 2vw, 11px)",
                                fontWeight: 700,
                                fontFamily: "Montserrat, sans-serif",
                                background: "#f8fafc",
                                color: "#111827",
                                border: "1px solid #e5e7eb",
                                maxWidth: "calc(100% - 16px)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.1,
                              }}
                            >
                              {community.card_highlight}
                            </div>
                          )}

                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = `/memberships/${community.id}/edit`;
                              }}
                              style={{
                                position: "absolute",
                                right: 8,
                                bottom: 8,
                                borderRadius: 6,
                                padding: "clamp(5px, 1.6vw, 7px) clamp(8px, 2.2vw, 11px)",
                                fontSize: "clamp(9px, 2vw, 11px)",
                                fontWeight: 700,
                                fontFamily: "Montserrat, sans-serif",
                                background: "#ffffff",
                                color: "#000000",
                                border: "1px solid #e5e7eb",
                                cursor: "pointer",
                                lineHeight: 1.1,
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            background: "#1e3a8a",
                            padding: "8px 8px",
                            minHeight: 40,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "clamp(15px, 2.8vw, 20px)",
                              fontWeight: 700,
                              fontFamily: "Montserrat, sans-serif",
                              lineHeight: 1.15,
                              color: "#ffffff",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {community.name ?? "Membership"}
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
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              background: "#000000",
              color: "#ffffff",
              fontSize: 34,
              fontWeight: 700,
              fontFamily: "Montserrat, sans-serif",
              boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
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

