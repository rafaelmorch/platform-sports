"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";

import { useEffect, useMemo, useState } from "react";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  community_id: string;
  user_id: string;
  status: string;
  created_at: string;
  payment_proof_url: string | null;
  payment_proof_path: string | null;
  app_membership_communities: {
    name: string | null;
  }[] | null; // ✅ CORREÇÃO
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type RequestView = {
  id: string;
  community_id: string;
  user_id: string;
  status: string;
  created_at: string;
  payment_proof_url: string | null;
  payment_proof_path: string | null;
  community_name: string | null;
  full_name: string | null;
  email: string | null;
};

export default function MembershipApprovalsPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const [requests, setRequests] = useState<RequestView[]>([]);
  const [loading, setLoading] = useState(true);

  function getProofUrl(row: {
    payment_proof_url: string | null;
    payment_proof_path: string | null;
  }) {
    if (row.payment_proof_url) return row.payment_proof_url;

    if (row.payment_proof_path) {
      const { data } = supabase.storage
        .from("membership-proofs")
        .getPublicUrl(row.payment_proof_path);

      return data?.publicUrl ?? null;
    }

    return null;
  }

  async function loadRequests() {
    setLoading(true);

    const { data: requestData, error: requestError } = await supabase
      .from("app_membership_requests")
      .select(`
        id,
        user_id,
        community_id,
        status,
        created_at,
        payment_proof_url,
        payment_proof_path,
        app_membership_communities(name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestError || !requestData || requestData.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const rows = requestData as unknown as RequestRow[]; // ✅ FIX TYPESCRIPT

    const userIds = Array.from(new Set(rows.map((row) => row.user_id)));

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    const profileMap = new Map<string, ProfileRow>();
    (profileData as ProfileRow[] | null)?.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    const merged: RequestView[] = rows.map((row) => {
      const profile = profileMap.get(row.user_id);

      return {
        id: row.id,
        community_id: row.community_id,
        user_id: row.user_id,
        status: row.status,
        created_at: row.created_at,
        payment_proof_url: row.payment_proof_url ?? null,
        payment_proof_path: row.payment_proof_path ?? null,
        community_name: row.app_membership_communities?.[0]?.name ?? null, // ✅ CORREÇÃO
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      };
    });

    setRequests(merged);
    setLoading(false);
  }

  async function approveRequest(id: string) {
    await supabase
      .from("app_membership_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    loadRequests();
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <>
      <style jsx global>{`
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
        }

        .page * {
          font-family: "Montserrat", Arial, sans-serif;
        }
      `}</style>

      <main
        className="page"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto 16px auto" }}>
          <BackArrow />
        </div>

        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            borderRadius: 28,
            padding: 24,
            border: "1px solid #d6dbe4",
            background: "#fff",
            boxShadow:
              "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
            Pending Approvals
          </h1>

          {loading && <p>Loading...</p>}

          {!loading && requests.length === 0 && (
            <p>No pending requests.</p>
          )}

          {requests.map((req) => {
            const proofUrl = getProofUrl(req);

            return (
              <div
                key={req.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {req.full_name || "No name"}
                  </div>

                  <div style={{ fontSize: 13, color: "#475569" }}>
                    {req.email || "No email"}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    User ID: {req.user_id}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Community: {req.community_name || "-"}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {new Date(req.created_at).toLocaleString()}
                  </div>

                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                    Payment proof: {proofUrl ? "Attached" : "Not sent"}
                  </div>

                  {proofUrl && (
                    <div style={{ marginTop: 12, maxWidth: 280 }}>
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: "none" }}
                      >
                        <img
                          src={proofUrl}
                          alt="Payment proof"
                          style={{
                            width: "100%",
                            display: "block",
                            borderRadius: 12,
                            border: "1px solid #cbd5e1",
                            background: "#f8fafc",
                          }}
                        />
                      </a>

                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-block",
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#0f172a",
                          textDecoration: "underline",
                        }}
                      >
                        Open proof
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => approveRequest(req.id)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    border: 0,
                    background: "#0f172a",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Approve
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
