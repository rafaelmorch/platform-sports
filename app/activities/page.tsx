"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
          backgroundColor: "#ffffff",
          color: "#000000", fontFamily: "Montserrat, sans-serif",
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
                gap: 8,
                flexWrap: "wrap",
                marginTop: 6,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
            >
              <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: 0 }}>Activities</h1>

              <Link
                href="/activities/new"
                style={{
  marginLeft: "auto",
  fontSize: 12,
  padding: "10px 14px",
  borderRadius: 6,
  border: "1px solid #000000",
  background: "#000000",
  color: "#ffffff",
  fontFamily: "Montserrat, sans-serif",
  textDecoration: "none",
  fontWeight: 600,
  whiteSpace: "nowrap",
}}
              >
                + New activity
              </Link>
            </div>

            <p style={{ fontSize: 13, color: "#374151", fontFamily: "Montserrat, sans-serif", margin: "6px 0 0 0" }}>
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
                gap: 8,
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
                        gap: 8,
                        padding: "14px 0",
                        
                        
                        
                        boxSizing: "border-box",
                        overflow: "hidden",
                        width: "100%",
                        maxWidth: "100%",
                        alignItems: "stretch", borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          width: thumbW,
                          minWidth: thumbW,
                          height: thumbH,
                          
                          overflow: "hidden",
                          background: "#000",
                          
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
                            fontWeight: 700, fontFamily: "Montserrat, sans-serif",
                            whiteSpace: "nowrap", borderRadius: 6,
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
                            color: "#374151", fontFamily: "Montserrat, sans-serif",
                            whiteSpace: "nowrap", borderRadius: 6,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <span style={{ color: "#1e3a8a", fontWeight: 600 }}>{a.sport ?? "—"}</span> • {formatDateTime(a.start_date)}
                        </p>

                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: 12,
                            color: "#374151", fontFamily: "Montserrat, sans-serif",
                            whiteSpace: "nowrap", borderRadius: 6,
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
                              color: "#374151", fontFamily: "Montserrat, sans-serif",
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
          background: #fff !important;
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
