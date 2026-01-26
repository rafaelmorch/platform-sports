"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  const d = new Date(v); // interprets as local
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/* ================= Small UI ================= */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(2,6,23,0.55)",
        color: "#e5e7eb",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: "0 10px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        whiteSpace: "nowrap",
      }}
      aria-label="Back"
    >
      <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.95 }}>←</span>
      <span style={{ letterSpacing: "0.02em" }}>Back</span>
    </button>
  );
}

function CalendarIcon() {
  // white, ~20% bigger than “normal”
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
    </svg>
  );
}

export default function NewActivityPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();

  // ✅ auth guard
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");

  const [dates, setDates] = useState<string[]>([""]); // datetime-local

  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");

  const [capacity, setCapacity] = useState(""); // optional => unlimited
  const [waitlist, setWaitlist] = useState(""); // optional
  const [priceUsd, setPriceUsd] = useState("");

  const [whatsapp, setWhatsapp] = useState(""); // optional
  const [description, setDescription] = useState(""); // required

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // back: try history; fallback list
  function handleBack() {
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {}
    router.push("/activities");
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#60a5fa",
    margin: 0,
    display: "block",
  };

  // ✅ box sizing prevents border overlap / “stacking”
  const inputStyle: React.CSSProperties = {
    boxSizing: "border-box",
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

  // ✅ “Pick” helper (abre o picker quando suportado)
  function openPicker(idx: number) {
    const el = document.getElementById(`dt-${idx}`) as HTMLInputElement | null;
    if (!el) return;

    // showPicker is supported in Chromium-based browsers
    const anyEl = el as any;
    if (typeof anyEl.showPicker === "function") {
      anyEl.showPicker();
      return;
    }

    // fallback
    el.focus();
    el.click();
  }

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("You must be logged in to create an activity.");

      const t = title.trim();
      const sp = sport.trim();
      const ad = addressText.trim();
      const ci = city.trim();
      const st = stateUS.trim();
      const wa = whatsapp.trim();
      const desc = description.trim();

      if (t.length < 3) throw new Error("Title * is required.");
      if (sp.length < 2) throw new Error("Sport * is required.");

      const cleanDates = dates.map((d) => (d ?? "").trim()).filter(Boolean);
      if (cleanDates.length === 0) throw new Error("Add at least 1 Date & Time *.");

      const uniqueDates = Array.from(new Set(cleanDates));
      if (uniqueDates.length !== cleanDates.length) {
        throw new Error("You added duplicate dates. Remove the duplicates.");
      }

      if (ad.length < 5) throw new Error("Address * is required.");
      if (ci.length < 2) throw new Error("City * is required.");
      if (st.length < 2) throw new Error("State * is required.");

      // ✅ Capacity optional => null means unlimited
      let capN: number | null = null;
      if (capacity.trim()) {
        const n = Number(capacity);
        if (!Number.isFinite(n) || n <= 0) throw new Error("Capacity must be empty (unlimited) or a number > 0.");
        capN = n;
      }

      let waitN = 0;
      if (waitlist.trim()) {
        const wn = Number(waitlist);
        if (!Number.isFinite(wn) || wn < 0) throw new Error("Waitlist must be empty or a number >= 0.");
        waitN = wn;
      }

      if (!priceUsd.trim()) throw new Error("Price (USD) * is required.");
      const cents = toCents(priceUsd);
      if (cents == null) throw new Error("Invalid Price (USD).");

      // ✅ Description required
      if (desc.length < 10) throw new Error("Description * is required (please add a bit more detail).");

      // ✅ WhatsApp optional
      const whatsappValue = wa.length ? wa : null;

      // upload optional image (bucket: event-images)
      let imagePath: string | null = null;
      if (imageFile) {
        if (!imageFile.type.startsWith("image/")) throw new Error("Invalid file. Please upload an image.");

        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage.from("event-images").upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type,
        });

        if (upErr) throw new Error(upErr.message || "Image upload failed.");

        imagePath = fileName;
      }

      // ✅ create 1 row per date
      const rows = uniqueDates.map((dtLocal) => {
        const iso = datetimeLocalToIso(dtLocal);
        if (!iso) throw new Error("One of the dates is invalid.");

        return {
          created_by: user.id,
          organizer_id: user.id,

          title: t,
          sport: sp,
          activity_type: sp,

          description: desc,

          start_date: iso,

          address_text: ad,
          location_text: ad,

          city: ci,
          state: st,

          capacity: capN, // ✅ nullable => unlimited
          waitlist_capacity: waitN,
          price_cents: cents,

          organizer_whatsapp: whatsappValue, // ✅ nullable

          image_path: imagePath,

          is_public: true,
          published: true,
        };
      });

      const { data, error: insErr } = await supabase.from("app_activities").insert(rows).select("id");
      if (insErr) throw new Error(insErr.message);

      const created = (data ?? []) as { id: string }[];
      setInfo(`Published activities: ${created.length}`);
      router.push("/activities");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create activity.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#020617",
          color: "#e5e7eb",
          padding: "16px",
          paddingBottom: "24px",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading...</p>
        </div>
      </main>
    );
  }

  const descriptionSuggestion =
    `Suggested details:\n` +
    `• Duration: (e.g., 60 minutes)\n` +
    `• What to bring: water bottle, towel, etc.\n` +
    `• Clothing: running shoes / comfortable clothes\n` +
    `• Minimum age: (e.g., 12+)\n` +
    `• Meeting point / check-in instructions\n` +
    `• Any special notes (pace groups, warm-up, cooldown, etc.)`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: "16px",
        paddingBottom: "24px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <header style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* ✅ standardized back button (NOT alone) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackButton onClick={handleBack} />

            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
                Activities
              </p>

              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 0 0" }}>Create activity</h1>

              <p style={{ fontSize: 13, color: "#9ca3af", margin: "6px 0 0 0" }}>
                Fields marked with <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span> are required.
              </p>
            </div>

            {/* ✅ LOGO no lado direito */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Platform_Logo.png"
              alt="Platform Sports"
              style={{
                height: 56,
                width: "auto",
                objectFit: "contain",
                display: "block",
                marginLeft: "auto",
              }}
            />
          </div>
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
            <input style={inputStyle} placeholder="e.g., Run club" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label style={labelStyle}>
            Sport <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="e.g., Running, Cycling, Functional..."
              value={sport}
              onChange={(e) => setSport(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>
              Date &amp; Time <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>(add multiple dates if recurring)</span>
            </p>

            {dates.map((d, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {/* ✅ input with our calendar icon + Pick */}
                <div style={{ position: "relative", flex: "1 1 260px", minWidth: 260 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      opacity: 0.95,
                    }}
                  >
                    <CalendarIcon />
                  </div>

                  <input
                    id={`dt-${idx}`}
                    style={{
                      ...inputStyle,
                      marginTop: 0,
                      paddingLeft: 42, // space for icon
                      paddingRight: 92, // space for Pick button
                    }}
                    type="datetime-local"
                    value={d}
                    onChange={(e) => updateDateAt(idx, e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => openPicker(idx)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 12,
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background: "rgba(2,6,23,0.65)",
                      color: "#e5e7eb",
                      fontWeight: 800,
                      cursor: "pointer",
                      lineHeight: 1,
                      boxShadow: "0 10px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Pick
                  </button>
                </div>

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
                  Remove
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
                + Add another date
              </button>
            </div>
          </div>

          <label style={labelStyle}>
            Address <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="e.g., 3516 President Barack Obama Pkwy"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: "1 1 220px", minWidth: 220 }}>
              City <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input style={inputStyle} placeholder="e.g., Orlando" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 140px", minWidth: 140 }}>
              State <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input style={inputStyle} placeholder="e.g., FL" value={stateUS} onChange={(e) => setStateUS(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 180 }}>
              Capacity (optional)
              <input
                style={inputStyle}
                inputMode="numeric"
                placeholder="Leave empty for unlimited"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 180 }}>
              Waitlist (optional)
              <input style={inputStyle} inputMode="numeric" placeholder="e.g., 10" value={waitlist} onChange={(e) => setWaitlist(e.target.value)} />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 180 }}>
              Price (USD) <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input
                style={inputStyle}
                inputMode="decimal"
                placeholder="e.g., 15.00 (0 = Free)"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Organizer WhatsApp (optional)
            <input
              style={inputStyle}
              placeholder="e.g., +1 407 555 1234"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Description <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <textarea
              style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
              placeholder={descriptionSuggestion}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label style={labelStyle}>
            Image (optional)
            <input
              style={inputStyle}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#9ca3af" }}>Tip: use a horizontal image.</span>
          </label>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
            <p style={{ fontSize: 12, color: "#60a5fa", margin: 0 }}>When publishing, it will create 1 activity per date.</p>

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
                opacity: busy ? 0.8 : 1,
              }}
            >
              {busy ? "Publishing..." : "Publish"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
