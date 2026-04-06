// app/memberships/[id]/inside/checkins/page.tsx
"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

type CheckinRow = {
  id: string;
  community_id: string;
  user_id: string;
  author_name: string | null;
  activity_type: string;
  comment: string | null;
  image_url: string | null;
  image_path: string | null;
  points: number;
  created_at: string;
  challenge_id: string | null;
};

function getDisplayName(name: string | null): string {
  return name?.trim() ? name.trim() : "Athlete";
}

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

function formatActivityType(value: string): string {
  if (!value) return "Activity";
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MembershipCheckinsHistoryPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [openImages, setOpenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadPage() {
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

      const { data: community } = await supabase
        .from("app_membership_communities")
        .select("id, created_by")
        .eq("id", communityId)
        .single();

      if (!community) {
        router.push("/memberships");
        return;
      }

      const isCreator = community.created_by === user.id;

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

      const { data, error } = await supabase
        .from("app_membership_checkins")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading check-in history:", error);
        setCheckins([]);
      } else {
        setCheckins((data as CheckinRow[]) ?? []);
      }

      setLoading(false);
    }

    loadPage();
  }, [communityId, router, supabase]);

  function toggleImage(checkinId: string) {
    setOpenImages((prev) => {
      const copy = new Set(prev);
      if (copy.has(checkinId)) {
        copy.delete(checkinId);
      } else {
        copy.add(checkinId);
      }
      return copy;
    });
  }

  if (loading) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingRight: "max(16px, env(safe-area-inset-right))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
        fontFamily: "Montserrat, Arial, sans-serif",
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
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 24px)",
              fontWeight: 800,
              margin: "0 0 6px 0",
              color: "#0f172a",
            }}
          >
            Check-in History
          </h1>

          <div style={{ color: "#64748b", fontSize: 14 }}>
            Full activity proof history for this membership.
          </div>
        </div>

        {checkins.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            No check-ins yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {checkins.map((item) => {
              const authorLabel = getDisplayName(item.author_name);
              const isImageOpen = openImages.has(item.id);
              const isChallengeCheckin = Boolean(item.challenge_id);

              return (
                <article
                  key={item.id}
                  style={{
                    borderRadius: 20,
                    padding: 14,
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                    border: "1px solid #e2e8f0",
                    boxShadow:
                      "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 999,
                          background: getAvatarBackground(authorLabel),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#f8fafc",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(authorLabel)}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {authorLabel}
                        </div>

                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 999,
                          padding: "6px 10px",
                          background: "#ede9fe",
                          color: "#6d28d9",
                          border: "1px solid #c4b5fd",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatActivityType(item.activity_type)}
                      </div>

                      {isChallengeCheckin && (
                        <div
                          style={{
                            borderRadius: 999,
                            padding: "6px 10px",
                            background: "#dbeafe",
                            color: "#1d4ed8",
                            border: "1px solid #93c5fd",
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Challenge
                        </div>
                      )}

                      <div
                        style={{
                          borderRadius: 999,
                          padding: "6px 10px",
                          background: "#fef3c7",
                          color: "#b45309",
                          border: "1px solid #fcd34d",
                          fontSize: 11,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        +{item.points} pts
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ color: "#475569", fontSize: 13 }}>
                      {isChallengeCheckin
                        ? "Challenge proof submitted."
                        : "Workout proof submitted."}
                    </div>

                    {item.image_url && (
                      <button
                        type="button"
                        onClick={() => toggleImage(item.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#2563eb",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        {isImageOpen ? "Hide photo" : "View photo"}
                      </button>
                    )}
                  </div>

                  {isImageOpen && item.image_url && (
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 18,
                        overflow: "hidden",
                        border: "1px solid #dbe2ea",
                        background: "#eef2f7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 8,
                      }}
                    >
                      <img
                        src={item.image_url}
                        alt="Check-in proof"
                        style={{
                          width: "100%",
                          maxHeight: 380,
                          objectFit: "contain",
                          display: "block",
                          borderRadius: 12,
                        }}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
