"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACTIVITY_OPTIONS = [
  "Run",
  "Bike",
  "Swimming",
  "Workout",
  "Trail Run",
  "Match",
  "Free Training",
];

export default function NewCheckinPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [activityType, setActivityType] = useState("Run");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setErrorText(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setErrorText(userError.message || "Could not get current user.");
      setLoading(false);
      return;
    }

    if (!user || !communityId) {
      setErrorText("Missing user session or community id.");
      setLoading(false);
      return;
    }

    if (!imageFile) {
      setErrorText("Please upload an image with proof of the workout.");
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

    const safeName = imageFile.name.replace(/\s+/g, "-");
    const filePath = `${communityId}/${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("membership-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Error uploading check-in image:", uploadError);
      setErrorText(
        [
          uploadError.message,
          uploadError.details,
          uploadError.hint,
          uploadError.name,
        ]
          .filter(Boolean)
          .join(" | ") || "Error uploading image."
      );
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("membership-images")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { error: insertError } = await supabase
      .from("app_membership_checkins")
      .insert({
        community_id: communityId,
        user_id: user.id,
        author_name: authorName,
        activity_type: activityType,
        image_url: imageUrl,
        image_path: filePath,
      });

    if (insertError) {
      console.error("Error creating check-in:", insertError);
      setErrorText(
        [
          insertError.message,
          insertError.details,
          insertError.hint,
          insertError.code,
          insertError.name,
        ]
          .filter(Boolean)
          .join(" | ") || "Error creating check-in."
      );
      setLoading(false);
      return;
    }

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
            background: "#fff",
            borderRadius: 24,
            padding: 20,
            border: "1px solid #e2e8f0",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 10px 0",
              color: "#0f172a",
            }}
          >
            New Check-in
          </h1>

          <div
            style={{
              borderRadius: 16,
              padding: "12px 14px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e3a8a",
              fontSize: 13,
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            Upload a photo from your phone or watch showing proof of the workout
            (for example: Strava, Apple Watch, Garmin, or similar).
          </div>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#334155",
              marginBottom: 8,
            }}
          >
            Activity Type
          </label>

          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid #d6dbe4",
              background: "#fff",
              color: "#0f172a",
              fontSize: 14,
              outline: "none",
              marginBottom: 14,
            }}
          >
            {ACTIVITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#334155",
              marginBottom: 8,
            }}
          >
            Workout Proof Image
          </label>

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
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Saving..." : "Check-in (+10 pts)"}
          </button>
        </div>
      </div>
    </main>
  );
}
