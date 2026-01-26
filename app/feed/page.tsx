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

/* ================= Avatar helpers (same as Activities) ================= */

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

  // posts the user already liked
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // comment text per post
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const [likeLoadingPostId, setLikeLoadingPostId] = useState<string | null>(null);
  const [commentLoadingPostId, setCommentLoadingPostId] = useState<string | null>(null);

  // loaded comments per post
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>({});
  // which posts have comments open
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);

  async function loadPosts() {
    setLoading(true);

    // ✅ 0) ensure session (block page)
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
    }

    if (!session) {
      router.push("/login");
      return; // ⛔ stop
    }

    const user = session.user;

    setUserId(user.id);

    // 1) user name (profile)
    const { data: profile } = await supabaseBrowser.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

    if (profile?.full_name) {
      setUserName(profile.full_name);
    } else {
      setUserName(null);
    }

    // 2) posts
    const { data: postsData, error: postsError } = await supabaseBrowser.from("feed_posts").select("*").order("created_at", { ascending: false });

    if (postsError || !postsData) {
      console.error("Error loading posts:", postsError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const rawPosts = postsData as Post[];
    const postIds = rawPosts.map((p) => p.id);

    // maps for likes and comments
    const likeCountMap: Record<string, number> = {};
    const commentCountMap: Record<string, number> = {};
    const likedByCurrentUser = new Set<string>();

    if (postIds.length > 0) {
      // 3) post likes
      const { data: likesData, error: likesError } = await supabaseBrowser.from("feed_likes").select("post_id, user_id").in("post_id", postIds);

      if (!likesError && likesData) {
        (likesData as any[]).forEach((row) => {
          const pid = row.post_id as string;
          likeCountMap[pid] = (likeCountMap[pid] ?? 0) + 1;

          if (row.user_id === user.id) {
            likedByCurrentUser.add(pid);
          }
        });
      }

      // 4) post comments count
      const { data: commentsData, error: commentsError } = await supabaseBrowser.from("feed_comments").select("post_id").in("post_id", postIds);

      if (!commentsError && commentsData) {
        (commentsData as any[]).forEach((row) => {
          const pid = row.post_id as string;
          commentCountMap[pid] = (commentCountMap[pid] ?? 0) + 1;
        });
      }
    }

    const postsWithCounters = rawPosts.map((p) => ({
      ...p,
      likes: likeCountMap[p.id] ?? 0,
      comments_count: commentCountMap[p.id] ?? 0,
    }));

    setPosts(postsWithCounters);
    setLikedPosts(likedByCurrentUser);
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- LIKE / UNLIKE (1 per user) ----------
  async function handleLike(postId: string) {
    if (!userId) {
      alert("Please log in to like posts.");
      return;
    }

    const alreadyLiked = likedPosts.has(postId);
    setLikeLoadingPostId(postId);

    if (alreadyLiked) {
      // UNLIKE
      const { error } = await supabaseBrowser.from("feed_likes").delete().eq("post_id", postId).eq("user_id", userId);

      if (error) {
        console.error("Error removing like:", error);
      } else {
        setLikedPosts((prev) => {
          const copy = new Set(prev);
          copy.delete(postId);
          return copy;
        });
        setPosts((current) => current.map((post) => (post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post)));
      }
    } else {
      // LIKE
      const { error } = await supabaseBrowser.from("feed_likes").insert({ post_id: postId, user_id: userId });

      if (error) {
        console.error("Error saving like:", error);
      } else {
        setLikedPosts((prev) => {
          const copy = new Set(prev);
          copy.add(postId);
          return copy;
        });
        setPosts((current) => current.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post)));
      }
    }

    setLikeLoadingPostId(null);
  }

  // ---------- LOAD / TOGGLE COMMENTS ----------
  async function toggleComments(postId: string) {
    // if already open, close
    if (openComments.has(postId)) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.delete(postId);
        return copy;
      });
      return;
    }

    // if already loaded, just open
    if (postComments[postId]) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
      return;
    }

    // load from Supabase
    setLoadingCommentsPostId(postId);

    const { data, error } = await supabaseBrowser.from("feed_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
    } else if (data) {
      setPostComments((prev) => ({
        ...prev,
        [postId]: data as Comment[],
      }));
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
    }

    setLoadingCommentsPostId(null);
  }

  // ---------- COMMENT ----------
  async function handleSubmitComment(postId: string) {
    const text = (commentText[postId] || "").trim();

    if (!text) return;
    if (!userId) {
      alert("Please log in to comment.");
      return;
    }

    setCommentLoadingPostId(postId);

    const { data, error } = await supabaseBrowser
      .from("feed_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        author_name: userName,
        content: text,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving comment:", error);
    } else if (data) {
      const newComment = data as Comment;

      // clear input
      setCommentText((prev) => ({
        ...prev,
        [postId]: "",
      }));

      // increment counter
      setPosts((current) => current.map((post) => (post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post)));

      // if loaded, append
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), newComment],
      }));
    }

    setCommentLoadingPostId(null);
  }

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
      <main
        style={{
          flex: 1,
          padding: "16px",
          paddingBottom: "72px",
        }}
      >
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
              <h1 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "4px" }}>Training Feed</h1>

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

            {/* ✅ Right side: button + logo (top-right) */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "0 0 auto" }}>
              <button
                type="button"
                onClick={() => router.push("/feed/new")}
                style={{
                  padding: "9px 14px",
                  borderRadius: "999px",
                  background: "#22c55e",
                  color: "#020617",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                New post
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ps.png"
                alt="Platform Sports"
                style={{
                  height: 86,
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>

          {loading && <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>Loading posts…</p>}

          {!loading && posts.length === 0 && (
            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "8px" }}>
              No posts yet. Be the first to log your workout.
            </p>
          )}

          <div
            style={{
              marginTop: posts.length > 0 ? "4px" : "0",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {posts.map((post) => {
              const isLiked = likedPosts.has(post.id);
              const isCommentsOpen = openComments.has(post.id);
              const comments = postComments[post.id] ?? [];

              // ⚠️ No author_user_id: use post.id as stable color seed
              const postAvatarSeed = post.id;

              return (
                <article
                  key={post.id}
                  style={{
                    borderRadius: "16px",
                    border: "1px solid #1e293b",
                    background: "#020617",
                    padding: "14px 14px 12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    {/* ✅ Avatar same as Activities */}
                    <div
                      title={post.author_name ?? ""}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "999px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                        flexShrink: 0,
                        ...avatarStyleFromId(postAvatarSeed),
                      }}
                    >
                      {initialsFromProfile(post.author_name, postAvatarSeed)}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>{post.author_name || "Athlete"}</span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{new Date(post.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "#e5e7eb",
                      marginBottom: post.image_url ? "10px" : "8px",
                      lineHeight: 1.5,
                    }}
                  >
                    {post.content}
                  </p>

                  {post.image_url && (
                    <div
                      style={{
                        borderRadius: "14px",
                        overflow: "hidden",
                        border: "1px solid #1e293b",
                        marginBottom: "8px",
                        background: "rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        maxHeight: "420px",
                      }}
                    >
                      <img
                        src={post.image_url}
                        alt="Workout photo"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      marginTop: "4px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        disabled={likeLoadingPostId === post.id}
                        style={{
                          border: "none",
                          background: isLiked ? "rgba(34,197,94,0.15)" : "transparent",
                          color: isLiked ? "#4ade80" : "#e5e7eb",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          opacity: likeLoadingPostId === post.id ? 0.7 : 1,
                        }}
                      >
                        <span style={{ fontSize: "14px", lineHeight: 1 }}>{isLiked ? "💚" : "🤍"}</span>
                        <span>{isLiked ? "Liked" : "Like"}</span>
                      </button>

                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {post.likes} like{post.likes === 1 ? "" : "s"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#64748b",
                        fontSize: "12px",
                        cursor: "pointer",
                        padding: "4px 6px",
                        borderRadius: "999px",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                      }}
                    >
                      {loadingCommentsPostId === post.id
                        ? "Loading comments…"
                        : isCommentsOpen
                        ? `Hide comments (${post.comments_count})`
                        : `View comments (${post.comments_count})`}
                    </button>
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmitComment(post.id);
                      }}
                      style={{ display: "flex", gap: "8px", alignItems: "center" }}
                    >
                      <input
                        type="text"
                        placeholder="Write a comment…"
                        value={commentText[post.id] ?? ""}
                        onChange={(e) =>
                          setCommentText((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        style={{
                          flex: 1,
                          fontSize: "12px",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          border: "1px solid #1e293b",
                          backgroundColor: "#020617",
                          color: "#e5e7eb",
                          outline: "none",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={commentLoadingPostId === post.id}
                        style={{
                          fontSize: "12px",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          border: "none",
                          background: "#22c55e",
                          color: "#020617",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          opacity: commentLoadingPostId === post.id ? 0.7 : 1,
                        }}
                      >
                        {commentLoadingPostId === post.id ? "Sending..." : "Send"}
                      </button>
                    </form>
                  </div>

                  {isCommentsOpen && (
                    <div
                      style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid #1f2937",
                        maxHeight: "180px",
                        overflowY: "auto",
                      }}
                    >
                      {comments.length === 0 ? (
                        <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                          No comments yet. Be the first to comment.
                        </p>
                      ) : (
                        <ul
                          style={{
                            listStyle: "none",
                            padding: 0,
                            margin: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {comments.map((c) => (
                            <li key={c.id} style={{ display: "flex", gap: "8px" }}>
                              {/* ✅ Avatar same as Activities (uses c.user_id) */}
                              <div
                                title={c.author_name ?? ""}
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "999px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  fontWeight: 900,
                                  letterSpacing: "0.04em",
                                  flexShrink: 0,
                                  ...avatarStyleFromId(c.user_id),
                                }}
                              >
                                {initialsFromProfile(c.author_name, c.user_id)}
                              </div>

                              <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.4 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: "#e5e7eb" }}>{c.author_name || "Athlete"}</span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "#6b7280",
                                      marginLeft: "8px",
                                    }}
                                  >
                                    {new Date(c.created_at).toLocaleDateString("en-US", {
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p style={{ margin: 0, color: "#d1d5db" }}>{c.content}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNavbar />
    </div>
  );
}
