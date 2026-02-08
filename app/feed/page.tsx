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

export default function FeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

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

    const rawPosts = postsData as Post[];
    const postIds = rawPosts.map((p) => p.id);

    const likeCountMap: Record<string, number> = {};
    const commentCountMap: Record<string, number> = {};
    const likedByUser = new Set<string>();

    if (postIds.length > 0) {
      const { data: likesData } = await supabaseBrowser
        .from("feed_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      likesData?.forEach((row: any) => {
        likeCountMap[row.post_id] = (likeCountMap[row.post_id] ?? 0) + 1;
        if (row.user_id === user.id) likedByUser.add(row.post_id);
      });

      const { data: commentsData } = await supabaseBrowser
        .from("feed_comments")
        .select("post_id")
        .in("post_id", postIds);

      commentsData?.forEach((row: any) => {
        commentCountMap[row.post_id] = (commentCountMap[row.post_id] ?? 0) + 1;
      });
    }

    const postsWithCounters = rawPosts.map((p) => ({
      ...p,
      likes: likeCountMap[p.id] ?? 0,
      comments_count: commentCountMap[p.id] ?? 0,
    }));

    setPosts(postsWithCounters);
    setLikedPosts(likedByUser);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e5e7eb" }}>
      <main style={{ padding: 16, paddingBottom: 72 }}>
        <h1>Training Feed</h1>

        {loading && <p>Loading posts…</p>}

        {!loading &&
          posts.map((post) => (
            <div key={post.id}>
              <p>{post.content}</p>
            </div>
          ))}
      </main>

      <BottomNavbar />
    </div>
  );
}
