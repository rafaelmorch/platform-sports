// app/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ProfileRow = {
  full_name: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setErrorMsg(null);
      setSuccessMsg(null);

      // 0) must be logged in
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const user = session.user;
      setEmail(user.email ?? null);

      // 1) load name (profiles -> fallback user_metadata)
      try {
        const { data: profile, error: profileError } = await supabaseBrowser
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        const fallbackName =
          (user.user_metadata as any)?.full_name ||
          (user.user_metadata as any)?.name ||
          "";

        setName(profile?.full_name || fallbackName || "");
      } catch (err) {
        console.error("Unexpected error loading profile:", err);
        setErrorMsg("Unexpected error while loading profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    run();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!session) {
        setErrorMsg("You must be logged in to save your profile.");
        setSaving(false);
        router.replace("/login");
        return;
      }

      const user = session.user;

      const { error: upsertError } = await supabaseBrowser
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: name.trim(),
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("Error saving profile:", upsertError);
        setErrorMsg("Error saving profile data.");
        setSaving(false);
        return;
      }

      setSuccessMsg("Profile updated successfully!");
    } catch (err) {
      console.error("Unexpected error saving profile:", err);
      setErrorMsg("Unexpected error while saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setSigningOut(true);
      const { error } = await supabaseBrowser.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);
        setErrorMsg("Error signing out. Please try again.");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Unexpected error signing out:", err);
      setErrorMsg("Unexpected error while signing out.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "16px",
        paddingBottom: "80px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "999px",
                background: "radial-gradient(circle at 20% 20%, #38bdf8, #0ea5e9 40%, #0f172a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 700,
                color: "#0b1120",
              }}
            >
              {name ? name.charAt(0).toUpperCase() : "A"}
            </div>

            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>My Profile</h1>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>Manage the name shown in SportPlatform.</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.6)",
              color: "#e5e7eb",
              fontSize: 13,
              fontWeight: 600,
              cursor: signingOut ? "not-allowed" : "pointer",
              opacity: signingOut ? 0.7 : 1,
            }}
            title="Sign out"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </header>

        <section
          style={{
            borderRadius: 18,
            padding: "16px 14px",
            background: "radial-gradient(circle at top, #0f172a, #020617 60%)",
            border: "1px solid rgba(148,163,184,0.4)",
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              marginBottom: 10,
            }}
          >
            Basic info
          </h2>

          {loadingProfile ? (
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading profile...</p>
          ) : (
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="name" style={{ fontSize: 12, color: "#d1d5db" }}>
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    borderRadius: 10,
                    padding: "8px 10px",
                    border: "1px solid rgba(55,65,81,0.9)",
                    backgroundColor: "#020617",
                    color: "#e5e7eb",
                    fontSize: 13,
                  }}
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "#6b7280",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  This is the name that will appear in the feed, dashboard, and other areas of the app.
                </p>
              </div>

              {email && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#d1d5db" }}>Email (read-only)</span>
                  <div
                    style={{
                      borderRadius: 10,
                      padding: "8px 10px",
                      border: "1px solid rgba(31,41,55,0.9)",
                      backgroundColor: "#020617",
                      fontSize: 13,
                      color: "#9ca3af",
                    }}
                  >
                    {email}
                  </div>
                </div>
              )}

              {errorMsg && (
                <p style={{ fontSize: 12, color: "#fca5a5", margin: 0, marginTop: 4 }}>
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p style={{ fontSize: 12, color: "#bbf7d0", margin: 0, marginTop: 4 }}>
                  {successMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  marginTop: 8,
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  padding: "8px 16px",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  background: "linear-gradient(to right, #38bdf8, #0ea5e9, #0284c7)",
                  color: "#0b1120",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                  transition: "opacity 0.15s ease-out",
                }}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          )}
        </section>
      </div>

      <BottomNavbar />
    </main>
  );
}
