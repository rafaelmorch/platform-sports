"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isApp = typeof window !== "undefined" && (window as any).Capacitor;

    // 🔥 Se NÃO for app → pula intro
    if (!isApp) {
      router.replace("/activities");
      return;
    }

    const lastSeen = localStorage.getItem("intro_last_seen");

    if (!lastSeen) {
      router.replace("/intro");
      return;
    }

    const now = Date.now();
    const diff = now - parseInt(lastSeen, 10);

    const ONE_DAY = 24 * 60 * 60 * 1000;

    if (diff > ONE_DAY) {
      router.replace("/intro");
    } else {
      router.replace("/activities");
    }
  }, [router]);

  return null;
}
