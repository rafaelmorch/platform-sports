// app/memberships/[id]/inside/events/page.tsx
"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: string;
  name: string | null;
  created_by: string | null;
};

type ActivityRow = {
  id: string;
  title: string | null;
  sport: string | null;
  activity_type: string | null;
  description: string | null;
  start_date: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  image_path: string | null;
  image_url: string | null;
  published: boolean | null;
  community_id: string | null;
};

function formatDateTime(dt: string | null): string {
  if (!dt) return "Date TBD";
  try {
    return new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function buildAddress(a: ActivityRow): string {
  const parts: string[] = [];
  const addr = (a.address_text ?? "").trim();
  const city = (a.city ?? "").trim();
  const state = (a.state ?? "").trim();

  if (addr) parts.push(addr);
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);

  return parts.join(" • ") || "Location TBD";
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function MembershipEventsPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const params = useParams();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!communityId || typeof communityId !== "string") {
        router.push("/memberships");
        return;
      }

      setLoading(true);
      setWarning(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: community } = await supabase
          .from("app_membership_communities")
          .select("id,name,created_by")
          .eq("id", communityId)
          .single();

        if (!community) {
          router.push("/memberships");
          return;
        }

        const typedCommunity = community as CommunityRow;
        const creator = typedCommunity.created_by === user.id;

        if (!creator) {
          const { data: request } = await supabase
            .from("app_membership_requests")
            .select("status")
            .eq("community_id", communityId)
            .eq("user_id", user.id)
            .single();

          if (!request || request.status !== "approved") {
            router.push(`/memberships/${communityId}`);
            return;
          }
        }

        const nowIso = new Date().toISOString();

        const { data: rows, error } = await supabase
          .from("app_activities")
          .select(
            "id,title,sport,activity_type,description,start_date,address_text,city,state,capacity,image_path,image_url,published,community_id"
          )
          .eq("published", true)
          .eq("community_id", communityId)
          .gte("start_date", nowIso)
          .order("start_date", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error("Error loading membership events:", error);
          setActivities([]);
          setWarning("I couldn't load the events right now.");
        } else {
          setActivities((rows as ActivityRow[]) ?? []);
          if (!rows || rows.length === 0) {
            setWarning("No upcoming events for this community.");
          }
        }

        setCommunityName(typedCommunity.name ?? null);
        setIsCreator(creator);
        setAllowed(true);
      } catch (err) {
        console.error("Unexpected error loading membership events:", err);
        if (!cancelled) {
          setWarning("Failed to connect to Supabase.");
          setActivities([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [communityId, router, supabase]);

  if (loading) return null;
  if (!allowed) return null;

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
        }

        * {
          box-sizing: border-box;
        }

        .membership-events-page * {
          font-family: "Montserrat", Arial, sans-serif;
        }
      `}</style>

      <main
        className="membership-events-page"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          overflowX: "hidden",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto 16px auto" }}>
          <BackArrow />
        </div>

        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 28,
            padding: "clamp(18px, 3vw, 24px)",
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: 6,
                  fontWeight: 700,
                }}
              >
                Community Events
              </div>

              <h1
                style={{
                  fontSize: "clamp(22px, 4vw, 24px)",
                  fontWeight: 800,
                  margin: 0,
                  color: "#0f172a",
                  lineHeight: 1.15,
                }}
              >
                {communityName ? `${communityName} Events` : "Events"}
              </h1>

              <p
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  margin: "8px 0 0 0",
                }}
              >
                Upcoming activities for this community.
              </p>
            </div>

            {isCreator && communityId && (
              <Link
                href={`/activities/new?community_id=${communityId}`}
                style={{
                  textDecoration: "none",
                  borderRadius: 999,
                  padding: "10px 16px",
                  background: "#0f172a",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                New Event
              </Link>
            )}
          </header>

          {warning && (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 16,
                padding: "12px 14px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {warning}
            </div>
          )}

          {activities.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activities.map((a) => {
                const img = getPublicImageUrl(a.image_path) || a.image_url || null;
                const typeLabel = (a.activity_type ?? a.sport ?? "Activity").trim() || "Activity";

                return (
                  <Link
                    key={a.id}
                    href={`/activities/${a.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <article
                      style={{
                        display: "grid",
                        gridTemplateColumns: "96px minmax(0, 1fr)",
                        gap: 14,
                        alignItems: "center",
                        borderRadius: 22,
                        padding: 14,
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        border: "1px solid #e2e8f0",
                        boxShadow:
                          "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
                      }}
                    >
                      <div
                        style={{
                          width: 96,
                          height: 78,
                          borderRadius: 16,
                          overflow: "hidden",
                          border: "1px solid #dbe2ea",
                          background: "#eef2f7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={a.title ?? "event"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                            No image
                          </span>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "5px 9px",
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              border: "1px solid #93c5fd",
                              fontSize: 11,
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {typeLabel}
                          </span>

                          <span
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDateTime(a.start_date)}
                          </span>
                        </div>

                        <h2
                          style={{
                            margin: "0 0 6px 0",
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {a.title ?? "Event"}
                        </h2>

                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            color: "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {buildAddress(a)}
                        </p>

                        {a.description ? (
                          <p
                            style={{
                              margin: "8px 0 0 0",
                              fontSize: 13,
                              color: "#475569",
                              lineHeight: 1.5,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {a.description}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
