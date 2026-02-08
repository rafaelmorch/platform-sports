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

  // posts que o usuário já curtiu
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // texto de comentário por post
  const [commentText, setCommentText] = useState<Record<string, string>>({});

  const [likeLoadingPostId, setLikeLoadingPostId] = useState<string | null>(
    null
  );
  const [commentLoadingPostId, setCommentLoadingPostId] = useState<
    string | null
  >(null);

  // comentários carregados por post
  const [postComments, setPostComments] = useState<Record<string, Comment[]>>(
    {}
  );
  // quais posts estão com comentários abertos
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<
    string | null
  >(null);

  async function loadPosts() {
    setLoading(true);

    // ✅ 0) garante sessão (bloqueia a página)
    const {
      data: { session },
      error: sessionError,
    } = await supabaseBrowser.auth.getSession();

    if (sessionError) {
      console.error("Erro ao obter sessão:", sessionError);
    }

    if (!session) {
      router.push("/login");
      return; // ⛔ não continua
    }

    const user = session.user;

    setUserId(user.id);

    // 1) nome do usuário (perfil)
    const { data: profile } = await supabaseBrowser
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.full_name) {
      setUserName(profile.full_name);
    } else {
      setUserName(null);
    }

    // 2) posts
    const { data: postsData, error: postsError } = await supabaseBrowser
      .from("feed_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError || !postsData) {
      console.error("Erro ao carregar posts:", postsError);
      setPosts([]);
      setLoading(false);
      return;
    }

    const rawPosts = postsData as Post[];
    const postIds = rawPosts.map((p) => p.id);

    // mapas para likes e comentários
    const likeCountMap: Record<string, number> = {};
    const commentCountMap: Record<string, number> = {};
    const likedByCurrentUser = new Set<string>();

    if (postIds.length > 0) {
      // 3) likes dos posts
      const { data: likesData, error: likesError } = await supabaseBrowser
        .from("feed_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (!likesError && likesData) {
        (likesData as any[]).forEach((row) => {
          const pid = row.post_id as string;
          likeCountMap[pid] = (likeCountMap[pid] ?? 0) + 1;

          if (row.user_id === user.id) {
            likedByCurrentUser.add(pid);
          }
        });
      }

      // 4) comentários dos posts
      const { data: commentsData, error: commentsError } =
        await supabaseBrowser
          .from("feed_comments")
          .select("post_id")
          .in("post_id", postIds);

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

  // ---------- CURTIR / DESCURTIR (1 por usuário) ----------
  async function handleLike(postId: string) {
    if (!userId) {
      alert("Faça login para curtir as postagens.");
      return;
    }

    const alreadyLiked = likedPosts.has(postId);
    setLikeLoadingPostId(postId);

    if (alreadyLiked) {
      // DESCURTIR
      const { error } = await supabaseBrowser
        .from("feed_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        console.error("Erro ao remover curtida:", error);
      } else {
        setLikedPosts((prev) => {
          const copy = new Set(prev);
          copy.delete(postId);
          return copy;
        });
        setPosts((current) =>
          current.map((post) =>
            post.id === postId
              ? { ...post, likes: Math.max(0, post.likes - 1) }
              : post
          )
        );
      }
    } else {
      // CURTIR
      const { error } = await supabaseBrowser
        .from("feed_likes")
        .insert({ post_id: postId, user_id: userId });

      if (error) {
        console.error("Erro ao registrar curtida:", error);
      } else {
        setLikedPosts((prev) => {
          const copy = new Set(prev);
          copy.add(postId);
          return copy;
        });
        setPosts((current) =>
          current.map((post) =>
            post.id === postId ? { ...post, likes: post.likes + 1 } : post
          )
        );
      }
    }

    setLikeLoadingPostId(null);
  }

  // ---------- CARREGAR / TOGGLE COMENTÁRIOS ----------
  async function toggleComments(postId: string) {
    // se já estiver aberto, fecha
    if (openComments.has(postId)) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.delete(postId);
        return copy;
      });
      return;
    }

    // se já temos comentários carregados, só abre
    if (postComments[postId]) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
      return;
    }

    // precisa carregar do Supabase
    setLoadingCommentsPostId(postId);

    const { data, error } = await supabaseBrowser
      .from("feed_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao carregar comentários:", error);
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

  // ---------- COMENTAR ----------
  async function handleSubmitComment(postId: string) {
    const text = (commentText[postId] || "").trim();

    if (!text) return;
    if (!userId) {
      alert("Faça login para comentar.");
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
      console.error("Erro ao salvar comentário:", error);
    } else if (data) {
      const newComment = data as Comment;

      // limpa campo
      setCommentText((prev) => ({
        ...prev,
        [postId]: "",
      }));

      // incrementa contador no post
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      // se os comentários desse post já estão carregados, adiciona na lista
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
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 800,
                  marginBottom: "4px",
                }}
              >
                Feed de Treinos
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "#94a3b8",
                  marginBottom: "6px",
                }}
              ></p>

              <p
                style={{
                  fontSize: "13px",
                  color: "#60a5fa",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Desafios te levam a um novo nível. Compartilhe o seu no esporte
                hoje.
              </p>
            </div>

            <a
              href="/feed/new"
              style={{
                padding: "9px 14px",
                borderRadius: "999px",
                background: "#22c55e",
                color: "#020617",
                fontSize: "13px",
                fontWeight: 700,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Nova postagem
            </a>
          </div>

          {loading && (
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Carregando postagens…
            </p>
          )}

          {!loading && posts.length === 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Nenhuma postagem ainda. Seja o primeiro a registrar seu treino.
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
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "999px",
                        background:
                          "radial-gradient(circle at 30% 30%, #22c55e, #0f172a)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#0b1120",
                      }}
                    >
                      {(post.author_name || "AT")
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        {post.author_name || "Atleta"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                        }}
                      >
                        {new Date(post.created_at).toLocaleString()}
                      </span>
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
                        alt="Foto do treino"
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
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleLike(post.id)}
                        disabled={likeLoadingPostId === post.id}
                        style={{
                          border: "none",
                          background: isLiked
                            ? "rgba(34,197,94,0.15)"
                            : "transparent",
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
                        <span style={{ fontSize: "14px", lineHeight: 1 }}>
                          {isLiked ? "💚" : "🤍"}
                        </span>
                        <span>{isLiked ? "Você curtiu" : "Curtir"}</span>
                      </button>

                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {post.likes} curtida{post.likes === 1 ? "" : "s"}
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
                        ? "Carregando comentários…"
                        : isCommentsOpen
                        ? `Ocultar comentários (${post.comments_count})`
                        : `Ver comentários (${post.comments_count})`}
                    </button>
                  </div>

                  <div style={{ marginTop: "8px" }}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmitComment(post.id);
                      }}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Escreva um comentário…"
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
                          opacity:
                            commentLoadingPostId === post.id ? 0.7 : 1,
                        }}
                      >
                        {commentLoadingPostId === post.id
                          ? "Enviando..."
                          : "Enviar"}
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
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            margin: 0,
                          }}
                        >
                          Ainda não há comentários neste post. Seja o primeiro a
                          comentar.
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
                              <div
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "999px",
                                  background:
                                    "radial-gradient(circle at 30% 30%, #38bdf8, #0f172a)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#0b1120",
                                  flexShrink: 0,
                                }}
                              >
                                {(c.author_name || "AT")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                              <div style={{ flex: 1, fontSize: "12px", lineHeight: 1.4 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: "#e5e7eb" }}>
                                    {c.author_name || "Atleta"}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      color: "#6b7280",
                                      marginLeft: "8px",
                                    }}
                                  >
                                    {new Date(c.created_at).toLocaleDateString("pt-BR", {
                                      day: "2-digit",
                                      month: "2-digit",
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
