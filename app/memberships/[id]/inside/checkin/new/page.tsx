// app/memberships/[id]/inside/checkin/new/page.tsx
"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function NewCheckinPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const challengeId = searchParams.get("challenge_id");

  const [loading, setLoading] = useState(false);
  const [activityType, setActivityType] = useState("run");
  const [imageFile, setImageFile] = useState<File | null>(null);

  async function handleSubmit() {
    if (!communityId) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    let image_url = null;

    if (imageFile) {
      const filePath = `${user.id}/${Date.now()}-${imageFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        alert(uploadError.message);
        setLoading(false);
        return;
      }

      const { data } = supabase.storage
        .from("event-images")
        .getPublicUrl(filePath);

      image_url = data.publicUrl;
    }

    let totalPoints = 10;

    // 🔥 AQUI ESTÁ A LÓGICA DO CHALLENGE
    if (challengeId) {
      const { data: challenge } = await supabase
        .from("app_membership_challenges")
        .select("deadline, points_active, points_late")
        .eq("id", challengeId)
        .single();

      if (challenge) {
        const now = new Date();
        const deadline = new Date(challenge.deadline);

        if (now <= deadline) {
          totalPoints = 10 + (challenge.points_active || 25);
        } else {
          totalPoints = 10 + (challenge.points_late || 15);
        }
      }
    }

    const { error } = await supabase.from("app_membership_checkins").insert({
      community_id: communityId,
      user_id: user.id,
      activity_type: activityType,
      image_url,
      points: totalPoints,
      challenge_id: challengeId || null,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push(`/memberships/${communityId}/inside`);
  }

  return (
    <main style={{ padding: 20 }}>
      <BackArrow />

      <h1>New Check-in</h1>

      <div style={{ marginTop: 20 }}>
        <select
          value={activityType}
          onChange={(e) => setActivityType(e.target.value)}
        >
          <option value="run">Run</option>
          <option value="bike">Bike</option>
          <option value="swim">Swim</option>
          <option value="workout">Workout</option>
          <option value="trail">Trail</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div style={{ marginTop: 20 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          borderRadius: 8,
          background: "#0f172a",
          color: "#fff",
        }}
      >
        {loading ? "Posting..." : "Post Check-in"}
      </button>
    </main>
  );
}
