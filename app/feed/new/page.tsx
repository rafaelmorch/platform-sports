// app/feed/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Supabase client for the browser using public env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Profile = {
  full_name: string | null;
};

export default function NewFeedPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(true);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setErrorMsg(null);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error fetching user:", userError);
          setErrorMsg("Error loading user.");
          return;
        }

        if (!user) {
          setErrorMsg("You must be logged in to post.");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle<Profile>();

        if (profileError) console.error("Error fetching profile:", profileError);

        const nameFromProfile = profile?.full_name || null;
        const meta: any = user.user_metadata || {};
        const nameFromMeta = meta.full_name || meta.name || null;

        const finalName =
          nameFromProfile || nameFromMeta || user.email || "Athlete";

        setAuthorName(finalName);
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
        setErrorMsg("Unexpected error loading profile.");
      } finally {
        setLoadingAuthor(false);
      }
    };

    loadProfile();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(null);
  };

  const uploadImageIfNeeded = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabase.storage
      .from("feed-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      throw new Error("Could not upload the image.");
    }

    const { data: publicData } = supabase.storage
      .from("feed-images")
      .getPublicUrl(filePath);

    return publicData?.publicUrl ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!authorName) {
      setErrorMsg("Could not load the profile name.");
      return;
    }

    if (!content.trim() && !imageFile) {
      setErrorMsg("Write something or select an image to post.");
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("You must be logged in to post.");
        setLoading(false);
        return;
      }

      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImageIfNeeded(user.id);

      const { error: insertError } = await supabase.from("feed_posts").insert({
        content: content.trim() || null,
        author_name: authorName,
        image_url: imageUrl,
      });

      if (insertError) {
        console.error("Error saving post:", insertError);
        setErrorMsg("Error saving the post.");
        setLoading(false);
        return;
      }

      setLoading(false);
      router.push("/feed");
    } catch (err: any) {
      console.error("Unexpected error saving post:", err);
      setErrorMsg(err.message || "Unexpected error saving the post.");
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ FIX da margem branca no app (WebView): zera html/body/#__next e força fundo escuro */}
      <style jsx global>{`
        html,
        body,
        #__next {
          margin: 0 !important;
          padding: 0 !important;
          background: #020617 !important;
          width: 100% !important;
          height: 100% !important;
          overflow-x: hidden;
        }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          padding: "16px",
          paddingRight: "18px", // ✅ pequena “margem” extra à direita
          paddingBottom: "24px",
          margin: 0,
          boxSizing: "border-box", // ✅ evita estourar pra fora
          width: "100%", // ✅ NÃO usar 100vw (causa overflow no mobile)
        }}
      >
        {/* Top bar with Back (standard) */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.65)",
              color: "#e5e7eb",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.02em",
              boxShadow:
                "0 10px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
              flex: "0 0 auto",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>
              ←
            </span>
            <span>Back</span>
          </button>

          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              New post
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "#9ca3af",
                margin: 0,
                marginTop: 2,
              }}
            >
              Share a workout, an achievement, or a message with your group.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ marginBottom: 12, fontSize: 13, color: "#9ca3af" }}>
            Posting as{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              {loadingAuthor ? "loading..." : authorName ?? "—"}
            </span>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post..."
              rows={4}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: 10,
                border: "1px solid rgba(55,65,81,0.9)",
                backgroundColor: "#020617",
                color: "#e5e7eb",
                fontSize: 16,
                resize: "vertical",
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="image" style={{ fontSize: 12, color: "#d1d5db" }}>
                Image (optional)
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ fontSize: 16, color: "#e5e7eb" }}
              />

              {imagePreview && (
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(55,65,81,0.9)",
                    maxHeight: 260,
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              )}

              <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                Supported formats: JPG, PNG, etc.
              </p>
            </div>

            {errorMsg && (
              <p style={{ fontSize: 12, color: "#fca5a5", margin: 0 }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || loadingAuthor}
              style={{
                marginTop: 4,
                borderRadius: 999,
                padding: "10px 16px",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                background: "#22c55e",
                color: "#ffffff",
                cursor: loading || loadingAuthor ? "not-allowed" : "pointer",
                opacity: loading || loadingAuthor ? 0.6 : 1,
              }}
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
