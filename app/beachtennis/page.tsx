"use client";

import { useEffect } from "react";

export default function RegisterPage2() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://form.jotform.com/jsform/260828929357169";
    script.async = true;

    const container = document.getElementById("jotform-container");
    if (container && !container.hasChildNodes()) {
      container.appendChild(script);
    }
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
          maxWidth: 900,
          margin: "0 auto",
          color: "#e5e7eb",
        }}
      >
        <h1 style={{ marginBottom: 16 }}>Event Registration</h1>

        <div id="jotform-container" />
      </div>
    </main>
  );
}