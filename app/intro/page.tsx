"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Events", href: "/events" },
  { label: "Groups", href: "/memberships" },
  { label: "Group\nActivities", href: "/activities" },
  { label: "Profile", href: "/profile" },
];

export default function IntroPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    const timer = window.setTimeout(() => {
      setShowButtons(true);
    }, 2000);

    return () => window.clearTimeout(timer);
  }, []);

  const handleNavigate = (href: string) => {
    try {
      localStorage.setItem("intro_last_seen", Date.now().toString());
    } catch {}

    router.push(href);
  };

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        onLoadedData={() => setVideoReady(true)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 250ms ease",
        }}
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(255,255,255,0.3), rgba(255,255,255,0.1), rgba(255,255,255,0.2))",
        }}
      />

      {/* LOGO */}
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <img
          src="/logo-sports-platform.png"
          alt="logo"
          style={{
            width: "92%",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/* BOTÕES */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "40px 24px 140px", // 🔥 desce um pouco
          opacity: showButtons ? 1 : 0,
          transform: showButtons ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 500ms ease, transform 500ms ease",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "18px",
          }}
        >
          {BUTTONS.map((button) => (
            <button
              key={button.href}
              onClick={() => handleNavigate(button.href)}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.96)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.9)", // 🔥 borda branca fina
                borderRadius: "10px",
                padding: "28px 16px",
                background: "rgba(255,255,255,0.03)", // 🔥 mais transparente (~5%)
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 900,
                textAlign: "center",
                whiteSpace: "pre-line",
                cursor: "pointer",
                minHeight: "120px",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
                transition: "all 0.15s ease",
              }}
            >
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
