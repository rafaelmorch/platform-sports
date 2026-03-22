"use client";

import { useEffect } from "react";

export default function CapacitorAndroidFix() {
  useEffect(() => {
    (async () => {
      const { Capacitor } = await import("@capacitor/core");

      // Só roda em app nativo
      if (!Capacitor.isNativePlatform()) return;

      // Só roda no Android
      if (Capacitor.getPlatform() !== "android") return;

      const { StatusBar } = await import("@capacitor/status-bar");
      const { Keyboard } = await import("@capacitor/keyboard");

      // Evita conteúdo atrás da status bar
      await StatusBar.setOverlaysWebView({ overlay: false });

      // Ajusta tela quando teclado abre
      await Keyboard.setResizeMode({ mode: "body" });
    })();
  }, []);

  return null;
}
