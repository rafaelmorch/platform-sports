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
  date: string | null;

  street: string | null;
  city: string | null;
  state: string | null;
  address_text: string | null;

  capacity: number | null;
  waitlist_capacity: number | null;
  price_cents: number | null;

  organizer_id: string | null;

  image_path: string | null;
  image_url: string | null;
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
  const street = (e.street ?? "").trim();
  const city = (e.city ?? "").trim();
  const state = (e.state ?? "").trim();

  const parts: string[] = [];
  if (street) parts.push(street);
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);

  const composed = parts.join(", ").trim();
  if (composed) return composed;

  const fallback = (e.address_text ?? "").trim();
  return fallback || "Location TBD";
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  // bucket do site estava "event-images". Mantive igual.
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function MyActivitiesPage() {
  const supabase = useMemo(() => supabaseBrowser, []);

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;

      if (userErr) {
        setError(userErr.message || "Failed to get user.");
        setActivities([]);
        setLoading(false);
        return;
      }

      const user = userRes.user;
      if (!user) {
        setError("Você precisa estar logado para ver suas activities.");
        setActivities([]);
        setLoading(false);
        return;
      }

      // ⚠️ Aqui assumimos que a tabela do APP se chama "activities"
      // e tem colunas parecidas com events (street/city/state/address_text, etc.)
      const { data, error } = await supabase
        .from("app_activities")
        .select(
          "id,title,sport,description,date,street,city,state,address_text,capacity,waitlist_capacity,price_cents,organizer_id,image_path,image_url"
        )
        .eq("organizer_id", user.id)
        .order("date", { ascending: true });

      if (cancelled) return;

      if (error) {
        setError(error.message || "Failed to load your activities.");
        setActivities([]);
      } else {
        setActivities((data as ActivityRow[]) ?? []);
      }

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "radial-gradient(circle at top left, #020617, #020617 55%, #000000 100%)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };

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
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
            Activities
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
                Minhas activities
              </h1>
              <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: 13 }}>
                Aqui aparecem apenas as activities criadas por você.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link
                href="/activities"
                style={{
                  fontSize: 12,
                  color: "#93c5fd",
                  textDecoration: "underline",
                  whiteSpace: "nowrap",
                }}
              >
                Voltar para activities
              </Link>

              <Link
                href="/activities/new"
                style={{
                  fontSize: 12,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.55)",
                  background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                  color: "#e0f2fe",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Criar activity
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>
            {error}
          </p>
        ) : null}

        {/* Lista */}
        {loading ? (
          <section style={cardStyle}>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
              Carregando suas activities...
            </p>
          </section>
        ) : activities.length === 0 ? (
          <section style={cardStyle}>
            <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
              Você ainda não criou nenhuma activity.
            </p>
          </section>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activities.map((a) => {
              const img = getPublicImageUrl(a.image_path) || a.image_url || null;

              return (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <section style={{ ...cardStyle, cursor: "pointer" }}>
                    <div
                      style={{
                        width: "100%",
                        height: 160,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.25)",
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={a.title ?? "activity image"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          No image
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 800,
                            color: "#e5e7eb",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {a.title ?? "Activity"}
                        </h2>

                        <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: 13 }}>
                          {(a.sport ?? "")} • {formatDateTime(a.date)}
                        </p>

                        <p style={{ margin: "6px 0 0 0", color: "#9ca3af", fontSize: 13 }}>
                          {buildAddress(a)}
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(56,189,248,0.5)",
                            background: "linear-gradient(135deg, rgba(8,47,73,0.9), rgba(12,74,110,0.9))",
                            color: "#e0f2fe",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatPrice(a.price_cents)}
                        </span>
                      </div>
                    </div>
                  </section>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavbar />
    </main>
  );
}

