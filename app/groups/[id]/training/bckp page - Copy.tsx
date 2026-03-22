// app/groups/[id]/training/page.tsx
"use client";

import Link from "next/link";
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
  is_public: boolean;
  created_by: string;
};

type TrainingRow = {
  id: string;
  group_id: string;
  created_by: string;
  title: string | null;
  content: string | null;
  is_published: boolean | null;
  schedule_type: "weekly" | "daily";
  training_date: string | null; // yyyy-mm-dd
  week_start_date: string | null; // yyyy-mm-dd
  created_at: string;
};

function fmtDateShort(d: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtWeekLabel(weekStart: string | null) {
  if (!weekStart) return "Weekly";
  return `Week of ${fmtDateShort(weekStart)}`;
}

export default function GroupTrainingPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingMember, setCheckingMember] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [group, setGroup] = useState<GroupRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const pillStyle = useMemo(
    () => ({
      fontSize: 11,
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(148,163,184,0.22)",
      background: "rgba(148,163,184,0.10)",
      color: "#cbd5e1",
      fontWeight: 900 as const,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap" as const,
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
        const returnTo = `/groups/${groupId}/training`;
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
        .select("id,name,goal,is_public,created_by")
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

  // ✅ Require ACTIVE membership to access trainings
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

      if (error) {
        router.replace(`/groups/${groupId}`);
        return;
      }

      if (!memberRow || memberRow.status !== "active") {
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

  // Load trainings
  useEffect(() => {
    let cancelled = false;

    async function loadTrainings() {
      if (!groupId) return;
      if (checkingAuth || checkingMember) return;

      setLoading(true);
      setErrorMsg(null);

      // pega publicados (se você quiser rascunho depois, a gente muda)
      const { data, error } = await supabaseBrowser
        .from("app_group_trainings")
        .select(
          "id,group_id,created_by,title,content,is_published,schedule_type,training_date,week_start_date,created_at"
        )
        .eq("group_id", groupId)
        .eq("is_published", true)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (error) {
        setErrorMsg(error.message);
        setTrainings([]);
        setLoading(false);
        return;
      }

      setTrainings((data ?? []) as TrainingRow[]);
      setLoading(false);
    }

    loadTrainings();

    return () => {
      cancelled = true;
    };
  }, [groupId, checkingAuth, checkingMember]);

  const weekly = useMemo(
  () =>
    trainings
      .filter((t) => t.schedule_type === "weekly")
      .sort((a, b) => {
        const da = a.week_start_date ?? "";
        const db = b.week_start_date ?? "";
        if (da !== db) return da.localeCompare(db); // ✅ ASC (Week 1 first)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }),
  [trainings]
);

  const daily = useMemo(
  () =>
    trainings
      .filter((t) => t.schedule_type === "daily")
      .sort((a, b) => {
        const da = a.training_date ?? "";
        const db = b.training_date ?? "";
        if (da !== db) return da.localeCompare(db); // ✅ ASC
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }),
  [trainings]
);

  const isOwner = useMemo(() => {
    if (!group || !userId) return false;
    return group.created_by === userId;
  }, [group, userId]);

  if (checkingAuth || checkingMember) return null;

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

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Training</h1>
              {group?.name ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Group: <span style={{ color: "#e5e7eb", fontWeight: 800 }}>{group.name}</span>
                </p>
              ) : null}
            </div>

            {isOwner ? (
              <Link
                href={`/groups/${groupId}/training/new`}
                style={{
                  fontSize: 12,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.35)",
                  background: "rgba(2,132,199,0.12)",
                  color: "#e0f2fe",
                  textDecoration: "none",
                  fontWeight: 900,
                  height: "fit-content",
                }}
              >
                Create Training
              </Link>
            ) : null}
          </div>

          <div style={{ height: 12 }} />

          {loading ? (
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Loading...</p>
            </div>
          ) : errorMsg ? (
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: 13, color: "#fca5a5" }}>{errorMsg}</p>
            </div>
          ) : trainings.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                No trainings yet.
              </p>
            </div>
          ) : (
            <>
              {/* WEEKLY */}
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#e5e7eb" }}>Weekly</div>
                <div style={{ height: 1, flex: 1, background: "rgba(148,163,184,0.18)" }} />
              </div>

              {weekly.length === 0 ? (
                <div style={{ ...cardStyle, marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No weekly plans yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  {weekly.map((t) => (
                    <div key={t.id} style={cardStyle}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>
                            {t.title?.trim() || "Weekly Training"}
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={pillStyle}>📅 {fmtWeekLabel(t.week_start_date)}</span>
                            <span style={pillStyle}>🕒 {new Date(t.created_at).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 10 }} />

                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: "#e5e7eb",
                        }}
                      >
                        {(t.content ?? "").trim() || "No content."}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DAILY */}
              <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#e5e7eb" }}>Daily</div>
                <div style={{ height: 1, flex: 1, background: "rgba(148,163,184,0.18)" }} />
              </div>

              {daily.length === 0 ? (
                <div style={cardStyle}>
                  <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No daily sessions yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {daily.map((t) => (
                    <div key={t.id} style={cardStyle}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>
                            {t.title?.trim() || "Daily Training"}
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={pillStyle}>📅 {fmtDateShort(t.training_date) || "Daily"}</span>
                            <span style={pillStyle}>🕒 {new Date(t.created_at).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ height: 10 }} />

                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: "#e5e7eb",
                        }}
                      >
                        {(t.content ?? "").trim() || "No content."}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
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