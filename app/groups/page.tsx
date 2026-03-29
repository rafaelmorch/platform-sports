"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type GroupRow = {
  id: string;
  name: string;
  goal: string | null;
  is_public: boolean;
  created_by: string;
  created_at?: string;
  image_url?: string | null;
};

type MembershipRow = {
  group_id: string;
  status: string;
  last_seen_at: string | null;
};

export default function GroupsPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRow[]>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Record<string, MembershipRow>>(
    {}
  );
  const [latestByGroup, setLatestByGroup] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      setUserId(data.session?.user?.id ?? null);
    }
    loadSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      setLoading(true);

      const { data, error } = await supabaseBrowser
        .from("app_groups")
        .select("id,name,goal,is_public,created_by,created_at,image_url")
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (error) {
        console.error(error);
        setGroups([]);
        setLoading(false);
        return;
      }

      setGroups((data ?? []) as GroupRow[]);
      setLoading(false);
    }

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUnreadData() {
      if (!userId) return;
      if (groups.length === 0) return;

      const groupIds = groups.map((g) => g.id);

      const { data: mData, error: mErr } = await supabaseBrowser
        .from("app_group_members")
        .select("group_id,status,last_seen_at")
        .eq("user_id", userId)
        .in("group_id", groupIds);

      if (cancelled) return;

      if (mErr) {
        console.warn("memberships load error:", mErr.message);
        return;
      }

      const mMap: Record<string, MembershipRow> = {};
      (mData ?? []).forEach((r: any) => {
        mMap[r.group_id] = r as MembershipRow;
      });
      setMemberships(mMap);

      const activeGroupIds = (mData ?? [])
        .filter((r: any) => r.status === "active")
        .map((r: any) => r.group_id);

      if (activeGroupIds.length === 0) return;

      const { data: msgData, error: msgErr } = await supabaseBrowser
        .from("app_group_messages")
        .select("group_id,created_at")
        .in("group_id", activeGroupIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled) return;

      if (msgErr) {
        console.warn("messages load error:", msgErr.message);
        return;
      }

      const latest: Record<string, string> = {};
      (msgData ?? []).forEach((row: any) => {
        if (!latest[row.group_id]) latest[row.group_id] = row.created_at;
      });
      setLatestByGroup(latest);
    }

    loadUnreadData();

    return () => {
      cancelled = true;
    };
  }, [userId, groups]);

  const hasNewByGroupId = useMemo(() => {
    const out: Record<string, boolean> = {};
    if (!userId) return out;

    groups.forEach((g) => {
      const m = memberships[g.id];
      if (!m || m.status !== "active") return;

      const lastSeen = m.last_seen_at ? new Date(m.last_seen_at).getTime() : 0;
      const lastMsg = latestByGroup[g.id]
        ? new Date(latestByGroup[g.id]).getTime()
        : 0;

      if (lastMsg > lastSeen) out[g.id] = true;
    });

    return out;
  }, [groups, memberships, latestByGroup, userId]);

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#e5e7eb",
          paddingTop: "16px",
          paddingRight: "0",
          paddingBottom: "100px",
          paddingLeft: "0",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            margin: "0 auto",
            padding: "0 16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
              Groups
            </h1>

            <Link
              href="/groups/new"
              style={{
                fontSize: 12,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.35)",
                background: "rgba(2,132,199,0.12)",
                color: "#e0f2fe",
                textDecoration: "none",
                fontWeight: 900,
                boxShadow: "0 6px 14px rgba(2,132,199,0.12)",
                whiteSpace: "nowrap",
              }}
            >
              Create Group
            </Link>
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No groups yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {groups.map((g) => (
                <Link
                  key={g.id}
                  href={`/groups/${g.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(56,189,248,0.15)",
                      padding: 16,
                      background:
                        "linear-gradient(160deg, rgba(2,6,23,0.98), rgba(2,20,40,0.95))",
                      boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 16,
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid rgba(56,189,248,0.25)",
                        background: "#020617",
                      }}
                    >
                      <img
                        src={g.image_url || "/ps.png"}
                        alt="Group"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>
                        {g.name}
                      </h2>

                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        Goal: {g.goal ?? "—"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNavbar />
    </>
  );
}