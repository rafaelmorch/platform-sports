// app/signup/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// --- SUPABASE CLIENT ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box", // ✅ prevents overflow
  padding: "10px 11px",
  borderRadius: "12px",
  border: "1px solid #1f2933",
  backgroundColor: "#020617",
  color: "#e5e7eb",
  fontSize: "13px",
};

export default function SignUpPage() {
  const router = useRouter();

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // status messages
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Please enter a valid email.");
      return;
    }

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
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name.trim(), name: name.trim() }, // keep both keys for compatibility
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // ✅ Supabase behavior: if email already exists, it may return a "user" with empty identities.
      const identities = (data.user as any)?.identities;
      if (Array.isArray(identities) && identities.length === 0) {
        setErrorMsg("This email is already registered. Please log in (or reset your password).");
        return;
      }

      // Optional: try to upsert profile immediately (safe if RLS blocks it)
      // If user needs email confirmation first, user may be null -> we skip.
      const userId = data.user?.id ?? null;
      if (userId) {
        try {
          await supabase
            .from("profiles")
            .upsert({ id: userId, full_name: name.trim() }, { onConflict: "id" });
        } catch {
          // ignore
        }
      }

      setSuccessMsg("Account created! Please check your email to confirm, then log in.");

      setName("");
      setEmail("");
      setPassword("");
      setPassword2("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Unexpected error while creating account.");
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
          overflow: "hidden", // ✅ keeps everything inside the card
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
          Create account
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "#9ca3af",
            marginBottom: "16px",
          }}
        >
          Start your journey on SportPlatform.
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
          onSubmit={handleSignup}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            marginBottom: "14px",
          }}
        >
          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="name" style={{ fontSize: "13px", color: "#d1d5db" }}>
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="email" style={{ fontSize: "13px", color: "#d1d5db" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="password" style={{ fontSize: "13px", color: "#d1d5db" }}>
              Password
            </label>

            <div style={{ position: "relative", width: "100%", boxSizing: "border-box" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...inputStyle,
                  padding: "10px 40px 10px 11px", // space for icon
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

          {/* Confirm password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label htmlFor="password2" style={{ fontSize: "13px", color: "#d1d5db" }}>
              Confirm password
            </label>

            <input
              id="password2"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Confirm your password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Button */}
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
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
          Already have an account?{" "}
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
            Log in
          </button>
        </div>
      </div>
    </main>
  );
}
