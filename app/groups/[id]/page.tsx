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
  is_public: boolean;
  created_by: string;
  created_at: string;
};

type MemberCountRow = {
  group_id: string;
  members: number;
};

export default function GroupDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [membersCount, setMembersCount] = useState<number>(0);

  const [memberStatus, setMemberStatus] = useState<"none" | "pending" | "active">(
    "none"
  );
  const [joinLoading, setJoinLoading] = useState(false);

  const cardStyle = useMemo(
    () => ({
      borderRadius: 18,
      border: "1px solid rgba(56,189,248,0.15)",
      padding: 16,
      background:
        "linear-gradient(160deg, rgba(2,6,23,0.98), rgba(2,20,40,0.95))",
      boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
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
        const returnTo = `/groups/${groupId}`;
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

    async function load() {
      if (!groupId) return;
      if (checkingAuth) return;

      setLoading(true);

      const { data: gData, error: gErr } = await supabaseBrowser
        .from("app_groups")
        .select("id,name,goal,is_public,created_by,created_at")
        .eq("id", groupId)
        .maybeSingle();

      if (cancelled) return;

      if (gErr) {
        console.error(gErr);
        setGroup(null);
        setLoading(false);
        return;
      }

      setGroup((gData ?? null) as GroupRow | null);

      const { count } = await supabaseBrowser
        .from("app_group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("status", "active");

      if (cancelled) return;

      setMembersCount(count ?? 0);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [groupId, checkingAuth]);

  useEffect(() => {
    let cancelled = false;

    async function loadMembership() {
      if (!groupId || !userId) return;

      const { data, error } = await supabaseBrowser
        .from("app_group_members")
        .select("status,last_seen_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("membership read error:", error.message);
        setMemberStatus("none");
        return;
      }

      const status = (data?.status as any) || null;

      if (status === "active") {
        setMemberStatus("active");

        const { error: uErr } = await supabaseBrowser
          .from("app_group_members")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("group_id", groupId)
          .eq("user_id", userId);

        if (uErr) console.warn("mark seen (details) error:", uErr.message);
      } else if (status === "pending") {
        setMemberStatus("pending");
      } else {
        setMemberStatus("none");
      }
    }

    loadMembership();

    return () => {
      cancelled = true;
    };
  }, [groupId, userId]);

  async function handleGroupAction() {
    if (!groupId || !userId || !group) return;

    if (memberStatus === "active") {
      router.push(`/groups/${groupId}/training`);
      return;
    }

    setJoinLoading(true);

    const desiredStatus = group.is_public ? "active" : "pending";

    const { error } = await supabaseBrowser.from("app_group_members").insert({
      group_id: groupId,
      user_id: userId,
      status: desiredStatus,
    });

    if (error) {
      console.error(error);
      setJoinLoading(false);
      return;
    }

    setMemberStatus(desiredStatus);

    if (desiredStatus === "active") {
      await supabaseBrowser
        .from("app_group_members")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      setJoinLoading(false);
      router.push(`/groups/${groupId}/training`);
      return;
    }

    setJoinLoading(false);
  }

  if (checkingAuth) return null;

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

          <h1 style={{ margin: "0 0 12px 0", fontSize: 22, fontWeight: 900 }}>
            Group Details
          </h1>

          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
          ) : !group ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Group not found.</p>
          ) : (
            <>
              <div style={{ ...cardStyle, display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 84,
                    height: 84,
                    borderRadius: 16,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid rgba(56,189,248,0.25)",
                    background: "#020617",
                    boxShadow:
                      "0 10px 18px rgba(2,132,199,0.10), 0 0 0 1px rgba(2,132,199,0.08)",
                  }}
                >
                  <img
                    src="/ps.png"
                    alt="Group"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {group.name}
                    </h2>

                    <span
                      style={{
                        fontSize: 11,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(56,189,248,0.35)",
                        background: "rgba(2,132,199,0.12)",
                        color: "#e0f2fe",
                        whiteSpace: "nowrap",
                        fontWeight: 800,
                      }}
                    >
                      {group.is_public ? "Public" : "Private"}
                    </span>
                  </div>

                  <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                    Goal: {group.goal ?? "—"}
                  </p>

                  <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                    Members: <span style={{ color: "#e5e7eb", fontWeight: 900 }}>{membersCount}</span>
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                {memberStatus === "pending" ? (
                  <div style={{ ...cardStyle }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>
                      Your request is pending approval.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGroupAction}
                    disabled={joinLoading}
                    style={{
                      width: "100%",
                      textAlign: "center",
                      fontSize: 14,
                      padding: "14px 12px",
                      borderRadius: 16,
                      fontWeight: 900,
                      color: joinLoading ? "#94a3b8" : "#e0f2fe",
                      border: "1px solid rgba(56,189,248,0.35)",
                      background: joinLoading ? "rgba(148,163,184,0.10)" : "rgba(2,132,199,0.15)",
                      cursor: joinLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 8px 18px rgba(0,0,0,0.55)",
                    }}
                  >
                    {joinLoading
                      ? group.is_public || memberStatus === "active"
                        ? "Entering..."
                        : "Requesting..."
                      : memberStatus === "active"
                      ? "Enter Group"
                      : group.is_public
                      ? "Enter Group"
                      : "Request to Join Group"}
                  </button>
                )}
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
          background: "#000",
          borderTop: "1px solid rgba(148,163,184,0.25)",
        }}
      >
        <BottomNavbar />
      </div>
*/}
    </>
  );
}