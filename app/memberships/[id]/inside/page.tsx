"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type CommunityRow = {
  id: string;
  name: string | null;
  created_by: string | null;
};

type HighlightRow = {
  id: string;
  community_id: string;
  type: string | null;
  title: string;
  content: string | null;
  content_rich: { html?: string } | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  link_label: string | null;
  expires_at: string | null;
  created_at: string;
};

type FeedPost = {
  id: string;
  created_at: string;
  community_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  image_url: string | null;
  likes: number;
  comments_count: number;
};

type FeedComment = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

type CheckinRow = {
  id: string;
  community_id: string;
  user_id: string;
  author_name: string | null;
  activity_type: string;
  comment: string | null;
  image_url: string | null;
  image_path: string | null;
  points: number;
  created_at: string;
};

function getTypeLabel(type: string | null): string {
  switch ((type || "").toLowerCase()) {
    case "announcement":
      return "Announcement";
    case "weekly_plan":
      return "Weekly Plan";
    case "challenge":
      return "Challenge";
    case "result":
      return "Result";
    case "update":
      return "Update";
    default:
      return "Highlight";
  }
}

function getTypeBadgeStyle(type: string | null): React.CSSProperties {
  switch ((type || "").toLowerCase()) {
    case "announcement":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
        border: "1px solid #93c5fd",
      };
    case "weekly_plan":
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    case "challenge":
      return {
        background: "#fef3c7",
        color: "#b45309",
        border: "1px solid #fcd34d",
      };
    case "result":
      return {
        background: "#ede9fe",
        color: "#6d28d9",
        border: "1px solid #c4b5fd",
      };
    case "update":
      return {
        background: "#fee2e2",
        color: "#b91c1c",
        border: "1px solid #fca5a5",
      };
    default:
      return {
        background: "#e2e8f0",
        color: "#334155",
        border: "1px solid #cbd5e1",
      };
  }
}

function getVideoEmbedUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    if (url.includes("youtube.com/embed/")) return url;

    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "").trim();
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v");
      if (!v) return null;
      return `https://www.youtube.com/embed/${v}`;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (!id) return null;
      return `https://player.vimeo.com/video/${id}`;
    }

    return null;
  } catch {
    return null;
  }
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) return false;
  return time < Date.now();
}

