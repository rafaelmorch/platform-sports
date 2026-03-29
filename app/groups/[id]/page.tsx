"use client";

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
  created_at: string;
  image_url?: string | null; // ✅ NOVO
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

  const [memberStatus, setMemberStatus] = useState<"none" | "pending" | "active">("none");
  const [joinLoading, setJoinLoading] = useState(false);

  const cardStyle = useMemo(
    () => ({
      borderRadius: 18,
      border: "1px solid rgba(56,189,248,0.15)",
      padding: 16,
      background: "linear-gradient(160deg, rgba(2,6,23,0.98), rgba(2,20,40,0.95))",
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
      if (!groupId || checkingAuth) return;

      setLoading(true);

      const { data: gData, error: gErr } = await supabaseBrowser
        .from("app_groups")
        .select("id,name,goal,is_public,created_by,created_at,image_url") // ✅ NOVO
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
      router.push(`/groups/${groupId}/training`);
      return;
    }

    setJoinLoading(false);
  }

  if (checkingAuth) return null;

  return (
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
                }}
              >
                <img
                  src={group.image_url || "/ps.png"} // ✅ AQUI É O FIX
                  alt="Group"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>
                  {group.name}
                </h2>

                <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Goal: {group.goal ?? "—"}
                </p>

                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#9ca3af" }}>
                  Members: <span style={{ color: "#e5e7eb", fontWeight: 900 }}>{membersCount}</span>
                </p>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                onClick={handleGroupAction}
                disabled={joinLoading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 16,
                  fontWeight: 900,
                  background: "#111827",
                  color: "#fff",
                }}
              >
                {memberStatus === "active"
                  ? "Enter Group"
                  : group.is_public
                  ? "Enter Group"
                  : "Request to Join Group"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}