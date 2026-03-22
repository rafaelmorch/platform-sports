// app/groups/[id]/training/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
// import BottomNavbar from "@/components/BottomNavbar";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type GroupRow = {
  id: string;
  name: string;
  goal: string | null;
  created_by: string;
};

type WeekDraft = {
  weekIndex: number; // 1..N (UI)
  title: string;
  content: string;
};

function clampInt(n: any, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Monday of current week (internal only)
function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDaysISO(isoYYYYMMDD: string, days: number) {
  const [y, m, d] = isoYYYYMMDD.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  dt.setHours(0, 0, 0, 0);
  return toISODate(dt);
}

export default function CreateTrainingPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingMember, setCheckingMember] = useState(true);
  const [checkingOwner, setCheckingOwner] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);

  // Weekly only (internal schedule)
  const scheduleType: "weekly" = "weekly";
  const [weekStart] = useState<string>(() => toISODate(mondayOf(new Date()))); // internal only (not shown)

  // ✅ Number of weeks MUST start empty
  const [weeksCountStr, setWeeksCountStr] = useState<string>("");

  // AI + editor
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [weeksDraft, setWeeksDraft] = useState<WeekDraft[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // ===== Light gray theme styles =====
  const pageBg = "#f3f4f6"; // light gray
  const textMain = "#0f172a"; // near-black
  const textSub = "rgba(15,23,42,0.65)";

  const cardStyle = useMemo(
    () => ({
      borderRadius: 16,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "#e5e7eb",
      boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
      padding: 14,
    }),
    []
  );

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.16)",
      background: "#f9fafb",
      color: textMain,
      padding: "10px 12px",
      outline: "none",
      fontSize: 13,
    }),
    [textMain]
  );

  const buttonPrimary = useMemo(
    () => ({
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "#111827",
      color: "#ffffff",
      fontWeight: 900 as const,
      cursor: "pointer",
    }),
    []
  );

  const buttonGhost = useMemo(
    () => ({
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.16)",
      background: "#f9fafb",
      color: textMain,
      fontWeight: 900 as const,
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    }),
    [textMain]
  );

  // ✅ Require login
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      setCheckingAuth(true);

      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;

      if (cancelled) return;

      if (!session) {
        const returnTo = `/groups/${groupId}/training/new`;
        try {
          localStorage.setItem("ps:returnTo", returnTo);
        } catch {}
        router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
        return;
      }

      setUserId(session.user.id);
      setCheckingAuth(false);
    }

    if (groupId) checkAuth();

    return () => {
      cancelled = true;
    };
  }, [groupId, router]);

  // Load group
  useEffect(() => {
    let cancelled = false;

    async function loadGroup() {
      if (!groupId) return;
      if (checkingAuth) return;

      const { data: gData, error: gErr } = await supabaseBrowser
        .from("app_groups")
        .select("id,name,goal,created_by")
        .eq("id", groupId)
        .maybeSingle();

      if (cancelled) return;

      if (gErr || !gData) {
        router.replace("/groups");
        return;
      }

      setGroup(gData as GroupRow);
    }

    loadGroup();

    return () => {
      cancelled = true;
    };
  }, [groupId, checkingAuth, router]);

  // ✅ Require ACTIVE membership
  useEffect(() => {
    let cancelled = false;

    async function checkMember() {
      if (!groupId || !userId) return;

      setCheckingMember(true);

      const { data: memberRow, error } = await supabaseBrowser
        .from("app_group_members")
        .select("status")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !memberRow || memberRow.status !== "active") {
        router.replace(`/groups/${groupId}`);
        return;
      }

      setCheckingMember(false);
    }

    checkMember();

    return () => {
      cancelled = true;
    };
  }, [groupId, userId, router]);

  // ✅ Owner-only page
  useEffect(() => {
    let cancelled = false;

    async function checkOwner() {
      if (!group || !userId) return;

      setCheckingOwner(true);

      if (group.created_by !== userId) {
        router.replace(`/groups/${groupId}/training`);
        return;
      }

      if (cancelled) return;
      setCheckingOwner(false);
    }

    checkOwner();

    return () => {
      cancelled = true;
    };
  }, [group, userId, groupId, router]);

  // sync selected draft into editor
  useEffect(() => {
    if (!weeksDraft.length) return;
    const idx = Math.max(0, Math.min(selectedIndex, weeksDraft.length - 1));
    const w = weeksDraft[idx];
    setSelectedIndex(idx);
    setTitle(w.title);
    setContent(w.content);
  }, [weeksDraft, selectedIndex]);

  function parseWeeksCountOrError(): number | null {
    const raw = weeksCountStr.trim();
    if (!raw) {
      setAiError("Please fill Number of weeks (max 24).");
      return null;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setAiError("Number of weeks must be a valid number (1 to 24).");
      return null;
    }
    const n = clampInt(parsed, 1, 24);
    return n;
  }

  async function generateWithAI() {
    setAiError(null);
    setPublishError(null);

    const p = prompt.trim();
    if (!p) {
      setAiError("Please write a prompt.");
      return;
    }

    if (!group) {
      setAiError("Group not loaded yet.");
      return;
    }

    const n = parseWeeksCountOrError();
    if (!n) return;

    setAiLoading(true);
    try {
      const resp = await fetch("/api/ai/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          groupName: group.name,
          groupGoal: group.goal ?? "",
          scheduleType, // weekly only
          weekStart, // internal only
          weeksCount: n,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setAiError(data?.error || "AI error.");
        setAiLoading(false);
        return;
      }

      if (data?.error) {
        setAiError(data.error);
        setAiLoading(false);
        return;
      }

      // Expect: { weeks: [{ title, content }, ...] }
      const weeks = Array.isArray(data?.weeks) ? (data.weeks as any[]) : [];
      if (!weeks.length) {
        setAiError("AI returned empty weeks.");
        setAiLoading(false);
        return;
      }

      const cleaned: WeekDraft[] = weeks
        .slice(0, n)
        .map((w, i) => ({
          weekIndex: i + 1,
          title: String(w?.title ?? "").trim(),
          content: String(w?.content ?? "").trim(),
        }))
        .filter((w) => w.title && w.content);

      if (cleaned.length !== Math.min(weeks.length, n)) {
        setAiError("AI returned incomplete weeks. Try again.");
        setAiLoading(false);
        return;
      }

      setWeeksDraft(cleaned);
      setSelectedIndex(0);
      setAiLoading(false);
    } catch (e: any) {
      setAiError(e?.message ?? "AI error.");
      setAiLoading(false);
    }
  }

  async function publishAllWeeks() {
    setPublishError(null);
    setAiError(null);

    if (!groupId || !userId) return;

    // ✅ Must not allow publish if Number of weeks is empty
    const n = parseWeeksCountOrError();
    if (!n) return;

    if (!weeksDraft.length) {
      setPublishError("Generate weeks first.");
      return;
    }

    setPublishing(true);

    try {
      // ✅ Delete ALL previous weekly trainings for this group first
      const del = await supabaseBrowser
        .from("app_group_trainings")
        .delete()
        .eq("group_id", groupId)
        .eq("schedule_type", "weekly");

      if (del.error) {
        setPublishError(del.error.message);
        setPublishing(false);
        return;
      }

      // ✅ Insert weeks in Week 1..N order
      const baseWeekStart = weekStart; // Monday ISO
      const rows = weeksDraft.slice(0, n).map((w, i) => ({
        group_id: groupId,
        created_by: userId,
        title: w.title,
        content: w.content,
        is_published: true,
        schedule_type: "weekly",
        week_start_date: addDaysISO(baseWeekStart, 7 * i), // internal ordering (not shown)
        training_date: null,
      }));

      const ins = await supabaseBrowser.from("app_group_trainings").insert(rows);

      if (ins.error) {
        setPublishError(ins.error.message);
        setPublishing(false);
        return;
      }

      router.replace(`/groups/${groupId}/training`);
    } catch (e: any) {
      setPublishError(e?.message ?? "Publish error.");
      setPublishing(false);
    }
  }

  if (checkingAuth || checkingMember || checkingOwner) return null;

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: pageBg,
          color: textMain,
          padding: "16px",
          paddingBottom: "120px",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 10 }}>
            <BackArrow />
          </div>

          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Create Training</h1>
          {group?.name ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: textSub }}>
              Group: <span style={{ color: textMain, fontWeight: 900 }}>{group.name}</span>
            </p>
          ) : null}

          <div style={{ height: 12 }} />

          {/* Weekly-only + Number of weeks */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>Schedule</div>

            <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 10 }}>
              Weekly
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: textSub }}>
                (One card per week)
              </span>
            </div>

            <div>
              <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>Number of weeks</div>

              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={weeksCountStr}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setWeeksCountStr(v);
                }}
                placeholder="Max 24 weeks"
                style={inputStyle}
              />

              <div style={{ marginTop: 6, fontSize: 11, color: textSub }}>
                Max: <span style={{ color: textMain, fontWeight: 900 }}>24</span> weeks.
              </div>

              {/* inline alert only when user tries and fails (aiError already shows) */}
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* AI prompt */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>AI Prompt</div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the athletes and the goal. Example: Beginners, run/walk, goal is 5K consistency..."
              style={{
                ...inputStyle,
                minHeight: 110,
                resize: "vertical",
                lineHeight: 1.4,
              }}
            />

            {aiError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#b91c1c", fontWeight: 900 }}>
                {aiError}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 11, color: textSub }}>
                Generate drafts, then review before publishing.
              </div>
            )}

            <button
              onClick={generateWithAI}
              disabled={aiLoading}
              style={{
                ...buttonPrimary,
                marginTop: 10,
                opacity: aiLoading ? 0.6 : 1,
                cursor: aiLoading ? "not-allowed" : "pointer",
              }}
            >
              {aiLoading ? "Generating..." : "Generate with AI"}
            </button>
          </div>

          <div style={{ height: 12 }} />

          {/* Weeks + editor */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>Weeks</div>

            {weeksDraft.length === 0 ? (
              <div style={{ fontSize: 13, color: textSub }}>No draft yet. Generate with AI to create weekly cards.</div>
            ) : (
              <>
                {/* Week selector: Week 1 / Week 2 ... (NO DATES) */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    overflowX: "auto",
                    paddingBottom: 6,
                    marginBottom: 12,
                  }}
                >
                  {weeksDraft.map((w, i) => (
                    <button
                      key={`week-${i}`}
                      onClick={() => setSelectedIndex(i)}
                      style={{
                        ...buttonGhost,
                        border:
                          i === selectedIndex
                            ? "1px solid rgba(17,24,39,0.55)"
                            : "1px solid rgba(15,23,42,0.16)",
                        background: i === selectedIndex ? "#111827" : "#f9fafb",
                        color: i === selectedIndex ? "#ffffff" : textMain,
                      }}
                    >
                      {`Week ${w.weekIndex}`}
                    </button>
                  ))}
                </div>

                {/* Editor */}
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>Title</div>
                    <input
                      value={title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTitle(v);
                        setWeeksDraft((prev) => {
                          const next = [...prev];
                          next[selectedIndex] = { ...next[selectedIndex], title: v };
                          return next;
                        });
                      }}
                      placeholder={`e.g. Week ${weeksDraft[selectedIndex]?.weekIndex ?? 1} — Base + Technique`}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>Content</div>
                    <textarea
                      value={content}
                      onChange={(e) => {
                        const v = e.target.value;
                        setContent(v);
                        setWeeksDraft((prev) => {
                          const next = [...prev];
                          next[selectedIndex] = { ...next[selectedIndex], content: v };
                          return next;
                        });
                      }}
                      placeholder="Write the weekly plan here..."
                      style={{
                        ...inputStyle,
                        minHeight: 220,
                        resize: "vertical",
                        lineHeight: 1.45,
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ height: 12 }} />

          {/* Publish */}
          <div style={cardStyle}>
            {publishError ? (
              <div style={{ marginBottom: 10, fontSize: 12, color: "#b91c1c", fontWeight: 900 }}>
                {publishError}
              </div>
            ) : null}

            <button
              onClick={publishAllWeeks}
              disabled={publishing || weeksDraft.length === 0}
              style={{
                ...buttonPrimary,
                opacity: publishing || weeksDraft.length === 0 ? 0.6 : 1,
                cursor: publishing || weeksDraft.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {publishing ? "Publishing..." : `Publish ${weeksDraft.length || ""} Weeks`}
            </button>

            <div style={{ marginTop: 8, fontSize: 11, color: textSub }}>
              This will delete the previous plan and publish one card per week.
            </div>
          </div>
        </div>
      </main>
{/*
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: pageBg,
          borderTop: "1px solid rgba(15,23,42,0.10)",
        }}
      >
        <BottomNavbar />
      </div>
*/}
    </>
  );
}