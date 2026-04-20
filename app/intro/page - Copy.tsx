"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const BUTTONS = [
  { label: "Events", href: "/events" },
  { label: "Groups", href: "/memberships" },
  { label: "Group\nActivities", href: "/activities" },
  { label: "Profile", href: "/profile" },
];

export default function IntroPage() {
  const router = useRouter();
  const [showButtons, setShowButtons] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
      localStorage.setItem("intro_seen", "true");
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
        background: "#000",
      }}
    >
      <video ref={videoRef}
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src="/intro.mp4" type="video/mp4" />
      </video>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.2), rgba(0,0,0,0.4))",
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
          padding: "40px 24px 180px",
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
                border: "1px solid rgba(255,255,255,0.8)",
                borderRadius: "10px",
                padding: "28px 16px",
                background: "rgba(255,255,255,0.08)",
                color: "#ffffff", // 🔥 azul marinho
                fontSize: "24px",
                fontWeight: 900,
                textAlign: "center",
                whiteSpace: "pre-line",
                cursor: "pointer",
                minHeight: "120px",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
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
