"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        width: "100%",
        background: "#020617",
        borderBottom: "1px solid #1f2933",
        padding: "12px 20px",
      }}
    >
      <nav
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          justifyContent: "flex-end",
          gap: 18,
          fontSize: 13,
        }}
      >
        <Link href="/privacy" style={{ color: "#e5e7eb", textDecoration: "none" }}>
          Privacy
        </Link>

        <Link href="/terms" style={{ color: "#e5e7eb", textDecoration: "none" }}>
          Terms
        </Link>
      </nav>
    </header>
  );
}
