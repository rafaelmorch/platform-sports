// app/login/page.tsx
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

export default function LoginPage() {
  const router = useRouter();
  const isNative = Capacitor.getPlatform() !== "web";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // ================= GOOGLE CALLBACK (ANDROID) =================
  useEffect(() => {
    if (!isNative) return;

    const setupListener = async () => {
      await App.addListener("appUrlOpen", async ({ url }) => {
        try {
          if (!url) return;
          try { await Browser.close(); } catch {}
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) throw error;
        } catch (e: any) {
          setErrorMsg(e?.message || "Failed to complete Google login.");
          setLoadingGoogle(false);
        }
      });
    };

    setupListener();
    return () => { App.removeAllListeners(); };
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
    const nativeRedirect = "platformsports://auth/callback";
    const webRedirect = `${window.location.origin}/auth/callback`;
    const redirectTo = isNative ? nativeRedirect : webRedirect;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: isNative },
    });

    if (error || !data?.url) {
      setErrorMsg("Failed to connect with Google.");
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
      <style jsx global>{`
        html, body { height: 100%; overflow: hidden; background: #000; margin: 0; }
        input::placeholder { color: #64748b; }
      `}</style>

      <main style={{
        height: "100vh",
        width: "100vw",
        background: "radial-gradient(circle at top, #0f172a 0%, #020617 50%, #000 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
        color: "#f8fafc"
      }}>
        
        <img 
          src="/logo-sports-platform.png" 
          alt="Platform Sports" 
          style={{ width: "100%", maxWidth: "450px", marginBottom: "30px", filter: "drop-shadow(0 0 15px rgba(34, 197, 94, 0.2))" }} 
        />

        <div style={{
          width: "100%",
          maxWidth: "400px",
          borderRadius: "24px",
          padding: "32px",
          background: "rgba(30, 41, 59, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
        }}>
          <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "700", marginBottom: "24px", letterSpacing: "-0.5px" }}>
            Bem-vindo
          </h1>

          {errorMsg && (
            <div style={{ background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "12px", borderRadius: "12px", fontSize: "14px", marginBottom: "16px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ height: "48px", borderRadius: "12px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.1)", background: "#f1f5f9", color: "#0f172a", fontSize: "16px" }}
            />

            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ height: "48px", width: "100%", borderRadius: "12px", padding: "0 48px 0 16px", border: "1px solid rgba(255,255,255,0.1)", background: "#f1f5f9", color: "#0f172a", fontSize: "16px", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", fontSize: "12px", fontWeight: "bold", cursor: "pointer", padding: "8px" }}
              >
                {showPassword ? "OCULTAR" : "EXIBIR"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ height: "50px", borderRadius: "12px", border: "none", background: "#22c55e", color: "#fff", fontWeight: "700", fontSize: "16px", marginTop: "8px", cursor: "pointer", transition: "0.2s", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
              <span style={{ padding: "0 10px", color: "#94a3b8", fontSize: "12px" }}>OU</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loadingGoogle}
              style={{ height: "50px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#fff", color: "#0f172a", fontWeight: "600", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", transition: "0.2s", opacity: loadingGoogle ? 0.7 : 1 }}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: "18px" }} />
              {loadingGoogle ? "Carregando..." : "Google"}
            </button>

            <div style={{ textAlign: "center", fontSize: "14px", marginTop: "16px" }}>
              <span style={{ color: "#94a3b8" }}>Não tem conta? </span>
              <Link href="/signup" style={{ color: "#22c55e", fontWeight: "700", textDecoration: "none" }}>
                Cadastre-se
              </Link>
            </div>
          </form>
        </div>
      </main>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 100 }}>
        <BottomNavbar />
      </div>
    </>
  );
}