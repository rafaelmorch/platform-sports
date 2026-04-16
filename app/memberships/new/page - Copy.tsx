"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

import dynamicImport from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackArrow from "@/components/BackArrow";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ReactQuill = dynamicImport(() => import("react-quill-new"), { ssr: false });

export const dynamic = "force-dynamic";

export default function NewMembershipPage() {
  const supabase = useMemo(() => supabaseBrowser, []);
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fullDescriptionRich, setFullDescriptionRich] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [billingInterval, setBillingInterval] = useState("month");
  const [cardHighlight, setCardHighlight] = useState("");
  const [galleryText, setGalleryText] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [checkoutButtonText, setCheckoutButtonText] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  function makeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slug.trim()) {
      setSlug(makeSlug(value));
    }
  }

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : "");
  }

  function handleBannerChange(file: File | null) {
    setBannerFile(file);
    setBannerPreview(file ? URL.createObjectURL(file) : "");
  }

  async function uploadImage(file: File, folder: "cover" | "banner", userId: string) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeSlug = makeSlug(slug || name || "membership");
    const filePath = `${userId}/${safeSlug}/${folder}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("membership-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("membership-images").getPublicUrl(filePath);

    return {
      path: filePath,
      url: data.publicUrl,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWarning(null);

    const cleanName = name.trim();
    const cleanSlug = makeSlug(slug || name);
    const cleanCardHighlight = cardHighlight.trim();
    const cleanCheckoutUrl = checkoutUrl.trim();
    const cleanCheckoutButtonText = checkoutButtonText.trim();

    const priceCents =
      priceDollars.trim() === ""
        ? 0
        : Math.round(Number(priceDollars.replace(",", ".")) * 100);

    const galleryUrls = galleryText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!cleanName) {
      setWarning("Community name is required.");
      return;
    }

    if (!cleanSlug) {
      setWarning("Slug is required.");
      return;
    }

    if (Number.isNaN(priceCents) || priceCents < 0) {
      setWarning("Enter a valid membership price.");
      return;
    }

    if (!coverFile) {
      setWarning("Card image is required.");
      return;
    }

    if (!bannerFile) {
      setWarning("Banner image is required.");
      return;
    }


    if (!cleanCheckoutButtonText) {
      setWarning("Button text is required.");
      return;
    }

    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setWarning("You must be logged in.");
        setSaving(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        setWarning("Only admins can create communities.");
        setSaving(false);
        return;
      }

      const coverUpload = await uploadImage(coverFile, "cover", user.id);
      const bannerUpload = await uploadImage(bannerFile, "banner", user.id);

      const richPayload = {
        html: fullDescriptionRich || "",
      };

      const plainTextFallback = fullDescriptionRich
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const { data, error } = await supabase
        .from("app_membership_communities")
        .insert({
          slug: cleanSlug,
          name: cleanName,
          short_description: null,
          full_description: plainTextFallback || null,
          full_description_rich: richPayload,
          price_cents: priceCents,
          billing_interval: billingInterval,
          cover_image_path: coverUpload.path,
          cover_image_url: coverUpload.url,
          banner_image_path: bannerUpload.path,
          banner_image_url: bannerUpload.url,
          card_highlight: cleanCardHighlight || null,
          gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
          checkout_url: cleanCheckoutUrl || null,
          checkout_button_text: cleanCheckoutButtonText,
          is_active: true,
          created_by: user.id
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("Error creating community:", error);
        setWarning(error?.message || "Failed to create community.");
        setSaving(false);
        return;
      }

      router.push(`/memberships/${data.id}`);
    } catch (err: any) {
      console.error(err);
      setWarning(err?.message || "Unexpected error while creating the community.");
    } finally {
      setSaving(false);
    }
  }

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link"],
      ["clean"],
    ],
  };

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
          -webkit-overflow-scrolling: touch;
        }
        #__next {
          height: 100%;
        }
        * {
          box-sizing: border-box;
        }
        .membership-new-page * {
          font-family: "Montserrat", Arial, sans-serif;
        }
        .membership-new-page .ql-toolbar.ql-snow {
          border: 1px solid #d6dbe4;
          border-bottom: 0;
          border-radius: 18px 18px 0 0;
          background: linear-gradient(180deg, #f9fafb 0%, #eef2f7 100%);
          box-shadow:
            inset 1px 1px 0 rgba(255,255,255,0.95),
            inset -1px -1px 0 rgba(203,213,225,0.7);
        }
        .membership-new-page .ql-container.ql-snow {
          border: 1px solid #d6dbe4;
          border-radius: 0 0 18px 18px;
          background: #ffffff;
          min-height: 240px;
          box-shadow:
            inset 1px 1px 0 rgba(255,255,255,0.95),
            inset -2px -2px 6px rgba(203,213,225,0.45);
        }
        .membership-new-page .ql-editor {
          min-height: 220px;
          font-size: 16px;
          color: #111827;
          line-height: 1.75;
        }
      `}</style>

      <main
        className="membership-new-page"
        style={{
          minHeight: "100vh",
          width: "100%",
          overflowX: "hidden",
          background: "linear-gradient(180deg, #eef1f5 0%, #e5e7eb 45%, #dfe3e8 100%)",
          color: "#111827",
          padding: 16,
          paddingBottom: 92,
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 12 }}>
            <BackArrow />
          </div>
          <header
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#475569",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Memberships
              </p>

              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  margin: "8px 0 0 0",
                  color: "#0f172a",
                }}
              >
                Create Membership
              </h1>

              <p
                style={{
                  fontSize: 14,
                  color: "#334155",
                  margin: "10px 0 0 0",
                  maxWidth: 760,
                  lineHeight: 1.7,
                }}
              >
                Build a clean membership page with card image, banner, rich long description, gallery content and external join button.
              </p>
            </div>


          </header>

          {warning && (
            <div
              style={{
                marginBottom: 14,
                borderRadius: 18,
                padding: "12px 14px",
                background: "#fff7ed",
                border: "1px solid #fdba74",
                color: "#9a3412",
                fontSize: 13,
                lineHeight: 1.5,
                boxShadow:
                  "inset 1px 1px 0 rgba(255,255,255,0.9), 0 10px 24px rgba(0,0,0,0.04)",
              }}
            >
              {warning}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 18,
                marginBottom: 18,
              }}
            >
              <section
                style={{
                  borderRadius: 28,
                  padding: 22,
                  border: "1px solid #d6dbe4",
                  background: "linear-gradient(180deg, #f8fafc 0%, #edf1f5 100%)",
                  boxShadow:
                    "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    margin: "0 0 16px 0",
                    color: "#0f172a",
                  }}
                >
                  Main Info
                </h2>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Community name</div>
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Run Club"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Slug</div>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(makeSlug(e.target.value))}
                    placeholder="run-club"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Card image</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
                    style={fileInputStyle}
                  />
                  <div style={hintStyle}>Recommended ratio: 16:10 • JPG or PNG • up to 3 MB</div>

                  <div style={previewCardFrameStyle}>
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Card preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={emptyPreviewTextStyle}>Card preview</div>
                    )}
                  </div>
                </label>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Card highlight</div>
                  <input
                    value={cardHighlight}
                    onChange={(e) => setCardHighlight(e.target.value)}
                    placeholder="Weekly challenges • Premium access"
                    style={inputStyle}
                  />
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <label style={{ display: "block", marginBottom: 14 }}>
                    <div style={labelStyle}>Price</div>
                    <input
                      value={priceDollars}
                      onChange={(e) => setPriceDollars(e.target.value)}
                      placeholder="29.99"
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ display: "block", marginBottom: 14 }}>
                    <div style={labelStyle}>Billing interval</div>
                    <select
                      value={billingInterval}
                      onChange={(e) => setBillingInterval(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="month">Month</option>
                      <option value="week">Week</option>
                      <option value="year">Year</option>
                    </select>
                  </label>
                </div>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Button text</div>
                  <input
                    value={checkoutButtonText}
                    onChange={(e) => setCheckoutButtonText(e.target.value)}
                    placeholder="Join this membership"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "block", marginBottom: 0 }}>
                  <div style={labelStyle}>External membership link</div>
                  <input
                    value={checkoutUrl}
                    onChange={(e) => setCheckoutUrl(e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </label>
              </section>

              <section
                style={{
                  borderRadius: 28,
                  padding: 22,
                  border: "1px solid #d6dbe4",
                  background: "linear-gradient(180deg, #f8fafc 0%, #edf1f5 100%)",
                  boxShadow:
                    "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
                }}
              >
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    margin: "0 0 16px 0",
                    color: "#0f172a",
                  }}
                >
                  Banner & Media
                </h2>

                <label style={{ display: "block", marginBottom: 14 }}>
                  <div style={labelStyle}>Banner image</div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBannerChange(e.target.files?.[0] ?? null)}
                    style={fileInputStyle}
                  />
                  <div style={hintStyle}>Recommended ratio: 16:9 • JPG or PNG • up to 3 MB</div>

                  <div style={previewBannerFrameStyle}>
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div style={emptyPreviewTextStyle}>Banner preview</div>
                    )}
                  </div>
                </label>

                <label style={{ display: "block", marginBottom: 0 }}>
                  <div style={labelStyle}>Photos & videos URLs</div>
                  <textarea
                    value={galleryText}
                    onChange={(e) => setGalleryText(e.target.value)}
                    rows={8}
                    placeholder={"One URL per line\nhttps://...\nhttps://..."}
                    style={textareaStyle}
                  />
                  <div style={hintStyle}>Use one URL per line for gallery images or external video links.</div>
                </label>
              </section>
            </div>

            <section
              style={{
                borderRadius: 28,
                padding: 22,
                border: "1px solid #d6dbe4",
                background: "linear-gradient(180deg, #f8fafc 0%, #edf1f5 100%)",
                boxShadow:
                  "8px 8px 24px rgba(148,163,184,0.18), -6px -6px 20px rgba(255,255,255,0.9)",
                marginBottom: 18,
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  margin: "0 0 10px 0",
                  color: "#0f172a",
                }}
              >
                Long Description
              </h2>

              <p
                style={{
                  margin: "0 0 14px 0",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "#475569",
                }}
              >
                Here you can mix different font sizes, colors, emphasis and structure for the long text.
              </p>

              <ReactQuill
                theme="snow"
                value={fullDescriptionRich}
                onChange={setFullDescriptionRich}
                modules={quillModules}
              />
            </section>

            <section
              style={{
                borderRadius: 28,
                padding: 22,
                border: "1px solid #d6dbe4",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                boxShadow:
                  "8px 8px 24px rgba(148,163,184,0.12), -6px -6px 20px rgba(255,255,255,0.9)",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#64748b",
                  marginBottom: 12,
                }}
              >
                Preview
              </div>

              <div
                style={{
                  color: "#111827",
                  lineHeight: 1.8,
                  fontSize: 16,
                }}
                dangerouslySetInnerHTML={{
                  __html:
                    fullDescriptionRich ||
                    "<p>Your formatted long description preview will appear here.</p>",
                }}
              />
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "15px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                  color: "#f8fafc",
                  boxShadow:
                    "0 14px 28px rgba(15,23,42,0.18), inset 1px 1px 0 rgba(255,255,255,0.1)",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Creating..." : "Create community"}
              </button>
            </div>
          </form>
        </div>

        
      </main>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 7,
  color: "#334155",
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  marginTop: 8,
  lineHeight: 1.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)",
  color: "#111827",
  padding: "13px 15px",
  fontSize: 14,
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.98), inset -2px -2px 6px rgba(203,213,225,0.45)",
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "11px 12px",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 120,
};

const previewCardFrameStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16 / 10",
  marginTop: 12,
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%)",
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.95), inset -2px -2px 6px rgba(203,213,225,0.45)",
};

const previewBannerFrameStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16 / 9",
  marginTop: 12,
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid #d6dbe4",
  background: "linear-gradient(180deg, #ffffff 0%, #e5e7eb 100%)",
  boxShadow:
    "inset 1px 1px 0 rgba(255,255,255,0.95), inset -2px -2px 6px rgba(203,213,225,0.45)",
};

const emptyPreviewTextStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 600,
};


