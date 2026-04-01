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

export default function MembershipInsidePage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [communityName, setCommunityName] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: request } = await supabase
        .from("app_membership_requests")
        .select("status")
        .eq("community_id", id)
        .eq("user_id", user.id)
        .single();

      if (!request || request.status !== "approved") {
        router.push(`/memberships/${id}`);
        return;
      }

      const { data: community } = await supabase
        .from("app_membership_communities")
        .select("name")
        .eq("id", id)
        .single();

      setCommunityName(community?.name || null);
      setAllowed(true);
      setLoading(false);
    }

    checkAccess();
  }, [params, supabase, router]);

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
          padding: 16,
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
            padding: 24,
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
          }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
            {communityName}
          </h1>

          {/* 🔥 5.1 Destaques */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              🔥 Highlights
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: weekly news, challenges and announcements.
            </div>
          </div>

          {/* 🏆 5.2 Ranking */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              🏆 Ranking
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: community leaderboard based on check-ins.
            </div>
          </div>

          {/* 📸 5.3 Feed */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              📸 Community Feed
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: posts, photos and interactions.
            </div>
          </div>

          {/* ➕ 5.4 Check-in */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              ➕ Check-in
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: register your activity and earn points.
            </div>
          </div>

          {/* 🥇 5.5 Leader */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
              🥇 Leader of the Month
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: monthly highlight.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
