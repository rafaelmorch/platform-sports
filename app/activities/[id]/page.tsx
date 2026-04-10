"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import BackArrow from "@/components/BackArrow";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

/* ================= Types ================= */

type ActivityRow = {
  id: string;

  created_at: string | null;
  created_by: string;

  title: string;
  activity_type: string;

  description: string | null;

  start_date: string | null;

  location_text: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;

  address_text: string | null;

  capacity: number;

  is_public: boolean;

  image_path: string | null;
  image_url: string | null;

  community_id: string | null;
};

type AttendeeAvatar = {
  user_id: string;
  full_name: string | null;
};

type CreatorAttendeeRow = {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  confirmed_at: string | null;
};

type ActivityMessageRow = {
  id: string;
  activity_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

type ProfileMini = {
  id: string;
  full_name: string | null;
  email: string | null;
};

/* ================= Utils ================= */

function formatDateTime(dt: string | null): string {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function formatTimeOnly(dt: string | null): string {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fieldValue(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t.length ? t : "—";
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

function initialsFromProfile(fullName: string | null | undefined, userId: string | null | undefined): string {
  const name = (fullName ?? "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const a = parts[0].slice(0, 1);
    const b = parts[parts.length - 1].slice(0, 1);
    return `${a}${b}`.toUpperCase();
  }

  const uid = (userId ?? "").trim();
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

function avatarStyleFromUserId(userId: string) {
  const hue = hashToHue(userId);

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

/* ===== Map helpers ===== */

function buildAddressForMap(a: ActivityRow | null): string {
  if (!a) return "";

  const address = (a.address_text ?? "").trim();
  if (address) return address;

  const city = (a.city ?? "").trim();
  const state = (a.state ?? "").trim();

  const parts: string[] = [];
  if (city && state) parts.push(`${city}, ${state}`);
  else if (city) parts.push(city);
  else if (state) parts.push(state);

  return parts.join(", ").trim();
}

function googleEmbedFromAddress(q: string): string | null {
  const s = (q ?? "").trim();
  if (!s) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(s)}&output=embed`;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/* ================= Page ================= */

export default function ActivityDetailPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();
  const { id: activityId } = useParams<{ id: string }>();

  const [activity, setActivity] = useState<ActivityRow | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [attendees, setAttendees] = useState<AttendeeAvatar[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [creatorAttendees, setCreatorAttendees] = useState<CreatorAttendeeRow[]>([]);
  const [creatorLoading, setCreatorLoading] = useState(false);

  const [membershipLocked, setMembershipLocked] = useState(false);
  const [lockedCommunityId, setLockedCommunityId] = useState<string | null>(null);
  const [canAccessProtectedContent, setCanAccessProtectedContent] = useState(false);

  const [chatMessages, setChatMessages] = useState<ActivityMessageRow[]>([]);
  const [chatProfiles, setChatProfiles] = useState<Record<string, ProfileMini>>({});
  const [chatLoading, setChatLoading] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatInfo, setChatInfo] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");

  const boxStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

  useEffect(() => {
    if (!activityId) return;

    let cancelled = false;

    async function loadActivity() {
      setLoading(true);
      setError(null);
      setInfo(null);
      setMembershipLocked(false);
      setLockedCommunityId(null);
      setCanAccessProtectedContent(false);

      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("app_activities")
        .select(
          "id,created_at,created_by,title,activity_type,description,start_date,location_text,city,state,lat,lng,is_public,image_path,image_url,address_text,capacity,community_id"
        )
        .eq("id", activityId)
        .single();

      if (cancelled) return;

      if (error) {
        setError(error.message || "Failed to load activity.");
        setActivity(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const a = (data as ActivityRow) ?? null;
      setActivity(a);

      const owner = !!(a?.created_by && user.id === a.created_by);
      setIsOwner(owner);

      if (!a?.community_id) {
        setCanAccessProtectedContent(true);
        setLoading(false);
        return;
      }

      setLockedCommunityId(a.community_id);

      if (owner) {
        setCanAccessProtectedContent(true);
        setLoading(false);
        return;
      }

      const [{ data: community }, { data: request }] = await Promise.all([
        supabase
          .from("app_membership_communities")
          .select("created_by")
          .eq("id", a.community_id)
          .maybeSingle(),
        supabase
          .from("app_membership_requests")
          .select("status")
          .eq("community_id", a.community_id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const isCommunityCreator = community?.created_by === user.id;
      const isApprovedMember = request?.status === "approved";

      if (isCommunityCreator || isApprovedMember) {
        setCanAccessProtectedContent(true);
        setMembershipLocked(false);
      } else {
        setMembershipLocked(true);
        setCanAccessProtectedContent(false);
      }

      setLoading(false);
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [supabase, activityId, router]);

  const fetchConfirmedCount = useCallback(async () => {
    if (!activityId || !canAccessProtectedContent) return;
    const { data, error } = await supabase.rpc("app_activity_confirmed_count", { p_activity_id: activityId });
    if (error) throw new Error(error.message);
    const n = typeof data === "number" ? data : Number(data ?? 0);
    setConfirmedCount(Number.isFinite(n) ? n : 0);
  }, [supabase, activityId, canAccessProtectedContent]);

  const fetchIsConfirmed = useCallback(async () => {
    if (!activityId || !canAccessProtectedContent) return;
    if (!userId) {
      setIsConfirmed(false);
      return;
    }

    const { data, error } = await supabase
      .from("app_activity_attendees")
      .select("user_id")
      .eq("activity_id", activityId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    setIsConfirmed(!!data?.user_id);
  }, [supabase, activityId, userId, canAccessProtectedContent]);

  const fetchAttendeeAvatars = useCallback(async () => {
    if (!activityId || !canAccessProtectedContent) return;

    const { data, error } = await supabase
      .from("app_activity_attendees")
      .select("user_id, profiles(full_name)")
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<{
      user_id: string;
      profiles: { full_name: string | null } | Array<{ full_name: string | null }> | null;
    }>;

    setAttendees(
      rows.map((r) => {
        const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return { user_id: r.user_id, full_name: p?.full_name ?? null };
      })
    );
  }, [supabase, activityId, canAccessProtectedContent]);

  const fetchCreatorList = useCallback(async () => {
    if (!activityId || !canAccessProtectedContent) return;
    if (!isOwner) {
      setCreatorAttendees([]);
      return;
    }

    setCreatorLoading(true);
    try {
      const { data, error } = await supabase.rpc("app_activity_confirmed_list_for_creator", { p_activity_id: activityId });
      if (error) throw new Error(error.message);
      setCreatorAttendees((data ?? []) as CreatorAttendeeRow[]);
    } finally {
      setCreatorLoading(false);
    }
  }, [supabase, activityId, isOwner, canAccessProtectedContent]);

  useEffect(() => {
    if (!canAccessProtectedContent) return;
    fetchConfirmedCount().catch(() => {});
  }, [fetchConfirmedCount, canAccessProtectedContent]);

  useEffect(() => {
    if (!canAccessProtectedContent) return;
    fetchAttendeeAvatars().catch(() => {});
    fetchIsConfirmed().catch(() => {});
  }, [fetchAttendeeAvatars, fetchIsConfirmed, canAccessProtectedContent]);

  useEffect(() => {
    if (!canAccessProtectedContent) return;
    fetchCreatorList().catch(() => {});
  }, [fetchCreatorList, canAccessProtectedContent]);

  const fetchChat = useCallback(async () => {
    if (!activityId || !canAccessProtectedContent) return;

    setChatLoading(true);
    setChatError(null);

    try {
      const { data, error } = await supabase
        .from("app_activity_messages")
        .select("id,activity_id,user_id,message,created_at")
        .eq("activity_id", activityId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as ActivityMessageRow[];
      setChatMessages(rows);

      const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);
      if (ids.length === 0) {
        setChatProfiles({});
        return;
      }

      const { data: prof, error: pErr } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      if (pErr) throw new Error(pErr.message);

      const map: Record<string, ProfileMini> = {};
      (prof ?? []).forEach((p) => {
        map[p.id] = { id: p.id, full_name: p.full_name ?? null, email: (p as any).email ?? null };
      });

      setChatProfiles(map);
    } catch (e: unknown) {
      setChatError(errorMessage(e));
    } finally {
      setChatLoading(false);
    }
  }, [supabase, activityId, canAccessProtectedContent]);

  useEffect(() => {
    if (!canAccessProtectedContent) return;
    fetchChat().catch(() => {});
  }, [fetchChat, canAccessProtectedContent]);

  async function handleDelete() {
    if (!activityId) return;
    if (!isOwner) return;

    const ok = window.confirm("Are you sure you want to delete this activity? This cannot be undone.");
    if (!ok) return;

    setDeleteBusy(true);
    setError(null);
    setInfo(null);

    try {
      const pathToRemove = activity?.image_path ?? null;

      const { error: delErr } = await supabase.from("app_activities").delete().eq("id", activityId);
      if (delErr) throw new Error(delErr.message);

      if (pathToRemove) {
        await supabase.storage.from("event-images").remove([pathToRemove]);
      }

      router.push("/activities");
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to delete activity.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleConfirmToggle() {
    if (!activityId || !userId) return;

    setConfirmBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (!isConfirmed) {
        const { error } = await supabase.from("app_activity_attendees").insert([{ activity_id: activityId, user_id: userId }]);
        if (error) throw new Error(error.message);
        setInfo("Attendance confirmed.");
      } else {
        const { error } = await supabase.from("app_activity_attendees").delete().eq("activity_id", activityId).eq("user_id", userId);
        if (error) throw new Error(error.message);
        setInfo("Attendance canceled.");
      }

      await fetchConfirmedCount();
      await fetchAttendeeAvatars();
      await fetchIsConfirmed();
      await fetchCreatorList();
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to update attendance.");
    } finally {
      setConfirmBusy(false);
    }
  }

  async function handleSendMessage() {
    if (!activityId || !userId) return;

    const text = (chatText ?? "").trim();
    if (!text) return;

    setChatBusy(true);
    setChatError(null);
    setChatInfo(null);

    try {
      const { data, error } = await supabase.rpc("app_post_activity_message", { p_activity_id: activityId, p_message: text });
      if (error) throw new Error(error.message);

      if (data && typeof data === "object") {
        const row = data as ActivityMessageRow;
        setChatMessages((prev) => [...prev, row]);

        if (!chatProfiles[userId]) {
          const { data: prof, error: pErr } = await supabase.from("profiles").select("id,full_name,email").eq("id", userId).maybeSingle();
          if (!pErr && prof?.id) {
            setChatProfiles((prev) => ({
              ...prev,
              [prof.id]: { id: prof.id, full_name: prof.full_name ?? null, email: (prof as any).email ?? null },
            }));
          }
        }
      } else {
        await fetchChat();
      }

      setChatText("");
      setChatInfo("Message sent.");
    } catch (e: unknown) {
      setChatError(errorMessage(e));
    } finally {
      setChatBusy(false);
    }
  }

  const img = getPublicImageUrl(activity?.image_path ?? null) || activity?.image_url || null;

  const addressForMap = buildAddressForMap(activity);
  const mapEmbedFromAddress = googleEmbedFromAddress(addressForMap);

  const mapUrl =
    activity?.lat != null && activity?.lng != null
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${activity.lat},${activity.lng}`)}&output=embed`
      : mapEmbedFromAddress;

  const typeText = fieldValue(activity?.activity_type ?? null);
  const dateText = formatDateTime(activity?.start_date ?? null);

  const avatarMax = 10;
  const avatarShown = attendees.slice(0, avatarMax);
  const avatarExtra = attendees.length > avatarMax ? attendees.length - avatarMax : 0;

  const cap = typeof activity?.capacity === "number" ? activity.capacity : 0;
  const spotsLeft = Math.max(0, cap - (confirmedCount ?? 0));

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          width: "100%",
          backgroundColor: "#ffffff",
          color: "#374151",
          padding: "16px",
          paddingBottom: "80px",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <header style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BackArrow href="/activities" />
              </div>

              <div style={{ minWidth: 0, flex: "1 1 260px" }}>
                <p style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748b", margin: 0 }}>
                  Activities
                </p>

                <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "6px 0 0 0" }}>
                  {loading ? "Loading..." : fieldValue(activity?.title ?? null)}
                </h1>

                <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", margin: "6px 0 0 0" }}>
                  {typeText} • {dateText}
                </p>
              </div>
            </div>

            {isOwner ? (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <Link
                  href={`/activities/${activityId}/edit`}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #1e3a8a",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 800,
                  }}
                >
                  Edit
                </Link>

                <button
                  onClick={handleDelete}
                  disabled={deleteBusy}
                  style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #fecaca",
                    background: "#ffffff",
                    color: "#b91c1c",
                    cursor: deleteBusy ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    opacity: deleteBusy ? 0.7 : 1,
                  }}
                >
                  {deleteBusy ? "Deleting..." : "Delete"}
                </button>
              </div>
            ) : null}
          </header>

          {error ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#fca5a5" }}>{error}</p> : null}
          {info ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#86efac" }}>{info}</p> : null}

          {membershipLocked ? (
            <section
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.28)",
                background: "#ffffff",
                padding: "14px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 240,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.22)",
                  overflow: "hidden",
                  position: "relative",
                  background: "#f8fafc",
                  ...boxStyle,
                }}
              >
                {img ? (
                  <>
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(18px)",
                        transform: "scale(1.15)",
                        opacity: 0.55,
                      }}
                    />
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "transparent",
                      }}
                    />
                    <img
                      src={img}
                      alt={activity?.title ?? "activity image"}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>No image</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(56,189,248,0.5)",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeText}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#ffffff",
                    color: "#374151",
                    whiteSpace: "nowrap",
                  }}
                >
                  Private community event
                </span>
              </div>


              <div
                style={{
                  borderRadius: 14,
                  padding: 14,
                  border: "1px solid rgba(250,204,21,0.30)",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                This event belongs to a private community. Join the community to view the full details, attendance, map and chat.
              </div>

              {lockedCommunityId && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <Link
                    href={`/memberships/${lockedCommunityId}`}
                    style={{
                      fontSize: 12,
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: "1px solid rgba(250,204,21,0.45)",
                      background: "linear-gradient(135deg, rgba(120,53,15,0.95), rgba(146,64,14,0.95))",
                      color: "#fef3c7",
                      textDecoration: "none",
                      fontWeight: 800,
                    }}
                  >
                    View Community
                  </Link>
                </div>
              )}
            </section>
          ) : (
            <section
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148,163,184,0.28)",
                background: "#ffffff",
                padding: "14px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 240,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.22)",
                  overflow: "hidden",
                  position: "relative",
                  background: "#f8fafc",
                  ...boxStyle,
                }}
              >
                {img ? (
                  <>
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage: `url(${img})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(18px)",
                        transform: "scale(1.15)",
                        opacity: 0.55,
                      }}
                    />
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "transparent",
                      }}
                    />
                    <img
                      src={img}
                      alt={activity?.title ?? "activity image"}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </>
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>No image</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(56,189,248,0.5)",
                    background: "#1e3a8a",
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {typeText}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#ffffff",
                    color: "#374151",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activity?.is_public ? "Public" : "Private"}
                </span>

                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "#ffffff",
                    color: "#374151",
                    whiteSpace: "nowrap",
                  }}
                >
                  Spots left: {spotsLeft}
                </span>
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "10px 0 6px 0" }}>Details</h2>

                <div style={{ padding: 12, ...boxStyle }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                      {[
                        { label: "Title", value: activity?.title ?? "—" },
                        { label: "Activity type", value: activity?.activity_type ?? "—" },
                        { label: "Start date", value: formatDateTime(activity?.start_date ?? null) },
                      ].map((row) => (
                        <div key={row.label}>
                          <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>{row.label}</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {String(row.value || "—")}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                      {[
                        { label: "Address", value: fieldValue(activity?.address_text ?? null) },
                        { label: "City", value: activity?.city ?? "—" },
                        { label: "State", value: activity?.state ?? "—" },
                      ].map((row) => (
                        <div key={row.label}>
                          <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>{row.label}</p>
                          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {String(row.value || "—")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {activity?.description ? (
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "10px 0 6px 0" }}>Description</h2>
                  <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", margin: 0, whiteSpace: "pre-wrap" }}>{activity.description}</p>
                </div>
              ) : null}

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "10px 0 6px 0" }}>Attendance</h2>

                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, ...boxStyle }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>
                    Confirmed: <span style={{ color: "#374151", fontWeight: 900 }}>{confirmedCount}</span>
                  </p>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {avatarShown.map((p) => (
                      <div
                        key={p.user_id}
                        title={p.full_name ?? ""}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 900,
                          letterSpacing: "0.04em",
                          ...avatarStyleFromUserId(p.user_id),
                        }}
                      >
                        {initialsFromProfile(p.full_name, p.user_id)}
                      </div>
                    ))}

                    {avatarExtra > 0 ? (
                      <div
                        style={{
                          height: 34,
                          borderRadius: "8px",
                          border: "1px dashed rgba(148,163,184,0.35)",
                          background: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 10px",
                          fontSize: 12,
                          fontWeight: 900,
                          color: "#64748b",
                        }}
                      >
                        +{avatarExtra}
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={handleConfirmToggle}
                    disabled={confirmBusy || loading}
                    style={{
                      fontSize: 12,
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: isConfirmed ? "1px solid #fecaca" : "1px solid #15803d",
                      background: isConfirmed ? "#ffffff" : "#16a34a",
                      color: isConfirmed ? "#b91c1c" : "#ffffff",
                      cursor: confirmBusy ? "not-allowed" : "pointer",
                      fontWeight: 900,
                      opacity: confirmBusy ? 0.75 : 1,
                      alignSelf: "flex-start",
                    }}
                  >
                    {confirmBusy ? "Please wait..." : isConfirmed ? "Cancel attendance" : "Confirm attendance"}
                  </button>

                  {isOwner ? (
                    <div style={{ marginTop: 6 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "6px 0 8px 0", color: "#374151" }}>
                        Confirmed attendees (creator)
                      </h3>

                      {creatorLoading ? (
                        <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "Arial, sans-serif" }}>Loading list...</p>
                      ) : creatorAttendees.length ? (
                        <div style={{ borderRadius: 12, overflow: "hidden", ...boxStyle }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                              padding: 10,
                              borderBottom: "1px solid rgba(148,163,184,0.18)",
                              color: "#64748b",
                              fontSize: 11,
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            <div>Name</div>
                            <div>Email</div>
                          </div>

                          {creatorAttendees.map((r, idx) => (
                            <div
                              key={`${r.user_id ?? "x"}-${idx}`}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 10,
                                padding: 10,
                                borderBottom: "1px solid rgba(148,163,184,0.12)",
                              }}
                            >
                              <div style={{ fontSize: 12, color: "#374151", fontWeight: 800 }}>{fieldValue(r.full_name)}</div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{fieldValue(r.email)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "Arial, sans-serif" }}>No confirmations yet.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "10px 0 6px 0" }}>Map</h2>

                {mapUrl ? (
                  <>
                    <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", margin: 0 }}>
                      Address used on map: <span style={{ color: "#374151" }}>{fieldValue(addressForMap || null)}</span>
                    </p>

                    {activity?.lat != null && activity?.lng != null ? (
                      <p style={{ fontSize: 12, color: "#64748b", fontFamily: "Arial, sans-serif", margin: "6px 0 0 0" }}>
                        Lat/Lng:{" "}
                        <span style={{ color: "#374151" }}>
                          {activity?.lat}, {activity?.lng}
                        </span>
                      </p>
                    ) : null}

                    <div style={{ marginTop: 10, borderRadius: 14, overflow: "hidden", ...boxStyle }}>
                      <iframe title="map" src={mapUrl} width="100%" height="240" style={{ border: 0 }} loading="lazy" />
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#6b7280", fontFamily: "Arial, sans-serif", margin: 0 }}>
                    Not enough address data to show the map. Fill in <b>address_text</b> (or city/state) for this activity.
                  </p>
                )}
              </div>

              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, fontFamily: "Montserrat, sans-serif", margin: "10px 0 6px 0" }}>Chat</h2>

                <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, ...boxStyle }}>
                  {chatError ? <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>{chatError}</p> : null}
                  {chatInfo ? <p style={{ margin: 0, fontSize: 12, color: "#86efac" }}>{chatInfo}</p> : null}

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.18)",
                      background: "#f8fafc",
                      padding: 10,
                      maxHeight: 260,
                      overflow: "auto",
                    }}
                  >
                    {chatLoading ? (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "Arial, sans-serif" }}>Loading messages...</p>
                    ) : chatMessages.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "Arial, sans-serif" }}>No messages yet. Be the first to say something.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {chatMessages.map((m) => {
                          const prof = chatProfiles[m.user_id];
                          const name = prof?.full_name ?? null;
                          const mine = userId === m.user_id;

                          return (
                            <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <div
                                title={name ?? ""}
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 12,
                                  fontWeight: 900,
                                  letterSpacing: "0.04em",
                                  flex: "0 0 auto",
                                  ...avatarStyleFromUserId(m.user_id),
                                }}
                              >
                                {initialsFromProfile(name, m.user_id)}
                              </div>

                              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                                  <p style={{ margin: 0, fontSize: 12, color: "#374151", fontWeight: 900 }}>
                                    {mine ? "You" : fieldValue(name)}
                                  </p>
                                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{formatTimeOnly(m.created_at)}</p>
                                </div>

                                <p
                                  style={{
                                    margin: "4px 0 0 0",
                                    fontSize: 13,
                                    color: "#374151",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {m.message}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <label style={{ flex: "1 1 360px" }}>
                      <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>Message</p>
                      <textarea
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Type a message..."
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(148,163,184,0.25)",
                          background: "#ffffff",
                          color: "#374151",
                          outline: "none",
                          minHeight: 70,
                          resize: "vertical",
                          boxSizing: "border-box",
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={chatBusy || !chatText.trim()}
                      style={{
                        fontSize: 12,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid #1e3a8a",
                        background: "#1e3a8a",
                        color: "#ffffff",
                        cursor: chatBusy ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        opacity: chatBusy ? 0.75 : 1,
                      }}
                    >
                      {chatBusy ? "Sending..." : "Send"}
                    </button>

                    <button
                      type="button"
                      onClick={() => fetchChat().catch(() => {})}
                      disabled={chatLoading || chatBusy}
                      style={{
                        fontSize: 12,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid rgba(148,163,184,0.35)",
                        background: "#ffffff",
                        color: "#374151",
                        fontWeight: 800,
                        cursor: chatLoading ? "not-allowed" : "pointer",
                        opacity: chatLoading ? 0.75 : 1,
                      }}
                    >
                      Refresh
                    </button>
                  </div>

                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                    Tip: Use this chat for quick coordination (parking, what to bring, updates).
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow-x: hidden !important;
        }
      `}</style>
    </>
  );
}










