"use client";

import { useRouter } from "next/navigation";

export default function LoginTopMenu() {
  const router = useRouter();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        background: "rgba(2,6,23,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 50,
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          background: "none",
          border: "none",
          color: "#e5e7eb",
          fontSize: 20,
          cursor: "pointer",
        }}
      >
        ←
      </button>
    </div>
  );
}