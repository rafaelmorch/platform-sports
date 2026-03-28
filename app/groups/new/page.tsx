"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

export default function CreateGroupPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== styles =====
  const pageBg = "#f3f4f6";
  const textMain = "#0f172a";
  const textSub = "rgba(15,23,42,0.65)";

  const cardStyle = useMemo(
    () => ({
      borderRadius: 16,
      border: "1px solid rgba(15,23,42,0.10)",
      background: "#e5e7eb",
      boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
      padding: 14,
    }),
    []
  );

  const inputStyle = useMemo(
    () => ({
      width: "100%",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.16)",
      background: "#f9fafb",
      color: textMain,
      padding: "10px 12px",
      outline: "none",
      fontSize: 13,
    }),
    [textMain]
  );

  const buttonPrimary = useMemo(
    () => ({
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.18)",
      background: "#111827",
      color: "#ffffff",
      fontWeight: 900 as const,
      cursor: "pointer",
    }),
    []
  );

  // ✅ auth
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;

      if (cancelled) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
      setCheckingAuth(false);
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createGroup() {
    setError(null);

    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    if (!userId) return;

    setLoading(true);

    let imageUrl: string | null = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabaseBrowser.storage
        .from("group-images")
        .upload(fileName, imageFile, { upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabaseBrowser.storage
        .from("group-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabaseBrowser
      .from("app_groups")
      .insert({
        name: name.trim(),
        goal: goal.trim() || null,
        is_public: isPublic,
        created_by: userId,
        image_url: imageUrl,
      })
      .select("id")
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabaseBrowser
      .from("app_group_members")
      .insert({
        group_id: data.id,
        user_id: userId,
        status: "active",
      });

    if (memberError) {
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.replace(`/groups/${data.id}`);
  }

  if (checkingAuth) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: pageBg,
        color: textMain,
        padding: "16px",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ marginBottom: 10 }}>
          <BackArrow />
        </div>

        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
          Create Group
        </h1>

        <div style={{ height: 12 }} />

        {/* FORM */}
        <div style={cardStyle}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                Group Name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Orlando Runners"
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                Goal
              </div>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe the purpose of the group..."
                style={{
                  ...inputStyle,
                  minHeight: 100,
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                Group Image
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setImageFile(file);
                }}
                style={inputStyle}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: textSub, marginBottom: 6 }}>
                Visibility
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "1px solid rgba(15,23,42,0.16)",
                    background: isPublic ? "#111827" : "#f9fafb",
                    color: isPublic ? "#fff" : textMain,
                    fontWeight: 900,
                  }}
                >
                  Public
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "1px solid rgba(15,23,42,0.16)",
                    background: !isPublic ? "#111827" : "#f9fafb",
                    color: !isPublic ? "#fff" : textMain,
                    fontWeight: 900,
                  }}
                >
                  Private
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 12 }} />

        {/* ERROR */}
        {error && (
          <div style={cardStyle}>
            <p style={{ margin: 0, color: "#b91c1c", fontWeight: 900 }}>
              {error}
            </p>
          </div>
        )}

        <div style={{ height: 12 }} />

        {/* BUTTON */}
        <div style={cardStyle}>
          <button
            onClick={createGroup}
            disabled={loading}
            style={{
              ...buttonPrimary,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </main>
  );
}