function getInitials(name: string | null): string {
  if (!name) return "AT";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getAvatarBackground(seed: string): string {
  const palettes = [
    "radial-gradient(circle at 30% 30%, #38bdf8, #0f172a)",
    "radial-gradient(circle at 30% 30%, #22c55e, #0f172a)",
    "radial-gradient(circle at 30% 30%, #f59e0b, #0f172a)",
    "radial-gradient(circle at 30% 30%, #a78bfa, #0f172a)",
    "radial-gradient(circle at 30% 30%, #fb7185, #0f172a)",
  ];

  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return palettes[sum % palettes.length];
}

function getDisplayName(name: string | null): string {
  return name?.trim() ? name.trim() : "Athlete";
}

function getRecencyBonus(createdAt: string): number {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return 0;

  const ageInMs = Date.now() - createdTime;
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  if (ageInDays <= 1) return 12;
  if (ageInDays <= 3) return 8;
  if (ageInDays <= 7) return 4;
  return 0;
}

function getFeedScore(post: Pick<FeedPost, "likes" | "comments_count" | "created_at">): number {
  return post.likes + post.comments_count * 2 + getRecencyBonus(post.created_at);
}

function formatActivityType(value: string): string {
  if (!value) return "Activity";
  return value
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MembershipInsidePage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const params = useParams();
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState<string | null>(null);
  const [canManageHighlights, setCanManageHighlights] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [likeLoadingPostId, setLikeLoadingPostId] = useState<string | null>(null);
  const [commentLoadingPostId, setCommentLoadingPostId] = useState<string | null>(null);

  const [postComments, setPostComments] = useState<Record<string, FeedComment[]>>({});
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const [checkinsLoading, setCheckinsLoading] = useState(true);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRow[]>([]);
  const [checkinTotalCount, setCheckinTotalCount] = useState(0);
  const [openCheckinImages, setOpenCheckinImages] = useState<Set<string>>(new Set());

  async function loadFeed(targetCommunityId: string, currentUserId: string | null) {
    setFeedLoading(true);

    const { data: postsData, error: postsError } = await supabase
      .from("app_membership_feed_posts")
      .select("*")
      .eq("community_id", targetCommunityId)
      .order("created_at", { ascending: false });

    if (postsError || !postsData) {
      console.error("Error loading membership feed posts:", postsError);
      setPosts([]);
      setLikedPosts(new Set());
      setActivePostId(null);
      setFeedLoading(false);
      return;
    }

    const rawPosts = (postsData as FeedPost[]) ?? [];
    const postIds = rawPosts.map((p) => p.id);

    const likeCountMap: Record<string, number> = {};
    const commentCountMap: Record<string, number> = {};
    const likedByCurrentUser = new Set<string>();

    if (postIds.length > 0) {
      const { data: likesData, error: likesError } = await supabase
        .from("app_membership_feed_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (!likesError && likesData) {
        (likesData as Array<{ post_id: string; user_id: string }>).forEach((row) => {
          const pid = row.post_id;
          likeCountMap[pid] = (likeCountMap[pid] ?? 0) + 1;

          if (currentUserId && row.user_id === currentUserId) {
            likedByCurrentUser.add(pid);
          }
        });
      }

      const { data: commentsData, error: commentsError } = await supabase
        .from("app_membership_feed_comments")
        .select("post_id")
        .in("post_id", postIds);

      if (!commentsError && commentsData) {
        (commentsData as Array<{ post_id: string }>).forEach((row) => {
          const pid = row.post_id;
          commentCountMap[pid] = (commentCountMap[pid] ?? 0) + 1;
        });
      }
    }

    const postsWithCounters = rawPosts.map((p) => ({
      ...p,
      likes: likeCountMap[p.id] ?? 0,
      comments_count: commentCountMap[p.id] ?? 0,
    }));

    const sortedPosts = [...postsWithCounters].sort((a, b) => {
      const scoreA = getFeedScore(a);
      const scoreB = getFeedScore(b);

      if (scoreB !== scoreA) return scoreB - scoreA;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(sortedPosts);
    setLikedPosts(likedByCurrentUser);
    setActivePostId(sortedPosts[0]?.id ?? null);
    setFeedLoading(false);
  }

  async function loadCheckins(targetCommunityId: string) {
    setCheckinsLoading(true);

    const { data, error } = await supabase
      .from("app_membership_checkins")
      .select("*")
      .eq("community_id", targetCommunityId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error loading membership check-ins:", error);
      setRecentCheckins([]);
      setCheckinTotalCount(0);
      setCheckinsLoading(false);
      return;
    }

    const rows = (data as CheckinRow[]) ?? [];
    setRecentCheckins(rows.slice(0, 5));
    setCheckinTotalCount(rows.length);
    setCheckinsLoading(false);
  }

  useEffect(() => {
    async function checkAccessAndLoad() {
      const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

      if (!id || typeof id !== "string") {
        router.push("/memberships");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(profile?.full_name || null);

      const { data: community } = await supabase
        .from("app_membership_communities")
        .select("id, name, created_by")
        .eq("id", id)
        .single();

      if (!community) {
        router.push("/memberships");
        return;
      }

      const typedCommunity = community as CommunityRow;
      const isCreator = typedCommunity.created_by === user.id;

      if (!isCreator) {
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
      }

      const { data: highlightRows } = await supabase
        .from("app_membership_highlights")
        .select(`
          id,
          community_id,
          type,
          title,
          content,
          content_rich,
          image_url,
          video_url,
          link_url,
          link_label,
          expires_at,
          created_at
        `)
        .eq("community_id", id)
        .order("created_at", { ascending: false });

      const visibleHighlights = ((highlightRows as HighlightRow[] | null) || []).filter(
        (item) => !isExpired(item.expires_at)
      );

      setCommunityId(id);
      setCommunityName(typedCommunity.name || null);
      setCanManageHighlights(isCreator);
      setHighlights(visibleHighlights);

      await Promise.all([loadFeed(id, user.id), loadCheckins(id)]);

      setAllowed(true);
      setLoading(false);
    }

    checkAccessAndLoad();
  }, [params, supabase, router]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container || posts.length === 0) return;

    const updateActiveCard = () => {
      const cards = Array.from(
        container.querySelectorAll<HTMLElement>("[data-feed-card='true']")
      );

      if (cards.length === 0) return;

      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      let nearestId: string | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        const postId = card.dataset.postId || null;

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestId = postId;
        }
      });

      setActivePostId(nearestId);
    };

    updateActiveCard();
    container.addEventListener("scroll", updateActiveCard, { passive: true });
    window.addEventListener("resize", updateActiveCard);

    return () => {
      container.removeEventListener("scroll", updateActiveCard);
      window.removeEventListener("resize", updateActiveCard);
    };
  }, [posts]);

  async function handleLike(postId: string) {
    if (!userId) return;

    const alreadyLiked = likedPosts.has(postId);
    setLikeLoadingPostId(postId);

    if (alreadyLiked) {
      const { error } = await supabase
        .from("app_membership_feed_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing like:", error);
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
      const { error } = await supabase
        .from("app_membership_feed_likes")
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (error) {
        console.error("Error saving like:", error);
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

  async function toggleComments(postId: string) {
    if (openComments.has(postId)) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.delete(postId);
        return copy;
      });
      return;
    }

    if (postComments[postId]) {
      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
      return;
    }

    setLoadingCommentsPostId(postId);

    const { data, error } = await supabase
      .from("app_membership_feed_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading comments:", error);
    } else if (data) {
      setPostComments((prev) => ({
        ...prev,
        [postId]: data as FeedComment[],
      }));

      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
    }

    setLoadingCommentsPostId(null);
  }

  async function handleSubmitComment(postId: string) {
    const text = (commentText[postId] || "").trim();

    if (!text || !userId) return;

    setCommentLoadingPostId(postId);

    const { data, error } = await supabase
      .from("app_membership_feed_comments")
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
      const newComment = data as FeedComment;

      setCommentText((prev) => ({
        ...prev,
        [postId]: "",
      }));

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, comments_count: post.comments_count + 1 }
            : post
        )
      );

      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), newComment],
      }));

      setOpenComments((prev) => {
        const copy = new Set(prev);
        copy.add(postId);
        return copy;
      });
    }

    setCommentLoadingPostId(null);
  }

  async function handleDeletePost(postId: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this post?");
    if (!confirmed) return;

    setDeletingPostId(postId);

    const { error } = await supabase
      .from("app_membership_feed_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      console.error("Error deleting post:", error);
      setDeletingPostId(null);
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== postId));
    setLikedPosts((prev) => {
      const copy = new Set(prev);
      copy.delete(postId);
      return copy;
    });
    setOpenComments((prev) => {
      const copy = new Set(prev);
      copy.delete(postId);
      return copy;
    });
    setPostComments((prev) => {
      const copy = { ...prev };
      delete copy[postId];
      return copy;
    });
    setExpandedPosts((prev) => {
      const copy = new Set(prev);
      copy.delete(postId);
      return copy;
    });

    setDeletingPostId(null);
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    setDeletingCommentId(commentId);

    const { error } = await supabase
      .from("app_membership_feed_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      setDeletingCommentId(null);
      return;
    }

    setPostComments((prev) => {
      const currentComments = prev[postId] ?? [];
      return {
        ...prev,
        [postId]: currentComments.filter((comment) => comment.id !== commentId),
      };
    });

    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comments_count: Math.max(0, post.comments_count - 1) }
          : post
      )
    );

    setDeletingCommentId(null);
  }

  function toggleExpandedPost(postId: string) {
    setExpandedPosts((prev) => {
      const copy = new Set(prev);
      if (copy.has(postId)) {
        copy.delete(postId);
      } else {
        copy.add(postId);
      }
      return copy;
    });
  }

  function toggleCheckinImage(checkinId: string) {
    setOpenCheckinImages((prev) => {
      const copy = new Set(prev);
      if (copy.has(checkinId)) {
        copy.delete(checkinId);
      } else {
        copy.add(checkinId);
      }
      return copy;
    });
  }

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
          width: 100%;
          min-height: 100%;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
        }

        * {
          box-sizing: border-box;
        }

        .page * {
          font-family: "Montserrat", Arial, sans-serif;
        }

        .highlight-rich-content {
          color: #0f172a;
          line-height: 1.8;
          font-size: 15px;
          word-break: break-word;
        }

        .highlight-rich-content p,
        .highlight-rich-content li,
        .highlight-rich-content h1,
        .highlight-rich-content h2,
        .highlight-rich-content h3,
        .highlight-rich-content h4,
        .highlight-rich-content h5,
        .highlight-rich-content h6,
        .highlight-rich-content span,
        .highlight-rich-content div {
          max-width: 100%;
          word-break: break-word;
        }

        .highlight-rich-content img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
        }

        .highlight-rich-content iframe {
          max-width: 100%;
          border: 0;
          border-radius: 12px;
        }

        .membership-feed-shell {
          position: relative;
        }

        .membership-feed-shell::before,
        .membership-feed-shell::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 48px;
          pointer-events: none;
          z-index: 2;
        }

        .membership-feed-shell::before {
          left: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%);
        }

        .membership-feed-shell::after {
          right: 0;
          background: linear-gradient(270deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 100%);
        }

        .membership-feed-carousel {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 10px 22px 20px 22px;
          margin: 0 -22px;
          scroll-snap-type: x mandatory;
          scroll-padding-left: calc(50% - 170px);
          scroll-padding-right: calc(50% - 170px);
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          scrollbar-width: none;
        }

        .membership-feed-carousel::-webkit-scrollbar {
          display: none;
        }

        .membership-feed-carousel::before,
        .membership-feed-carousel::after {
          content: "";
          flex: 0 0 max(4px, calc(50% - 170px));
        }

        .membership-feed-card {
          flex: 0 0 340px;
          width: 340px;
          max-width: 340px;
          scroll-snap-align: center;
          min-width: 0;
          transition:
            transform 0.28s ease,
            opacity 0.28s ease,
            box-shadow 0.28s ease,
            border-color 0.28s ease;
          transform: scale(0.94);
          opacity: 0.68;
        }

        .membership-feed-card.is-active {
          transform: scale(1);
          opacity: 1;
        }

        .membership-checkin-scroll {
          max-height: 420px;
          overflow-y: auto;
          padding-right: 6px;
        }

        .membership-checkin-scroll::-webkit-scrollbar {
          width: 8px;
        }

        .membership-checkin-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .membership-checkin-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        @media (max-width: 640px) {
          .membership-feed-shell::before,
          .membership-feed-shell::after {
            width: 24px;
          }

          .membership-feed-carousel {
            gap: 12px;
            padding: 8px 14px 18px 14px;
            margin: 0 -14px;
            scroll-padding-left: calc(50% - 140px);
            scroll-padding-right: calc(50% - 140px);
          }

          .membership-feed-carousel::before,
          .membership-feed-carousel::after {
            flex: 0 0 max(4px, calc(50% - 140px));
          }

          .membership-feed-card {
            flex: 0 0 280px;
            width: 280px;
            max-width: 280px;
          }

          .membership-checkin-scroll {
            max-height: 360px;
          }
        }
      `}</style>

      <main
        className="page"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
          paddingTop: "max(16px, env(safe-area-inset-top))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          overflowX: "hidden",
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
            padding: "clamp(18px, 3vw, 24px)",
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 24px)",
                fontWeight: 800,
                margin: 0,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              {communityName}
            </h1>

            {canManageHighlights && communityId && (
              <Link
                href={`/memberships/${communityId}/inside/highlights/new`}
                style={{
                  textDecoration: "none",
                  borderRadius: 999,
                  padding: "10px 16px",
                  background: "#0f172a",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  whiteSpace: "nowrap",
                }}
              >
                New Highlight
              </Link>
            )}
          </div>

          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  color: "#0f172a",
                }}
              >
                🔥 Highlights
              </h2>
            </div>

            {highlights.length === 0 ? (
              <div
                style={{
                  borderRadius: 20,
                  padding: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No active highlights right now.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 16 }}>
                {highlights.map((item) => {
                  const embedUrl = getVideoEmbedUrl(item.video_url);

                  return (
                    <article
                      key={item.id}
                      style={{
                        borderRadius: 22,
                        padding: "clamp(16px, 3vw, 20px)",
                        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                        border: "1px solid #e2e8f0",
                        boxShadow:
                          "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            ...getTypeBadgeStyle(item.type),
                            borderRadius: 999,
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getTypeLabel(item.type)}
                        </div>

                        {item.expires_at && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            Visible until {new Date(item.expires_at).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <h3
                        style={{
                          fontSize: "clamp(18px, 3vw, 22px)",
                          fontWeight: 800,
                          color: "#0f172a",
                          margin: "0 0 14px 0",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.title}
                      </h3>

                      {item.image_url && (
                        <div
                          style={{
                            width: "100%",
                            borderRadius: 18,
                            overflow: "hidden",
                            marginBottom: 16,
                            border: "1px solid #dbe2ea",
                            background: "#f1f5f9",
                          }}
                        >
                          <img
                            src={item.image_url}
                            alt={item.title}
                            style={{
                              width: "100%",
                              maxHeight: 420,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      )}

                      <div
                        className="highlight-rich-content"
                        dangerouslySetInnerHTML={{
                          __html:
                            item.content_rich?.html ||
                            (item.content ? `<p>${item.content}</p>` : "<p></p>"),
                        }}
                      />

                      {embedUrl && (
                        <div
                          style={{
                            marginTop: 16,
                            borderRadius: 18,
                            overflow: "hidden",
                            background: "#e2e8f0",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              width: "100%",
                              paddingTop: "56.25%",
                            }}
                          >
                            <iframe
                              src={embedUrl}
                              title={item.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                border: 0,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {!embedUrl && item.video_url && (
                        <div style={{ marginTop: 16 }}>
                          <a
                            href={item.video_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textDecoration: "none",
                              borderRadius: 999,
                              padding: "10px 14px",
                              background: "#1d4ed8",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            Open video
                          </a>
                        </div>
                      )}

                      {item.link_url && (
                        <div style={{ marginTop: 16 }}>
                          <a
                            href={item.link_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textDecoration: "none",
                              borderRadius: 999,
                              padding: "10px 14px",
                              background: "#0f172a",
                              color: "#fff",
                              fontSize: 13,
                              fontWeight: 700,
                            }}
                          >
                            {item.link_label || "Open link"}
                          </a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: "0 0 4px 0",
                    color: "#0f172a",
                  }}
                >
                  ➕ Check-in
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Register your activity and earn 10 points for the ranking.
                </div>
              </div>

              {communityId && (
                <Link
                  href={`/memberships/${communityId}/inside/checkin/new`}
                  style={{
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  New Check-in
                </Link>
              )}
            </div>

            {checkinsLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading check-ins...</div>
            ) : recentCheckins.length === 0 ? (
              <div
                style={{
                  borderRadius: 20,
                  padding: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No check-ins yet. Start registering activities to build the ranking.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 2,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #86efac",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {checkinTotalCount} total check-in{checkinTotalCount === 1 ? "" : "s"}
                  </div>

                  <div
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      border: "1px solid #93c5fd",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    +10 points each
                  </div>
                </div>

                <div className="membership-checkin-scroll">
                  <div style={{ display: "grid", gap: 12 }}>
                    {recentCheckins.map((item) => {
                      const authorLabel = getDisplayName(item.author_name);
                      const isImageOpen = openCheckinImages.has(item.id);

                      return (
                        <article
                          key={item.id}
                          style={{
                            borderRadius: 20,
                            padding: 14,
                            background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            border: "1px solid #e2e8f0",
                            boxShadow:
                              "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.85)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: 999,
                                  background: getAvatarBackground(authorLabel),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#f8fafc",
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(authorLabel)}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: "#0f172a",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {authorLabel}
                                </div>

                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#64748b",
                                  }}
                                >
                                  {new Date(item.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: "6px 10px",
                                  background: "#ede9fe",
                                  color: "#6d28d9",
                                  border: "1px solid #c4b5fd",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatActivityType(item.activity_type)}
                              </div>

                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: "6px 10px",
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fcd34d",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                +{item.points} pts
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                color: "#475569",
                                fontSize: 13,
                                lineHeight: 1.5,
                              }}
                            >
                              Workout proof submitted.
                            </div>

                            {item.image_url && (
                              <button
                                type="button"
                                onClick={() => toggleCheckinImage(item.id)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#2563eb",
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                {isImageOpen ? "Hide photo" : "View photo"}
                              </button>
                            )}
                          </div>

                          {isImageOpen && item.image_url && (
                            <div
                              style={{
                                marginTop: 12,
                                borderRadius: 18,
                                overflow: "hidden",
                                border: "1px solid #dbe2ea",
                                background: "#eef2f7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 8,
                              }}
                            >
                              <img
                                src={item.image_url}
                                alt="Check-in proof"
                                style={{
                                  width: "100%",
                                  maxHeight: 300,
                                  objectFit: "contain",
                                  display: "block",
                                  borderRadius: 12,
                                }}
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>
              🏆 Ranking
            </h2>
            <div style={{ color: "#475569", fontSize: 14 }}>
              Coming soon: community leaderboard based on check-ins.
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: "0 0 4px 0",
                    color: "#0f172a",
                  }}
                >
                  📸 Community Feed
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Swipe sideways to explore the latest community posts.
                </div>
              </div>

              {communityId && (
                <Link
                  href={`/memberships/${communityId}/inside/feed/new`}
                  style={{
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: "#22c55e",
                    color: "#052e16",
                    fontWeight: 700,
                    fontSize: 13,
                    whiteSpace: "nowrap",
                  }}
                >
                  New Post
                </Link>
              )}
            </div>

            {feedLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading feed...</div>
            ) : posts.length === 0 ? (
              <div
                style={{
                  borderRadius: 20,
                  padding: 18,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No posts yet. Be the first to share something with the community.
              </div>
            ) : (
              <div className="membership-feed-shell">
                <div ref={carouselRef} className="membership-feed-carousel">
                  {posts.map((post) => {
                    const isLiked = likedPosts.has(post.id);
                    const isCommentsOpen = openComments.has(post.id);
                    const comments = postComments[post.id] ?? [];
                    const authorLabel = getDisplayName(post.author_name);
                    const isActive = activePostId === post.id;
                    const isExpanded = expandedPosts.has(post.id);
                    const canDeletePost = userId === post.user_id;

                    return (
                      <article
                        key={post.id}
                        data-feed-card="true"
                        data-post-id={post.id}
                        className={`membership-feed-card${isActive ? " is-active" : ""}`}
                        style={{
                          borderRadius: 24,
                          border: isActive ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
                          background: isActive
                            ? "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
                            : "linear-gradient(180deg, #fbfdff 0%, #f1f5f9 100%)",
                          padding: 16,
                          boxShadow: isActive
                            ? "0 22px 48px rgba(15,23,42,0.14), 0 8px 20px rgba(148,163,184,0.18)"
                            : "6px 6px 18px rgba(148,163,184,0.10), -4px -4px 14px rgba(255,255,255,0.82)",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 999,
                                background: getAvatarBackground(authorLabel),
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                fontWeight: 700,
                                color: "#f8fafc",
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(authorLabel)}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {authorLabel}
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  color: "#64748b",
                                }}
                              >
                                {new Date(post.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {canDeletePost && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              disabled={deletingPostId === post.id}
                              style={{
                                border: "1px solid #fecaca",
                                background: "#fff1f2",
                                color: "#be123c",
                                borderRadius: 999,
                                padding: "6px 10px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                opacity: deletingPostId === post.id ? 0.7 : 1,
                                flexShrink: 0,
                              }}
                            >
                              {deletingPostId === post.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>

                        <div style={{ marginBottom: post.image_url ? 12 : 10 }}>
                          <p
                            style={{
                              fontSize: 14,
                              color: "#0f172a",
                              margin: 0,
                              lineHeight: 1.6,
                              display: isExpanded ? "block" : "-webkit-box",
                              WebkitLineClamp: isExpanded ? "unset" : 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {post.content}
                          </p>

                          {post.content.length > 90 && (
                            <button
                              type="button"
                              onClick={() => toggleExpandedPost(post.id)}
                              style={{
                                marginTop: 6,
                                border: "none",
                                background: "transparent",
                                color: "#2563eb",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          )}
                        </div>

                        {post.image_url && (
                          <div
                            style={{
                              borderRadius: 18,
                              overflow: "hidden",
                              border: "1px solid #dbe2ea",
                              marginBottom: 10,
                              background: "#eef2f7",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 8,
                            }}
                          >
                            <img
                              src={post.image_url}
                              alt="Community post"
                              style={{
                                width: "100%",
                                maxHeight: 360,
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 12,
                              }}
                            />
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 12,
                            marginTop: 6,
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleLike(post.id)}
                              disabled={likeLoadingPostId === post.id}
                              style={{
                                border: "none",
                                background: isLiked ? "rgba(34,197,94,0.12)" : "transparent",
                                color: isLiked ? "#16a34a" : "#334155",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                cursor: "pointer",
                                padding: "6px 10px",
                                borderRadius: 999,
                                fontWeight: 600,
                                opacity: likeLoadingPostId === post.id ? 0.7 : 1,
                              }}
                            >
                              <span style={{ fontSize: 14, lineHeight: 1 }}>
                                {isLiked ? "💚" : "🤍"}
                              </span>
                              <span>{isLiked ? "Liked" : "Like"}</span>
                            </button>

                            <span style={{ fontSize: 12, color: "#64748b" }}>
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
                              fontSize: 12,
                              cursor: "pointer",
                              padding: "4px 6px",
                              borderRadius: 999,
                              textDecoration: "underline",
                              textDecorationStyle: "dotted",
                            }}
                          >
                            {loadingCommentsPostId === post.id
                              ? "Loading comments..."
                              : isCommentsOpen
                              ? `Hide comments (${post.comments_count})`
                              : `View comments (${post.comments_count})`}
                          </button>
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSubmitComment(post.id);
                            }}
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText[post.id] ?? ""}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              style={{
                                flex: 1,
                                minWidth: 0,
                                fontSize: 12,
                                padding: "8px 10px",
                                borderRadius: 999,
                                border: "1px solid #d6dbe4",
                                backgroundColor: "#ffffff",
                                color: "#0f172a",
                                outline: "none",
                              }}
                            />
                            <button
                              type="submit"
                              disabled={commentLoadingPostId === post.id}
                              style={{
                                fontSize: 12,
                                padding: "8px 12px",
                                borderRadius: 999,
                                border: "none",
                                background: "#0f172a",
                                color: "#ffffff",
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
                              marginTop: 10,
                              paddingTop: 10,
                              borderTop: "1px solid #e2e8f0",
                              maxHeight: 220,
                              overflowY: "auto",
                            }}
                          >
                            {comments.length === 0 ? (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  margin: 0,
                                  lineHeight: 1.5,
                                }}
                              >
                                No comments yet on this post.
                              </p>
                            ) : (
                              <ul
                                style={{
                                  listStyle: "none",
                                  padding: 0,
                                  margin: 0,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}
                              >
                                {comments.map((c) => {
                                  const commentAuthor = getDisplayName(c.author_name);
                                  const canDeleteComment =
                                    userId === c.user_id || userId === post.user_id;

                                  return (
                                    <li
                                      key={c.id}
                                      style={{ display: "flex", gap: 8 }}
                                    >
                                      <div
                                        style={{
                                          width: 24,
                                          height: 24,
                                          borderRadius: 999,
                                          background: getAvatarBackground(commentAuthor),
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: 10,
                                          fontWeight: 700,
                                          color: "#f8fafc",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {getInitials(commentAuthor)}
                                      </div>

                                      <div
                                        style={{
                                          flex: 1,
                                          fontSize: 12,
                                          lineHeight: 1.45,
                                          minWidth: 0,
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "baseline",
                                            gap: 8,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontWeight: 700,
                                              color: "#0f172a",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                            }}
                                          >
                                            {commentAuthor}
                                          </span>

                                          <span
                                            style={{
                                              fontSize: 10,
                                              color: "#94a3b8",
                                              flexShrink: 0,
                                            }}
                                          >
                                            {new Date(c.created_at).toLocaleDateString("en-US", {
                                              month: "2-digit",
                                              day: "2-digit",
                                            })}
                                          </span>
                                        </div>

                                        <p style={{ margin: "2px 0 0 0", color: "#334155" }}>
                                          {c.content}
                                        </p>

                                        {canDeleteComment && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(post.id, c.id)}
                                            disabled={deletingCommentId === c.id}
                                            style={{
                                              marginTop: 4,
                                              border: "none",
                                              background: "transparent",
                                              color: "#be123c",
                                              fontSize: 11,
                                              fontWeight: 700,
                                              cursor: "pointer",
                                              padding: 0,
                                              opacity: deletingCommentId === c.id ? 0.7 : 1,
                                            }}
                                          >
                                            {deletingCommentId === c.id ? "Deleting..." : "Delete"}
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>
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
