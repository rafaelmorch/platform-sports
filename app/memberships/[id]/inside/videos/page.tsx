"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: string;
  name: string | null;
  created_by: string | null;
};

type VideoRow = {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  sort_order: number | null;
  is_published: boolean;
  created_at: string;
};

function getVideoEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    if (url.includes("youtube.com/embed/")) return url;

    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (!v) return null;
      return `https://www.youtube.com/embed/${v}`;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (!id) return null;
      return `https://player.vimeo.com/video/${id}`;
    }

    if (parsed.hostname.includes("drive.google.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const fileIndex = parts.findIndex((part) => part === "d");
      if (fileIndex >= 0 && parts[fileIndex + 1]) {
        return `https://drive.google.com/file/d/${parts[fileIndex + 1]}/preview`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export default function MembershipVideosPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const params = useParams();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

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
      const isAdmin = profile?.is_admin === true;

      if (!isCreator && !isAdmin) {
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

      const { data: videoRows, error: videosError } = await supabase
        .from("app_membership_videos")
        .select("*")
        .eq("community_id", communityId)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (videosError) {
        console.error("Error loading membership videos:", videosError);
        setVideos([]);
      } else {
        setVideos((videoRows as VideoRow[]) ?? []);
      }

      setCommunityName(typedCommunity.name || null);
      setAllowed(true);
      setLoading(false);
    }

    load();
  }, [communityId, router, supabase]);

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
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid transparent",
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

              <Link
                href={`/memberships/${communityId}/inside/videos`}
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
                Videos
              </Link>
            </div>
          )}

          <div style={{ marginBottom: 8 }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: "0 0 4px 0",
                color: "#0f172a",
              }}
            >
              Training Videos
            </h2>

            <div style={{ color: "#64748b", fontSize: 13 }}>
              Exclusive training content for approved members.
            </div>
          </div>

          {videos.length === 0 ? (
            <div
              style={{
                marginTop: 18,
                borderRadius: 20,
                padding: 18,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              No videos published yet.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
                marginTop: 18,
              }}
            >
              {videos.map((video) => {
                const embedUrl = getVideoEmbedUrl(video.video_url);

                return (
                  <article
                    key={video.id}
                    style={{
                      borderRadius: 24,
                      padding: 16,
                      background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                      border: "1px solid #e2e8f0",
                      boxShadow:
                        "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "#0f172a",
                            lineHeight: 1.3,
                            marginBottom: 6,
                          }}
                        >
                          {video.title}
                        </div>

                        {video.description && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              lineHeight: 1.65,
                            }}
                          >
                            {video.description}
                          </div>
                        )}
                      </div>

                      {embedUrl ? (
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16 / 9",
                            borderRadius: 18,
                            overflow: "hidden",
                            border: "1px solid #dbe2ea",
                            background: "#eef2f7",
                          }}
                        >
                          <iframe
                            src={embedUrl}
                            title={video.title}
                            style={{ width: "100%", height: "100%", border: 0 }}
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : video.thumbnail_url ? (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            textDecoration: "none",
                            display: "block",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              aspectRatio: "16 / 9",
                              borderRadius: 18,
                              overflow: "hidden",
                              border: "1px solid #dbe2ea",
                              background: "#eef2f7",
                            }}
                          >
                            <img
                              src={video.thumbnail_url}
                              alt={video.title}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </div>
                        </a>
                      ) : (
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            textDecoration: "none",
                            borderRadius: 16,
                            padding: "12px 14px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            width: "fit-content",
                          }}
                        >
                          Open video
                        </a>
                      )}

                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            textDecoration: "none",
                            borderRadius: 999,
                            padding: "10px 14px",
                            background: "#0f172a",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Open original link
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
