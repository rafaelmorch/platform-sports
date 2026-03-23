"use client";

import { useEffect } from "react";

export default function CapacitorAndroidFix() {
  useEffect(() => {
    (async () => {
      const { Capacitor } = await import("@capacitor/core");

      if (!Capacitor.isNativePlatform()) return;
      if (Capacitor.getPlatform() !== "android") return;

      const { StatusBar } = await import("@capacitor/status-bar");
      const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");

      await StatusBar.setOverlaysWebView({ overlay: false });
      await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    })();
  }, []);

  return null;
}