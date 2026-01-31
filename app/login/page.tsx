"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import BottomNavbar from "@/components/BottomNavbar";

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

// Use o padrão PKCE para maior segurança em apps mobile
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false, // Deixamos o listener manual tratar a URL no app
  }
});

const NATIVE_REDIRECT = "platformsports://auth/callback";
// Certifique-se de que esta URL é a que contém o seu route.ts
const WEB_REDIRECT = "https://platform-sports.vercel.app/auth/callback";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isNative = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Capacitor.isNativePlatform();
  }, []);

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
      // Trata o caso do app abrir direto por um link (Cold Start)
      const launch = await App.getLaunchUrl();
      if (launch?.url) handleDeepLink(launch.url);

      // Trata o app já aberto em background
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
          setErrorMsg("Erro ao processar login: " + e.message);
          setLoadingGoogle(false);
        }
      }
    };

    setupListener();
    return () => { App.removeAllListeners(); };
  }, [isNative]);

  // ================= ACTIONS =================
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg("Credenciais inválidas.");
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setErrorMsg(null);
    setLoadingGoogle(true);

    const redirectTo = isNative ? NATIVE_REDIRECT : WEB_REDIRECT;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: isNative, // Só pulamos o redirect automático no App
      },
    });

    if (error || !data?.url) {
      setErrorMsg("Falha ao conectar com Google.");
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
    // ... sua UI se mantém a mesma ...
    <main>
       {/* UI aqui */}
    </main>
  );
}