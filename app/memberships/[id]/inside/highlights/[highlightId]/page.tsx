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

type HighlightRow = {
  id: string;
  community_id: string;
  type: string | null;
  title: string;
  content: string | null;
  content_rich: { html?: string } | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  link_label: string | null;
  expires_at: string | null;
  created_at: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function MembershipHighlightDetailPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<HighlightRow | null>(null);

  useEffect(() => {
    async function loadHighlight() {
      const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;
      const highlightId = Array.isArray(params?.highlightId)
        ? params.highlightId[0]
        : params?.highlightId;

      if (!communityId || !highlightId) {
        router.push("/memberships");
        return;
      }

      const { data, error } = await supabase
        .from("app_membership_highlights")
        .select("*")
        .eq("community_id", communityId)
        .eq("id", highlightId)
        .single();

      if (error || !data) {
        router.push(`/memberships/${communityId}/inside`);
        return;
      }

      setItem(data as HighlightRow);
      setLoading(false);
    }

    loadHighlight();
  }, [params, router, supabase]);

  if (loading || !item) return null;

  const richHtml = item.content_rich?.html?.trim() || "";
  const plainText = item.content?.trim() || "";
  const fallbackText = richHtml ? stripHtml(richHtml) : plainText;

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

        .highlight-rich-content {
          color: #0f172a;
          line-height: 1.75;
          font-size: 15px;
          word-break: break-word;
        }

        .highlight-rich-content p,
        .highlight-rich-content li,
        .highlight-rich-content h1,
        .highlight-rich-content h2,
        .highlight-rich-content h3,
        .highlight-rich-content h4,
        .highlight-rich-content h5,
        .highlight-rich-content h6,
        .highlight-rich-content span,
        .highlight-rich-content div {
          max-width: 100%;
          word-break: break-word;
        }

        .highlight-rich-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0;
        }

        .highlight-rich-content iframe {
          max-width: 100%;
          border: 0;
          border-radius: 0;
        }

        .highlight-rich-content a {
          color: #2563eb;
        }
      `}</style>

      <main
        className="page"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
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
            padding: "clamp(18px, 3vw, 24px)",
            border: "1px solid #d6dbe4",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          {item.image_url && (
            <div
              style={{
                marginBottom: 18,
                overflow: "hidden",
                borderRadius: 0,
                border: "1px solid #dbe2ea",
                background: "#eef2f7",
              }}
            >
              <img
  src={item.image_url}
  alt={item.title}
  style={{
    width: "100%",
    height: "260px",
    maxHeight: "40vh",
    objectFit: "contain",
background: "#f1f5f9",
    display: "block",
    borderRadius: 0,
  }}
/>
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}
          >
            Highlight
          </div>

          <h1
            style={{
              margin: "0 0 10px 0",
              fontSize: "clamp(24px, 4vw, 34px)",
              fontWeight: 800,
              lineHeight: 1.1,
              color: "#0f172a",
            }}
          >
            {item.title}
          </h1>

          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 20,
            }}
          >
            {new Date(item.created_at).toLocaleString()}
          </div>

          {richHtml ? (
            <div
              className="highlight-rich-content"
              dangerouslySetInnerHTML={{ __html: richHtml }}
            />
          ) : (
            <div
              style={{
                fontSize: 15,
                color: "#334155",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
              }}
            >
              {fallbackText}
            </div>
          )}

          {(item.video_url || item.link_url) && (
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              {item.video_url && (
                <a
                  href={item.video_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    padding: "10px 16px",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  Open video
                </a>
              )}

              {item.link_url && (
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    padding: "10px 16px",
                    background: "#e2e8f0",
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: 13,
                    border: "1px solid #cbd5e1",
                  }}
                >
                  {item.link_label?.trim() || "Open link"}
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
