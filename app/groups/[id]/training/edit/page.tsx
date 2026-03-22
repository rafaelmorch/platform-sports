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

type EditableTraining = {
  id: string | null; // null = new week not yet saved
  group_id: string;
  created_by: string;
  title: string;
  content: string;
  is_published: boolean;
  schedule_type: "weekly" | "daily";
  week_start_date: string | null;
  created_at: string | null;
  weekLabel: string;
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(isoYYYYMMDD: string, days: number) {
  const [y, m, d] = isoYYYYMMDD.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + days);
  dt.setHours(0, 0, 0, 0);
  return toISODate(dt);
}

export default function EditTrainingPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingMember, setCheckingMember] = useState(true);
  const [checkingOwner, setCheckingOwner] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EditableTraining[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const addWeekBtnStyle = useMemo(
    () => ({
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "#ffffff",
      color: "#111827",
      fontWeight: 900 as const,
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      setCheckingAuth(true);

      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;

      if (cancelled) return;

      if (!session) {
        const returnTo = `/groups/${groupId}/training/edit`;
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

  useEffect(() => {
    let cancelled = false;

    async function loadRows() {
      if (!groupId) return;
      if (checkingAuth || checkingMember || checkingOwner) return;

      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabaseBrowser
        .from("app_group_trainings")
        .select(
          "id,group_id,created_by,title,content,is_published,schedule_type,week_start_date,created_at"
        )
        .eq("group_id", groupId)
        .eq("is_published", true)
        .eq("schedule_type", "weekly")
        .order("week_start_date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (error) {
        setErrorMsg(error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const mapped = ((data ?? []) as TrainingRow[])
        .sort((a, b) => {
          const da = a.week_start_date ?? "";
          const db = b.week_start_date ?? "";
          if (da !== db) return da.localeCompare(db);
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        })
        .map((r, idx) => ({
          id: r.id,
          group_id: r.group_id,
          created_by: r.created_by,
          title: (r.title ?? "").trim(),
          content: (r.content ?? "").trim(),
          is_published: Boolean(r.is_published),
          schedule_type: r.schedule_type,
          week_start_date: r.week_start_date,
          created_at: r.created_at,
          weekLabel: `Week ${idx + 1}`,
        }));

      setRows(mapped);
      setLoading(false);
    }

    loadRows();

    return () => {
      cancelled = true;
    };
  }, [groupId, checkingAuth, checkingMember, checkingOwner]);

  function updateRow(index: number, field: "title" | "content", value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  }

  function addWeek() {
    setErrorMsg(null);

    const nextWeekNumber = rows.length + 1;

    let nextWeekStart: string | null = null;

    if (rows.length > 0) {
      const lastWeek = rows[rows.length - 1];
      if (lastWeek.week_start_date) {
        nextWeekStart = addDaysISO(lastWeek.week_start_date, 7);
      }
    }

    // fallback in case there is no previous week date
    if (!nextWeekStart) {
      nextWeekStart = toISODate(new Date());
    }

    setRows((prev) => [
      ...prev,
      {
        id: null,
        group_id: groupId,
        created_by: userId || "",
        title: `Week ${nextWeekNumber}`,
        content: "",
        is_published: true,
        schedule_type: "weekly",
        week_start_date: nextWeekStart,
        created_at: null,
        weekLabel: `Week ${nextWeekNumber}`,
      },
    ]);
  }

  async function saveAll() {
    setErrorMsg(null);

    if (!rows.length) {
      setErrorMsg("No trainings to save.");
      return;
    }

    for (const r of rows) {
      if (!String(r.title ?? "").trim() || !String(r.content ?? "").trim()) {
        setErrorMsg("All cards must have Title and Content.");
        return;
      }
    }

    setSaving(true);

    try {
      const existingRows = rows.filter((r) => r.id);
      const newRows = rows.filter((r) => !r.id);

      // update existing
      if (existingRows.length > 0) {
        const updateResults = await Promise.all(
          existingRows.map((r) =>
            supabaseBrowser
              .from("app_group_trainings")
              .update({
                title: String(r.title ?? "").trim(),
                content: String(r.content ?? "").trim(),
              })
              .eq("id", r.id as string)
              .eq("group_id", groupId)
          )
        );

        const failedUpdate = updateResults.find((x) => x.error);
        if (failedUpdate?.error) {
          setErrorMsg(failedUpdate.error.message);
          setSaving(false);
          return;
        }
      }

      // insert new weeks
      if (newRows.length > 0) {
        const payload = newRows.map((r) => ({
          group_id: groupId,
          created_by: userId,
          title: String(r.title ?? "").trim(),
          content: String(r.content ?? "").trim(),
          is_published: true,
          schedule_type: "weekly",
          week_start_date: r.week_start_date,
          training_date: null,
        }));

        const { error: insertError } = await supabaseBrowser
          .from("app_group_trainings")
          .insert(payload);

        if (insertError) {
          setErrorMsg(insertError.message);
          setSaving(false);
          return;
        }
      }

      setSaving(false);
      router.replace(`/groups/${groupId}/training`);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Save error.");
      setSaving(false);
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

          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Edit Training
          </h1>

          {group?.name ? (
            <p style={{ margin: "6px 0 0 0", fontSize: 12, color: textSub }}>
              Group: <span style={{ color: textMain, fontWeight: 900 }}>{group.name}</span>
            </p>
          ) : null}

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
          ) : rows.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ margin: 0, fontSize: 13, color: textSub }}>
                No trainings to edit.
              </p>
            </div>
          ) : (
            <>
              <div style={{ ...cardStyle, marginBottom: 12 }}>
                <button onClick={addWeek} style={addWeekBtnStyle}>
                  Add Week
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {rows.map((r, index) => (
                  <div key={r.id ?? `new-${index}`} style={cardStyle}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        marginBottom: 10,
                        color: textMain,
                      }}
                    >
                      {r.weekLabel}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                          Title
                        </div>
                        <input
                          value={r.title ?? ""}
                          onChange={(e) => updateRow(index, "title", e.target.value)}
                          style={inputStyle}
                          placeholder="Weekly Training"
                        />
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                          Content
                        </div>
                        <textarea
                          value={r.content ?? ""}
                          onChange={(e) => updateRow(index, "content", e.target.value)}
                          style={{
                            ...inputStyle,
                            minHeight: 220,
                            resize: "vertical",
                            lineHeight: 1.5,
                            fontFamily: "Calibri, Arial, sans-serif",
                          }}
                          placeholder="Write the weekly plan here..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: 12 }} />

              <div style={cardStyle}>
                <button
                  onClick={saveAll}
                  disabled={saving}
                  style={{
                    ...buttonPrimary,
                    opacity: saving ? 0.6 : 1,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </>
          )}
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