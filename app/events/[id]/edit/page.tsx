// app/admin/events/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type AppEventRow = {
  id: string;
  title: string;
  description: string | null;
  date: string; // timestamptz

  location: string | null;
  location_name: string | null;
  address_text: string | null;

  street: string | null;
  city: string | null;
  state: string | null;

  lat: number | null;
  lng: number | null;

  sport: string | null;

  capacity: number | null;
  waitlist_capacity: number; // NOT NULL
  price_cents: number; // NOT NULL

  organizer_whatsapp: string | null;
  contact_email: string | null;

  published: boolean;

  image_url: string | null; // legado
  image_path: string | null;
};

function toInputDateTimeLocal(iso: string) {
  // converte ISO para "YYYY-MM-DDTHH:mm" local (pra input datetime-local)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromInputDateTimeLocal(v: string) {
  // input datetime-local -> ISO
  // o Date interpreta como local; depois convertemos para ISO UTC
  const d = new Date(v);
  return d.toISOString();
}

// bucket usado em outras telas suas (atividades/“event-images”)
function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

async function ensureIsAdmin() {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session) return { ok: false as const, reason: "no_session" as const };

  const userId = session.user.id;

  const { data, error } = await supabaseBrowser
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false as const, reason: "db_error" as const, error };
  if (!data) return { ok: false as const, reason: "not_admin" as const };

  return { ok: true as const, userId };
}

