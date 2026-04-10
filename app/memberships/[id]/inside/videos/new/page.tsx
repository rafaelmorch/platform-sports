"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

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

export default function NewMembershipVideoPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const params = useParams();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isPublished, setIsPublished] = useState(true);

  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

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
      const canManageCommunity = profile?.is_admin === true || isCreator;

      if (!canManageCommunity) {
        router.push(`/memberships/${communityId}/inside/videos`);
        return;
      }

      setCommunityName(typedCommunity.name || null);
      setAllowed(true);
      setLoading(false);
    }

    load();
  }, [communityId, router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!communityId || typeof communityId !== "string") return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanVideoUrl = videoUrl.trim();
    const cleanThumbnailUrl = thumbnailUrl.trim();
    const parsedSortOrder = Number(sortOrder);

    if (!cleanTitle) {
      setWarning("Title is required.");
      return;
    }

    if (!cleanVideoUrl) {
      setWarning("Video URL is required.");
      return;
    }

    if (Number.isNaN(parsedSortOrder)) {
      setWarning("Sort order must be a valid number.");
      return;
    }

    setSaving(true);
    setWarning(null);

    const { error } = await supabase.from("app_membership_videos").insert({
      community_id: communityId,
      title: cleanTitle,
      description: cleanDescription || null,
      video_url: cleanVideoUrl,
      thumbnail_url: cleanThumbnailUrl || null,
      sort_order: parsedSortOrder,
      is_published: isPublished,
    });

    if (error) {
      console.error("Error creating membership video:", error);
      setWarning(error.message || "Failed to create video.");
      setSaving(false);
      return;
    }

    router.push(`/memberships/${communityId}/inside/videos`);
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
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#64748b",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Videos
            </div>

            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 24px)",
                fontWeight: 800,
                margin: 0,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              Add Video
            </h1>

            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 14,
                color: "#64748b",
                lineHeight: 1.6,
              }}
            >
              {communityName ? `Community: ${communityName}` : "Create a new training video item."}
            </p>
          </div>

          {warning && (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 18,
                padding: "12px 14px",
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#9a3412",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {warning}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              <label style={{ display: "block" }}>
                <div style={labelStyle}>Title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Run Technique Session 01"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Short explanation about this video."
                  style={textareaStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Video URL</div>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../preview"
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={labelStyle}>Thumbnail URL</div>
                <input
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <label style={{ display: "block" }}>
                  <div style={labelStyle}>Sort order</div>
                  <input
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingTop: 28,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  >
                    Published
                  </span>
                </label>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => router.push(`/memberships/${communityId}/inside/videos`)}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#f8fafc",
                  color: "#0f172a",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 800,
                  background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                  color: "#f8fafc",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving..." : "Save video"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 7,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)",
  color: "#111827",
  padding: "13px 15px",
  fontSize: 14,
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.98), inset -2px -2px 6px rgba(203,213,225,0.45)",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 120,
};
