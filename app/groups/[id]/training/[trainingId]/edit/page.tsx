// app/groups/[id]/training/[trainingId]/edit/page.tsx
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

type TrainingRow = {
  id: string;
  group_id: string;
  created_by: string;
  title: string | null;
  content: string | null;
  is_published: boolean | null;
  schedule_type: "weekly" | "daily";
  week_start_date: string | null;
  created_at: string;
};

export default function EditTrainingPage() {
  const router = useRouter();
  const params = useParams();

  const groupId = params?.id as string;
  const trainingId = params?.trainingId as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingMember, setCheckingMember] = useState(true);
  const [checkingOwner, setCheckingOwner] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);

  const [loadingTraining, setLoadingTraining] = useState(true);
  const [training, setTraining] = useState<TrainingRow | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // ===== Light gray theme =====
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
      boxShadow: "0 10px 22px rgba(15,23,42,0.10)",
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
        const returnTo = `/groups/${groupId}/training/${trainingId}/edit`;
        try {
          localStorage.setItem("ps:returnTo", returnTo);
        } catch {}
        router.replace(`/login?redirect=${encodeURIComponent(returnTo)}`);
        return;
      }

      setUserId(session.user.id);
      setCheckingAuth(false);
    }

    if (groupId && trainingId) checkAuth();

    return () => {
      cancelled = true;
    };
  }, [groupId, trainingId, router]);

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

  // Load training
  useEffect(() => {
    let cancelled = false;

    async function loadTraining() {
      if (!groupId || !trainingId) return;
      if (checkingAuth || checkingMember || checkingOwner) return;

      setLoadingTraining(true);
      setErrorMsg(null);

      const { data, error } = await supabaseBrowser
        .from("app_group_trainings")
        .select("id,group_id,created_by,title,content,is_published,schedule_type,week_start_date,created_at")
        .eq("id", trainingId)
        .eq("group_id", groupId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setErrorMsg(error?.message || "Training not found.");
        setTraining(null);
        setLoadingTraining(false);
        return;
      }

      const row = data as TrainingRow;

      // we only edit weekly here
      if (row.schedule_type !== "weekly") {
        router.replace(`/groups/${groupId}/training`);
        return;
      }

      setTraining(row);
      setTitle((row.title ?? "").trim());
      setContent((row.content ?? "").trim());
      setLoadingTraining(false);
    }

    loadTraining();

    return () => {
      cancelled = true;
    };
  }, [groupId, trainingId, checkingAuth, checkingMember, checkingOwner, router]);

  async function saveChanges() {
    setSavedMsg(null);
    setErrorMsg(null);

    const t = title.trim();
    const c = content.trim();

    if (!t || !c) {
      setErrorMsg("Title and content are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabaseBrowser
      .from("app_group_trainings")
      .update({
        title: t,
        content: c,
      })
      .eq("id", trainingId)
      .eq("group_id", groupId);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedMsg("Saved.");
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

          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Edit Training
          </h1>

          {group?.name ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: textSub }}>
              Group: <span style={{ color: textMain, fontWeight: 900 }}>{group.name}</span>
            </p>
          ) : null}

          <div style={{ height: 12 }} />

          <div style={cardStyle}>
            {loadingTraining ? (
              <p style={{ margin: 0, fontSize: 13, color: textSub }}>Loading...</p>
            ) : errorMsg ? (
              <p style={{ margin: 0, fontSize: 13, color: "#b91c1c", fontWeight: 900 }}>{errorMsg}</p>
            ) : !training ? (
              <p style={{ margin: 0, fontSize: 13, color: textSub }}>Not found.</p>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>
                  Weekly (editing)
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                      Title
                    </div>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Weekly Training"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                      Content
                    </div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write the weekly plan here..."
                      style={{
                        ...inputStyle,
                        minHeight: 260,
                        resize: "vertical",
                        lineHeight: 1.5,
                        fontFamily: "Calibri, Arial, sans-serif",
                      }}
                    />
                  </div>

                  {savedMsg ? (
                    <div style={{ fontSize: 12, color: "rgba(15,23,42,0.80)", fontWeight: 900 }}>
                      {savedMsg}
                    </div>
                  ) : null}

                  {errorMsg ? (
                    <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 900 }}>
                      {errorMsg}
                    </div>
                  ) : null}

                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    style={{
                      ...buttonPrimary,
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    onClick={() => router.replace(`/groups/${groupId}/training`)}
                    style={{
                      ...buttonPrimary,
                      background: "#e5e7eb",
                      color: "#111827",
                      border: "1px solid rgba(15,23,42,0.18)",
                      boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
                    }}
                  >
                    Back to Training
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

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
    </>
  );
}