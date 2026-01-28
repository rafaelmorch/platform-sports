"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type ActivityRow = {
  id: string;
  title: string | null;
  sport: string | null;
  description: string | null;
  start_date: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  capacity: number | null;
  image_path: string | null;
  image_url: string | null;
  published: boolean | null;
};

function formatDateTime(dt: string | null): string {
  if (!dt) return "Date TBD";
  try {
    return new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

function buildAddress(a: ActivityRow): string {
  const parts = [];
  if (a.address_text) parts.push(a.address_text);
  if (a.city && a.state) parts.push(`${a.city}, ${a.state}`);
  return parts.join(" • ") || "Location TBD";
}

function getPublicImageUrl(path: string | null): string | null {
  if (!path) return null;
  const { data } = supabaseBrowser.storage.from("event-images").getPublicUrl(path);
  return data?.publicUrl ?? null;
}

export default function ActivitiesPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nowIso = new Date().toISOString();

      const { data } = await supabase
        .from("app_activities")
        .select(
          "id,title,sport,description,start_date,address_text,city,state,capacity,image_path,image_url,published"
        )
        .eq("published", true)
        .gte("start_date", nowIso)
        .order("start_date", { ascending: true });

      if (!cancelled) {
        setActivities((data as ActivityRow[]) ?? []);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        padding: 16,
        paddingBottom: 96,
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ marginBottom: 16 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#64748b",
              margin: 0,
            }}
          >
            Activities
          </p>

          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "6px 0" }}>
            Activities
          </h1>

          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Training sessions and community activities.
          </p>
        </header>

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
        ) : activities.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            No upcoming activities.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activities.map((a) => {
              const img =
                getPublicImageUrl(a.image_path) || a.image_url || null;

              return (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <article
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(148,163,184,0.25)",
                      background:
                        "linear-gradient(145deg,#020617,#000000)",
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: 120,
                        minWidth: 120,
                        height: 80,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#000",
                        border: "1px solid rgba(148,163,184,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={a.title ?? "activity"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          No image
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.title ?? "Activity"}
                      </h2>

                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: 12,
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.sport} • {formatDateTime(a.start_date)}
                      </p>

                      <p
                        style={{
                          margin: "6px 0 0 0",
                          fontSize: 12,
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {buildAddress(a)}
                      </p>

                      {a.description ? (
                        <p
                          style={{
                            margin: "8px 0 0 0",
                            fontSize: 12,
                            color: "#cbd5e1",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {a.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavbar />
    </main>
  );
}
