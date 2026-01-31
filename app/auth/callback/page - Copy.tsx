"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        await supabaseBrowser.auth.exchangeCodeForSession(code);
      }

      const { data } = await supabaseBrowser.auth.getSession();

      if (data.session) {
        router.replace("/feed");
      } else {
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return null;
}
