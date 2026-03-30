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
  image_url?: string | null;
  image_path?: string | null;
};

type PendingRequestRow = {
  user_id: string;
  full_name: string | null;
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

  const [isOwner, setIsOwner] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequestRow[]>([]);
  const [requestActionUserId, setRequestActionUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  function getGroupImageSrc(groupRow: GroupRow | null) {
    if (!groupRow) return "/ps.png";

    if (groupRow.image_url && groupRow.image_url.trim()) {
      return groupRow.image_url;
    }

    if (groupRow.image_path && groupRow.image_path.trim()) {
      const { data } = supabaseBrowser.storage
        .from("group-images")
        .getPublicUrl(groupRow.image_path);
      return data?.publicUrl || "/ps.png";
    }

    return "/ps.png";
  }

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
      if (!groupId || checkingAuth || !userId) return;

      setLoading(true);

      const { data: gData, error: gErr } = await supabaseBrowser
        .from("app_groups")
        .select("id,name,goal,is_public,created_by,created_at,image_url,image_path")
        .eq("id", groupId)
        .maybeSingle();

      if (cancelled) return;

      if (gErr) {
        console.error(gErr);
        setGroup(null);
        setLoading(false);
        return;
      }

      const groupRow = (gData ?? null) as GroupRow | null;
      setGroup(groupRow);

      if (!groupRow) {
        setLoading(false);
        return;
      }

      const owner = groupRow.created_by === userId;
      setIsOwner(owner);

      const [{ count }, memberStatusResult] = await Promise.all([
        supabaseBrowser
          .from("app_group_members")
          .select("id", { count: "exact", head: true })
          .eq("group_id", groupId)
          .eq("status", "active"),
        supabaseBrowser
          .from("app_group_members")
          .select("status")
          .eq("group_id", groupId)
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setMembersCount(count ?? 0);

      if (memberStatusResult.error) {
        console.error(memberStatusResult.error);
        setMemberStatus("none");
      } else if (!memberStatusResult.data) {
        setMemberStatus("none");
      } else if (memberStatusResult.data.status === "active") {
        setMemberStatus("active");
      } else if (memberStatusResult.data.status === "pending") {
        setMemberStatus("pending");
      } else {
        setMemberStatus("none");
      }

      if (owner) {
        const { data: pendingRows, error: pendingErr } = await supabaseBrowser
          .from("app_group_members")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("status", "pending");

        if (cancelled) return;

        if (pendingErr) {
          console.error(pendingErr);
          setPendingRequests([]);
        } else {
          const userIds = (pendingRows ?? []).map((row) => row.user_id);

          if (userIds.length === 0) {
            setPendingRequests([]);
          } else {
            const { data: profilesData, error: profilesErr } = await supabaseBrowser
              .from("app_profiles_public")
              .select("id,full_name")
              .in("id", userIds);

            if (cancelled) return;

            if (profilesErr) {
              console.error(profilesErr);
              setPendingRequests(
                userIds.map((id) => ({
                  user_id: id,
                  full_name: null,
                }))
              );
            } else {
              const profilesMap = new Map(
                (profilesData ?? []).map((profile) => [profile.id, profile.full_name ?? null])
              );

              setPendingRequests(
                userIds.map((id) => ({
                  user_id: id,
                  full_name: profilesMap.get(id) ?? null,
                }))
              );
            }
          }
        }
      } else {
        setPendingRequests([]);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [groupId, checkingAuth, userId]);

  async function handleGroupAction() {
    if (!groupId || !userId || !group) return;

    if (memberStatus === "active") {
      router.push(`/groups/${groupId}/training`);
      return;
    }

    if (memberStatus === "pending") {
      return;
    }

    setJoinLoading(true);

    const desiredStatus = group.is_public ? "active" : "pending";

    const { error } = await supabaseBrowser.from("app_group_members").upsert(
      {
        group_id: groupId,
        user_id: userId,
        status: desiredStatus,
      },
      { onConflict: "group_id,user_id" }
    );

    if (error) {
      console.error(error);
      setJoinLoading(false);
      return;
    }

    setMemberStatus(desiredStatus);

    if (desiredStatus === "active") {
      setMembersCount((prev) => prev + 1);
      router.push(`/groups/${groupId}/training`);
      return;
    }

    setJoinLoading(false);
  }

  async function handleApproveRequest(targetUserId: string) {
    if (!groupId) return;

    setRequestActionUserId(targetUserId);

    const { error } = await supabaseBrowser
      .from("app_group_members")
      .update({ status: "active" })
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error(error);
      setRequestActionUserId(null);
      return;
    }

    setPendingRequests((prev) => prev.filter((item) => item.user_id !== targetUserId));
    setMembersCount((prev) => prev + 1);
    setRequestActionUserId(null);
  }

  async function handleRejectRequest(targetUserId: string) {
    if (!groupId) return;

    setRequestActionUserId(targetUserId);

    const { error } = await supabaseBrowser
      .from("app_group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", targetUserId)
      .eq("status", "pending");

    if (error) {
      console.error(error);
      setRequestActionUserId(null);
      return;
    }

    setPendingRequests((prev) => prev.filter((item) => item.user_id !== targetUserId));
    setRequestActionUserId(null);
  }

  async function handleDeleteGroup() {
    if (!groupId || !isOwner || deleteLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this group? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeleteLoading(true);

    const { error } = await supabaseBrowser
      .from("app_groups")
      .delete()
      .eq("id", groupId)
      .eq("created_by", userId);

    if (error) {
      console.error(error);
      setDeleteLoading(false);
      alert("Could not delete group.");
      return;
    }

    router.push("/groups");
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
                  src={getGroupImageSrc(group)}
                  alt="Group"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.src = "/ps.png";
                  }}
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
                disabled={joinLoading || memberStatus === "pending"}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: 16,
                  fontWeight: 900,
                  background: "#111827",
                  color: "#fff",
                  opacity: joinLoading || memberStatus === "pending" ? 0.75 : 1,
                  cursor: joinLoading || memberStatus === "pending" ? "default" : "pointer",
                }}
              >
                {memberStatus === "active"
                  ? "Enter Group"
                  : memberStatus === "pending"
                  ? "Request Pending"
                  : group.is_public
                  ? "Enter Group"
                  : "Request to Join Group"}
              </button>
            </div>

            {isOwner && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleteLoading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: 16,
                    fontWeight: 900,
                    background: "rgba(127,29,29,0.95)",
                    color: "#fff",
                    border: "1px solid rgba(248,113,113,0.25)",
                    opacity: deleteLoading ? 0.75 : 1,
                    cursor: deleteLoading ? "default" : "pointer",
                  }}
                >
                  {deleteLoading ? "Deleting Group..." : "Delete Group"}
                </button>
              </div>
            )}

            {isOwner && pendingRequests.length > 0 && (
              <div style={{ ...cardStyle, marginTop: 14 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 900 }}>
                  Pending Requests
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {pendingRequests.map((request) => {
                    const isActing = requestActionUserId === request.user_id;

                    return (
                      <div
                        key={request.user_id}
                        style={{
                          borderRadius: 14,
                          border: "1px solid rgba(56,189,248,0.12)",
                          padding: 12,
                          background: "rgba(15,23,42,0.55)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: 14,
                                fontWeight: 800,
                                color: "#e5e7eb",
                              }}
                            >
                              {request.full_name?.trim() || "User"}
                            </p>

                            <p
                              style={{
                                margin: "4px 0 0 0",
                                fontSize: 11,
                                color: "#9ca3af",
                                wordBreak: "break-all",
                              }}
                            >
                              {request.user_id}
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => handleApproveRequest(request.user_id)}
                              disabled={isActing}
                              style={{
                                borderRadius: 12,
                                border: "1px solid rgba(34,197,94,0.35)",
                                background: "rgba(34,197,94,0.14)",
                                color: "#dcfce7",
                                padding: "10px 12px",
                                fontWeight: 900,
                                cursor: isActing ? "default" : "pointer",
                              }}
                            >
                              Approve
                            </button>

                            <button
                              onClick={() => handleRejectRequest(request.user_id)}
                              disabled={isActing}
                              style={{
                                borderRadius: 12,
                                border: "1px solid rgba(239,68,68,0.35)",
                                background: "rgba(239,68,68,0.14)",
                                color: "#fee2e2",
                                padding: "10px 12px",
                                fontWeight: 900,
                                cursor: isActing ? "default" : "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}