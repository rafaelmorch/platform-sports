"use client";

import { useSearchParams } from "next/navigation";

export default function BeachTennisSuccessPage() {
  const params = useSearchParams();
  const code = params.get("code");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#111827",
        fontFamily: "Calibri, Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          textAlign: "center",
        }}
      >
        <img
          src="/logo-sports-platform.png"
          alt="Platform Sports"
          style={{
            width: 150,
            marginBottom: 20,
          }}
        />

        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600 }}>
          Inscrição realizada
        </h1>

        {code && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 14,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: "#1d4ed8" }}>
              Seu código de confirmação:
            </p>
            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              {code}
            </p>
          </div>
        )}

        <p
          style={{
            marginTop: 20,
            fontSize: 18,
            lineHeight: 1.7,
            color: "#374151",
          }}
        >
          A confirmação será enviada por e-mail em breve.
        </p>
      </div>
    </div>
  );
}
