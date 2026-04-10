"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string | null;
  sport: string | null;
  description: string | null;
  date: string | null;

  address_text: string | null;
  city: string | null;
  state: string | null;

  capacity: number | null;
  waitlist_capacity: number | null;
  price_cents: number | null;

  image_path: string | null; // Storage
  image_url: string | null; // legacy
  published: boolean;
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

function buildAddress(e: EventRow): string {
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

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function EventsPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setWarning(null);

      try {
        const nowIso = new Date().toISOString();

        const { data, error } = await supabase
          .from("app_events")
          .select(
            "id,title,sport,description,date,address_text,city,state,capacity,waitlist_capacity,price_cents,image_path,image_url,published"
          )
          .eq("published", true)
          .gte("date", nowIso)
          .order("date", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error("Error loading events:", error);
          setWarning("I couldn't load the events right now.");
          setEvents([]);
        } else {
          const rows = (data as EventRow[]) ?? [];
          if (rows.length === 0) {
            setWarning("There are no upcoming published events yet.");
            setEvents([]);
          } else {
            setEvents(rows);
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        if (!cancelled) {
          setWarning("Failed to connect to Supabase.");
          setEvents([]);
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
      {/* ✅ remove “borda branca” (margin padrão do body) e garante fundo escuro */}
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
      `}</style><main
        style={{
          minHeight: "100vh",
          width: "100%",
          overflowX: "hidden",
          backgroundColor: "#ffffff",
          color: "#000000",
          padding: 16,
          paddingBottom: 80,
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          {/* Header */}
          <header
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Events
              </p>

              <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "8px 0 0 0" }}>Events</h1>

              <p style={{ fontSize: 13, color: "#374151", fontFamily: "Montserrat, sans-serif", margin: "8px 0 0 0" }}>Official platform events.</p>
            </div>

            {/* Platform Sports Logo (2x) */}
           
          </header>

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

          {/* Grid */}
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
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                    background: "#000000",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ height: 160, background: "rgba(148,163,184,0.10)" }} />
                  <div style={{ padding: 14 }} />
                </div>
              ))
            ) : (
              events.map((e) => {
                const img = getPublicImageUrl(e.image_path) || e.image_url || null;

                const priceLabel = formatPrice(e.price_cents);
                const when = formatDateTime(e.date);
                const where = buildAddress(e);

                return (
                  <Link key={e.id} href={`/events/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div
                      style={{
                        borderRadius: 8,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      }}
                    >
                      {/* Banner */}
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio: "16 / 9",
                          background: "rgba(148,163,184,0.10)",
                        }}
                      >
                        {img && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={e.title ?? "Event"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        )}

                        <div
                          style={{
                            position: "absolute",
                            left: 12,
                            top: 12,
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700, fontFamily: "Montserrat, sans-serif",
                            background: "#1e3a8a",
                            border: "1px solid #1e3a8a",
                            color: "#ffffff",
                          }}
                        >
                          {e.sport?.toUpperCase() ?? "EVENT"}
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            right: 12,
                            top: 12,
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700, fontFamily: "Montserrat, sans-serif",
                            background: "#ffffff",
                            color: "#000000",
                          }}
                        >
                          {priceLabel}
                        </div>
                      </div>

                      {/* Content */}
                      <div style={{ padding: 14 }}>
                        <div style={{ fontSize: 12, color: "#374151", fontFamily: "Montserrat, sans-serif", marginBottom: 10 }}>
                          {when} &nbsp;&nbsp;•&nbsp;&nbsp; {where}
                        </div>

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700, fontFamily: "Montserrat, sans-serif",
                            lineHeight: 1.15,
                            marginBottom: 10,
                          }}
                        >
                          {e.title}
                        </div>

                        {e.description && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#111827", fontFamily: "Montserrat, sans-serif",
                              lineHeight: 1.35,
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              marginBottom: 12,
                            }}
                          >
                            {e.description}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontSize: 12, color: "#374151", fontFamily: "Montserrat, sans-serif" }}>View details</div>

                          <div
                            style={{
                              borderRadius: 6,
                              padding: "10px 14px",
                              fontSize: 12,
                              fontWeight: 700, fontFamily: "Montserrat, sans-serif",
                              background: "#000000",
                              color: "#ffffff",
                            }}
                          >
                            View
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <BottomNavbar />
      </main>
    </>
  );
}


