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

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
  },
});

// ✅ O redirect aponta para a ponte na Vercel (onde está seu route.ts corrigido)
const NATIVE_REDIRECT = "https://platform-sports.vercel.app/auth/callback";

export default function LoginPage() {
  const router = useRouter();
  const isNative = Capacitor.isNativePlatform();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);

  const debugRedirectTo = useMemo(() => {
    if (!debugUrl) return null;
    try {
      const u = new URL(debugUrl);
      return u.searchParams.get("redirect_to");
    } catch { return null; }
  }, [debugUrl]);

  // ================= AUTH STATE =================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/activities");
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ================= HELPERS =================
  async function finishOAuthFromUrl(url: string) {
    try {
      if (!url) return;
      try { await Browser.close(); } catch {}

      const u = new URL(url);
      const code = u.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        router.replace("/activities");
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to complete login.");
      setLoadingGoogle(false);
    }
  }

  // ================= CALLBACK LISTENER (CORRIGIDO PARA CAPACITOR 6+) =================
  useEffect(() => {
    if (!isNative) return;

    const setupListener = async () => {
      // 1. Verifica se o app foi aberto via URL (Cold Start)
      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        await finishOAuthFromUrl(launch.url);
      }

      // 2. Registra o listener para redirecionamentos com o app em background
      // No Capacitor 6+, addListener retorna uma Promise
      await App.addListener("appUrlOpen", async ({ url }) => {
        if (url && url.includes("platformsports://")) {
          await finishOAuthFromUrl(url);
        }
      });
    };

    setupListener();

    return () => {
      // Remove todos os listeners para evitar vazamento de memória e erros de tipo
      App.removeAllListeners();
    };
  }, [isNative]);

  // ================= ACTIONS =================
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg("Invalid email or password.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErrorMsg(null);
    setLoadingGoogle(true);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: NATIVE_REDIRECT,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data?.url) {
      setErrorMsg("Failed to connect.");
      setLoadingGoogle(false);
      return;
    }

    setDebugUrl(data.url);
    await Browser.open({ url: data.url, presentationStyle: "fullscreen" });
  }

  return (
    <>
      <style jsx global>{`
        html, body { height: 100%; overflow: hidden; background: #000; }
      `}</style>
      <main style={{ height: "100vh", width: "100vw", background: "radial-gradient(circle at top, #020617 0%, #000 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", paddingBottom: 96, color: "#e5e7eb" }}>
        <img src="/logo-sports-platform.png" alt="Platform Sports" style={{ width: 520, maxWidth: "92vw", marginBottom: 18 }} />
        
        {isNative && (
          <div style={{ width: "100%", maxWidth: 680, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 11 }}>
            <b>DEBUG:</b> {debugRedirectTo ? `Redirecting to: ${debugRedirectTo}` : "Aguardando clique no Google..."}
          </div>
        )}

        <div style={{ width: "100%", maxWidth: 420, borderRadius: 28, padding: 26, background: "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))", boxShadow: "0 30px 80px rgba(0,0,0,0.85)" }}>
          <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Sign in</h1>
          
          {errorMsg && (
            <div style={{ background: "rgba(220,38,38,0.25)", padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ height: 44, borderRadius: 999, padding: "0 16px", border: "none", background: "#e5eefc", color: "#000" }} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ height: 44, borderRadius: 999, padding: "0 16px", border: "none", background: "#e5eefc", color: "#000" }} 
            />
            
            <button 
              type="submit" 
              disabled={loading} 
              style={{ height: 44, borderRadius: 999, border: "none", background: "#22c55e", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            
            <button 
              type="button" 
              onClick={handleGoogle} 
              disabled={loadingGoogle} 
              style={{ height: 44, borderRadius: 999, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              {loadingGoogle ? "Connecting..." : "Continue with Google"}
            </button>

            <div style={{ textAlign: "center", fontSize: 13, marginTop: 10 }}>
              <span style={{ color: "#9ca3af" }}>Don&apos;t have an account? </span>
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