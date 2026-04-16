"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

function PendingMembershipContent() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const searchParams = useSearchParams();

  const communityId = searchParams.get("community_id");

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleProofChange(file: File | null) {
    setProofFile(file);
    setMessage(null);

    if (file) {
      setProofPreview(URL.createObjectURL(file));
    } else {
      setProofPreview("");
    }
  }

  async function handleUploadProof() {
    if (!communityId) {
      setMessage("Missing community id.");
      return;
    }

    if (!proofFile) {
      setMessage("Select a payment proof image first.");
      return;
    }

    try {
      setUploading(true);
      setMessage(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("You must be logged in.");
        setUploading(false);
        return;
      }

      const extension = proofFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/${communityId}/payment-proof-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("membership-proofs")
        .upload(filePath, proofFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setMessage(uploadError.message || "Failed to upload proof.");
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("membership-proofs")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("app_membership_requests")
        .update({
          payment_proof_path: filePath,
          payment_proof_url: publicUrlData.publicUrl,
        })
        .eq("community_id", communityId)
        .eq("user_id", user.id);

      if (updateError) {
        setMessage(updateError.message || "Failed to attach proof to request.");
        setUploading(false);
        return;
      }

      setMessage("Payment proof uploaded successfully.");
    } catch (err: any) {
      setMessage(err?.message || "Unexpected error.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main
      className="pending-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        background:
          "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto 16px auto", boxSizing: "border-box" }}>
        <BackArrow />
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 900,
          margin: "0 auto",
          borderRadius: 28,
          padding: "clamp(18px, 4vw, 28px)",
          boxSizing: "border-box",
          border: "1px solid #d6dbe4",
          background: "linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)",
          boxShadow:
            "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            marginBottom: 16,
            color: "#0f172a",
          }}
        >
          You're almost in 🚀
        </h1>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: "#334155",
            marginBottom: 24,
          }}
        >
          Your request to join this community has been received.
        </p>

        <div
          style={{
            borderRadius: 20,
            padding: 20,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            marginBottom: 24,
            boxSizing: "border-box",
          }}
        >
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.7,
              color: "#0f172a",
              margin: 0,
              fontWeight: 500,
            }}
          >
            Please wait for payment confirmation to be approved and gain full
            access to the community.
          </p>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: 560,
            margin: "0 auto 24px auto",
            borderRadius: 24,
            padding: "clamp(16px, 4vw, 22px)",
            boxSizing: "border-box",
            border: "1px solid #d6dbe4",
            background: "linear-gradient(180deg, #f8fafc 0%, #edf1f5 100%)",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.14), -6px -6px 20px rgba(255,255,255,0.9)",
            textAlign: "left",
            overflow: "hidden",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              margin: "0 0 10px 0",
              color: "#0f172a",
            }}
          >
            Optional payment proof
          </h2>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "#475569",
              marginTop: 0,
              marginBottom: 14,
            }}
          >
            You may upload a screenshot of your payment to help speed up manual verification.
            This is optional.
          </p>

          <input
            id="payment-proof-input"
            type="file"
            accept="image/*"
            onChange={(e) => handleProofChange(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />

          <label
            htmlFor="payment-proof-input"
            style={{
              display: "block",
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              borderRadius: 18,
              border: "1px solid #d6dbe4",
              background: "linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)",
              color: "#111827",
              padding: "12px 14px",
              fontSize: 14,
              boxShadow:
                "inset 1px 1px 0 rgba(255,255,255,0.98), inset -2px -2px 6px rgba(203,213,225,0.45)",
              marginBottom: 10,
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {proofFile ? proofFile.name : "Choose payment proof image"}
          </label>

          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Recommended: JPG or PNG • up to 3 MB
          </div>

          <div
            style={{
              width: "100%",
              minHeight: 220,
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid #d6dbe4",
              background: "linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%)",
              boxShadow:
                "inset 1px 1px 0 rgba(255,255,255,0.95), inset -2px -2px 6px rgba(203,213,225,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxSizing: "border-box",
            }}
          >
            {proofPreview ? (
              <img
                src={proofPreview}
                alt="Payment proof preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Proof preview
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUploadProof}
            disabled={uploading}
            style={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "14px 18px",
              fontSize: 13,
              fontWeight: 700,
              background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
              color: "#f8fafc",
              boxShadow:
                "0 14px 28px rgba(15,23,42,0.18), inset 1px 1px 0 rgba(255,255,255,0.1)",
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Upload payment proof"}
          </button>

          {message && (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                lineHeight: 1.6,
                color: message.toLowerCase().includes("success") ? "#166534" : "#9a3412",
                background: message.toLowerCase().includes("success") ? "#f0fdf4" : "#fff7ed",
                border: `1px solid ${
                  message.toLowerCase().includes("success") ? "#86efac" : "#fdba74"
                }`,
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              {message}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          You will be notified once your access is approved.
        </div>
      </div>
    </main>
  );
}

export default function PendingMembershipPage() {
  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          width: 100%;
          height: 100%;
          overflow-x: hidden;
        }

        .pending-page * {
          font-family: "Montserrat", Arial, sans-serif;
        }
      `}</style>

      <Suspense fallback={null}>
        <PendingMembershipContent />
      </Suspense>
    </>
  );
}
