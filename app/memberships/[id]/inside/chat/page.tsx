"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: string;
  name: string | null;
  created_by: string | null;
};

type ChatRow = {
  id: string;
  community_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

function getDisplayName(name: string | null): string {
  return name?.trim() ? name.trim() : "Athlete";
}

function formatMessageDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function MembershipChatPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const params = useParams();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function fetchMessages(currentCommunityId: string) {
    const { data: rows, error } = await supabase
      .from("app_membership_chat_messages")
      .select("id, community_id, user_id, message, created_at")
      .eq("community_id", currentCommunityId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading membership chat:", error);
      setMessages([]);
      return;
    }

    const typedRows = (rows as ChatRow[]) ?? [];
    setMessages(typedRows);

    const userIds = Array.from(new Set(typedRows.map((m) => m.user_id).filter(Boolean)));

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const map: Record<string, string> = {};
      ((profiles as ProfileRow[]) ?? []).forEach((profile) => {
        map[profile.id] = getDisplayName(profile.full_name);
      });

      setProfilesMap(map);
    } else {
      setProfilesMap({});
    }

    scrollToBottom();
  }

  useEffect(() => {
    async function load() {
      if (!communityId || typeof communityId !== "string") {
        router.push("/memberships");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: community } = await supabase
        .from("app_membership_communities")
        .select("id, name, created_by")
        .eq("id", communityId)
        .single();

      if (!community) {
        router.push("/memberships");
        return;
      }

      const typedCommunity = community as CommunityRow;
      const isCreator = typedCommunity.created_by === user.id;

      if (!isCreator) {
        const { data: request } = await supabase
          .from("app_membership_requests")
          .select("status")
          .eq("community_id", communityId)
          .eq("user_id", user.id)
          .single();

        if (!request || request.status !== "approved") {
          router.push(`/memberships/${communityId}`);
          return;
        }
      }

      setCommunityName(typedCommunity.name || null);
      setAllowed(true);
      await fetchMessages(communityId);
      setLoading(false);
    }

    load();
  }, [communityId, router, supabase]);

  useEffect(() => {
    if (!communityId) return;

    const channel = supabase
      .channel(`membership-chat-${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "app_membership_chat_messages",
          filter: `community_id=eq.${communityId}`,
        },
        async () => {
          if (typeof communityId === "string") {
            await fetchMessages(communityId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, supabase]);

  async function sendMessage() {
    const message = text.trim();
    if (!message || !communityId || !userId) return;

    setSending(true);

    const { error } = await supabase.from("app_membership_chat_messages").insert({
      community_id: communityId,
      user_id: userId,
      message,
    });

    if (error) {
      console.error("Error sending membership chat message:", error);
      setSending(false);
      return;
    }

    setText("");
    await fetchMessages(communityId);
    setSending(false);
  }

  if (loading) return null;
  if (!allowed) return null;

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #e5ddd5 !important;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
        }

        * {
          box-sizing: border-box;
        }

        .page * {
          font-family: "Montserrat", Arial, sans-serif;
        }
      `}</style>

      <main
        className="page"
        style={{
          minHeight: "100vh",
          background: "#e5ddd5",
          paddingTop: "max(10px, env(safe-area-inset-top))",
          paddingRight: "max(8px, env(safe-area-inset-right))",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          paddingLeft: "max(8px, env(safe-area-inset-left))",
          overflowX: "hidden",
        }}
      >
        <div style={{ width: "100%", maxWidth: 920, margin: "0 auto 10px auto" }}>
          <BackArrow />
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 920,
            margin: "0 auto",
            borderRadius: 22,
            padding: "clamp(12px, 2vw, 18px)",
            border: "1px solid #d6dbe4",
            background: "#f0f2f5",
            boxShadow: "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 24px)",
                fontWeight: 800,
                margin: 0,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              {communityName}
            </h1>
          </div>

          

          <div
            style={{
              borderRadius: 18,
              padding: "10px",
              background: "#efeae2",
              border: "1px solid #dde3ea",
              marginBottom: 10,
              minHeight: "calc(100vh - 235px)",
              maxHeight: "calc(100vh - 235px)",
              overflowY: "auto",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>No messages yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((msg) => {
                  const mine = msg.user_id === userId;
                  const author = mine ? "You" : getDisplayName(profilesMap[msg.user_id] ?? null);

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: mine ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "88%",
                          minWidth: "120px",
                          padding: "8px 10px 6px 10px",
                          borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: mine ? "#dcf8c6" : "#ffffff",
                          color: "#111827",
                          fontSize: 13,
                          lineHeight: 1.45,
                          boxShadow: "0 1px 2px rgba(0,0,0,0.10)",
                          border: mine ? "1px solid #cdebb8" : "1px solid #eceff3",
                          wordBreak: "break-word",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            marginBottom: 4,
                            color: mine ? "#166534" : "#334155",
                          }}
                        >
                          {author}
                        </div>

                        <div>{msg.message}</div>

                        <div
                          style={{
                            fontSize: 10,
                            textAlign: "right",
                            marginTop: 4,
                            color: "#6b7280",
                          }}
                        >
                          {formatMessageDateTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              borderRadius: 18,
              padding: 10,
              background: "#f0f2f5",
              border: "1px solid #dbe3ea",
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
                border: "1px solid #d6dbe4",
                outline: "none",
                background: "#ffffff",
                color: "#0f172a",
                borderRadius: 999,
                padding: "12px 14px",
                fontSize: 13,
              }}
            />

            <button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              style={{
                padding: "12px 18px",
                borderRadius: 999,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
                whiteSpace: "nowrap",
                opacity: sending || !text.trim() ? 0.7 : 1,
              }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

