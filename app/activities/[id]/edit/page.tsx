// app/activities/[id]/edit/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

/* ================= Utils ================= */

function toCents(usdText: string): number | null {
  const v = (usdText ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToUsdText(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toFixed(2);
}

// ✅ datetime-local (local) -> ISO UTC
function datetimeLocalToIso(dtLocal: string): string | null {
  const v = (dtLocal ?? "").trim();
  if (!v) return null;
  const d = new Date(v); // local
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ISO UTC -> datetime-local string (YYYY-MM-DDTHH:mm)
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function formatDatePreview(dtLocal: string): string {
  const v = (dtLocal ?? "").trim();
  if (!v) return "No date selected";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Invalid date";
  try {
    return d.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return v;
  }
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
        boxShadow:
          "0 10px 26px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        whiteSpace: "nowrap",
      }}
      aria-label="Back"
    >
      <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.95 }}>←</span>
      <span style={{ letterSpacing: "0.02em" }}>Back</span>
    </button>
  );
}

/* ================= Types ================= */

type ActivityRow = {
  id: string;
  created_by: string;

  title: string | null;
  sport: string | null;
  activity_type: string | null;

  description: string | null;
  start_date: string | null;

  address_text: string | null;
  city: string | null;
  state: string | null;

  capacity: number | null; // nullable => unlimited
  waitlist_capacity: number | null;
  price_cents: number | null;

  organizer_whatsapp: string | null;

  image_path: string | null;

  // flags (some schemas have these)
  is_public?: boolean | null;
  published?: boolean | null;
  organizer_id?: string | null;
};

/* ================= Page ================= */

