"use client";

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
  waitlist_capacity: number | null;
  price_cents: number | null;

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function formatPrice(priceCents: number | null): string {
  const cents = priceCents ?? 0;
  if (cents <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function buildAddress(e: ActivityRow): string {
  const a = (e.address_text ?? "").trim();
  const city = (e.city ?? "").trim();
  const state = (e.state ?? "").trim();

  const parts: string[] = [];
  if (a) parts.push(a);
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);

  return parts.join(" • ") || "Location TBD";
}

// ✅ keep consistent with /activities/new (uploads to event-images)
function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function ActivitiesPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nowIso = new Date().toISOString();

        const { data, error } = await supabase
          .from("app_activities")
          .select(
            "id,title,sport,description,start_date,address_text,city,state,capacity,waitlist_capacity,price_cents,image_path,image_url,published"
          )
          .eq("published", true)
          .gte("start_date", nowIso)
          .order("start_date", { ascending: true });

        if (cancelled) return;

        if (error) {
          setError(error.message || "Failed to load activities.");
          setActivities([]);
        } else {
          setActivities((data as ActivityRow[]) ?? []);
        }
      } catch {
        if (cancelled) return;
        setError("Failed to load activities.");
        setActivities([]);
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
    <main
      style={{
        minHeight: "100vh",
        width: "100vw",
        margin: 0,
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: 16,
        paddingBottom: 96, // ✅ espaço pro navbar fixo
        boxSizing: "border-box",
        overflowX: "hidden", // ✅ evita “vazar” pro lado e criar borda/scroll
      }}
    >
      {/* ✅ remove contorno branco / scroll lateral */}
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100%;
          height: 100%;
          background: #020617 !important;
          overflow-x: hidden;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
              marginTop: 6,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Activities</h1>

            <Link
              href="/activities/new"
              style={{
                fontSize: 12,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.55)",
                background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                color: "#e0f2fe",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Create activity
            </Link>
          </div>

          <p style={{ fontSize: 13, color: "#9ca3af", margin: "8px 0 0 0" }}>
            Create your activity and share it with the community.
          </p>
        </header>

        {error ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error}</p>
        ) : null}

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
        ) : activities.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>No upcoming published activities yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {activities.map((a) => {
              const img = getPublicImageUrl(a.image_path) || (a.image_url ?? null);

              const priceLabel = formatPrice(a.price_cents ?? 0);
              const when = formatDateTime(a.start_date);
              const where = buildAddress(a);

              return (
                <Link key={a.id} href={`/activities/${a.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <article
                    style={{
                      cursor: "pointer",
                      borderRadius: 18,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "radial-gradient(circle at top left, #020617, #020617 50%, #000000 100%)",
                      padding: 14,
                      display: "flex",
                      gap: 12,
                      alignItems: "stretch",
                      width: "100%", // ✅ nunca passa do container
                      boxSizing: "border-box",
                      overflow: "hidden", // ✅ impede overflow interno
                    }}
                  >
                    <div
                      style={{
                        width: 160,
                        minWidth: 160,
                        height: 96,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.25)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={a.title ?? "activity image"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>No image</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "flex-start",
                          flexWrap: "wrap", // ✅ no mobile não estoura
                        }}
                      >
                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 16,
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
                            {(a.sport ?? "")} • {when}
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
                            {where}
                          </p>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                            alignItems: "flex-start",
                            flex: "0 0 auto",
                            maxWidth: "100%",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              padding: "4px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(56,189,248,0.5)",
                              background: "linear-gradient(135deg, rgba(8,47,73,0.9), rgba(12,74,110,0.9))",
                              color: "#e0f2fe",
                              whiteSpace: "nowrap",
                              maxWidth: "100%",
                            }}
                          >
                            {priceLabel}
                          </span>

                          {typeof a.capacity === "number" && a.capacity > 0 ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.35)",
                                background: "rgba(2,6,23,0.65)",
                                color: "#e5e7eb",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                              }}
                            >
                              Cap: {a.capacity}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {a.description ? (
                        <p
                          style={{
                            margin: "10px 0 0 0",
                            fontSize: 12,
                            color: "#9ca3af",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {a.description}
                        </p>
                      ) : null}
                    </div>

                    {/* ✅ sem alterar layout: só ajusta no mobile pra não estourar */}
                    <style jsx>{`
                      @media (max-width: 520px) {
                        article {
                          flex-direction: column;
                        }
                      }
                    `}</style>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ navbar fixo de verdade */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      >
        <BottomNavbar />
      </div>
    </main>
  );
}
