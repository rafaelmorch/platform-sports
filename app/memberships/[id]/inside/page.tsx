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
  challenge_id?: string | null;
  is_disregarded: boolean;
  disregarded_at: string | null;
  disregarded_by: string | null;
};

type RankingRow = {
  user_id: string;
  author_name: string;
  total_points: number;
  total_checkins: number;
  streak: number;
};

type LeaderRow = {
  user_id: string;
  author_name: string;
  total_points: number;
  total_checkins: number;
};

type ChallengeRow = {
  id: string;
  community_id: string;
  created_by: string;
  title: string;
  description: string | null;
  activity_type: string;
  goal_criteria: string | null;
  deadline: string;
  points_active: number;
  points_late: number;
  is_active: boolean;
  created_at: string;
};

type ProfileMini = {
  id: string;
  full_name: string | null;
  is_admin?: boolean | null;
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

function isCurrentMonth(dateString: string): boolean {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function toLocalDateKey(dateString: string): string | null {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calculateStreakFromRows(rows: Array<{ created_at: string }>): number {
  const uniqueDays = Array.from(
    new Set(
      rows
        .map((row) => toLocalDateKey(row.created_at))
        .filter((value): value is string => Boolean(value))
    )
  ).sort((a, b) => b.localeCompare(a));

  if (uniqueDays.length === 0) return 0;

  let streak = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = new Date(`${uniqueDays[i - 1]}T00:00:00`);
    const curr = new Date(`${uniqueDays[i]}T00:00:00`);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function formatEndsLabel(deadline: string): string {
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return "Ends soon";
  return `Ends ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function isChallengeExpired(deadline: string): boolean {
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function sortChallenges(rows: ChallengeRow[]): ChallengeRow[] {
  return [...rows].sort((a, b) => {
    const aExpired = isChallengeExpired(a.deadline);
    const bExpired = isChallengeExpired(b.deadline);

    if (aExpired !== bExpired) {
      return aExpired ? 1 : -1;
    }

    const aTime = new Date(a.deadline).getTime();
    const bTime = new Date(b.deadline).getTime();

    if (!aExpired && !bExpired) {
      return aTime - bTime;
    }

    return bTime - aTime;
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getHighlightPreview(item: HighlightRow): string {
  const rich = item.content_rich?.html ? stripHtml(item.content_rich.html) : "";
  const plain = item.content?.trim() || "";
  const base = rich || plain;

  if (!base) return "Open to view details.";
  return base.length > 120 ? `${base.slice(0, 120).trim()}...` : base;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasVideos, setHasVideos] = useState(false);

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
  const [checkinActionId, setCheckinActionId] = useState<string | null>(null);

  const [rankingLoading, setRankingLoading] = useState(true);
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);

  const [leaderLoading, setLeaderLoading] = useState(true);
  const [leaderRow, setLeaderRow] = useState<LeaderRow | null>(null);

  const [myStreak, setMyStreak] = useState(0);

  const [challengesLoading, setChallengesLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [openChallenges, setOpenChallenges] = useState<Set<string>>(new Set());

  const dividerSectionStyle: React.CSSProperties = {
    borderTop: "1px solid rgba(226,232,240,0.9)",
    paddingTop: 24,
  };

  async function loadVideosFlag(targetCommunityId: string) {
    const { data, error } = await supabase
      .from("app_membership_videos")
      .select("id")
      .eq("community_id", targetCommunityId)
      .eq("is_published", true)
      .limit(1);

    if (error) {
      console.error("Error loading membership videos flag:", error);
      setHasVideos(false);
      return;
    }

    setHasVideos(Boolean(data && data.length > 0));
  }

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
      const { data: likesData } = await supabase
        .from("app_membership_feed_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (likesData) {
        (likesData as Array<{ post_id: string; user_id: string }>).forEach((row) => {
          const pid = row.post_id;
          likeCountMap[pid] = (likeCountMap[pid] ?? 0) + 1;

          if (currentUserId && row.user_id === currentUserId) {
            likedByCurrentUser.add(pid);
          }
        });
      }

      const { data: commentsData } = await supabase
        .from("app_membership_feed_comments")
        .select("post_id")
        .in("post_id", postIds);

      if (commentsData) {
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

  async function loadCheckins(targetCommunityId: string, currentUserId: string | null, canManageCommunity: boolean) {
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

    const visibleRows = rows.filter((row) => {
      if (!row.is_disregarded) return true;
      if (canManageCommunity) return true;
      if (currentUserId && row.user_id === currentUserId) return true;
      return false;
    });

    const publicRows = rows.filter((row) => !row.is_disregarded);

    setRecentCheckins(visibleRows.slice(0, 5));
    setCheckinTotalCount(canManageCommunity ? visibleRows.length : publicRows.length);
    setCheckinsLoading(false);
  }

  async function loadRanking(targetCommunityId: string, creatorId: string | null, currentUserId: string | null) {
    setRankingLoading(true);

    const [{ data: memberRequests, error: membersError }, { data: checkinData, error: checkinError }] =
      await Promise.all([
        supabase
          .from("app_membership_requests")
          .select("user_id")
          .eq("community_id", targetCommunityId)
          .eq("status", "approved"),
        supabase
          .from("app_membership_checkins")
          .select("user_id, author_name, points, created_at, is_disregarded")
          .eq("community_id", targetCommunityId),
      ]);

    if (membersError || checkinError) {
      console.error("Error loading membership ranking:", membersError || checkinError);
      setRankingRows([]);
      setMyStreak(0);
      setRankingLoading(false);
      return;
    }

    const approvedUserIds = Array.from(
      new Set(
        ((memberRequests as Array<{ user_id: string }> | null) ?? []).map((row) => row.user_id).filter(Boolean)
      )
    );

    if (creatorId && !approvedUserIds.includes(creatorId)) {
      approvedUserIds.unshift(creatorId);
    }

    const { data: memberProfiles } =
      approvedUserIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", approvedUserIds)
        : { data: [] as ProfileMini[] };

    const profileNameMap = new Map<string, string>();
    ((memberProfiles as ProfileMini[]) ?? []).forEach((profile) => {
      profileNameMap.set(profile.id, getDisplayName(profile.full_name));
    });

    const activeCheckins = ((checkinData as Array<{
      user_id: string;
      author_name: string | null;
      points: number;
      created_at: string;
      is_disregarded: boolean;
    }>) ?? []).filter((row) => !row.is_disregarded);

    const grouped = new Map<
      string,
      RankingRow & { rawRows: Array<{ created_at: string }> }
    >();

    approvedUserIds.forEach((memberId) => {
      grouped.set(memberId, {
        user_id: memberId,
        author_name: profileNameMap.get(memberId) ?? "Athlete",
        total_points: 0,
        total_checkins: 0,
        streak: 0,
        rawRows: [],
      });
    });

    activeCheckins.forEach((row) => {
      const existing = grouped.get(row.user_id);

      if (!existing) {
        grouped.set(row.user_id, {
          user_id: row.user_id,
          author_name: getDisplayName(row.author_name) || profileNameMap.get(row.user_id) || "Athlete",
          total_points: row.points ?? 0,
          total_checkins: 1,
          streak: 0,
          rawRows: [{ created_at: row.created_at }],
        });
        return;
      }

      existing.total_points += row.points ?? 0;
      existing.total_checkins += 1;
      existing.rawRows.push({ created_at: row.created_at });

      const bestName = profileNameMap.get(row.user_id) ?? getDisplayName(row.author_name);
      if (bestName && bestName !== "Athlete") {
        existing.author_name = bestName;
      }
    });

    const ranking = Array.from(grouped.values()).map((row) => ({
      user_id: row.user_id,
      author_name: row.author_name,
      total_points: row.total_points,
      total_checkins: row.total_checkins,
      streak: calculateStreakFromRows(row.rawRows),
    }));

    ranking.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.total_checkins !== a.total_checkins) return b.total_checkins - a.total_checkins;
      return a.author_name.localeCompare(b.author_name);
    });

    setRankingRows(ranking);

    const mine = ranking.find((row) => row.user_id === currentUserId);
    setMyStreak(mine?.streak ?? 0);

    setRankingLoading(false);
  }

  async function loadLeaderOfMonth(targetCommunityId: string) {
    setLeaderLoading(true);

    const { data, error } = await supabase
      .from("app_membership_checkins")
      .select("user_id, author_name, points, created_at, is_disregarded")
      .eq("community_id", targetCommunityId);

    if (error || !data) {
      console.error("Error loading leader of the month:", error);
      setLeaderRow(null);
      setLeaderLoading(false);
      return;
    }

    const monthRows = (data as Array<{
      user_id: string;
      author_name: string | null;
      points: number;
      created_at: string;
      is_disregarded: boolean;
    }>)
      .filter((row) => !row.is_disregarded)
      .filter((row) => isCurrentMonth(row.created_at));

    if (monthRows.length === 0) {
      setLeaderRow(null);
      setLeaderLoading(false);
      return;
    }

    const grouped = new Map<string, LeaderRow>();

    monthRows.forEach((row) => {
      const existing = grouped.get(row.user_id);

      if (!existing) {
        grouped.set(row.user_id, {
          user_id: row.user_id,
          author_name: getDisplayName(row.author_name),
          total_points: row.points ?? 0,
          total_checkins: 1,
        });
        return;
      }

      existing.total_points += row.points ?? 0;
      existing.total_checkins += 1;

      if (existing.author_name === "Athlete" && getDisplayName(row.author_name) !== "Athlete") {
        existing.author_name = getDisplayName(row.author_name);
      }
    });

    const sorted = Array.from(grouped.values()).sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.total_checkins !== a.total_checkins) return b.total_checkins - a.total_checkins;
      return a.author_name.localeCompare(b.author_name);
    });

    setLeaderRow(sorted[0] ?? null);
    setLeaderLoading(false);
  }

  async function loadChallenges(targetCommunityId: string) {
    setChallengesLoading(true);

    const { data, error } = await supabase
      .from("app_membership_challenges")
      .select("*")
      .eq("community_id", targetCommunityId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error loading membership challenges:", error);
      setChallenges([]);
      setChallengesLoading(false);
      return;
    }

    const rows = sortChallenges((data as ChallengeRow[]) ?? []);
    setChallenges(rows);
    setChallengesLoading(false);
  }

  async function handleDisregardToggle(checkinId: string, shouldRestore: boolean) {
    if (!communityId || !userId || !canManageHighlights) return;

    setCheckinActionId(checkinId);

    const payload = shouldRestore
      ? {
          is_disregarded: false,
          disregarded_at: null,
          disregarded_by: null,
        }
      : {
          is_disregarded: true,
          disregarded_at: new Date().toISOString(),
          disregarded_by: userId,
        };

    const { error } = await supabase
      .from("app_membership_checkins")
      .update(payload)
      .eq("id", checkinId)
      .eq("community_id", communityId);

    if (error) {
      console.error("Error updating check-in disregard:", error);
      setCheckinActionId(null);
      return;
    }

    const { data: community } = await supabase
      .from("app_membership_communities")
      .select("created_by")
      .eq("id", communityId)
      .maybeSingle();

    await Promise.all([
      loadCheckins(communityId, userId, canManageHighlights),
      loadRanking(communityId, community?.created_by ?? null, userId),
      loadLeaderOfMonth(communityId),
    ]);

    setCheckinActionId(null);
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
        .select("full_name, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(profile?.full_name || null);
      setIsAdmin(profile?.is_admin === true);

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
      const canManageCommunity = profile?.is_admin === true || isCreator;

      if (!isCreator && profile?.is_admin !== true) {
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
      setCanManageHighlights(canManageCommunity);
      setHighlights(visibleHighlights);

      await Promise.all([
        loadFeed(id, user.id),
        loadCheckins(id, user.id, canManageCommunity),
        loadRanking(id, typedCommunity.created_by ?? null, user.id),
        loadLeaderOfMonth(id),
        loadChallenges(id),
        loadVideosFlag(id),
      ]);

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
            post.id === postId ? { ...post, likes: Math.max(0, post.likes - 1) } : post
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
          current.map((post) => (post.id === postId ? { ...post, likes: post.likes + 1 } : post))
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
          post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
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

    const { error } = await supabase.from("app_membership_feed_posts").delete().eq("id", postId);

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
        post.id === postId ? { ...post, comments_count: Math.max(0, post.comments_count - 1) } : post
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

  function toggleChallenge(challengeId: string) {
    setOpenChallenges((prev) => {
      const copy = new Set(prev);
      if (copy.has(challengeId)) {
        copy.delete(challengeId);
      } else {
        copy.add(challengeId);
      }
      return copy;
    });
  }

  if (loading) return null;
  if (!allowed) return null;

  const orderedRanking = rankingRows;

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

        .membership-feed-carousel,
        .membership-challenge-carousel {
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

        .membership-feed-carousel::-webkit-scrollbar,
        .membership-challenge-carousel::-webkit-scrollbar {
          display: none;
        }

        .membership-feed-carousel::before,
        .membership-feed-carousel::after,
        .membership-challenge-carousel::before,
        .membership-challenge-carousel::after {
          content: "";
          flex: 0 0 max(4px, calc(50% - 170px));
        }

        .membership-feed-card,
        .membership-challenge-card {
          flex: 0 0 340px;
          width: 340px;
          max-width: 340px;
          scroll-snap-align: center;
          min-width: 0;
        }

        .membership-feed-card {
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

          .membership-feed-carousel,
          .membership-challenge-carousel {
            gap: 12px;
            padding: 8px 14px 18px 14px;
            margin: 0 -14px;
            scroll-padding-left: calc(50% - 140px);
            scroll-padding-right: calc(50% - 140px);
          }

          .membership-feed-carousel::before,
          .membership-feed-carousel::after,
          .membership-challenge-carousel::before,
          .membership-challenge-carousel::after {
            flex: 0 0 max(4px, calc(50% - 140px));
          }

          .membership-feed-card,
          .membership-challenge-card {
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
              marginBottom: 12,
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

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {canManageHighlights && communityId && (
                <Link
                  href={`/memberships/${communityId}/inside/challenges/new`}
                  style={{
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "10px 16px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  New Challenge
                </Link>
              )}

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
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  New Highlight
                </Link>
              )}
            </div>
          </div>

          {communityId && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 36,
                borderBottom: "1px solid #e2e8f0",
                marginBottom: 22,
                overflowX: "auto",
                paddingBottom: 2,
              }}
            >
              <Link
                href={`/memberships/${communityId}/inside`}
                style={{
                  textDecoration: "none",
                  color: "#0f172a",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid #facc15",
                  whiteSpace: "nowrap",
                }}
              >
                Home
              </Link>

              <Link
                href={`/memberships/${communityId}/inside/chat`}
                style={{
                  textDecoration: "none",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Chat
              </Link>

              <Link
                href={`/memberships/${communityId}/inside/events`}
                style={{
                  textDecoration: "none",
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 0 12px 0",
                  borderBottom: "3px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Events
              </Link>

              {hasVideos && (
                <Link
                  href={`/memberships/${communityId}/inside/videos`}
                  style={{
                    textDecoration: "none",
                    color: "#64748b",
                    fontSize: 14,
                    fontWeight: 600,
                    padding: "10px 0 12px 0",
                    borderBottom: "3px solid transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  Videos
                </Link>
              )}
            </div>
          )}

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
                  Challenges
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Active challenges come first. Tap any card to expand and check in.
                </div>
              </div>
            </div>

            {challengesLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading challenges...</div>
            ) : challenges.length === 0 ? (
              <div
                style={{
                  borderRadius: 0,
                  padding: 18,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No challenges yet.
              </div>
            ) : (
              <div className="membership-challenge-carousel">
                {challenges.map((challenge) => {
                  const isOpen = openChallenges.has(challenge.id);
                  const expired = isChallengeExpired(challenge.deadline);

                  return (
                    <article
                      key={challenge.id}
                      className="membership-challenge-card"
                      style={{
  width: isOpen ? undefined : 96,
  height: isOpen ? undefined : 96,
  flex: isOpen ? undefined : "0 0 96px",
  borderRadius: isOpen ? 24 : 999,
  border: expired ? "1px solid #e5e7eb" : "2px solid #fcd34d",
  background: expired
    ? "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)"
    : "linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #f8fafc 100%)",
  padding: isOpen ? 16 : 4,
      overflow: "hidden",

  // 👇 ESSA É A CORREÇÃO
  display: "flex",
  flexDirection: "column",
  justifyContent: isOpen ? "flex-start" : "center",
  alignItems: isOpen ? "stretch" : "center",
}}
                    >
                      <button
                        type="button"
                        onClick={() => toggleChallenge(challenge.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        <div
  style={{
    display: isOpen ? "flex" : "block",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: isOpen ? 10 : 6,
    textAlign: isOpen ? "left" : "center",
  }}
>
  {isOpen && (
    <div
      style={{
        borderRadius: 999,
        padding: "3px 8px",
        background: expired ? "#e2e8f0" : "#fef3c7",
        color: expired ? "#475569" : "#b45309",
        border: expired ? "1px solid #cbd5e1" : "1px solid #fcd34d",
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {expired ? "Expired" : "Active"}
    </div>
  )}
  <div
    style={{
      fontSize: isOpen ? 11 : 10,
      color: "#64748b",
      fontWeight: 400,
      whiteSpace: isOpen ? "nowrap" : "normal",
      flexShrink: 0,
      lineHeight: 1.2,
    }}
  >
    {formatEndsLabel(challenge.deadline)}
  </div>
</div>
                        <div
  style={{
    fontSize: isOpen ? 16 : 11,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: isOpen ? 1.25 : 1.1,
    marginBottom: isOpen ? 6 : 0,
    marginTop: isOpen ? 0 : 1,
    padding: isOpen ? 0 : "0 6px",
    display: "-webkit-box",
    WebkitLineClamp: isOpen ? "unset" : 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    textAlign: isOpen ? "left" : "center",
  }}
>
  {challenge.title}
</div>
                        {!isOpen && null}
                      </button>
                      {isOpen && (
                        <div
                          style={{
                            marginTop: 14,
                            paddingTop: 14,
                            borderTop: "1px solid #e2e8f0",
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "#ede9fe",
                                color: "#6d28d9",
                                border: "1px solid #c4b5fd",
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              {formatActivityType(challenge.activity_type)}
                            </div>

                            <div
                              style={{
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #86efac",
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              +{challenge.points_active} pts on time
                            </div>

                            <div
                              style={{
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "#dbeafe",
                                color: "#1d4ed8",
                                border: "1px solid #93c5fd",
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              +{challenge.points_late} pts late
                            </div>
                          </div>

                          {challenge.goal_criteria && (
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: "#334155",
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Goal
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#475569",
                                  lineHeight: 1.55,
                                }}
                              >
                                {challenge.goal_criteria}
                              </div>
                            </div>
                          )}

                          {challenge.description && (
                            <div>
                              <div
                                style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: "#334155",
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.3,
                                }}
                              >
                                Details
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#475569",
                                  lineHeight: 1.55,
                                }}
                              >
                                {challenge.description}
                              </div>
                            </div>
                          )}

                          <Link
                            href={`/memberships/${communityId}/inside/checkin/new?challenge_id=${challenge.id}`}
                            style={{
                              textDecoration: "none",
                              marginTop: 2,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 999,
                              padding: "10px 14px",
                              background: "#0f172a",
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: 12,
                              width: "fit-content",
                            }}
                          >
                            Check in this challenge
                          </Link>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div
  style={{
    ...dividerSectionStyle,
    marginBottom: 28,
    borderRadius: 0,
    padding: 16,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  }}
>
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
                  Highlights
                </h2>
              </div>
            </div>

            {highlights.length === 0 ? (
              <div
                style={{
                  borderRadius: 0,
                  padding: 18,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No active highlights right now.
              </div>
            ) : (
              <div style={{ borderTop: "1px solid #e2e8f0" }}>
                {highlights.map((item) => (
                  <Link
                    key={item.id}
                    href={`/memberships/${communityId}/inside/highlights/${item.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "92px minmax(0, 1fr)",
                      gap: 14,
                      alignItems: "center",
                      padding: "14px 0",
                      textDecoration: "none",
                      color: "inherit",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        width: 92,
                        height: 68,
                        borderRadius: 0,
                        overflow: "hidden",
                        background: "#eef2f7",
                        border: "1px solid #dbe2ea",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            fontSize: 10,
                            color: "#64748b",
                            fontWeight: 700,
                            textAlign: "center",
                            padding: 6,
                          }}
                        >
                          Highlight
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          flexWrap: "wrap",
                          marginBottom: 6,
                        }}
                      ></div>

                      <div
                        style={{
                          fontSize: 15, fontWeight: 700, color: "#94a3b8", lineHeight: 1.25, marginBottom: 4, textTransform: "uppercase",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.title}
                      </div>

                      <div
                        style={{
                          fontSize: 15, color: "#000000", lineHeight: 1.45,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          wordBreak: "break-word",
                        }}
                      >
                        {getHighlightPreview(item)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div
  style={{
    ...dividerSectionStyle,
    marginBottom: 28,
    borderRadius: 0,
    padding: 16,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  }}
>
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
                  Community Feed
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
                    fontSize: 12,
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
                  borderRadius: 0,
                  padding: 18,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
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
                                  fontSize: 12,
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
                                  fontSize: 10,
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
                                padding: "3px 8px",
                                fontSize: 10,
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
                              marginBottom: 6,
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
                                borderRadius: 0,
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
                                padding: "3px 8px",
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
                              gap: 4,
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
                                  lineHeight: 1.35,
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
                                  gap: 4,
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
                                            gap: 4,
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
                                              fontSize: 10,
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

          <div style={{ ...dividerSectionStyle, marginBottom: 22 }}>
            {leaderLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading leader...</div>
            ) : leaderRow ? (
              <div
                style={{
                  borderRadius: 26,
                  padding: "18px 20px",
                  background: "linear-gradient(135deg, #fef3c7 0%, #fff7ed 50%, #ffffff 100%)",
                  border: "1px solid #fcd34d",
                                    display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 999,
                      background: getAvatarBackground(leaderRow.author_name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f8fafc",
                      fontWeight: 800,
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(leaderRow.author_name)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#b45309",
                        letterSpacing: 0.4,
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      Leader of the Month
                    </div>

                    <div
                      style={{
                        fontSize: "clamp(18px, 3vw, 24px)",
                        fontWeight: 800,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 4,
                      }}
                    >
                      {leaderRow.author_name}
                    </div>

                    <div style={{ fontSize: 12, color: "#475569" }}>
                      {leaderRow.total_checkins} check-in{leaderRow.total_checkins === 1 ? "" : "s"} this month
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: 999,
                    padding: "10px 14px",
                    background: "transparent",
                    border: "1px solid #fcd34d",
                    color: "#b45309",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {leaderRow.total_points} pts
                </div>
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 22,
                  padding: 16,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  color: "#9a3412",
                  fontSize: 14,
                }}
              >
                No leader yet for this month. The first completed check-in of the month will start the race.
              </div>
            )}
          </div>

          <div
            style={{
              ...dividerSectionStyle,
              marginBottom: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: 22,
                padding: 16,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#2563eb",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 6,
                }}
              >
                Your streak
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {myStreak} 🔥
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Consecutive active day{myStreak === 1 ? "" : "s"} based on your check-ins.
              </div>
            </div>

            <div
              style={{
                borderRadius: 22,
                padding: 16,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                borderBottom: "1px solid #e2e8f0",
                             }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#16a34a",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  marginBottom: 6,
                }}
              >
                Community pulse
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {checkinTotalCount}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Total visible check-ins registered by this membership.
              </div>
            </div>
          </div>

          <div
  style={{
    ...dividerSectionStyle,
    marginBottom: 28,
    borderRadius: 0,
    padding: 16,
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  }}
>
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
                  Check-in
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Register your activity and earn points for the ranking.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {communityId && (
                  <Link
                    href={`/memberships/${communityId}/inside/checkins`}
                    style={{
                      textDecoration: "none",
                      borderRadius: 999,
                      padding: "10px 16px",
                      background: "#e2e8f0",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    View History
                  </Link>
                )}

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
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    New Check-in
                  </Link>
                )}
              </div>
            </div>

            {checkinsLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading check-ins...</div>
            ) : recentCheckins.length === 0 ? (
              <div
                style={{
                  borderRadius: 0,
                  padding: 18,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No check-ins yet. Start registering activities to build the ranking.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
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
                      padding: "3px 8px",
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #86efac",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {checkinTotalCount} visible check-in{checkinTotalCount === 1 ? "" : "s"}
                  </div>

                  <div
                    style={{
                      borderRadius: 999,
                      padding: "3px 8px",
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      border: "1px solid #93c5fd",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Ranking ignores disregarded entries
                  </div>
                </div>

                <div className="membership-checkin-scroll">
                  <div style={{ display: "grid", gap: 6 }}>
                    {recentCheckins.map((item) => {
                      const authorLabel = getDisplayName(item.author_name);
                      const isImageOpen = openCheckinImages.has(item.id);
                      const isChallengeCheckin = Boolean(item.challenge_id);
                      const isMine = item.user_id === userId;

                      return (
                        <article
                          key={item.id}
                          style={{
                            borderRadius: 0,
                            padding: "8px 0",
                            background: item.is_disregarded
                              ? "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)"
                              : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              flexWrap: "wrap",
                              marginBottom: 6,
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
                                  width: 30,
                                  height: 30,
                                  borderRadius: 999,
                                  background: getAvatarBackground(authorLabel),
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
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
                                    fontSize: 12,
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
                                    fontSize: 10,
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
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  background: "#ede9fe",
                                  color: "#6d28d9",
                                  border: "1px solid #c4b5fd",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {formatActivityType(item.activity_type)}
                              </div>

                              {isChallengeCheckin && (
                                <div
                                  style={{
                                    borderRadius: 999,
                                    padding: "3px 8px",
                                    background: "#dbeafe",
                                    color: "#1d4ed8",
                                    border: "1px solid #93c5fd",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Challenge
                                </div>
                              )}

                              <div
                                style={{
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  background: item.is_disregarded ? "#fee2e2" : "#fef3c7",
                                  color: item.is_disregarded ? "#b91c1c" : "#b45309",
                                  border: item.is_disregarded ? "1px solid #fca5a5" : "1px solid #fcd34d",
                                  fontSize: 10,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.is_disregarded ? "Disregarded" : `+${item.points} pts`}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                color: "#475569",
                                fontSize: 12,
                                lineHeight: 1.35,
                              }}
                            >
                              {item.comment?.trim()
                                ? item.comment
                                : isChallengeCheckin
                                ? "Challenge proof submitted."
                                : "Workout proof submitted."}
                            </div>

                            {item.is_disregarded && (
                              <div
                                style={{
                                  borderRadius: 14,
                                  padding: "10px 12px",
                                  background: "#fff7ed",
                                  border: "1px solid #fdba74",
                                  color: "#9a3412",
                                  fontSize: 12,
                                  lineHeight: 1.55,
                                }}
                              >
                                {isMine
                                  ? "This check-in was disregarded by an admin and is hidden from other members."
                                  : "This check-in is currently disregarded and hidden from regular members."}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              {item.image_url ? (
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
                              ) : (
                                <span style={{ fontSize: 12, color: "#64748b" }}>No photo attached</span>
                              )}

                              {canManageHighlights && (
                                <button
                                  type="button"
                                  onClick={() => handleDisregardToggle(item.id, item.is_disregarded)}
                                  disabled={checkinActionId === item.id}
                                  style={{
                                    border: item.is_disregarded ? "1px solid #86efac" : "1px solid #fdba74",
                                    background: item.is_disregarded ? "#f0fdf4" : "#fff7ed",
                                    color: item.is_disregarded ? "#166534" : "#9a3412",
                                    borderRadius: 999,
                                    padding: "8px 12px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                    opacity: checkinActionId === item.id ? 0.7 : 1,
                                  }}
                                >
                                  {checkinActionId === item.id
                                    ? "Saving..."
                                    : item.is_disregarded
                                    ? "Add again"
                                    : "Disregard"}
                                </button>
                              )}
                            </div>
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
                                  borderRadius: 0,
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

          <div style={dividerSectionStyle}>
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
                  Ranking
                </h2>
                <div style={{ color: "#64748b", fontSize: 13 }}>
                  Community points based on completed visible check-ins.
                </div>
              </div>
            </div>

            {rankingLoading ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading ranking...</div>
            ) : rankingRows.length === 0 ? (
              <div
                style={{
                  borderRadius: 0,
                  padding: 18,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                No ranking yet. Check-ins will appear here as soon as members start posting.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: 22,
                  overflow: "hidden",
                  borderBottom: "1px solid #e2e8f0",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                                  }}
              >
                {orderedRanking.map((row, index) => {
                  const authorLabel = getDisplayName(row.author_name);
                  const isTopThree = index < 3;
                  const rankLabel = index === 0 ? "🥇 #1" : index === 1 ? "🥈 #2" : index === 2 ? "🥉 #3" : `#${index + 1}`;

                  return (
                    <div
                      key={row.user_id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderBottom:
                          index === orderedRanking.length - 1 ? "none" : "1px solid #eef2f7",
                        background: isTopThree
                          ? "linear-gradient(90deg, rgba(254,243,199,0.55) 0%, rgba(255,255,255,0) 100%)"
                          : "transparent",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: isTopThree ? "#b45309" : "#64748b",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rankLabel}
                      </div>

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
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            background: getAvatarBackground(authorLabel),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
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
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#0f172a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {authorLabel}
                          </div>

                          <div style={{ fontSize: 12, color: "#64748b" }}>
                            {row.total_checkins} check-in{row.total_checkins === 1 ? "" : "s"} • 🔥 {row.streak}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          background: "#dcfce7",
                          color: "#166534",
                          border: "1px solid #86efac",
                          fontSize: 12,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.total_points} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}








