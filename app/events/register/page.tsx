"use client";

import { useEffect } from "react";

export default function RegisterPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://pci.jotform.com/jsform/260788197607169";
    script.async = true;
    document.getElementById("jotform-container")?.appendChild(script);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          color: "#e5e7eb",
        }}
      >
        <h1 style={{ marginBottom: 12 }}>Event Registration</h1>

        <div id="jotform-container" />
      </div>
    </main>
  );
}