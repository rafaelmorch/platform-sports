// app/groups/[id]/training/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
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
  week_start: string; // YYYY-MM-DD
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

// returns Monday of the week for given date
function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDateShort(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return d;
  }
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

  // schedule
  const [scheduleType] = useState<"weekly">("weekly");
  const [weekStart, setWeekStart] = useState<string>(() =>
    toISODate(mondayOf(new Date()))
  );

  // multi-week
  const [weeksCount, setWeeksCount] = useState<number>(4);

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

  const cardStyle = useMemo(
    () => ({
      borderRadius: 18,
      border: "1px solid rgba(56,189,248,0.15)",
      background: "linear-gradient(160deg, rgba(2,6,23,0.98), rgba(0,0,0,1))",
      boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
      padding: 14,
    }),
    []
  );

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      borderRadius: 14,
      border: "1px solid rgba(148,163,184,0.22)",
      background: "rgba(2,6,23,0.70)",
      color: "#e5e7eb",
      padding: "10px 12px",
      outline: "none",
      fontSize: 13,
    }),
    []
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

    const n = clampInt(weeksCount, 1, 24);
    setWeeksCount(n);

    setAiLoading(true);
    try {
      const resp = await fetch("/api/ai/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          groupName: group.name,
          groupGoal: group.goal ?? "",
          scheduleType,
          weekStart,
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
        // backend may return 200 with error + raw
        setAiError(data.error);
        setAiLoading(false);
        return;
      }

      const weeks = Array.isArray(data?.weeks) ? (data.weeks as WeekDraft[]) : [];
      if (!weeks.length) {
        setAiError("AI returned empty weeks.");
        setAiLoading(false);
        return;
      }

      const cleaned = weeks
        .map((w) => ({
          week_start: String(w.week_start ?? "").trim(),
          title: String(w.title ?? "").trim(),
          content: String(w.content ?? "").trim(),
        }))
        .filter((w) => w.week_start && w.title && w.content);

      if (cleaned.length !== weeks.length) {
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
    if (!weeksDraft.length) {
      setPublishError("Generate weeks first.");
      return;
    }

    setPublishing(true);

    try {
      // bulk insert one row per week (weekly)
      const rows = weeksDraft.map((w) => ({
        group_id: groupId,
        created_by: userId,
        title: w.title,
        content: w.content,
        is_published: true,
        schedule_type: "weekly",
        week_start_date: w.week_start, // must satisfy constraint
        training_date: null,
      }));

      const { error } = await supabaseBrowser.from("app_group_trainings").insert(rows);

      if (error) {
        setPublishError(error.message);
        setPublishing(false);
        return;
      }

      // go back to training list
      router.replace(`/groups/${groupId}/training`);
    } catch (e: any) {
      setPublishError(e?.message ?? "Publish error.");
      setPublishing(false);
    }
  }

  // Avoid flicker while redirecting
  if (checkingAuth || checkingMember || checkingOwner) return null;

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#e5e7eb",
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
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
              Group: <span style={{ color: "#e5e7eb", fontWeight: 800 }}>{group.name}</span>
            </p>
          ) : null}

          <div style={{ height: 12 }} />

          {/* Schedule card */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>Schedule</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Type</div>
                <div
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: 0.95,
                  }}
                >
                  <span style={{ fontWeight: 900 }}>Weekly</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>cards per week</span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Week start (Monday)</div>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ height: 10 }} />

            <div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Number of weeks</div>
              <input
                type="number"
                min={1}
                max={24}
                value={weeksCount}
                onChange={(e) => setWeeksCount(clampInt(e.target.value, 1, 24))}
                style={inputStyle}
              />
              <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
                Weekly plan starting <span style={{ color: "#e5e7eb", fontWeight: 800 }}>{fmtDateShort(weekStart)}</span>.
              </div>
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* AI prompt card */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>AI Prompt (Draft Generator)</div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the athletes and the goal. Example: Beginners, can barely run 5K, goal is consistency + 5K improvement..."
              style={{
                ...inputStyle,
                minHeight: 110,
                resize: "vertical",
                lineHeight: 1.4,
              }}
            />

            {aiError ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5", fontWeight: 800 }}>
                {aiError}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
                You will review & edit before publishing.
              </div>
            )}

            <button
              onClick={generateWithAI}
              disabled={aiLoading}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.22)",
                background: aiLoading
                  ? "rgba(148,163,184,0.10)"
                  : "linear-gradient(90deg, rgba(255, 200, 0, 0.18), rgba(255, 70, 0, 0.14))",
                color: aiLoading ? "#94a3b8" : "#fde68a",
                fontWeight: 900,
                cursor: aiLoading ? "not-allowed" : "pointer",
              }}
            >
              {aiLoading ? "Generating..." : "Generate with AI"}
            </button>
          </div>

          <div style={{ height: 12 }} />

          {/* Weeks list + editor */}
          <div style={cardStyle}>
            <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>Weeks</div>

            {weeksDraft.length === 0 ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                No draft yet. Generate with AI to create weekly cards.
              </div>
            ) : (
              <>
                {/* week selector */}
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
                      key={`${w.week_start}-${i}`}
                      onClick={() => setSelectedIndex(i)}
                      style={{
                        flex: "0 0 auto",
                        padding: "8px 10px",
                        borderRadius: 999,
                        border:
                          i === selectedIndex
                            ? "1px solid rgba(56,189,248,0.45)"
                            : "1px solid rgba(148,163,184,0.22)",
                        background:
                          i === selectedIndex
                            ? "rgba(2,132,199,0.16)"
                            : "rgba(148,163,184,0.10)",
                        color: i === selectedIndex ? "#e0f2fe" : "#cbd5e1",
                        fontWeight: 900,
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {`Week ${i + 1} • ${fmtDateShort(w.week_start)}`}
                    </button>
                  ))}
                </div>

                {/* editor (edits ONLY selected week, and then syncs back into weeksDraft) */}
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Title</div>
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
                      placeholder="e.g. Week Plan — Base + Speed"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>Content</div>
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
                      placeholder="Write the training here..."
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
              <div style={{ marginBottom: 10, fontSize: 12, color: "#fca5a5", fontWeight: 800 }}>
                {publishError}
              </div>
            ) : null}

            <button
              onClick={publishAllWeeks}
              disabled={publishing || weeksDraft.length === 0}
              style={{
                width: "100%",
                padding: "14px 14px",
                borderRadius: 14,
                border: "1px solid rgba(56,189,248,0.25)",
                background:
                  publishing || weeksDraft.length === 0
                    ? "rgba(148,163,184,0.10)"
                    : "rgba(2,132,199,0.14)",
                color: publishing || weeksDraft.length === 0 ? "#94a3b8" : "#e0f2fe",
                fontWeight: 900,
                cursor: publishing || weeksDraft.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {publishing ? "Publishing..." : `Publish ${weeksDraft.length || ""} Training Cards`}
            </button>

            <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
              This will create one weekly training card per week.
            </div>
          </div>
        </div>
      </main>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#000",
          borderTop: "1px solid rgba(148,163,184,0.25)",
        }}
      >
        <BottomNavbar />
      </div>
    </>
  );
}