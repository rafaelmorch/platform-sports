// app/memberships/[id]/inside/chat/page.tsx
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
  author_name: string | null;
  message: string;
  created_at: string;
};

function getInitials(name: string | null): string {
  if (!name) return "AT";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getAvatarBackground(seed: string): string {
  const palettes = [
    "radial-gradient(circle at 30% 30%, #38bdf8, #0f172a)",
    "radial-gradient(circle at 30% 30%, #22c55e, #0f172a)",
    "radial-gradient(circle at 30% 30%, #f59e0b, #0f172a)",
    "radial-gradient(circle at 30% 30%, #a78bfa, #0f172a)",
    "radial-gradient(circle at 30% 30%, #fb7185, #0f172a)",
  ];

  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return palettes[sum % palettes.length];
}

function getDisplayName(name: string | null): string {
  return name?.trim() ? name.trim() : "Athlete";
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
  const [userName, setUserName] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  function scrollToBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(profile?.full_name || null);

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

      const { data: rows, error } = await supabase
        .from("app_membership_chat_messages")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading membership chat:", error);
        setMessages([]);
      } else {
        setMessages((rows as ChatRow[]) ?? []);
      }

      setCommunityName(typedCommunity.name || null);
      setAllowed(true);
      setLoading(false);
      scrollToBottom();
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
        (payload) => {
          const row = payload.new as ChatRow;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });

          scrollToBottom();
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

    const { data, error } = await supabase
      .from("app_membership_chat_messages")
      .insert({
        community_id: communityId,
        user_id: userId,
        author_name: userName,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending membership chat message:", error);
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === (data as ChatRow).id)) return prev;
        return [...prev, data as ChatRow];
      });
      setText("");
      scrollToBottom();
    }

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
          background: #000 !important;
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
          background:
            "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          overflowX: "hidden",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto 16px auto" }}>
          <BackArrow />
        </div>

        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 28,
            padding: "clamp(18px, 3vw, 24px)",
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
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
              marginBottom: 12,
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

          {communityId && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 36,
                borderBottom: "1px solid #e2e8f0",
                marginBottom: 22,
                overflowX: "auto",
                paddingBottom: 2,
              }}
            >
              <Link
                href={`/memberships/${communityId}/inside`}
                style={{
                  textDecoration: "none",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Home
              </Link>

              <Link
                href={`/memberships/${communityId}/inside/chat`}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid #facc15",
                  whiteSpace: "nowrap",
                }}
              >
                Chat
              </Link>

              <Link
                href={`/memberships/${communityId}/inside/events`}
                style={{
                  textDecoration: "none",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Events
              </Link>
            </div>
          )}

          <div
            style={{
              borderRadius: 22,
              padding: 16,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              border: "1px solid #e2e8f0",
              boxShadow:
                "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
              marginBottom: 14,
              minHeight: 420,
              maxHeight: 520,
              overflowY: "auto",
            }}
          >
            {messages.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>No messages yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((msg) => {
                  const mine = msg.user_id === userId;
                  const author = mine ? "You" : getDisplayName(msg.author_name);

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: mine ? "flex-end" : "flex-start",
                      }}
                    >
                      <div style={{ maxWidth: "78%", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        {!mine && (
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 999,
                              background: getAvatarBackground(author),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#f8fafc",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(author)}
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                            {author}
                          </div>

                          <div
                            style={{
                              padding: "10px 12px",
                              borderRadius: 16,
                              background: mine ? "#0f172a" : "#f1f5f9",
                              color: mine ? "#ffffff" : "#0f172a",
                              fontSize: 13,
                              lineHeight: 1.5,
                              border: mine ? "1px solid #0f172a" : "1px solid #e2e8f0",
                              wordBreak: "break-word",
                            }}
                          >
                            {msg.message}
                          </div>
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
              gap: 10,
              alignItems: "center",
              borderRadius: 18,
              padding: 12,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
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
