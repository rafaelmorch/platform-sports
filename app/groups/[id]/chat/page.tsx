"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
// import BottomNavbar from "@/components/BottomNavbar";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type MsgRow = {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  is_highlight: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

export default function GroupChatPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
const [checkingMember, setCheckingMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MsgRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const surface3D = {
    background: "linear-gradient(145deg, #2f3035, #1e1f23)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "10px 10px 22px rgba(0,0,0,0.65), -6px -6px 18px rgba(255,255,255,0.04)",
  } as const;

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function ensureProfiles(userIds: string[]) {
    const missing = userIds.filter((id) => !profiles[id]);
    if (!missing.length) return;

    const { data } = await supabaseBrowser
      .from("app_profiles_public")
      .select("id,full_name")
      .in("id", missing);

    const next: Record<string, string> = {};
    (data as ProfileRow[] | null)?.forEach((p) => {
      next[p.id] = p.full_name?.trim() || "Member";
    });

    setProfiles((prev) => ({ ...prev, ...next }));
  }

  const nameFor = useMemo(() => {
    return (id: string) => profiles[id] || "Member";
  }, [profiles]);

  // Auth
  useEffect(() => {
    async function check() {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.replace(`/login`);
        return;
      }
      setUserId(data.session.user.id);
      setCheckingAuth(false);
    }
    check();
  }, [router]);

  // Load messages
  useEffect(() => {
    async function load() {
      if (!groupId || checkingAuth) return;

      const { data } = await supabaseBrowser
        .from("app_group_messages")
        .select("id,group_id,user_id,message,is_highlight,created_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      const rows = (data ?? []) as MsgRow[];
      setMessages(rows);
      await ensureProfiles(rows.map((r) => r.user_id));
      setLoading(false);
      scrollToBottom();
    }

    load();
  }, [groupId, checkingAuth]);

  // Realtime
  useEffect(() => {
    if (!groupId) return;

    const channel = supabaseBrowser
      .channel(`group-chat-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const row = payload.new as MsgRow;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          await ensureProfiles([row.user_id]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [groupId]);

  // FIX: insert + select
  async function sendMessage() {
    const m = text.trim();
    if (!m || !groupId || !userId) return;

    setSending(true);

    const { data, error } = await supabaseBrowser
      .from("app_group_messages")
      .insert({
        group_id: groupId,
        user_id: userId,
        message: m,
        is_highlight: false,
      })
      .select("id,group_id,user_id,message,is_highlight,created_at")
      .single();

    if (error) {
      console.error(error);
      setSending(false);
      return;
    }

    const row = data as MsgRow;

    setMessages((prev) => [...prev, row]);
    await ensureProfiles([row.user_id]);

    setText("");
    setSending(false);
    scrollToBottom();
  }

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
          <BackArrow />

          {/* Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              margin: "12px 0",
            }}
          >
            <Link
              href={`/groups/${groupId}/training`}
              style={{
                textAlign: "center",
                padding: 14,
                borderRadius: 14,
                fontWeight: 900,
                color: "#fff",
                textDecoration: "none",
                background: "linear-gradient(145deg,#ef4444,#7f1d1d)",
              }}
            >
              Open Training
            </Link>

            <Link
              href={`/groups/${groupId}/performance`}
              style={{
                textAlign: "center",
                padding: 14,
                borderRadius: 14,
                fontWeight: 900,
                color: "#fff",
                textDecoration: "none",
                background: "linear-gradient(145deg,#facc15,#78350f)",
              }}
            >
              Open Performance
            </Link>
          </div>

          {/* Messages */}
          <div
            style={{
              borderRadius: 18,
              padding: 14,
              minHeight: "55vh",
              ...surface3D,
            }}
          >
            {loading ? (
              <p>Loading...</p>
            ) : messages.length === 0 ? (
              <p>No messages yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map((msg) => {
                  const mine = msg.user_id === userId;
                  const author = mine ? "You" : nameFor(msg.user_id);

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: mine ? "flex-end" : "flex-start",
                      }}
                    >
                      <div style={{ maxWidth: "80%" }}>
                        <div style={{ fontSize: 11, marginBottom: 4 }}>
                          {author}
                        </div>

                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 14,
                            background: mine
                              ? "rgba(2,132,199,0.3)"
                              : "rgba(0,0,0,0.3)",
                          }}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                borderRadius: 16,
                padding: 10,
                ...surface3D,
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending) sendMessage();
                  }
                }}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#fff",
                }}
              />

              <button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: "#25D366",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
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
          background: "#000",
        }}
      >
        <BottomNavbar />
      </div>
*/}
    </>
  );
}