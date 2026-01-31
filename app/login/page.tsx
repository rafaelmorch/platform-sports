"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BottomNavbar from "@/components/BottomNavbar";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

// ================= SUPABASE =================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ================= PAGE =================
export default function LoginPage() {
  const router = useRouter();
  const isNative = Capacitor.isNativePlatform();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ================= AUTH STATE =================
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/activities");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // ================= GOOGLE CALLBACK (ANDROID/iOS via deep link) =================
  useEffect(() => {
    if (!isNative) return;

    const sub = App.addListener("appUrlOpen", async ({ url }) => {
      try {
        if (!url) return;

        // Fecha o browser do OAuth (se estiver aberto)
        try {
          await Browser.close();
        } catch {}

        const u = new URL(url);
        const code = u.searchParams.get("code");

        if (code) {
          // Troca o code por sessão
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // fallback (caso venha outro formato)
          // @ts-expect-error compat
          const { error } = await supabase.auth.getSessionFromUrl({
            url,
            storeSession: true,
          });
          if (error) throw error;
        }

        setLoadingGoogle(false);
      } catch (e: any) {
        setErrorMsg(e?.message || "Failed to complete Google login.");
        setLoadingGoogle(false);
      }
    });

    return () => {
      sub.remove();
    };
  }, [isNative]);

  // ================= EMAIL LOGIN =================
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Invalid email or password.");
      setLoading(false);
      return;
    }

    // auth state listener vai redirecionar
  }

  // ================= GOOGLE LOGIN =================
  async function handleGoogle() {
    setErrorMsg(null);
    setLoadingGoogle(true);

    const redirectTo = isNative
      ? "com.platformsports.app://auth/callback"
      : `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // ✅ no app a gente controla a abertura do browser
        // ✅ no site deixa o supabase redirecionar normal
        skipBrowserRedirect: isNative,
      },
    });

    if (error) {
      setErrorMsg("Failed to connect with Google.");
      setLoadingGoogle(false);
      return;
    }

    // APP: abre o Chrome Custom Tab (Capacitor Browser)
    if (isNative && data?.url) {
      await Browser.open({
        url: data.url,
        presentationStyle: "fullscreen",
      });
    }
  }

  // ================= UI =================
  return (
    <>
      <style jsx global>{`
        html,
        body {
          height: 100%;
          overflow: hidden;
          background: #000;
        }
      `}</style>

      <main
        style={{
          height: "100vh",
          width: "100vw",
          background:
            "radial-gradient(circle at top, #020617 0%, #020617 45%, #000 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          paddingBottom: 96,
          color: "#e5e7eb",
          boxSizing: "border-box",
        }}
      >
        <img
          src="/logo-sports-platform.png"
          alt="Platform Sports"
          style={{ width: 520, maxWidth: "92vw", marginBottom: 24 }}
        />

        <div
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 28,
            padding: 26,
            background:
              "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))",
            boxShadow: "0 30px 80px rgba(0,0,0,0.85)",
          }}
        >
          <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700 }}>
            Sign in
          </h1>

          {errorMsg && (
            <div
              style={{
                background: "rgba(220,38,38,0.25)",
                padding: 10,
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                height: 44,
                borderRadius: 999,
                padding: "0 16px",
                border: "none",
                background: "#e5eefc",
              }}
            />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                height: 44,
                borderRadius: 999,
                padding: "0 16px",
                border: "none",
                background: "#e5eefc",
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                fontSize: 12,
                textAlign: "right",
                cursor: "pointer",
              }}
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 44,
                borderRadius: 999,
                border: "none",
                background: "#22c55e",
                color: "#fff",
                fontWeight: 700,
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loadingGoogle}
              style={{
                height: 44,
                borderRadius: 999,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loadingGoogle ? "Connecting..." : "Continue with Google"}
            </button>

            <div style={{ textAlign: "center", fontSize: 13 }}>
              <span style={{ color: "#9ca3af" }}>
                Don&apos;t have an account?{" "}
              </span>
              <Link href="/signup" style={{ color: "#fff", fontWeight: 700 }}>
                Create account
              </Link>
            </div>
          </form>
        </div>
      </main>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0 }}>
        <BottomNavbar />
      </div>
    </>
  );
}
