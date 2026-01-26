"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import BackArrow from "@/components/BackArrow";

export const dynamic = "force-dynamic";

/* ================= Types ================= */

type EventRow = {
  id: string;

  title: string;
  description: string | null;

  date: string;

  location: string | null; // legacy
  location_name: string | null;

  address_text: string | null;
  street: string | null;
  city: string | null;
  state: string | null;

  contact_email: string | null;
  organizer_whatsapp: string | null;

  sport: string | null;

  capacity: number | null;
  waitlist_capacity: number;
  price_cents: number;

  published: boolean;

  image_path: string | null;
  image_url: string | null;

  created_by: string | null;
  organizer_id: string | null;

  lat: number | null;
  lng: number | null;

  registration_url: string | null;
};

/* ================= Utils ================= */

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function moneyFromCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  if (!Number.isFinite(cents)) return "—";
  if (cents <= 0) return "Free";
  const usd = cents / 100;
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fieldValue(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t.length ? t : "—";
}

function hasText(v: string | null | undefined): boolean {
  return ((v ?? "").trim().length ?? 0) > 0;
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

// Where: DOES NOT include city/state
function buildWhereNoCityState(e: EventRow | null): string {
  if (!e) return "—";

  const parts: string[] = [];

  const locName = (e.location_name ?? "").trim();
  const address = (e.address_text ?? "").trim();

  if (locName) parts.push(locName);
  if (address) parts.push(address);

  const legacy = (e.location ?? "").trim();
  const built = parts.join(" • ").trim();

  return built || legacy || "—";
}

function buildAddressForMap(e: EventRow | null): string {
  if (!e) return "";
  const addr = (e.address_text ?? "").trim();
  if (addr) return addr;

  const locName = (e.location_name ?? "").trim();
  const legacy = (e.location ?? "").trim();

  return locName || legacy;
}

function googleEmbedFromAddress(address: string): string | null {
  const q = (address ?? "").trim();
  if (!q) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
}

/* ================= Page ================= */

export default function EventDetailPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const { id: eventId } = useParams<{ id: string }>();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data, error: e } = await supabase
        .from("app_events")
        .select(
          [
            "id,title,description",
            "date",
            "location,location_name",
            "address_text,street,city,state",
            "contact_email,organizer_whatsapp",
            "sport",
            "capacity,waitlist_capacity,price_cents",
            "published",
            "image_path,image_url",
            "created_by,organizer_id",
            "lat,lng",
            "registration_url",
          ].join(",")
        )
        .eq("id", eventId)
        .single();

      if (cancelled) return;

      if (e) {
        setError(e.message || "Failed to load the event.");
        setEvent(null);
      } else {
        // ✅ ONLY CHANGE: make TS happy for build
        setEvent((((data as unknown) as EventRow) ?? null));
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, eventId]);

  const img = getPublicImageUrl(event?.image_path ?? null) || event?.image_url || null;

  const whenText = formatDateTime(event?.date ?? null);
  const whereText = buildWhereNoCityState(event);

  const titleText = loading ? "Loading..." : fieldValue(event?.title);
  const sportText = fieldValue(event?.sport);
  const priceText = moneyFromCents(event?.price_cents);

  const publishedText = event?.published ? "Public" : "Private";

  const registerUrl =
    (event?.registration_url ?? "").trim() ||
    (event?.id ? `/events/${encodeURIComponent(event.id)}/register` : null);

  const addressForMap = buildAddressForMap(event);
  const mapEmbed = googleEmbedFromAddress(addressForMap);

  const waitlist = Number(event?.waitlist_capacity ?? 0);
  const showWaitlist = waitlist > 0;

  const showEmail = hasText(event?.contact_email);
  const showWhatsapp = hasText(event?.organizer_whatsapp);

  /* ================= Styles ================= */

  const borderSoft = "1px solid rgba(148,163,184,0.18)";
  const shadowSoft = "0 18px 44px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.04)";
  const charcoalDiagonal =
    "linear-gradient(135deg, rgba(71,85,105,0.30) 0%, rgba(15,23,42,0.65) 45%, rgba(0,0,0,0.96) 100%)";

  const chipBase: React.CSSProperties = {
    fontSize: 11,
    padding: "5px 10px",
    borderRadius: 999,
    border: borderSoft,
    background: "rgba(0,0,0,0.60)",
    color: "#e5e7eb",
    whiteSpace: "nowrap",
  };

  const sectionCard: React.CSSProperties = {
    borderRadius: 20,
    border: borderSoft,
    background: "#000000",
    boxShadow: shadowSoft,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const btnPrimaryRedPulse: React.CSSProperties = {
    borderRadius: 999,
    padding: "11px 16px",
    border: "1px solid rgba(248,113,113,0.65)",
    background: "linear-gradient(135deg, rgba(220,38,38,1), rgba(239,68,68,1), rgba(127,29,29,1))",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 950,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 10px 26px rgba(239,68,68,0.22)",
    animation: "pulseSoft 1.6s ease-in-out infinite",
    willChange: "transform, box-shadow",
  };

  const box: React.CSSProperties = {
    borderRadius: 14,
    border: borderSoft,
    background: charcoalDiagonal,
    boxShadow: "0 14px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.04)",
    padding: 10,
  };

  // ✅ VOLTOU PRO AZUL PADRÃO
  const boxLabel: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    color: "#60a5fa",
    fontWeight: 800,
  };

  const boxValue: React.CSSProperties = {
    margin: "6px 0 0 0",
    fontSize: 13,
    color: "#e5e7eb",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Loading…</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main style={{ minHeight: "100vh", background: "#000", color: "#e5e7eb", padding: 16 }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error || "Event not found."}</p>
          <Link href="/events" style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline" }}>
            Back
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#000000", color: "#e5e7eb", padding: 16, paddingBottom: 40 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackArrow href="/events" label="Back" />

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#94a3b8", margin: 0 }}>
                Events
              </p>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 0 0", wordBreak: "break-word" }}>{titleText}</h1>
              <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#9ca3af" }}>
                {whenText} • {fieldValue(event.location_name)}
              </p>
            </div>

            {/* ✅ remove "Events" link and show logo */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
            </div>
          </div>
        </header>

        {error ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error}</p> : null}

        <section style={sectionCard}>
          {/* Hero image (blurred fill like Activities) */}
          <div
            style={{
              width: "100%",
              height: 220,
              borderRadius: 18,
              border: borderSoft,
              overflow: "hidden",
              position: "relative",
              background: "rgba(0,0,0,0.55)",
              boxShadow: "0 18px 44px rgba(0,0,0,0.60)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {img ? (
              <>
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${img})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    filter: "blur(18px)",
                    transform: "scale(1.15)",
                    opacity: 0.55,
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(0,0,0,0.25), rgba(0,0,0,0.75))",
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={event.title ?? "event image"}
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </>
            ) : (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>No image</span>
            )}
          </div>

          {/* Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span
              style={{
                ...chipBase,
                border: "1px solid rgba(148,163,184,0.22)",
                background: "rgba(15,23,42,0.45)",
                color: "#e5e7eb",
                fontWeight: 900,
              }}
            >
              {priceText}
            </span>
            <span style={chipBase}>{publishedText}</span>
            <span style={chipBase}>{sportText}</span>
          </div>

          {/* Register */}
          {registerUrl ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={registerUrl} target="_blank" rel="noreferrer" style={btnPrimaryRedPulse}>
                Register ↗
              </a>
            </div>
          ) : null}

          {/* Description */}
          {event.description ? (
            <div style={{ marginTop: 2 }}>
              {/* ✅ label volta pro azul padrão */}
              <p style={{ margin: 0, fontSize: 12, color: "#60a5fa", fontWeight: 800 }}>Description</p>
              <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#e5e7eb", whiteSpace: "pre-wrap" }}>{event.description}</p>
            </div>
          ) : null}

          {/* Details */}
          <div style={{ marginTop: 2 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, margin: "8px 0 8px 0" }}>Details</h2>

            <div className="pairRow">
              <div style={box}>
                <p style={boxLabel}>Title</p>
                <p style={boxValue}>{fieldValue(event.title)}</p>
              </div>
              <div style={box}>
                <p style={boxLabel}>Sport</p>
                <p style={boxValue}>{fieldValue(event.sport)}</p>
              </div>
            </div>

            <div className="pairRow" style={{ marginTop: 10 }}>
              <div style={box}>
                <p style={boxLabel}>Capacity</p>
                <p style={boxValue}>{event.capacity != null ? String(event.capacity) : "—"}</p>
              </div>

              {showWaitlist ? (
                <div style={box}>
                  <p style={boxLabel}>Waitlist</p>
                  <p style={boxValue}>{String(waitlist)}</p>
                </div>
              ) : (
                <div style={{ display: "none" }} />
              )}
            </div>

            {showEmail || showWhatsapp ? (
              <div className="pairRow" style={{ marginTop: 10 }}>
                {showEmail ? (
                  <div style={box}>
                    <p style={boxLabel}>Email</p>
                    <p style={boxValue}>{fieldValue(event.contact_email)}</p>
                  </div>
                ) : (
                  <div style={{ display: "none" }} />
                )}

                {showWhatsapp ? (
                  <div style={box}>
                    <p style={boxLabel}>WhatsApp</p>
                    <p style={boxValue}>{fieldValue(event.organizer_whatsapp)}</p>
                  </div>
                ) : (
                  <div style={{ display: "none" }} />
                )}
              </div>
            ) : null}

            <div className="pairRow" style={{ marginTop: 10 }}>
              <div style={box}>
                <p style={boxLabel}>City</p>
                <p style={boxValue}>{fieldValue(event.city)}</p>
              </div>
              <div style={box}>
                <p style={boxLabel}>State</p>
                <p style={boxValue}>{fieldValue(event.state)}</p>
              </div>
            </div>

            <div style={{ ...box, marginTop: 10 }}>
              <p style={boxLabel}>Where</p>
              <p style={boxValue}>{whereText}</p>
            </div>

            <div style={{ ...box, marginTop: 10 }}>
              <p style={boxLabel}>When</p>
              <p style={boxValue}>{whenText}</p>
            </div>
          </div>

          {/* Map */}
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 16, fontWeight: 900, margin: "10px 0 8px 0" }}>Map</h2>

            {mapEmbed ? (
              <>
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    border: borderSoft,
                    background: charcoalDiagonal,
                    boxShadow: "0 18px 44px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <iframe title="map" src={mapEmbed} width="100%" height="320" style={{ border: 0 }} loading="lazy" />
                </div>

                <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Address used on map: <span style={{ color: "#e5e7eb" }}>{fieldValue(addressForMap)}</span>
                </p>
              </>
            ) : (
              <div style={{ ...box, padding: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                  Not enough address data to show the map. Fill in <b>address_text</b> on this event.
                </p>
              </div>
            )}
          </div>

          <style jsx>{`
            .pairRow {
              display: grid;
              grid-template-columns: 1fr;
              gap: 10px;
            }
            @media (min-width: 640px) {
              .pairRow {
                grid-template-columns: 1fr 1fr;
              }
            }

            @keyframes pulseSoft {
              0% {
                transform: scale(1);
                box-shadow: 0 10px 26px rgba(239, 68, 68, 0.22);
              }
              50% {
                transform: scale(1.03);
                box-shadow: 0 14px 34px rgba(239, 68, 68, 0.32);
              }
              100% {
                transform: scale(1);
                box-shadow: 0 10px 26px rgba(239, 68, 68, 0.22);
              }
            }
          `}</style>
        </section>
      </div>
    </main>
  );
}
