// app/memberships/[id]/inside/checkin/new/page.tsx
"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ChallengeRow = {
  id: string;
  title: string;
  activity_type: string;
  goal_criteria: string | null;
  deadline: string;
  points_active: number;
  points_late: number;
};

function formatActivityType(value: string): string {
  if (!value) return "Training";
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function NewCheckinPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const challengeId = searchParams.get("challenge_id");

  const [activityType, setActivityType] = useState("Training");
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<ChallengeRow | null>(null);

  useEffect(() => {
    async function loadChallenge() {
      if (!challengeId) return;

      const { data, error } = await supabase
        .from("app_membership_challenges")
        .select("id, title, activity_type, goal_criteria, deadline, points_active, points_late")
        .eq("id", challengeId)
        .single();

      if (error || !data) {
        console.error("Error loading challenge:", error);
        return;
      }

      const typed = data as ChallengeRow;
      setChallenge(typed);
      setActivityType(formatActivityType(typed.activity_type));
    }

    loadChallenge();
  }, [challengeId, supabase]);

  async function handleSubmit() {
    setLoading(true);
    setErrorText(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !communityId) {
      setErrorText("Missing user.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const authorName =
      profile?.full_name?.trim() || user.email?.split("@")[0] || "Athlete";

    let imageUrl: string | null = null;

    if (imageFile) {
      const path = `${communityId}/${user.id}/${Date.now()}-${imageFile.name}`;

      const { error } = await supabase.storage
        .from("membership-images")
        .upload(path, imageFile);

      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("membership-images")
        .getPublicUrl(path);

      imageUrl = data.publicUrl;
    }

    let points = 10;

    if (challengeId) {
      let challengeData = challenge;

      if (!challengeData) {
        const { data, error } = await supabase
          .from("app_membership_challenges")
          .select("id, title, activity_type, goal_criteria, deadline, points_active, points_late")
          .eq("id", challengeId)
          .single();

        if (error || !data) {
          setErrorText("Challenge not found.");
          setLoading(false);
          return;
        }

        challengeData = data as ChallengeRow;
      }

      const now = new Date();
      const deadline = new Date(challengeData.deadline);

      if (now <= deadline) {
        points = challengeData.points_active || 25;
      } else {
        points = challengeData.points_late || 15;
      }
    }

    const { error } = await supabase
      .from("app_membership_checkins")
      .insert({
        community_id: communityId,
        user_id: user.id,
        author_name: authorName,
        activity_type: activityType,
        comment,
        image_url: imageUrl,
        points,
        challenge_id: challengeId || null,
      });

    if (error) {
      setErrorText(error.message);
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
        padding: 16,
        fontFamily: "Montserrat, Arial",
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
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>New Check-in</h1>

          {challenge && (
            <div
              style={{
                marginTop: 14,
                borderRadius: 16,
                padding: 14,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#c2410c",
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  marginBottom: 6,
                }}
              >
                Challenge
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.3,
                  marginBottom: 6,
                }}
              >
                {challenge.title}
              </div>

              <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.5 }}>
                Ends {new Date(challenge.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {challenge.goal_criteria && (
                <div style={{ fontSize: 13, color: "#7c2d12", lineHeight: 1.5, marginTop: 6 }}>
                  {challenge.goal_criteria}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    color: "#166534",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  +{challenge.points_active || 25} pts on time
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#dbeafe",
                    border: "1px solid #93c5fd",
                    color: "#1d4ed8",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  +{challenge.points_late || 15} pts late
                </div>
              </div>
            </div>
          )}

          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              border: "1px solid #ccc",
            }}
          >
            <option>Training</option>
            <option>Match</option>
            <option>Run</option>
            <option>Workout</option>
            <option>Bike</option>
            <option>Swim</option>
            <option>Trail</option>
            <option>Other</option>
          </select>

          <textarea
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              marginTop: 12,
              minHeight: 100,
              borderRadius: 12,
              padding: 10,
              border: "1px solid #ccc",
            }}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            style={{ marginTop: 12 }}
          />

          {errorText && (
            <div style={{ color: "red", marginTop: 10 }}>{errorText}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 16,
              width: "100%",
              padding: 12,
              borderRadius: 999,
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              border: "none",
            }}
          >
            {loading
              ? "Saving..."
              : challenge
              ? "Check-in Challenge"
              : "Check-in (+10 pts)"}
          </button>
        </div>
      </div>
    </main>
  );
}
