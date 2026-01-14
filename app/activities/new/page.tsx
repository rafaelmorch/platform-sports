// app/activities/new/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

function toCents(usdText: string): number | null {
  const v = (usdText ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ✅ datetime-local (local) -> ISO UTC
function datetimeLocalToIso(dtLocal: string): string | null {
  const v = (dtLocal ?? "").trim();
  if (!v) return null;
  const d = new Date(v); // interpreta como local
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function NewActivityPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");

  const [dates, setDates] = useState<string[]>([""]); // datetime-local

  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");

  const [capacity, setCapacity] = useState("");
  const [waitlist, setWaitlist] = useState(""); // opcional
  const [priceUsd, setPriceUsd] = useState("");

  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#60a5fa",
    margin: 0,
  };

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

  function updateDateAt(idx: number, value: string) {
    setDates((prev) => prev.map((d, i) => (i === idx ? value : d)));
  }

  function addDate() {
    setDates((prev) => [...prev, ""]);
  }

  function removeDate(idx: number) {
    setDates((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Você precisa estar logado para criar atividade.");

      const t = title.trim();
      const sp = sport.trim();
      const ad = addressText.trim();
      const ci = city.trim();
      const st = stateUS.trim();
      const wa = whatsapp.trim();

      if (t.length < 3) throw new Error("Title * é obrigatório.");
      if (sp.length < 2) throw new Error("Sport * é obrigatório.");

      const cleanDates = dates.map((d) => (d ?? "").trim()).filter(Boolean);
      if (cleanDates.length === 0) throw new Error("Adicione pelo menos 1 Date & Time *.");

      const uniqueDates = Array.from(new Set(cleanDates));
      if (uniqueDates.length !== cleanDates.length) {
        throw new Error("Você adicionou datas repetidas. Remova as duplicadas.");
      }

      if (ad.length < 5) throw new Error("Address (texto completo) * é obrigatório.");
      if (ci.length < 2) throw new Error("City * é obrigatório.");
      if (st.length < 2) throw new Error("State * é obrigatório.");

      if (!capacity.trim()) throw new Error("Capacity * é obrigatório.");
      const capN = Number(capacity);
      if (!Number.isFinite(capN) || capN <= 0) throw new Error("Capacity deve ser um número > 0.");

      let waitN = 0;
      if (waitlist.trim()) {
        const wn = Number(waitlist);
        if (!Number.isFinite(wn) || wn < 0) throw new Error("Waitlist deve ser vazio ou número >= 0.");
        waitN = wn;
      }

      if (!priceUsd.trim()) throw new Error("Price (USD) * é obrigatório.");
      const cents = toCents(priceUsd);
      if (cents == null) throw new Error("Price (USD) inválido.");

      if (wa.length < 6) throw new Error("WhatsApp do organizador * é obrigatório.");

      // upload opcional de imagem (reusa o bucket "event-images")
      let imagePath: string | null = null;
      if (imageFile) {
        if (!imageFile.type.startsWith("image/")) throw new Error("Arquivo inválido. Envie uma imagem.");

        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("event-images")
          .upload(fileName, imageFile, { cacheControl: "3600", upsert: false, contentType: imageFile.type });

        if (upErr) throw new Error(upErr.message || "Falha no upload da imagem.");

        imagePath = fileName;
      }

      // ✅ cria 1 linha por data (repetitivo)
      const rows = uniqueDates.map((dtLocal) => {
        const iso = datetimeLocalToIso(dtLocal);
        if (!iso) throw new Error("Uma das datas está inválida.");

        return {
          // dono / RLS
          created_by: user.id,
          organizer_id: user.id, // ✅ bom ter preenchido

          title: t,
          sport: sp,
          activity_type: sp, // obrigatório (você pode mudar depois pra outro campo)

          description: description.trim() || null,

          start_date: iso, // ✅ correto (UTC)

          address_text: ad,
          location_text: ad, // opcional

          city: ci,
          state: st,

          capacity: capN,
          waitlist_capacity: waitN,
          price_cents: cents,

          organizer_whatsapp: wa,

          image_path: imagePath,

          is_public: true,
          published: true,
        };
      });

      const { data, error: insErr } = await supabase.from("app_activities").insert(rows).select("id");
      if (insErr) throw new Error(insErr.message);

      const created = (data ?? []) as { id: string }[];
      setInfo(`Atividades publicadas: ${created.length}`);
      router.push("/activities");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao criar atividade.");
    } finally {
      setBusy(false);
    }
  }

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
            Atividades
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Criar atividade</h1>

            <Link href="/activities" style={{ fontSize: 12, color: "#93c5fd", textDecoration: "underline", whiteSpace: "nowrap" }}>
              Voltar
            </Link>
          </div>

          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Campos com <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span> são obrigatórios.
          </p>
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
          <label style={labelStyle}>
            Title <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input style={inputStyle} placeholder="Ex: Run club" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label style={labelStyle}>
            Sport <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="Ex: Running, Cycling, Functional..."
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>
              Date & Time <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>(adicione várias datas se for repetitivo)</span>
            </p>

            {dates.map((d, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={{ ...inputStyle, marginTop: 0, flex: "1 1 260px" }}
                  type="datetime-local"
                  value={d}
                  onChange={(e) => updateDateAt(idx, e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => removeDate(idx)}
                  disabled={dates.length <= 1}
                  style={{
                    fontSize: 12,
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.65)",
                    color: "#e5e7eb",
                    fontWeight: 800,
                    cursor: dates.length <= 1 ? "not-allowed" : "pointer",
                    opacity: dates.length <= 1 ? 0.6 : 1,
                  }}
                >
                  Remover
                </button>
              </div>
            ))}

            <div>
              <button
                type="button"
                onClick={addDate}
                style={{
                  fontSize: 12,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.55)",
                  background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                  color: "#e0f2fe",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                + Adicionar outra data
              </button>
            </div>
          </div>

          <label style={labelStyle}>
            Address (texto completo) <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="Ex: 3516 President Barack Obama Pkwy"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: "1 1 220px" }}>
              City <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input style={inputStyle} placeholder="Ex: Orlando" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 140px" }}>
              State <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input style={inputStyle} placeholder="Ex: FL" value={stateUS} onChange={(e) => setStateUS(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: "1 1 180px" }}>
              Capacity <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input style={inputStyle} inputMode="numeric" placeholder="Ex: 20" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px" }}>
              Waitlist (opcional)
              <input style={inputStyle} inputMode="numeric" placeholder="Ex: 10" value={waitlist} onChange={(e) => setWaitlist(e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px" }}>
              Price (USD) <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input
                style={inputStyle}
                inputMode="decimal"
                placeholder="Ex: 15.00 (0 = Free)"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
              />
            </label>
          </div>

          <label style={labelStyle}>
            WhatsApp do organizador <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input style={inputStyle} placeholder="Ex: +1 407 555 1234" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </label>

          <label style={labelStyle}>
            Description (opcional)
            <textarea
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
              placeholder="Descreva a atividade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Imagem (opcional)
            <input
              style={inputStyle}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#9ca3af" }}>Dica: use uma imagem horizontal.</span>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <p style={{ fontSize: 12, color: "#60a5fa", margin: 0 }}>Ao publicar, será criada 1 atividade para cada data informada.</p>

            <button
              onClick={handleCreate}
              disabled={busy}
              style={{
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.55)",
                background: "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                color: "#e0f2fe",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              {busy ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </section>
      </div>

      <BottomNavbar />
    </main>
  );
}
