"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 11px",
  borderRadius: "12px",
  border: "1px solid #1f2933",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontSize: "13px",
};

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== password2) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg("Password updated successfully. You can now log in.");
      setPassword("");
      setPassword2("");

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Unexpected error while updating password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #020617 0, #020617 45%, #000000 100%)",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "24px",
          border: "1px solid #111827",
          overflow: "hidden",
          background: "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
          boxShadow: "0 24px 70px rgba(0,0,0,0.85)",
          padding: "24px 20px 22px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            marginBottom: "6px",
          }}
        >
          Update password
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "#9ca3af",
            marginBottom: "16px",
          }}
        >
          Enter your new password below.
        </p>

        {errorMsg && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.45)",
              background: "rgba(153,27,27,0.25)",
              fontSize: "12px",
              color: "#fecaca",
              boxSizing: "border-box",
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginBottom: "12px",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid rgba(34,197,94,0.45)",
              background: "rgba(21,128,61,0.25)",
              fontSize: "12px",
              color: "#bbf7d0",
              boxSizing: "border-box",
            }}
          >
            {successMsg}
          </div>
        )}

        <form
          onSubmit={handleUpdatePassword}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="password" style={{ fontSize: "13px", color: "#d1d5db" }}>
              New password
            </label>

            <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  padding: "10px 40px 10px 11px",
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  padding: 0,
                  lineHeight: 0,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="password2" style={{ fontSize: "13px", color: "#d1d5db" }}>
              Confirm new password
            </label>

            <input
              id="password2"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Confirm your new password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px",
              borderRadius: "999px",
              border: "none",
              fontSize: "14px",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#020617",
              boxShadow: "0 14px 40px rgba(34,197,94,0.45)",
            }}
          >
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>

        <div style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
          Remembered your password?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "13px",
              color: "#e5e7eb",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    </main>
  );
}
