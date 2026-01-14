// app/activities/[id]/edit/page.tsx
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
  created_at: string;
  created_by: string;

  title: string | null;
  sport: string | null;
  activity_type: string | null;
  description: string | null;

  start_date: string | null;

  address_text: string | null;
  city: string | null;
  state: string | null;

  capacity: number | null;
  waitlist_capacity: number | null;
  price_cents: number | null;
  organizer_whatsapp: string | null;

  is_public: boolean | null;
  published: boolean | null;

  image_path: string | null;
  image_url: string | null;

  organizer_id: string | null;

  // extras no schema (opcionais)
  duration_minutes?: number | null;
  distance_m?: number | null;
  location_text?: string | null;
  lat?: number | null;
  lng?: number | null;
};

/* ================= Utils ================= */

function centsFromUsd(usd: string): number | null {
  const v = (usd ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function usdFromCents(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

// Converte ISO (UTC) -> datetime-local (local)
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

// Converte datetime-local (local) -> ISO UTC
function datetimeLocalToIso(dtLocal: string): string | null {
  const v = (dtLocal ?? "").trim();
  if (!v) return null;
  const d = new Date(v); // interpreta como local
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/* ================= Page ================= */

export default function EditActivityPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const { id: activityId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // fields
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");
  const [activityType, setActivityType] = useState("");

  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(""); // datetime-local

  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");

  const [capacity, setCapacity] = useState("");
  const [waitlist, setWaitlist] = useState("");
  const [priceUsd, setPriceUsd] = useState("");

  const [whatsapp, setWhatsapp] = useState("");

  const [published, setPublished] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  // image
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setInfo(null);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!user) {
        setError("Você precisa estar logado.");
        setLoading(false);
        return;
      }

      const { data, error: e } = await supabase
        .from("app_activities")
        .select(
          [
            "id,created_at,created_by",
            "title,sport,activity_type,description,start_date",
            "address_text,city,state",
            "capacity,waitlist_capacity,price_cents,organizer_whatsapp",
            "published,is_public",
            "image_path,image_url",
            "organizer_id",
          ].join(",")
        )
        .eq("id", activityId)
        .single();

      if (cancelled) return;

      if (e) {
        setError(e.message || "Falha ao carregar activity.");
        setLoading(false);
        return;
      }

      const a = data as ActivityRow;

      // dono: created_by (principal) ou organizer_id (se existir)
      const isOwner = a.created_by === user.id || (!!a.organizer_id && a.organizer_id === user.id);
      if (!isOwner) {
        setError("Você não é o dono desta activity.");
        setLoading(false);
        return;
      }

      setTitle(a.title ?? "");
      setSport(a.sport ?? "");
      setActivityType(a.activity_type ?? "");

      setDescription(a.description ?? "");
      setStartDate(isoToDatetimeLocal(a.start_date));

      setAddressText(a.address_text ?? "");
      setCity(a.city ?? "");
      setStateUS(a.state ?? "");

      setCapacity(a.capacity != null ? String(a.capacity) : "");
      setWaitlist(a.waitlist_capacity != null ? String(a.waitlist_capacity) : "");
      setPriceUsd(usdFromCents(a.price_cents));

      setWhatsapp(a.organizer_whatsapp ?? "");

      setPublished(a.published ?? true);
      setIsPublic(a.is_public ?? true);

      setCurrentImagePath(a.image_path ?? null);
      const img = getPublicImageUrl(a.image_path ?? null) || a.image_url || null;
      setCurrentImageUrl(img);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, activityId]);

  // preview local do file
  useEffect(() => {
    if (!newFile) {
      setNewPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(newFile);
    setNewPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newFile]);

  async function handleUploadImage() {
    if (!activityId) return;
    if (!newFile) {
      setError("Selecione uma imagem primeiro.");
      return;
    }

    setUploadBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Você precisa estar logado.");

      if (!newFile.type.startsWith("image/")) {
        throw new Error("Arquivo inválido. Envie uma imagem.");
      }

      const safeName = newFile.name.replace(/\s+/g, "-");
      const newPath = `activities/${activityId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("event-images")
        .upload(newPath, newFile, { upsert: true, contentType: newFile.type });

      if (upErr) throw new Error(upErr.message);

      const { error: dbErr } = await supabase
        .from("app_activities")
        .update({ image_path: newPath })
        .eq("id", activityId);

      if (dbErr) throw new Error(dbErr.message);

      // remove antiga (best-effort)
      if (currentImagePath && currentImagePath !== newPath) {
        await supabase.storage.from("event-images").remove([currentImagePath]);
      }

      setCurrentImagePath(newPath);
      setCurrentImageUrl(getPublicImageUrl(newPath));
      setNewFile(null);
      setInfo("Imagem atualizada com sucesso!");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao atualizar imagem.");
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleSave() {
    if (!activityId) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const t = title.trim();
      const sp = sport.trim();
      const at = activityType.trim();
      const ad = addressText.trim();
      const ci = city.trim();
      const st = stateUS.trim();
      const wa = whatsapp.trim();

      if (t.length < 3) throw new Error("Title é obrigatório (mín. 3).");
      if (sp.length < 2) throw new Error("Sport é obrigatório.");

      // Se activity_type ficou vazio, usa sport como fallback
      const finalActivityType = at.length ? at : sp;

      // start_date (opcional, mas seu /new pede. aqui vou exigir também)
      if (!startDate.trim()) throw new Error("Date & Time é obrigatório.");
      const startIso = datetimeLocalToIso(startDate);
      if (!startIso) throw new Error("Date & Time inválido.");

      if (ad.length < 5) throw new Error("Address é obrigatório.");
      if (ci.length < 2) throw new Error("City é obrigatório.");
      if (st.length < 2) throw new Error("State é obrigatório.");

      if (!capacity.trim()) throw new Error("Capacity é obrigatória.");
      const capN = Number(capacity);
      if (!Number.isFinite(capN) || capN <= 0) throw new Error("Capacity deve ser um número > 0.");

      let waitN = 0;
      if (waitlist.trim()) {
        const wn = Number(waitlist);
        if (!Number.isFinite(wn) || wn < 0) throw new Error("Waitlist deve ser vazio ou número >= 0.");
        waitN = wn;
      }

      if (!priceUsd.trim()) throw new Error("Price (USD) é obrigatório.");
      const priceCents = centsFromUsd(priceUsd);
      if (priceCents == null) throw new Error("Price (USD) inválido.");

      if (wa && wa.length < 6) throw new Error("WhatsApp inválido (ex: +14075551234).");

      const payload = {
        title: t,
        sport: sp,
        activity_type: finalActivityType,
        description: description.trim() || null,

        start_date: startIso,

        address_text: ad,
        city: ci,
        state: st,

        capacity: Math.round(capN),
        waitlist_capacity: Math.round(waitN),
        price_cents: priceCents,

        organizer_whatsapp: wa || null,

        published: !!published,
        is_public: !!isPublic,
      };

      const { error: upErr } = await supabase.from("app_activities").update(payload).eq("id", activityId);
      if (upErr) throw new Error(upErr.message);

      setInfo("Activity atualizada com sucesso!");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activityId) return;

    const ok = window.confirm("Tem certeza que deseja apagar esta activity? Isso não pode ser desfeito.");
    if (!ok) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { error: delErr } = await supabase.from("app_activities").delete().eq("id", activityId);
      if (delErr) throw new Error(delErr.message);

      router.push("/activities");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao apagar.");
    } finally {
      setBusy(false);
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#60a5fa" };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "#374151",
    color: "#ffffff",
    outline: "none",
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "radial-gradient(circle at top left, #020617, #020617 50%, #000000 100%)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#020617", color: "#e5e7eb", padding: 16, paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
              Activities
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0 0 0" }}>Editar activity</h1>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/activities" style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline" }}>
              Voltar
            </Link>
            <Link href={`/activities/${activityId}`} style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline" }}>
              Ver activity
            </Link>
          </div>
        </header>

        {error ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error}</p> : null}
        {info ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#86efac" }}>{info}</p> : null}

        {/* IMAGEM */}
        <section style={cardStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Imagem</h2>

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
            {newPreviewUrl || currentImageUrl ? (
              <img
                src={newPreviewUrl || currentImageUrl || ""}
                alt="activity image"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>No image</span>
            )}
          </div>

          <label style={labelStyle}>
            Trocar imagem
            <input
              style={inputStyle}
              type="file"
              accept="image/*"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              disabled={loading || uploadBusy}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleUploadImage}
              disabled={loading || uploadBusy || !newFile}
              style={{
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.55)",
                background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                color: "#e0f2fe",
                fontWeight: 900,
                cursor: loading || uploadBusy || !newFile ? "not-allowed" : "pointer",
              }}
            >
              {uploadBusy ? "Enviando..." : "Salvar imagem"}
            </button>
          </div>
        </section>

        {/* FORM */}
        <section style={{ ...cardStyle, marginTop: 12 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Carregando...</p>
          ) : (
            <>
              <label style={labelStyle}>
                Title *
                <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, flex: "1 1 220px" }}>
                  Sport *
                  <input style={inputStyle} value={sport} onChange={(e) => setSport(e.target.value)} />
                </label>

                <label style={{ ...labelStyle, flex: "1 1 220px" }}>
                  Activity type (opcional)
                  <input style={inputStyle} placeholder="Se vazio, vira igual ao Sport" value={activityType} onChange={(e) => setActivityType(e.target.value)} />
                </label>
              </div>

              <label style={labelStyle}>
                Date & Time *
                <input style={inputStyle} type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>

              <label style={labelStyle}>
                Address (texto completo) *
                <input style={inputStyle} value={addressText} onChange={(e) => setAddressText(e.target.value)} />
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, flex: "1 1 220px" }}>
                  City *
                  <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} />
                </label>

                <label style={{ ...labelStyle, flex: "1 1 140px" }}>
                  State *
                  <input style={inputStyle} value={stateUS} onChange={(e) => setStateUS(e.target.value)} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label style={{ ...labelStyle, flex: "1 1 180px" }}>
                  Capacity *
                  <input style={inputStyle} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </label>

                <label style={{ ...labelStyle, flex: "1 1 180px" }}>
                  Waitlist (opcional)
                  <input style={inputStyle} inputMode="numeric" value={waitlist} onChange={(e) => setWaitlist(e.target.value)} />
                </label>

                <label style={{ ...labelStyle, flex: "1 1 180px" }}>
                  Price (USD) *
                  <input style={inputStyle} inputMode="decimal" placeholder="Ex: 15.00 (0 = Free)" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} />
                </label>
              </div>

              <label style={labelStyle}>
                WhatsApp do organizador (opcional)
                <input style={inputStyle} placeholder="+14075551234" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              </label>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#e5e7eb" }}>
                  <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                  Published
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#e5e7eb" }}>
                  <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                  Public (aparece para todo mundo)
                </label>
              </div>

              <label style={labelStyle}>
                Description (opcional)
                <textarea style={{ ...inputStyle, minHeight: 110, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  style={{
                    fontSize: 12,
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(248,113,113,0.55)",
                    background: "rgba(127,29,29,0.35)",
                    color: "#fecaca",
                    fontWeight: 900,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Apagar
                </button>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => router.push("/activities")}
                    style={{
                      fontSize: 12,
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.65)",
                      color: "#e5e7eb",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={busy}
                    style={{
                      fontSize: 12,
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(56,189,248,0.55)",
                      background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                      color: "#e0f2fe",
                      fontWeight: 900,
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    {busy ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <BottomNavbar />
    </main>
  );
}
