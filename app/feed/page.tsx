// app/feed/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import BottomNavbar from "@/components/BottomNavbar";

type Post = {
  id: string;
  created_at: string;
  author_name: string | null;
  content: string;
  image_url: string | null;
  likes: number;
  comments_count: number;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

/* ================= Avatar helpers ================= */

function initialsFromProfile(fullName: string | null | undefined, fallbackId: string | null | undefined): string {
  const name = (fullName ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const a = parts[0].slice(0, 1);
    const b = parts[parts.length - 1].slice(0, 1);
    return `${a}${b}`.toUpperCase();
  }

  const uid = (fallbackId ?? "").trim();
  if (uid.length >= 2) return uid.slice(0, 2).toUpperCase();
  if (uid.length === 1) return uid.toUpperCase();
  return "?";
}

function hashToHue(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function avatarStyleFromId(id: string) {
  const hue = hashToHue(id);

  const base = `hsl(${hue} 60% 22%)`;
  const light = `hsl(${hue} 70% 38%)`;
  const highlight = `hsl(${hue} 80% 70% / 0.22)`;
  const border = `hsl(${hue} 70% 55% / 0.55)`;

  return {
    background: `radial-gradient(circle at 30% 28%, ${highlight} 0%, transparent 38%), radial-gradient(circle at 30% 30%, ${light} 0%, ${base} 60%)`,
    border: `1px solid ${border}`,
    color: "rgba(255,255,255,0.94)",
    boxShadow:
      "inset 0 10px 16px rgba(255,255,255,0.08), inset 0 -10px 18px rgba(0,0,0,0.35), 0 10px 22px rgba(0,0,0,0.35)",
  } as const;
}

/* ================= Page ================= */

export default function FeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const [likeLoadingPostId, setLikeLoadingPostId] = useState<string | null>(null);
  const [commentLoadingPostId, setCommentLoadingPostId] = useState<string | null>(null);

  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);

    const {
      data: { session },
    } = await supabaseBrowser.auth.getSession();

    if (!session) {
      router.push("/login");
      return;
    }

    const user = session.user;
    setUserId(user.id);

    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    setUserName(profile?.full_name ?? null);

    const { data: postsData } = await supabaseBrowser
      .from("feed_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!postsData) {
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts(postsData as Post[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main style={{ flex: 1, padding: "16px", paddingBottom: "72px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <h1 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>
                Training Feed
              </h1>

              <p
                style={{
                  fontSize: "13px",
                  color: "#60a5fa",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Challenges push you to the next level. Share yours in sport today.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                onClick={() => router.push("/feed/new")}
                style={{
                  padding: "9px 14px",
                  borderRadius: "999px",
                  background: "#22c55e",
                  color: "#020617",
                  fontSize: "13px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                New post
              </button>

              <img src="/ps.png" alt="Platform Sports" style={{ height: 86 }} />
            </div>
          </div>

          {loading && <p>Loading posts…</p>}

          {!loading && posts.length === 0 && <p>No posts yet.</p>}
        </div>
      </main>

      <BottomNavbar />
    </div>
  );
}
