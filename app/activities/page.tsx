"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  title: string | null;
  sport: string | null;
  description: string | null;
  start_date: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  image_path: string | null;
  image_url: string | null;
  published: boolean | null;
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

export default function ActivitiesPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const nowIso = new Date().toISOString();

      const { data } = await supabase
        .from("app_activities")
        .select("id,title,sport,description,start_date,address_text,city,state,capacity,image_path,image_url,published")
        .eq("published", true)
        .gte("start_date", nowIso)
        .order("start_date", { ascending: true });

      if (!cancelled) {
        setActivities((data as ActivityRow[]) ?? []);
        setLoading(false);
      }
    }

    checkAuthAndLoad();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const thumbW = "clamp(96px, 24vw, 132px)";
  const thumbH = "clamp(72px, 18vw, 92px)";
  const navSafe = 88;

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          width: "100%",
          maxWidth: "100vw",
          backgroundColor: "#000000",
          color: "#e5e7eb",
          padding: 16,
          paddingBottom: navSafe + 16,
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            width: "100%",
            margin: "0 auto",
            overflowX: "hidden",
            boxSizing: "border-box",
          }}
        >
          <header style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#64748b",
                margin: 0,
              }}
            >
              Activities
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 6,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Activities</h1>

              <Link
                href="/activities/new"
                style={{
                  marginLeft: "auto",
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.55)",
                  background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                  color: "#e0f2fe",
                  textDecoration: "none",
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                }}
              >
                + New activity
              </Link>
            </div>

            <p style={{ fontSize: 13, color: "#9ca3af", margin: "6px 0 0 0" }}>
              Training sessions and community activities.
            </p>
          </header>

          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
          ) : activities.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No upcoming activities.</p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
                maxWidth: "100%",
                overflowX: "hidden",
                boxSizing: "border-box",
              }}
            >
              {activities.map((a) => {
                const img = getPublicImageUrl(a.image_path) || a.image_url || null;

                return (
                  <Link
                    key={a.id}
                    href={`/activities/${a.id}`}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: "100%",
                      textDecoration: "none",
                      color: "inherit",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <article
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 14,
                        borderRadius: 16,
                        border: "1px solid rgba(148,163,184,0.22)",
                        background: "linear-gradient(145deg,#020617,#000000)",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        width: "100%",
                        maxWidth: "100%",
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        style={{
                          width: thumbW,
                          minWidth: thumbW,
                          height: thumbH,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#000",
                          border: "1px solid rgba(148,163,184,0.20)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxSizing: "border-box",
                        }}
                      >
                        {img ? (
                          <img
                            src={img}
                            alt={a.title ?? "activity"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>No image</span>
                        )}
                      </div>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          maxWidth: "100%",
                          overflow: "hidden",
                          boxSizing: "border-box",
                        }}
                      >
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {a.title ?? "Activity"}
                        </h2>

                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 12,
                            color: "#9ca3af",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {(a.sport ?? "—")} • {formatDateTime(a.start_date)}
                        </p>

                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 12,
                            color: "#9ca3af",
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
                              fontSize: 12,
                              color: "#cbd5e1",
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

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: "100vw",
          zIndex: 9999,
          background: "#000000",
          borderTop: "1px solid rgba(148,163,184,0.18)",
          paddingBottom: "env(safe-area-inset-bottom)",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        <BottomNavbar />
      </div>

      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          background: #000 !important;
          overflow-x: hidden !important;
        }

        body > div,
        #__next {
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
        }

        * {
          outline-color: transparent;
        }
      `}</style>
    </>
  );
}
