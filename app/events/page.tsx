"use client";

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
  image_url: string | null; // legado (se existir)
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

const demoEvents: EventRow[] = [
  {
    id: "demo-1",
    title: "Treino 5K + Coffee Social",
    sport: "Running",
    description:
      "Treino leve pra conhecer a galera e sair com energia lá em cima. Ritmo livre, sem pressão.",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    address_text: "OCSC - Millenia",
    city: "Orlando",
    state: "FL",
    capacity: 30,
    waitlist_capacity: 10,
    price_cents: 0,
    image_path: null,
    image_url: "/event-demo-1.jpg",
    published: true,
  },
  {
    id: "demo-2",
    title: "Time Trial 1 Mile",
    sport: "Running",
    description:
      "Teste seu pace na milha. Cronometrado, ranking e aquela vibe de evolução de verdade.",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    address_text: "Lake Nona Loop",
    city: "Orlando",
    state: "FL",
    capacity: 60,
    waitlist_capacity: 0,
    price_cents: 1500,
    image_path: null,
    image_url: "/event-demo-2.jpg",
    published: true,
  },
  {
    id: "demo-3",
    title: "Longão de Sábado",
    sport: "Running",
    description:
      "Base é base. Saída em grupo, rota segura e aquele empurrão pra construir consistência.",
    date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8).toISOString(),
    address_text: "Winter Park",
    city: "Winter Park",
    state: "FL",
    capacity: 40,
    waitlist_capacity: 10,
    price_cents: 0,
    image_path: null,
    image_url: "/event-demo-3.jpg",
    published: true,
  },
];

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
        const { data, error } = await supabase
          .from("events")
          .select(
            "id,title,sport,description,date,address_text,city,state,capacity,waitlist_capacity,price_cents,image_path,image_url,published"
          )
          .eq("published", true)
          .order("date", { ascending: true });

        if (cancelled) return;

        if (error) {
          setWarning("Não consegui ler os eventos do Supabase agora. Mostrando eventos demonstrativos.");
          setEvents(demoEvents);
        } else {
          const rows = ((data as EventRow[]) ?? []).filter((e) => e?.published === true);
          if (rows.length === 0) {
            setWarning("Ainda não há eventos publicados. Mostrando eventos demonstrativos.");
            setEvents(demoEvents);
          } else {
            setEvents(rows);
          }
        }
      } catch {
        if (cancelled) return;
        setWarning("Falha ao conectar no Supabase. Mostrando eventos demonstrativos.");
        setEvents(demoEvents);
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
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: 16,
        paddingBottom: 80,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Header */}
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
            Eventos
          </p>

          <h1 style={{ fontSize: 24, fontWeight: 900, margin: "8px 0 0 0" }}>Eventos</h1>

          <p style={{ fontSize: 13, color: "#9ca3af", margin: "8px 0 0 0" }}>
            Eventos oficiais da plataforma. (Criação: Admin)
          </p>
        </header>

        {warning ? (
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
        ) : null}

        {/* Grid de banners */}
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
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(17,24,39,0.9)",
                  background:
                    "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.90))",
                  boxShadow: "0 24px 70px rgba(0,0,0,0.70)",
                }}
              >
                <div style={{ height: 160, background: "rgba(148,163,184,0.10)" }} />
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      height: 14,
                      width: "70%",
                      background: "rgba(148,163,184,0.12)",
                      borderRadius: 999,
                      marginBottom: 10,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: "95%",
                      background: "rgba(148,163,184,0.10)",
                      borderRadius: 999,
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      height: 10,
                      width: "85%",
                      background: "rgba(148,163,184,0.10)",
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            events.map((e) => {
              const img = getPublicImageUrl(e.image_path) || (e.image_url ?? null);

              const priceLabel = formatPrice(e.price_cents ?? 0);
              const when = formatDateTime(e.date);
              const where = buildAddress(e);

              // se for demo, não precisa ter rota
              const href = e.id.startsWith("demo-") ? "/events" : `/events/${e.id}`;

              return (
                <Link key={e.id} href={href} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      borderRadius: 22,
                      overflow: "hidden",
                      border: "1px solid rgba(17,24,39,0.9)",
                      background:
                        "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.90))",
                      boxShadow: "0 24px 70px rgba(0,0,0,0.75)",
                      transition: "transform 0.15s ease, border-color 0.15s ease",
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
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={e.title ?? "Evento"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            filter: "contrast(1.03) saturate(1.05)",
                          }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%" }} />
                      )}

                      <div
                        style={{
                          position: "absolute",
                          left: 12,
                          top: 12,
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 900,
                          letterSpacing: 0.2,
                          color: "#e5e7eb",
                          background: "rgba(2,6,23,0.72)",
                          border: "1px solid rgba(148,163,184,0.18)",
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {e.sport ? e.sport.toUpperCase() : "EVENTO"}
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
                          color: "#020617",
                          background: "rgba(34,197,94,0.95)",
                        }}
                      >
                        {priceLabel}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                        🕒 {when} &nbsp;&nbsp;•&nbsp;&nbsp; 📍 {where}
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1.15,
                          marginBottom: 6,
                        }}
                      >
                        {e.title ?? "Evento"}
                      </div>

                      {e.description ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#cbd5e1",
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
                      ) : (
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                          Sem descrição.
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          Toque para ver detalhes →
                        </div>

                        <div
                          style={{
                            borderRadius: 999,
                            padding: "9px 12px",
                            fontSize: 12,
                            fontWeight: 900,
                            color: "#020617",
                            background: "linear-gradient(135deg,#22c55e,#16a34a)",
                          }}
                        >
                          Ver
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
          Dica: se você colocar imagens em <b>/public</b> com nomes{" "}
          <b>event-demo-1.jpg</b>, <b>event-demo-2.jpg</b>, <b>event-demo-3.jpg</b>, os cards demo ficam
          ainda mais brabos.
        </div>
      </div>

      <BottomNavbar />
    </main>
  );
}
