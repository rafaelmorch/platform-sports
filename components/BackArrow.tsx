// components/BackArrow.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type BackArrowProps = {
  href?: string;          // quando você quer voltar para uma rota específica
  label?: string;         // texto (padrão: Back)
  forceBack?: boolean;    // força router.back() mesmo se tiver href
};

export default function BackArrow({ href, label = "Back", forceBack = false }: BackArrowProps) {
  const router = useRouter();

  const sharedStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 36,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.35)",
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: "0.02em",
    textDecoration: "none",
    boxShadow: "0 10px 22px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const arrowStyle: React.CSSProperties = {
    fontSize: 16,
    lineHeight: 1,
    marginTop: -1,
    opacity: 0.95,
  };

  if (!href || forceBack) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        style={sharedStyle}
      >
        <span aria-hidden style={arrowStyle}>←</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link href={href} aria-label="Back" style={sharedStyle}>
      <span aria-hidden style={arrowStyle}>←</span>
      <span>{label}</span>
    </Link>
  );
}