export default function AdminEventEditPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [row, setRow] = useState<AppEventRow | null>(null);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateLocal, setDateLocal] = useState("");

  const [sport, setSport] = useState("");
  const [capacity, setCapacity] = useState<string>(""); // string pra input
  const [waitlistCapacity, setWaitlistCapacity] = useState<string>("0");

  // mostrar em dólares, salvar em cents
  const [priceUsd, setPriceUsd] = useState<string>("0.00");

  const [locationName, setLocationName] = useState("");
  const [addressText, setAddressText] = useState("");
  const [location, setLocation] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");

  const [contactEmail, setContactEmail] = useState("");
  const [organizerWhatsapp, setOrganizerWhatsapp] = useState("");

  const [published, setPublished] = useState(false);

  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageLegacyUrl, setImageLegacyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const adminCheck = await ensureIsAdmin();

      if (!adminCheck.ok) {
        // segue o mesmo comportamento do /admin/page.tsx
        if (adminCheck.reason === "no_session") {
          router.replace("/login");
          return;
        }
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("app_events")
        .select(
          "id,title,description,date,location,location_name,address_text,street,city,state,lat,lng,sport,capacity,waitlist_capacity,price_cents,organizer_whatsapp,contact_email,published,image_url,image_path"
        )
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (error) {
        setErrorMsg(error.message || "Erro ao carregar evento.");
        setRow(null);
        setLoading(false);
        return;
      }

      const r = data as AppEventRow;
      setRow(r);

      setTitle(r.title ?? "");
      setDescription(r.description ?? "");
      setDateLocal(r.date ? toInputDateTimeLocal(r.date) : "");

      setSport(r.sport ?? "");
      setCapacity(r.capacity == null ? "" : String(r.capacity));
      setWaitlistCapacity(String(r.waitlist_capacity ?? 0));

      const usd = (Number(r.price_cents ?? 0) / 100).toFixed(2);
      setPriceUsd(usd);

      setLocationName(r.location_name ?? "");
      setAddressText(r.address_text ?? "");
      setLocation(r.location ?? "");

      setStreet(r.street ?? "");
      setCity(r.city ?? "");
      setState(r.state ?? "");

      setLat(r.lat == null ? "" : String(r.lat));
      setLng(r.lng == null ? "" : String(r.lng));

      setContactEmail(r.contact_email ?? "");
      setOrganizerWhatsapp(r.organizer_whatsapp ?? "");

      setPublished(!!r.published);

      setImagePath(r.image_path ?? null);
      setImageLegacyUrl(r.image_url ?? null);

      setLoading(false);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, router, supabase]);

  const previewImg =
    getPublicImageUrl(imagePath) ||
    imageLegacyUrl ||
    null;

  const mapUrl =
    lat.trim() && lng.trim()
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&output=embed`
      : null;

  function parseUsdToCents(v: string) {
    // aceita "12", "12.3", "12.30"
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }

  async function handleSave() {
    if (!id) return;

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const adminCheck = await ensureIsAdmin();
      if (!adminCheck.ok) {
        if (adminCheck.reason === "no_session") router.replace("/login");
        else router.replace("/");
        return;
      }

      const priceCents = parseUsdToCents(priceUsd);

      const payload: Partial<AppEventRow> = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        date: dateLocal ? fromInputDateTimeLocal(dateLocal) : row?.date ?? new Date().toISOString(),

        sport: sport.trim() ? sport.trim() : null,

        capacity: capacity.trim() ? Number(capacity) : null,
        waitlist_capacity: Number(waitlistCapacity || "0") || 0,
        price_cents: priceCents,

        location_name: locationName.trim() ? locationName.trim() : null,
        address_text: addressText.trim() ? addressText.trim() : null,
        location: location.trim() ? location.trim() : null,

        street: street.trim() ? street.trim() : null,
        city: city.trim() ? city.trim() : null,
        state: state.trim() ? state.trim() : null,

        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,

        contact_email: contactEmail.trim() ? contactEmail.trim() : null,
        organizer_whatsapp: organizerWhatsapp.trim() ? organizerWhatsapp.trim() : null,

        published: !!published,

        image_path: imagePath ?? null,
        // image_url (legado) a gente não mexe
      };

      if (!payload.title) {
        throw new Error("Título é obrigatório.");
      }

      const { error } = await supabase
        .from("app_events")
        .update(payload)
        .eq("id", id);

      if (error) throw new Error(error.message);

      setSuccessMsg("Evento atualizado com sucesso ✅");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    if (!id) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const adminCheck = await ensureIsAdmin();
      if (!adminCheck.ok) {
        if (adminCheck.reason === "no_session") router.replace("/login");
        else router.replace("/");
        return;
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : "jpg";

      const key = `events/${id}/${Date.now()}.${safeExt}`;

      const { error: upErr } = await supabase.storage
        .from("event-images")
        .upload(key, file, { upsert: true, contentType: file.type || "image/jpeg" });

      if (upErr) throw new Error(upErr.message);

      // salva no banco
      const { error: dbErr } = await supabase
        .from("app_events")
        .update({ image_path: key })
        .eq("id", id);

      if (dbErr) throw new Error(dbErr.message);

      setImagePath(key);
      setSuccessMsg("Imagem atualizada ✅");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro no upload.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>Carregando evento…</p>
      </main>
    );
  }

  if (!row) {
    return (
      <main style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb", padding: 16 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ color: "#fca5a5", fontSize: 13 }}>{errorMsg || "Evento não encontrado."}</p>
          <Link href="/admin/events" style={{ color: "#93c5fd", textDecoration: "underline", fontSize: 13 }}>
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb", padding: 16 }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => router.push("/admin/events")}
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.65)",
                color: "#e5e7eb",
                cursor: "pointer",
                fontSize: 18,
                fontWeight: 900,
                lineHeight: "40px",
              }}
              aria-label="Voltar"
              title="Voltar"
            >
              ←
            </button>

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
                Admin • Eventos
              </p>
              <h1 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 0 0" }}>Editar evento</h1>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "6px 0 0 0" }}>
                ID: <span style={{ color: "#e5e7eb" }}>{row.id}</span>
              </p>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link href="/admin/events" style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline" }}>
                Voltar pra lista
              </Link>
            </div>
          </div>

          {errorMsg ? <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#fca5a5" }}>{errorMsg}</p> : null}
          {successMsg ? <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#86efac" }}>{successMsg}</p> : null}
        </header>

        <section
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "radial-gradient(circle at top, #0f172a, #020617 65%)",
            padding: "14px 14px",
          }}
        >
          {/* Image */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div
              style={{
                width: "100%",
                height: 240,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                overflow: "hidden",
                background: "rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {previewImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImg} alt={title || "event image"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Sem imagem</span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label
                style={{
                  fontSize: 12,
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.65)",
                  color: "#e5e7eb",
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                {uploading ? "Enviando..." : "Trocar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                (salva em <b>image_path</b> no bucket <b>event-images</b>)
              </span>
            </div>
          </div>

          {/* Form */}
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#93c5fd" }}>Título *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Futebol Society"
                style={{
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#93c5fd" }}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes do evento…"
                rows={4}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e5e7eb",
                  padding: "10px 12px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Data/Hora *</label>
                <input
                  type="datetime-local"
                  value={dateLocal}
                  onChange={(e) => setDateLocal(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Esporte</label>
                <input
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="Ex.: Futebol"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Capacidade</label>
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Ex.: 20"
                  inputMode="numeric"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Waitlist</label>
                <input
                  value={waitlistCapacity}
                  onChange={(e) => setWaitlistCapacity(e.target.value)}
                  inputMode="numeric"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Preço (USD)</label>
                <input
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
                <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                  (salva em <b>price_cents</b>)
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Location name</label>
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Ex.: OCSC - Millenia"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Address text</label>
                <input
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="Ex.: 3516 President Barack Obama Pkwy..."
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#93c5fd" }}>Location (linha livre)</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Langstaff Dr • Windermere, FL"
                style={{
                  height: 42,
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.55)",
                  color: "#e5e7eb",
                  padding: "0 12px",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Street</label>
                <input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>State</label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Lat</label>
                <input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  inputMode="decimal"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Lng</label>
                <input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  inputMode="decimal"
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {mapUrl ? (
              <div style={{ marginTop: 6 }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#9ca3af" }}>Preview do mapa</p>
                <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(148,163,184,0.25)" }}>
                  <iframe title="map" src={mapUrl} width="100%" height="240" style={{ border: 0 }} loading="lazy" />
                </div>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Contact email</label>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contato@..."
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#93c5fd" }}>Organizer WhatsApp</label>
                <input
                  value={organizerWhatsapp}
                  onChange={(e) => setOrganizerWhatsapp(e.target.value)}
                  placeholder="+1..."
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    padding: "0 12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
              <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  style={{ transform: "scale(1.15)" }}
                />
                <span style={{ fontSize: 13, color: "#e5e7eb", fontWeight: 800 }}>
                  Publicado
                </span>
              </label>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginLeft: "auto",
                  borderRadius: 999,
                  padding: "10px 18px",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 900,
                  background: "linear-gradient(to right, #38bdf8, #0ea5e9, #0284c7)",
                  color: "#0b1120",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </section>

        <div style={{ marginTop: 14 }}>
          <Link href="/admin/events" style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline" }}>
            ← Voltar para Admin / Eventos
          </Link>
        </div>
      </div>
    </main>
  );
}
