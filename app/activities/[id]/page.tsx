// app/activities/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

/* ================= Types ================= */

type ActivityRow = {
  id: string;

  created_at: string | null;
  created_by: string;

  title: string;
  activity_type: string;

  description: string | null;

  start_date: string | null;
  duration_minutes: number | null;
  distance_m: number | null;

  location_text: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;

  is_public: boolean;

  image_path: string | null;
  image_url: string | null; // legado
};

/* ================= Utils ================= */

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
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

function milesFromMeters(m: number | null): string {
  if (m == null) return "—";
  const mi = m / 1609.344;
  return `${mi.toFixed(2)} mi`;
}

function minutesLabel(mins: number | null): string {
  if (mins == null) return "—";
  if (!Number.isFinite(mins) || mins <= 0) return "—";
  return `${mins} min`;
}

function fieldValue(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t.length ? t : "—";
}

// ✅ manter consistente com /activities/new (upload em event-images)
function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function buildLocation(a: ActivityRow | null): string {
  if (!a) return "";
  const parts: string[] = [];

  const loc = (a.location_text ?? "").trim();
  const city = (a.city ?? "").trim();
  const state = (a.state ?? "").trim();

  if (loc) parts.push(loc);
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);

  return parts.join(" • ").trim() || "—";
}

/* ================= Page ================= */

export default function ActivityDetailPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const { id: activityId } = useParams<{ id: string }>();

  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Load activity + isOwner
  useEffect(() => {
    if (!activityId) return;

    let cancelled = false;

    async function loadActivity() {
      setLoading(true);
      setError(null);
      setInfo(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      const { data, error } = await supabase
        .from("app_activities")
        .select(
          "id,created_at,created_by,title,activity_type,description,start_date,duration_minutes,distance_m,location_text,city,state,lat,lng,is_public,image_path,image_url"
        )
        .eq("id", activityId)
        .single();

      if (cancelled) return;

      if (error) {
        setError(error.message || "Failed to load activity.");
        setActivity(null);
        setIsOwner(false);
      } else {
        const a = (data as ActivityRow) ?? null;
        setActivity(a);

        const owner = !!(user?.id && a?.created_by && user.id === a.created_by);
        setIsOwner(owner);
      }

      setLoading(false);
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [supabase, activityId]);

  async function handleDelete() {
    if (!activityId) return;
    if (!isOwner) return;

    const ok = window.confirm("Tem certeza que deseja apagar esta activity? Isso não pode ser desfeito.");
    if (!ok) return;

    setDeleteBusy(true);
    setError(null);
    setInfo(null);

    try {
      const pathToRemove = activity?.image_path ?? null;

      const { error: delErr } = await supabase.from("app_activities").delete().eq("id", activityId);
      if (delErr) throw new Error(delErr.message);

      // ✅ deletar do mesmo bucket usado no upload (/activities/new)
      if (pathToRemove) {
        await supabase.storage.from("event-images").remove([pathToRemove]);
      }

      router.push("/activities");
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete activity.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const img = getPublicImageUrl(activity?.image_path ?? null) || activity?.image_url || null;

  const mapUrl =
    activity?.lat != null && activity?.lng != null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${activity.lat},${activity.lng}`)}&output=embed`
      : null;

  const titleText = loading ? "Carregando..." : fieldValue(activity?.title ?? null);
  const typeText = fieldValue(activity?.activity_type ?? null);
  const dateText = formatDateTime(activity?.start_date ?? null);
  const locationLine = buildLocation(activity);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: "16px",
        paddingBottom: "80px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <header style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#64748b",
              margin: 0,
            }}
          >
            Activity
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{titleText}</h1>

            <Link
              href="/activities"
              style={{
                fontSize: 12,
                color: "#93c5fd",
                textDecoration: "underline",
                whiteSpace: "nowrap",
              }}
            >
              Voltar
            </Link>
          </div>

          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {typeText} • {dateText}
          </p>

          {isOwner ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <Link
                href={`/activities/${activityId}/edit`}
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.55)",
                  background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                  color: "#e0f2fe",
                  textDecoration: "none",
                  fontWeight: 800,
                }}
              >
                Editar
              </Link>

              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(248,113,113,0.55)",
                  background: "rgba(127,29,29,0.35)",
                  color: "#fecaca",
                  cursor: deleteBusy ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                {deleteBusy ? "Apagando..." : "Apagar"}
              </button>
            </div>
          ) : null}
        </header>

        {error ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error}</p> : null}
        {info ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#86efac" }}>{info}</p> : null}

        <section
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "radial-gradient(circle at top left, #020617, #020617 50%, #000000 100%)",
            padding: "14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Image */}
          <div
            style={{
              width: "100%",
              height: 220,
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
              <img src={img} alt={activity?.title ?? "activity image"} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>No image</span>
            )}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
              {typeText}
            </span>

            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.65)",
                color: "#e5e7eb",
                whiteSpace: "nowrap",
              }}
            >
              {minutesLabel(activity?.duration_minutes ?? null)}
            </span>

            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.65)",
                color: "#e5e7eb",
                whiteSpace: "nowrap",
              }}
            >
              {milesFromMeters(activity?.distance_m ?? null)}
            </span>

            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.65)",
                color: "#e5e7eb",
                whiteSpace: "nowrap",
              }}
            >
              {activity?.is_public ? "Public" : "Private"}
            </span>
          </div>

          {/* Details */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "10px 0 6px 0" }}>Detalhes</h2>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.35)",
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                { label: "Title", value: activity?.title ?? "—" },
                { label: "Activity type", value: activity?.activity_type ?? "—" },
                { label: "Start date", value: formatDateTime(activity?.start_date ?? null) },
                { label: "Duration (minutes)", value: activity?.duration_minutes != null ? String(activity.duration_minutes) : "—" },
                { label: "Distance", value: activity?.distance_m != null ? milesFromMeters(activity.distance_m) : "—" },
                { label: "Location", value: locationLine },
                { label: "City", value: activity?.city ?? "—" },
                { label: "State", value: activity?.state ?? "—" },
              ].map((row) => (
                <div key={row.label}>
                  <p style={{ margin: 0, fontSize: 12, color: "#60a5fa" }}>{row.label}</p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: 13,
                      color: "#9ca3af",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {String(row.value || "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          {mapUrl ? (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "10px 0 6px 0" }}>Mapa</h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Lat/Lng:{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {activity?.lat}, {activity?.lng}
                </span>
              </p>

              <div style={{ marginTop: 10, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(148,163,184,0.25)" }}>
                <iframe title="map" src={mapUrl} width="100%" height="240" style={{ border: 0 }} loading="lazy" />
              </div>
            </div>
          ) : null}

          {/* Description */}
          {activity?.description ? (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "10px 0 6px 0" }}>Descrição</h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, whiteSpace: "pre-wrap" }}>
                {activity.description}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <BottomNavbar />
    </main>
  );
}
