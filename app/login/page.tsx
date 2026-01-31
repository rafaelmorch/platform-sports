"use client";

import { useEffect, useMemo, useState } from "react";
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

const NATIVE_REDIRECT = "platformsports://auth/callback";
const WEB_REDIRECT = "https://platform-sports.vercel.app/auth/callback";

export default function LoginPage() {
  const router = useRouter();

  const isNative = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ================= AUTH STATE =================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/activities");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ================= GOOGLE CALLBACK (APP) =================
  useEffect(() => {
    if (!isNative) return;

    const setupListener = async () => {
      const launch = await App.getLaunchUrl();
      if (launch?.url) handleDeepLink(launch.url);

      await App.addListener("appUrlOpen", ({ url }) => {
        handleDeepLink(url);
      });
    };

    const handleDeepLink = async (url: string) => {
      if (url.includes("platformsports://")) {
        try {
          await Browser.close();
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) throw error;
        } catch (e: any) {
          setErrorMsg(e.message);
          setLoadingGoogle(false);
        }
      }
    };

    setupListener();
    return () => { App.removeAllListeners(); };
  }, [isNative]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg("Invalid credentials.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErrorMsg(null);
    setLoadingGoogle(true);
    const redirectTo = isNative ? NATIVE_REDIRECT : WEB_REDIRECT;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: isNative },
    });

    if (error || !data?.url) {
      setErrorMsg("Connection failed.");
      setLoadingGoogle(false);
      return;
    }

    if (isNative) {
      await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
    } else {
      window.location.href = data.url;
    }
  }

  return (
    <>
      <style jsx global>{`html, body { height: 100%; overflow: hidden; background: #000; }`}</style>
      <main style={{ height: "100vh", width: "100vw", background: "radial-gradient(circle at top, #020617 0%, #000 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", color: "#e5e7eb" }}>
        <img src="/logo-sports-platform.png" alt="Logo" style={{ width: 520, maxWidth: "92vw", marginBottom: 24 }} />
        <div style={{ width: "100%", maxWidth: 420, borderRadius: 28, padding: 26, background: "rgba(15,23,42,0.95)", boxShadow: "0 30px 80px rgba(0,0,0,0.85)" }}>
          <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Sign in</h1>
          {errorMsg && <div style={{ background: "rgba(220,38,38,0.25)", padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 12 }}>{errorMsg}</div>}
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ height: 44, borderRadius: 999, padding: "0 16px", background: "#e5eefc", color: "#000" }} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ height: 44, borderRadius: 999, padding: "0 16px", background: "#e5eefc", color: "#000" }} />
            <button type="submit" disabled={loading} style={{ height: 44, borderRadius: 999, background: "#22c55e", color: "#fff", fontWeight: 700 }}>{loading ? "Signing in..." : "Sign in"}</button>
            <button type="button" onClick={handleGoogle} disabled={loadingGoogle} style={{ height: 44, borderRadius: 999, background: "#dc2626", color: "#fff", fontWeight: 700 }}>Continue with Google</button>
          </form>
        </div>
      </main>
      <div style={{ position: "fixed", bottom: 0, width: "100%" }}><BottomNavbar /></div>
    </>
  );
}