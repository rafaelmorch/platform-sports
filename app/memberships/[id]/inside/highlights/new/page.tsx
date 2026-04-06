"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import dynamicImport from "next/dynamic";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ReactQuill = dynamicImport(() => import("react-quill-new"), { ssr: false });

export const dynamic = "force-dynamic";

export default function NewMembershipHighlightPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const [type, setType] = useState("announcement");
  const [title, setTitle] = useState("");
  const [contentRich, setContentRich] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    setMessage(null);

    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview("");
    }
  }

  async function uploadImage(file: File, communityId: string, userId: string) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${userId}/${communityId}/highlight-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("membership-highlights")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("membership-highlights")
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: data.publicUrl,
    };
  }

  async function handleCreate() {
    const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    if (!communityId || typeof communityId !== "string") {
      setMessage("Invalid community.");
      return;
    }

    if (!title.trim()) {
      setMessage("Title is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You must be logged in.");
        setSaving(false);
        return;
      }

      let uploadedImagePath: string | null = null;
      let uploadedImageUrl: string | null = null;

      if (imageFile) {
        const uploaded = await uploadImage(imageFile, communityId, user.id);
        uploadedImagePath = uploaded.path;
        uploadedImageUrl = uploaded.url;
      }

      const plainTextFallback = contentRich
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const { error } = await supabase
        .from("app_membership_highlights")
        .insert({
          community_id: communityId,
          type,
          title: title.trim(),
          content: plainTextFallback || null,
          content_rich: { html: contentRich || "" },
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
          image_path: uploadedImagePath,
          image_url: uploadedImageUrl,
          video_url: videoUrl.trim() || null,
          link_url: linkUrl.trim() || null,
          link_label: linkLabel.trim() || null,
        });

      if (error) {
        setMessage(error.message || "Failed to create highlight.");
        setSaving(false);
        return;
      }

      router.push(`/memberships/${communityId}/inside`);
    } catch (err: any) {
      setMessage(err?.message || "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

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

        .page {
          overflow-x: hidden;
        }

        .page .ql-toolbar.ql-snow {
          border: 1px solid #d6dbe4;
          border-bottom: 0;
          border-radius: 18px 18px 0 0;
          background: linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
          box-shadow:
            inset 1px 1px 0 rgba(255,255,255,0.95),
            inset -1px -1px 0 rgba(203,213,225,0.7);
          overflow-x: auto;
        }

        .page .ql-container.ql-snow {
          border: 1px solid #d6dbe4;
          border-radius: 0 0 18px 18px;
          background: #ffffff;
          min-height: 220px;
          box-shadow:
            inset 1px 1px 0 rgba(255,255,255,0.95),
            inset -2px -2px 6px rgba(203,213,225,0.45);
          overflow: hidden;
        }

        .page .ql-editor {
          min-height: 200px;
          font-size: 16px;
          color: #111827;
          line-height: 1.75;
          word-break: break-word;
        }

        .page .ql-picker {
          max-width: 100%;
        }

        .page .ql-snow .ql-tooltip {
          left: 0 !important;
          max-width: calc(100vw - 48px);
        }

        @media (max-width: 640px) {
          .page .ql-toolbar.ql-snow {
            padding: 8px 6px;
          }

          .page .ql-editor {
            min-height: 180px;
            font-size: 15px;
          }
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
        <div style={{ width: "100%", maxWidth: 900, margin: "0 auto 16px auto" }}>
          <BackArrow />
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 28,
            padding: "clamp(16px, 3vw, 24px)",
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
            overflow: "hidden",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(22px, 4vw, 24px)",
              fontWeight: 800,
              marginBottom: 20,
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            New Highlight
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 16,
              marginBottom: 18,
              width: "100%",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={inputStyle}
              >
                <option value="announcement">Announcement</option>
                <option value="weekly_plan">Weekly Plan</option>
                <option value="challenge">Challenge</option>
                <option value="result">Result</option>
                <option value="update">Update</option>
              </select>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Expires at</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16, minWidth: 0 }}>
            <label style={labelStyle}>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly training, challenge, announcement..."
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 18, minWidth: 0 }}>
            <label style={labelStyle}>Formatted content</label>
            <div style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
              <ReactQuill
                theme="snow"
                value={contentRich}
                onChange={setContentRich}
                modules={quillModules}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: 16,
              marginBottom: 18,
              width: "100%",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                style={fileInputStyle}
              />
              <div style={hintStyle}>Optional • JPG or PNG • up to 3 MB</div>

              <div style={previewFrameStyle}>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Highlight preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div style={emptyPreviewTextStyle}>Image preview</div>
                )}
              </div>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Video URL</label>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/... or other video link"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Link URL</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Link label</label>
                <input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Read more, Open page, Watch now..."
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {message && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 14,
                padding: "10px 12px",
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#9a3412",
                fontSize: 13,
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            style={{
              width: "100%",
              maxWidth: 260,
              padding: "12px 18px",
              borderRadius: 999,
              border: 0,
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving..." : "Create highlight"}
          </button>
        </div>
      </main>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 8,
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginTop: 8,
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  borderRadius: 18,
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)",
  color: "#111827",
  padding: "13px 15px",
  fontSize: 14,
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.98), inset -2px -2px 6px rgba(203,213,225,0.45)",
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "11px 12px",
};

const previewFrameStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 220,
  marginTop: 12,
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%)",
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.95), inset -2px -2px 6px rgba(203,213,225,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyPreviewTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
  padding: "12px",
};
