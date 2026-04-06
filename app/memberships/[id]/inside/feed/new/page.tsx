"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function NewMembershipPostPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) return;

    setLoading(true);
    setErrorText(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Error getting user:", userError);
      setErrorText(userError.message || "Could not get current user.");
      setLoading(false);
      return;
    }

    if (!user || !communityId) {
      setErrorText("Missing user session or community id.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error loading profile:", profileError);
    }

    const authorName =
      profile?.full_name?.trim() || user.email?.split("@")[0] || "Athlete";

    let imageUrl: string | null = null;

    if (imageFile) {
      const safeName = imageFile.name.replace(/\s+/g, "-");
      const filePath = `${communityId}/${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("membership-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("Error uploading image:", uploadError);
        setErrorText(
          [
            uploadError.message,
            uploadError.name,
          ]
            .filter(Boolean)
            .join(" | ") || "Error uploading image."
        );
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("membership-images")
        .getPublicUrl(filePath);

      imageUrl = data.publicUrl;
    }

    const payload = {
      community_id: communityId,
      user_id: user.id,
      author_name: authorName,
      content: content.trim(),
      image_url: imageUrl,
    };

    console.log("Creating membership feed post with payload:", payload);

    const { data, error } = await supabase
      .from("app_membership_feed_posts")
      .insert(payload)
      .select();

    if (error) {
      console.error("Error creating post:", error);
      setErrorText(
        [
          error.message,
          error.code,
          error.name,
        ]
          .filter(Boolean)
          .join(" | ") || "Unknown error creating post."
      );
      setLoading(false);
      return;
    }

    console.log("Post created successfully:", data);
    router.push(`/memberships/${communityId}/inside`);
  }

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
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <BackArrow />

        <div
          style={{
            marginTop: 20,
            borderRadius: 24,
            padding: 20,
            background: "#fff",
            border: "1px solid #e2e8f0",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 16,
              color: "#0f172a",
            }}
          >
            Create Post
          </h1>

          <textarea
            placeholder="Share something with the community..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: "100%",
              minHeight: 120,
              borderRadius: 16,
              border: "1px solid #d6dbe4",
              padding: 12,
              fontSize: 14,
              outline: "none",
              resize: "none",
              marginBottom: 12,
              color: "#0f172a",
              background: "#fff",
            }}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            style={{ marginBottom: 16 }}
          />

          {errorText && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 14,
                padding: "12px 14px",
                background: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {errorText}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 999,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </main>
  );
}
