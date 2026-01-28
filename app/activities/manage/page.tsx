"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  created_by: string | null;
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

// ✅ manter consistente com /activities/new (upload em event-images)
function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage
    .from("event-images")
    .getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function isExpired(startDate: string | null): boolean {
  if (!startDate) return false;
  const t = new Date(startDate).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

export default function ActivitiesManagePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser, []);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const userId = session.user.id;

        const { data, error } = await supabase
          .from("app_activities")
          .select(
            "id,title,sport,description,start_date,address_text,city,state,capacity,waitlist_capacity,price_cents,image_path,image_url,published,created_by"
          )
          .eq("created_by", userId)
          .order("start_date", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.error("Erro ao carregar minhas atividades:", error);
          setErrorMsg("Não consegui carregar suas atividades agora.");
          setActivities([]);
        } else {
          setActivities((data as ActivityRow[]) ?? []);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Erro inesperado:", err);
        setErrorMsg("Erro inesperado ao carregar suas atividades.");
        setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: 16,
        paddingBottom: 28,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Top bar com seta */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Link
            href="/activities"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#e5e7eb",
              fontSize: 13,
              fontWeight: 900,
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.65)",
            }}
            aria-label="Voltar para Atividades"
          >
            ← Voltar
          </Link>

          <div style={{ lineHeight: 1.1 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#64748b",
                margin: 0,
              }}
            >
              Atividades
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
              Gerenciar Minhas Atividades
            </h1>
          </div>
        </div>

        <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 14px 0" }}>
          Aqui aparecem todas as suas atividades (inclusive expiradas). As expiradas não aparecem na lista pública.
        </p>

        <div style={{ marginBottom: 14 }}>
          <Link
            href="/activities/new"
            style={{
              fontSize: 12,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.55)",
              background:
                "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
              color: "#e0f2fe",
              textDecoration: "none",
              fontWeight: 900,
              display: "inline-block",
            }}
          >
            Criar atividade
          </Link>
        </div>

        {errorMsg ? (
          <div
            style={{
              borderRadius: 14,
              padding: "10px 12px",
              marginBottom: 12,
              background: "rgba(248,113,113,0.10)",
              border: "1px solid rgba(248,113,113,0.22)",
              color: "#fecaca",
              fontSize: 12,
              lineHeight: 1.35,
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Carregando...</p>
        ) : activities.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            Você ainda não criou nenhuma atividade.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {activities.map((a) => {
              const img = getPublicImageUrl(a.image_path) || (a.image_url ?? null);
              const expired = isExpired(a.start_date);

              const when = formatDateTime(a.start_date);
              const where = buildAddress(a);
              const priceLabel = formatPrice(a.price_cents ?? 0);

              return (
                <article
                  key={a.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background:
                      "radial-gradient(circle at top left, #020617, #020617 50%, #000000 100%)",
                    padding: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "stretch",
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
                    }}
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={a.title ?? "activity image"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.title ?? "Atividade"}
                          </h2>

                          {expired ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(248,113,113,0.35)",
                                background: "rgba(127,29,29,0.18)",
                                color: "#fecaca",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              EXPIRADA
                            </span>
                          ) : null}

                          {a.published ? (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(34,197,94,0.28)",
                                background: "rgba(20,83,45,0.18)",
                                color: "#bbf7d0",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              PUBLICADA
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.25)",
                                background: "rgba(2,6,23,0.65)",
                                color: "#cbd5e1",
                                fontWeight: 900,
                                whiteSpace: "nowrap",
                              }}
                            >
                              RASCUNHO
                            </span>
                          )}
                        </div>

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

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(56,189,248,0.5)",
                            background:
                              "linear-gradient(135deg, rgba(8,47,73,0.9), rgba(12,74,110,0.9))",
                            color: "#e0f2fe",
                            whiteSpace: "nowrap",
                            fontWeight: 900,
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
                              fontWeight: 900,
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

                    <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link
                        href={`/activities/${a.id}`}
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 900,
                          textDecoration: "none",
                          color: "#0b1120",
                          background: "linear-gradient(to right, #38bdf8, #0ea5e9, #0284c7)",
                        }}
                      >
                        Ver
                      </Link>

                      <Link
                        href={`/activities/${a.id}/edit`}
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          fontSize: 12,
                          fontWeight: 900,
                          textDecoration: "none",
                          color: "#e5e7eb",
                          border: "1px solid rgba(148,163,184,0.35)",
                          background: "rgba(2,6,23,0.65)",
                        }}
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ ONLY: remove o contorno branco (sem mexer no resto) */}
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #020617 !important;
          overflow-x: hidden !important;
        }
        * {
          outline: none !important;
        }
      `}</style>
    </main>
  );
}
