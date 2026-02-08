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

export default function FeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>(
    {}
  );
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

    setPosts(postsData as Post[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <>
      {/* ✅ FORÇA FUNDO PRETO GLOBAL */}
      <style jsx global>{`
        html,
        body,
        #__next {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          width: "100vw",
        }}
      >
        <main
          style={{
            flex: 1,
            padding: "16px",
            paddingBottom: "72px",
          }}
        >
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            {/* ✅ Logo topo */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <img
                src="/logo-sports-platform.png"
                alt="Platform Sports"
                style={{
                  width: "100%",
                  maxWidth: "320px",
                  height: "auto",
                }}
              />
            </div>

            <h1 style={{ fontSize: 20, fontWeight: 800 }}>
              Feed de Treinos
            </h1>

            {loading && <p>Carregando postagens...</p>}

            {!loading &&
              posts.map((post) => (
                <article key={post.id}>
                  <p>{post.content}</p>
                </article>
              ))}
          </div>
        </main>

        <BottomNavbar />
      </div>
    </>
  );
}