export default function EditActivityPage() {
  const router = useRouter();
  const { id: activityId } = useParams<{ id: string }>();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRow | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState("");

  // ✅ SAME AS /new
  const [dates, setDates] = useState<string[]>([""]); // datetime-local

  const [addressText, setAddressText] = useState("");
  const [city, setCity] = useState("");
  const [stateUS, setStateUS] = useState("");

  const [capacity, setCapacity] = useState(""); // optional
  const [waitlist, setWaitlist] = useState(""); // optional
  const [priceUsd, setPriceUsd] = useState("");

  const [whatsapp, setWhatsapp] = useState(""); // optional
  const [description, setDescription] = useState(""); // required

  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const dateInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // standardized back
  function handleBack() {
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
    } catch {}
    router.push(`/activities/${activityId}`);
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#60a5fa",
    margin: 0,
    display: "block",
  };

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

  const pickButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(2,6,23,0.55)",
    color: "#e5e7eb",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow:
      "0 14px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    whiteSpace: "nowrap",
  };

  const descriptionSuggestion =
    `Suggested details:\n` +
    `• Duration: (e.g., 60 minutes)\n` +
    `• What to bring: water bottle, towel, etc.\n` +
    `• Clothing: running shoes / comfortable clothes\n` +
    `• Minimum age: (e.g., 12+)\n` +
    `• Meeting point / check-in instructions\n` +
    `• Any special notes (pace groups, warm-up, cooldown, etc.)`;

  // ✅ SAME AS /new
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

  function openNativePicker(idx: number) {
    const el = dateInputRefs.current[idx];
    if (!el) return;

    // Chrome/Edge: opens picker programmatically
    const maybeShowPicker = (el as HTMLInputElement & { showPicker?: () => void })
      .showPicker;

    if (typeof maybeShowPicker === "function") {
      maybeShowPicker.call(el);
      return;
    }

    // fallback
    try {
      el.focus();
      el.click();
    } catch {}
  }

  // Auth guard + load activity + owner check
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setCheckingAuth(true);
        setLoading(true);
        setError(null);
        setInfo(null);

        const {
          data: { session },
        } = await supabaseBrowser.auth.getSession();

        if (!session?.user?.id) {
          router.replace("/login");
          return;
        }

        const uid = session.user.id;
        if (cancelled) return;
        setUserId(uid);

        const { data, error: fetchErr } = await supabaseBrowser
          .from("app_activities")
          .select(
            "id,created_by,title,sport,activity_type,description,start_date,address_text,city,state,capacity,waitlist_capacity,price_cents,organizer_whatsapp,image_path,is_public,published,organizer_id"
          )
          .eq("id", activityId)
          .single();

        if (cancelled) return;

        if (fetchErr) {
          setError(fetchErr.message || "Failed to load activity.");
          setActivity(null);
          return;
        }

        const a = (data as ActivityRow) ?? null;
        if (!a) {
          setError("Activity not found.");
          return;
        }

        // owner check
        if (!a.created_by || a.created_by !== uid) {
          router.replace(`/activities/${activityId}`);
          return;
        }

        setActivity(a);

        // hydrate form
        setTitle(a.title ?? "");
        setSport(a.sport ?? a.activity_type ?? "");

        // ✅ initialize dates[] with existing start_date as first row
        const first = isoToDatetimeLocal(a.start_date ?? null);
        setDates([first || ""]);

        setAddressText(a.address_text ?? "");
        setCity(a.city ?? "");
        setStateUS(a.state ?? "");

        setCapacity(a.capacity == null ? "" : String(a.capacity));
        setWaitlist(a.waitlist_capacity == null ? "" : String(a.waitlist_capacity));
        setPriceUsd(centsToUsdText(a.price_cents ?? null));

        setWhatsapp(a.organizer_whatsapp ?? "");
        setDescription(a.description ?? "");
      } catch (e: unknown) {
        setError(errorMessage(e));
      } finally {
        if (!cancelled) {
          setCheckingAuth(false);
          setLoading(false);
        }
      }
    };

    if (activityId) run();

    return () => {
      cancelled = true;
    };
  }, [router, activityId]);

  async function handleSave() {
    if (!activityId) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (!userId) {
        router.replace("/login");
        return;
      }
      if (!activity || activity.created_by !== userId) {
        throw new Error("You do not have permission to edit this activity.");
      }

      const t = title.trim();
      const sp = sport.trim();
      const ad = addressText.trim();
      const ci = city.trim();
      const st = stateUS.trim();
      const wa = whatsapp.trim();
      const desc = description.trim();

      if (t.length < 3) throw new Error("Title * is required.");
      if (sp.length < 2) throw new Error("Sport * is required.");

      // ✅ same rules as /new
      const cleanDates = dates.map((d) => (d ?? "").trim()).filter(Boolean);
      if (cleanDates.length === 0) throw new Error("Add at least 1 Date & Time *.");
      const uniqueDates = Array.from(new Set(cleanDates));
      if (uniqueDates.length !== cleanDates.length)
        throw new Error("You added duplicate dates. Remove duplicates.");

      const isoDates = uniqueDates.map((dt) => {
        const iso = datetimeLocalToIso(dt);
        if (!iso) throw new Error("One of the dates is invalid.");
        return iso;
      });

      const firstIso = isoDates[0];

      if (ad.length < 5) throw new Error("Address * is required.");
      if (ci.length < 2) throw new Error("City * is required.");
      if (st.length < 2) throw new Error("State * is required.");

      // capacity optional => null = unlimited
      let capN: number | null = null;
      if (capacity.trim()) {
        const n = Number(capacity);
        if (!Number.isFinite(n) || n <= 0)
          throw new Error("Capacity must be empty (unlimited) or a number > 0.");
        capN = n;
      }

      let waitN: number | null = 0;
      if (waitlist.trim()) {
        const wn = Number(waitlist);
        if (!Number.isFinite(wn) || wn < 0)
          throw new Error("Waitlist must be empty or a number >= 0.");
        waitN = wn;
      }

      if (!priceUsd.trim()) throw new Error("Price (USD) * is required.");
      const cents = toCents(priceUsd);
      if (cents == null) throw new Error("Invalid Price (USD).");

      // description required
      if (desc.length < 10)
        throw new Error("Description * is required (please add a bit more detail).");

      // whatsapp optional
      const whatsappValue = wa.length ? wa : null;

      // image optional (replace)
      let newImagePath: string | null = activity.image_path ?? null;
      const oldImagePath = activity.image_path ?? null;

      if (imageFile) {
        if (!imageFile.type.startsWith("image/"))
          throw new Error("Invalid file. Please upload an image.");

        const ext = imageFile.name.split(".").pop() || "jpg";
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabaseBrowser.storage
          .from("event-images")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: imageFile.type,
          });
        if (upErr) throw new Error(upErr.message || "Image upload failed.");

        newImagePath = fileName;
      }

      // Keep flags consistent (so list shows it)
      const isPublic =
        typeof activity.is_public === "boolean" ? activity.is_public : true;
      const published =
        typeof activity.published === "boolean" ? activity.published : true;

      // 1) Update the current activity with the FIRST date
      const updatePayload = {
        title: t,
        sport: sp,
        activity_type: sp,

        description: desc,
        start_date: firstIso,

        address_text: ad,
        location_text: ad,

        city: ci,
        state: st,

        capacity: capN,
        waitlist_capacity: waitN,
        price_cents: cents,

        organizer_whatsapp: whatsappValue,

        image_path: newImagePath,

        is_public: isPublic,
        published: published,
      };

      const { error: updErr } = await supabaseBrowser
        .from("app_activities")
        .update(updatePayload)
        .eq("id", activityId);

      if (updErr) throw new Error(updErr.message);

      // 2) For extra dates, CREATE new activities (same as /new behavior)
      const extraIsoDates = isoDates.slice(1);
      if (extraIsoDates.length > 0) {
        const rows = extraIsoDates.map((iso) => ({
          created_by: userId,
          organizer_id: userId,

          title: t,
          sport: sp,
          activity_type: sp,

          description: desc,

          start_date: iso,

          address_text: ad,
          location_text: ad,

          city: ci,
          state: st,

          capacity: capN,
          waitlist_capacity: waitN,
          price_cents: cents,

          organizer_whatsapp: whatsappValue,

          image_path: newImagePath,

          is_public: isPublic,
          published: published,
        }));

        const { error: insErr } = await supabaseBrowser.from("app_activities").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }

      // if image changed: delete old
      if (imageFile && oldImagePath && oldImagePath !== newImagePath) {
        await supabaseBrowser.storage.from("event-images").remove([oldImagePath]);
      }

      setInfo(
        extraIsoDates.length
          ? `Saved. Also created ${extraIsoDates.length} additional date(s).`
          : "Saved."
      );
      router.push(`/activities/${activityId}`);
    } catch (e: unknown) {
      setError(errorMessage(e));
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
          padding: 16,
          paddingBottom: 24,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: 16,
        paddingBottom: 24,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header
          style={{
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackButton onClick={handleBack} />

            <div style={{ minWidth: 0 }}>
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

              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 0 0" }}>
                Edit activity
              </h1>

              <p style={{ fontSize: 13, color: "#9ca3af", margin: "6px 0 0 0" }}>
                Fields marked with{" "}
                <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span> are required.
              </p>
            </div>
          </div>
        </header>

        {error ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>
            {error}
          </p>
        ) : null}
        {info ? (
          <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#86efac" }}>
            {info}
          </p>
        ) : null}

        <section
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.35)",
            background:
              "radial-gradient(circle at top left, #020617, #020617 50%, #000000 100%)",
            padding: "14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <label style={labelStyle}>
            Title <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="e.g., Run club"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading || busy}
            />
          </label>

          <label style={labelStyle}>
            Sport <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="e.g., Running, Cycling, Functional..."
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              disabled={loading || busy}
            />
          </label>

          {/* Date & Time (same as /new) BUT with visible button */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ ...labelStyle, marginBottom: 0 }}>
              Date &amp; Time <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>{" "}
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                (add multiple dates if this is recurring)
              </span>
            </p>

            {dates.map((d, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Visible "picker button" */}
                <button
                  type="button"
                  onClick={() => openNativePicker(idx)}
                  disabled={loading || busy}
                  style={{
                    ...pickButtonStyle,
                    flex: "1 1 260px",
                    justifyContent: "space-between",
                  }}
                  aria-label="Pick date and time"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>📅</span>
                    <span style={{ fontSize: 13, fontWeight: 900 }}>
                      {formatDatePreview(d)}
                    </span>
                  </span>
                  <span style={{ fontSize: 12, color: "#93c5fd", fontWeight: 900 }}>
                    Pick
                  </span>
                </button>

                {/* Hidden native input (we open it via showPicker) */}
                <input
                  ref={(el) => {
                    dateInputRefs.current[idx] = el;
                  }}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: 1,
                    height: 1,
                    pointerEvents: "none",
                  }}
                  type="datetime-local"
                  value={d}
                  onChange={(e) => updateDateAt(idx, e.target.value)}
                  tabIndex={-1}
                />

                <button
                  type="button"
                  onClick={() => removeDate(idx)}
                  disabled={dates.length <= 1 || loading || busy}
                  style={{
                    fontSize: 12,
                    padding: "10px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(2,6,23,0.65)",
                    color: "#e5e7eb",
                    fontWeight: 800,
                    cursor:
                      dates.length <= 1 || loading || busy ? "not-allowed" : "pointer",
                    opacity: dates.length <= 1 || loading || busy ? 0.6 : 1,
                    whiteSpace: "nowrap",
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
                disabled={loading || busy}
                style={{
                  fontSize: 12,
                  padding: "10px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.55)",
                  background:
                    "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                  color: "#e0f2fe",
                  fontWeight: 900,
                  cursor: loading || busy ? "not-allowed" : "pointer",
                  opacity: loading || busy ? 0.75 : 1,
                }}
              >
                + Add another date
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Save will update this activity with the first date and <b>create new activities</b>{" "}
              for additional dates.
            </p>
          </div>

          <label style={labelStyle}>
            Address <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <input
              style={inputStyle}
              placeholder="e.g., 3516 President Barack Obama Pkwy"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              disabled={loading || busy}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ ...labelStyle, flex: "1 1 220px", minWidth: 220 }}>
              City <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input
                style={inputStyle}
                placeholder="e.g., Orlando"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading || busy}
              />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 140px", minWidth: 140 }}>
              State <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input
                style={inputStyle}
                placeholder="e.g., FL"
                value={stateUS}
                onChange={(e) => setStateUS(e.target.value)}
                disabled={loading || busy}
              />
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
                disabled={loading || busy}
              />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 180 }}>
              Waitlist (optional)
              <input
                style={inputStyle}
                inputMode="numeric"
                placeholder="e.g., 10"
                value={waitlist}
                onChange={(e) => setWaitlist(e.target.value)}
                disabled={loading || busy}
              />
            </label>

            <label style={{ ...labelStyle, flex: "1 1 180px", minWidth: 180 }}>
              Price (USD) <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
              <input
                style={inputStyle}
                inputMode="decimal"
                placeholder="e.g., 15.00 (0 = Free)"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                disabled={loading || busy}
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
              disabled={loading || busy}
            />
          </label>

          <label style={labelStyle}>
            Description <span style={{ color: "#93c5fd", fontWeight: 700 }}>*</span>
            <textarea
              style={{ ...inputStyle, minHeight: 130, resize: "vertical" }}
              placeholder={descriptionSuggestion}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading || busy}
            />
          </label>

          <label style={labelStyle}>
            Image (optional)
            <input
              style={inputStyle}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              disabled={loading || busy}
            />
            <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
              Tip: upload a horizontal image. Leave empty to keep current image.
            </span>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <p style={{ fontSize: 12, color: "#60a5fa", margin: 0 }}>
              {activity?.capacity == null
                ? "Capacity is unlimited (because capacity is empty)."
                : "Capacity is limited (because capacity has a number)."}
            </p>

            <button
              onClick={handleSave}
              disabled={busy || loading}
              style={{
                fontSize: 12,
                padding: "10px 12px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.55)",
                background:
                  "linear-gradient(135deg, rgba(8,47,73,0.95), rgba(12,74,110,0.95))",
                color: "#e0f2fe",
                cursor: busy ? "not-allowed" : "pointer",
                fontWeight: 800,
                opacity: busy ? 0.8 : 1,
              }}
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
