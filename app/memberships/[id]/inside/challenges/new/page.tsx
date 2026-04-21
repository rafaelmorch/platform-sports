// app/memberships/[id]/inside/challenges/new/page.tsx
"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function NewMembershipChallengePage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const communityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activityType, setActivityType] = useState("run");
  const [goalCriteria, setGoalCriteria] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pointsActive, setPointsActive] = useState("25");
  const [pointsLate, setPointsLate] = useState("15");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setErrorText(null);

    if (!communityId) {
      setErrorText("Missing community.");
      setLoading(false);
      return;
    }

    if (!title.trim()) {
      setErrorText("Title is required.");
      setLoading(false);
      return;
    }

    if (!deadline) {
      setErrorText("Deadline is required.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorText("Missing user.");
      setLoading(false);
      return;
    }

    const activePointsNumber = Number(pointsActive);
    const latePointsNumber = Number(pointsLate);

    if (Number.isNaN(activePointsNumber) || activePointsNumber < 0) {
      setErrorText("Points on time must be a valid number.");
      setLoading(false);
      return;
    }

    if (Number.isNaN(latePointsNumber) || latePointsNumber < 0) {
      setErrorText("Points late must be a valid number.");
      setLoading(false);
      return;
    }

    const deadlineIso = new Date(deadline).toISOString();

    const { error } = await supabase.from("app_membership_challenges").insert({
      community_id: communityId,
      created_by: user.id,
      title: title.trim(),
      description: description.trim() || null,
      activity_type: activityType.trim().toLowerCase(),
      goal_criteria: goalCriteria.trim() || null,
      deadline: deadlineIso,
      points_active: activePointsNumber,
      points_late: latePointsNumber,
      is_active: isActive,
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
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <BackArrow />

        <div
          style={{
            marginTop: 20,
            background: "#fff",
            borderRadius: 24,
            padding: 20,
            border: "1px solid #e2e8f0",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.12), -6px -6px 20px rgba(255,255,255,0.9)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 6px 0",
            }}
          >
            New Challenge
          </h1>

          <div
            style={{
              fontSize: 14,
              color: "#64748b",
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            Create a challenge for this community. Closed cards will show title and deadline.
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
                <label
                  style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Run 10K under 1 hour"
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",                  boxSizing: "border-box",                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
                <label
                  style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Complete this challenge and submit your proof through check-in."
                style={{
                  width: "100%",
                  minHeight: 90,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",                  boxSizing: "border-box",                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
                <label
                  style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Activity type
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  background: "#fff",
                }}
              >
                <option value="run">Run</option>
                <option value="bike">Bike</option>
                <option value="swim">Swim</option>
                <option value="workout">Workout</option>
                <option value="trail">Trail</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ minWidth: 0 }}>
                <label
                  style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Goal criteria
              </label>
              <textarea
                value={goalCriteria}
                onChange={(e) => setGoalCriteria(e.target.value)}
                placeholder="Finish 10K under 60 minutes."
                style={{
                  width: "100%",
                  minHeight: 90,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",
                  resize: "vertical",                  boxSizing: "border-box",                }}
              />
            </div>

            <div style={{ minWidth: 0 }}>
                <label
                  style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#334155",
                  marginBottom: 6,
                }}
              >
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  outline: "none",                  boxSizing: "border-box",                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",                gap: 12,                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Points on time
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsActive}
                  onChange={(e) => setPointsActive(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",                  boxSizing: "border-box",                }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Points late
                </label>
                <input
                  type="number"
                  min="0"
                  value={pointsLate}
                  onChange={(e) => setPointsLate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    outline: "none",                  boxSizing: "border-box",                }}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
                fontSize: 14,
                color: "#334155",
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active challenge
            </label>
          </div>

          {errorText && (
            <div
              style={{
                color: "#b91c1c",
                marginTop: 14,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {errorText}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 18,
              width: "100%",
              padding: 12,
              borderRadius: 999,
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Saving..." : "Create Challenge"}
          </button>
        </div>
      </div>
    </main>
  );
}



