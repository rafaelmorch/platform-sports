// app/groups/[id]/training/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  training_date: string | null;
  week_start_date: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  training_id: string;
  group_id: string;
  user_id: string;
  comment: string;
  created_at: string;
};

type ReactionRow = {
  id: string;
  training_id: string;
  group_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

type CompletionRow = {
  id: string;
  training_id: string;
  group_id: string;
  user_id: string;
  completed_at: string;
};

type WeeklyTrainingView = TrainingRow & {
  weekLabel: string;
};

const REACTIONS = ["🔥", "👏", "💪", "🙌"];

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

  const [showInteractions, setShowInteractions] = useState(false);

  const [commentsByTraining, setCommentsByTraining] = useState<Record<string, CommentRow[]>>({});
  const [reactionsByTraining, setReactionsByTraining] = useState<Record<string, ReactionRow[]>>({});
  const [completionsByTraining, setCompletionsByTraining] = useState<Record<string, CompletionRow[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingForTraining, setSendingForTraining] = useState<Record<string, boolean>>({});

  const pageBg = "#f3f4f6";
  const textMain = "#0f172a";
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

  const createBtnStyle = useMemo(
    () => ({
      fontSize: 12,
      padding: "10px 14px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "linear-gradient(180deg, rgba(239,68,68,0.95), rgba(220,38,38,0.92))",
      color: "#ffffff",
      textDecoration: "none",
      fontWeight: 900,
      height: "fit-content",
      boxShadow: "0 10px 24px rgba(220,38,38,0.18)",
      transform: "translateZ(0)",
      whiteSpace: "nowrap" as const,
    }),
    []
  );

  const editBtnStyle = useMemo(
    () => ({
      fontSize: 12,
      padding: "10px 14px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "#111827",
      color: "#ffffff",
      textDecoration: "none",
      fontWeight: 900,
      height: "fit-content",
      boxShadow: "0 10px 20px rgba(15,23,42,0.10)",
      whiteSpace: "nowrap" as const,
    }),
    []
  );

  const toggleBtnStyle = useMemo(
    () => ({
      fontSize: 12,
      padding: "10px 14px",
      borderRadius: 999,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "#ffffff",
      color: "#111827",
      textDecoration: "none",
      fontWeight: 900,
      height: "fit-content",
      boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
      whiteSpace: "nowrap" as const,
      cursor: "pointer",
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

  useEffect(() => {
    let cancelled = false;

    async function loadTrainings() {
      if (!groupId) return;
      if (checkingAuth || checkingMember) return;

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabaseBrowser
        .from("app_group_trainings")
        .select("id,group_id,created_by,title,content,is_published,schedule_type,training_date,week_start_date,created_at")
        .eq("group_id", groupId)
        .eq("is_published", true)
        .eq("schedule_type", "weekly")
        .order("week_start_date", { ascending: true })
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

  useEffect(() => {
    let cancelled = false;

    async function loadInteractionData() {
      if (!showInteractions) return;
      if (!groupId) return;
      if (checkingAuth || checkingMember) return;
      if (trainings.length === 0) return;

      const trainingIds = trainings.map((t) => t.id);

      const [commentsRes, reactionsRes, completionsRes] = await Promise.all([
        supabaseBrowser
          .from("app_training_comments")
          .select("id,training_id,group_id,user_id,comment,created_at")
          .eq("group_id", groupId)
          .in("training_id", trainingIds)
          .order("created_at", { ascending: true }),
        supabaseBrowser
          .from("app_training_reactions")
          .select("id,training_id,group_id,user_id,reaction,created_at")
          .eq("group_id", groupId)
          .in("training_id", trainingIds),
        supabaseBrowser
          .from("app_training_completions")
          .select("id,training_id,group_id,user_id,completed_at")
          .eq("group_id", groupId)
          .in("training_id", trainingIds),
      ]);

      if (cancelled) return;

      const commentsMap: Record<string, CommentRow[]> = {};
      (commentsRes.data ?? []).forEach((c: any) => {
        if (!commentsMap[c.training_id]) commentsMap[c.training_id] = [];
        commentsMap[c.training_id].push(c as CommentRow);
      });

      const reactionsMap: Record<string, ReactionRow[]> = {};
      (reactionsRes.data ?? []).forEach((r: any) => {
        if (!reactionsMap[r.training_id]) reactionsMap[r.training_id] = [];
        reactionsMap[r.training_id].push(r as ReactionRow);
      });

      const completionsMap: Record<string, CompletionRow[]> = {};
      (completionsRes.data ?? []).forEach((c: any) => {
        if (!completionsMap[c.training_id]) completionsMap[c.training_id] = [];
        completionsMap[c.training_id].push(c as CompletionRow);
      });

      setCommentsByTraining(commentsMap);
      setReactionsByTraining(reactionsMap);
      setCompletionsByTraining(completionsMap);
    }

    loadInteractionData();

    return () => {
      cancelled = true;
    };
  }, [showInteractions, groupId, checkingAuth, checkingMember, trainings]);

  const isOwner = useMemo(() => {
    if (!group || !userId) return false;
    return group.created_by === userId;
  }, [group, userId]);

  const weekly: WeeklyTrainingView[] = useMemo(() => {
    const rows = trainings
      .filter((t) => t.schedule_type === "weekly")
      .sort((a, b) => {
        const da = a.week_start_date ?? "";
        const db = b.week_start_date ?? "";
        if (da !== db) return da.localeCompare(db);
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

    return rows.map((t, idx) => ({
      ...t,
      weekLabel: `Week ${idx + 1}`,
    }));
  }, [trainings]);

  function getReactionCount(trainingId: string) {
    return reactionsByTraining[trainingId]?.length ?? 0;
  }

  function getCommentCount(trainingId: string) {
    return commentsByTraining[trainingId]?.length ?? 0;
  }

  function getCompletionCount(trainingId: string) {
    return completionsByTraining[trainingId]?.length ?? 0;
  }

  function hasUserCompleted(trainingId: string) {
    return Boolean(
      completionsByTraining[trainingId]?.some((c) => c.user_id === userId)
    );
  }

  function hasUserReaction(trainingId: string, reaction: string) {
    return Boolean(
      reactionsByTraining[trainingId]?.some(
        (r) => r.user_id === userId && r.reaction === reaction
      )
    );
  }

  async function toggleCompletion(trainingId: string) {
    if (!userId) return;

    const existing = completionsByTraining[trainingId]?.find((c) => c.user_id === userId);

    if (existing) {
      const { error } = await supabaseBrowser
        .from("app_training_completions")
        .delete()
        .eq("id", existing.id);

      if (error) return;

      setCompletionsByTraining((prev) => ({
        ...prev,
        [trainingId]: (prev[trainingId] ?? []).filter((c) => c.id !== existing.id),
      }));
      return;
    }

    const { data, error } = await supabaseBrowser
      .from("app_training_completions")
      .insert({
        training_id: trainingId,
        group_id: groupId,
        user_id: userId,
      })
      .select("id,training_id,group_id,user_id,completed_at")
      .single();

    if (error || !data) return;

    setCompletionsByTraining((prev) => ({
      ...prev,
      [trainingId]: [...(prev[trainingId] ?? []), data as CompletionRow],
    }));
  }

  async function toggleReaction(trainingId: string, reaction: string) {
    if (!userId) return;

    const existing = reactionsByTraining[trainingId]?.find(
      (r) => r.user_id === userId && r.reaction === reaction
    );

    if (existing) {
      const { error } = await supabaseBrowser
        .from("app_training_reactions")
        .delete()
        .eq("id", existing.id);

      if (error) return;

      setReactionsByTraining((prev) => ({
        ...prev,
        [trainingId]: (prev[trainingId] ?? []).filter((r) => r.id !== existing.id),
      }));
      return;
    }

    const { data, error } = await supabaseBrowser
      .from("app_training_reactions")
      .insert({
        training_id: trainingId,
        group_id: groupId,
        user_id: userId,
        reaction,
      })
      .select("id,training_id,group_id,user_id,reaction,created_at")
      .single();

    if (error || !data) return;

    setReactionsByTraining((prev) => ({
      ...prev,
      [trainingId]: [...(prev[trainingId] ?? []), data as ReactionRow],
    }));
  }

  async function addComment(trainingId: string) {
    const text = (commentDrafts[trainingId] ?? "").trim();
    if (!text || !userId) return;

    setSendingForTraining((prev) => ({ ...prev, [trainingId]: true }));

    const { data, error } = await supabaseBrowser
      .from("app_training_comments")
      .insert({
        training_id: trainingId,
        group_id: groupId,
        user_id: userId,
        comment: text,
      })
      .select("id,training_id,group_id,user_id,comment,created_at")
      .single();

    if (error || !data) {
      setSendingForTraining((prev) => ({ ...prev, [trainingId]: false }));
      return;
    }

    setCommentsByTraining((prev) => ({
      ...prev,
      [trainingId]: [...(prev[trainingId] ?? []), data as CommentRow],
    }));

    setCommentDrafts((prev) => ({ ...prev, [trainingId]: "" }));
    setSendingForTraining((prev) => ({ ...prev, [trainingId]: false }));
  }

  if (checkingAuth || checkingMember) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        color: textMain,
        padding: "16px",
        paddingBottom: "40px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <BackArrow />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              Training
            </h1>
            {group?.name ? (
              <p style={{ margin: "6px 0 0 0", fontSize: 12, color: textSub }}>
                Group: <span style={{ color: textMain, fontWeight: 900 }}>{group.name}</span>
              </p>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setShowInteractions((prev) => !prev)}
              style={toggleBtnStyle}
            >
              {showInteractions ? "Hide Interactions" : "Show Interactions"}
            </button>

            {isOwner ? (
              <>
                <Link href={`/groups/${groupId}/training/new`} style={createBtnStyle}>
                  Create Training
                </Link>
                <Link href={`/groups/${groupId}/training/edit`} style={editBtnStyle}>
                  Edit Training
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ height: 12 }} />

        {loading ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: textSub }}>Loading...</p>
          </div>
        ) : errorMsg ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 900 }}>
              {errorMsg}
            </p>
          </div>
        ) : weekly.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ margin: 0, fontSize: 13, color: textSub }}>No trainings yet.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: textMain }}>Weekly</div>
              <div style={{ height: 1, flex: 1, background: "rgba(15,23,42,0.14)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {weekly.map((t) => {
                const comments = commentsByTraining[t.id] ?? [];
                const reactions = reactionsByTraining[t.id] ?? [];
                const completions = completionsByTraining[t.id] ?? [];

                return (
                  <div key={t.id} style={cardStyle}>
                    <div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          marginBottom: 6,
                          color: textMain,
                        }}
                      >
                        {t.weekLabel}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "rgba(15,23,42,0.78)",
                        }}
                      >
                        {(t.title ?? "").trim() || "Weekly Training"}
                      </div>
                    </div>

                    <div style={{ height: 10 }} />

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: textMain,
                        fontFamily: "Calibri, Arial, sans-serif",
                      }}
                    >
                      {(t.content ?? "").trim() || "No content."}
                    </div>

                    <div style={{ height: 12 }} />

                    {/* counts always visible */}
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        flexWrap: "wrap",
                        fontSize: 12,
                        fontWeight: 900,
                        color: textMain,
                      }}
                    >
                      <span>🔥 {getReactionCount(t.id)}</span>
                      <span>💬 {getCommentCount(t.id)}</span>
                      <span>✅ {getCompletionCount(t.id)}</span>
                    </div>

                    {showInteractions ? (
                      <>
                        <div style={{ height: 12 }} />

                        {/* reactions */}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          {REACTIONS.map((reaction) => (
                            <button
                              key={reaction}
                              onClick={() => toggleReaction(t.id, reaction)}
                              style={{
                                fontSize: 18,
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: hasUserReaction(t.id, reaction)
                                  ? "1px solid rgba(17,24,39,0.55)"
                                  : "1px solid rgba(15,23,42,0.16)",
                                background: hasUserReaction(t.id, reaction) ? "#111827" : "#f9fafb",
                                color: hasUserReaction(t.id, reaction) ? "#ffffff" : textMain,
                                cursor: "pointer",
                              }}
                            >
                              {reaction}
                            </button>
                          ))}
                        </div>

                        {/* completion */}
                        <button
                          onClick={() => toggleCompletion(t.id)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 14,
                            border: "1px solid rgba(15,23,42,0.18)",
                            background: hasUserCompleted(t.id) ? "#111827" : "#ffffff",
                            color: hasUserCompleted(t.id) ? "#ffffff" : "#111827",
                            fontWeight: 900,
                            cursor: "pointer",
                            marginBottom: 12,
                          }}
                        >
                          {hasUserCompleted(t.id) ? "Completed ✔" : "I did this workout"}
                        </button>

                        {/* comments preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                          {comments.length === 0 ? (
                            <div style={{ fontSize: 12, color: textSub }}>No comments yet.</div>
                          ) : (
                            comments.slice(-2).map((c) => (
                              <div
                                key={c.id}
                                style={{
                                  background: "#f9fafb",
                                  border: "1px solid rgba(15,23,42,0.08)",
                                  borderRadius: 12,
                                  padding: "10px 12px",
                                  fontSize: 13,
                                  color: textMain,
                                }}
                              >
                                {c.comment}
                              </div>
                            ))
                          )}
                        </div>

                        {/* comment input */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            value={commentDrafts[t.id] ?? ""}
                            onChange={(e) =>
                              setCommentDrafts((prev) => ({
                                ...prev,
                                [t.id]: e.target.value,
                              }))
                            }
                            placeholder="Write a comment..."
                            style={inputStyle}
                          />

                          <button
                            onClick={() => addComment(t.id)}
                            disabled={sendingForTraining[t.id] || !(commentDrafts[t.id] ?? "").trim()}
                            style={{
                              minWidth: 96,
                              padding: "10px 12px",
                              borderRadius: 14,
                              border: "1px solid rgba(15,23,42,0.18)",
                              background: "#111827",
                              color: "#ffffff",
                              fontWeight: 900,
                              cursor:
                                sendingForTraining[t.id] || !(commentDrafts[t.id] ?? "").trim()
                                  ? "not-allowed"
                                  : "pointer",
                              opacity:
                                sendingForTraining[t.id] || !(commentDrafts[t.id] ?? "").trim()
                                  ? 0.6
                                  : 1,
                            }}
                          >
                            {sendingForTraining[t.id] ? "..." : "Send"}
                          </button>
                        </div>

                        {/* summary */}
                        <div style={{ marginTop: 10, fontSize: 11, color: textSub }}>
                          Showing latest comments.
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}