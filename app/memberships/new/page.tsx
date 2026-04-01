"use client";

import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";

import dynamicImport from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNavbar from "@/components/BottomNavbar";
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

    const { error } = await supabase.storage
      .from("membership-images")
      .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("membership-images")
      .getPublicUrl(filePath);

    return { path: filePath, url: data.publicUrl };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWarning(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setWarning("You must be logged in.");
      return;
    }

    try {
      setSaving(true);

      const coverUpload = await uploadImage(coverFile!, "cover", user.id);
      const bannerUpload = await uploadImage(bannerFile!, "banner", user.id);

      const { data, error } = await supabase
        .from("app_membership_communities")
        .insert({
          slug,
          name,
          full_description: fullDescriptionRich,
          full_description_rich: { html: fullDescriptionRich },
          price_cents: Math.round(Number(priceDollars) * 100),
          billing_interval: billingInterval,
          cover_image_path: coverUpload.path,
          cover_image_url: coverUpload.url,
          banner_image_path: bannerUpload.path,
          banner_image_url: bannerUpload.url,
          card_highlight: cardHighlight,
          gallery_urls: galleryText.split("\n").filter(Boolean),
          checkout_url: checkoutUrl,
          checkout_button_text: checkoutButtonText,
          is_active: true,

          created_by: user.id, // 🔥 CORREÇÃO PRINCIPAL
        })
        .select("id")
        .single();

      if (error) {
        setWarning(error.message);
        return;
      }

      router.push(`/memberships/${data.id}`);
    } catch (err: any) {
      setWarning(err.message || "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Create Membership</h1>

      <form onSubmit={handleSubmit}>
        <input placeholder="Name" value={name} onChange={(e) => handleNameChange(e.target.value)} />
        <input placeholder="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

        <input type="file" onChange={(e) => handleCoverChange(e.target.files?.[0] || null)} />
        <input type="file" onChange={(e) => handleBannerChange(e.target.files?.[0] || null)} />

        <input placeholder="Price" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} />

        <input placeholder="Checkout URL" value={checkoutUrl} onChange={(e) => setCheckoutUrl(e.target.value)} />
        <input placeholder="Button text" value={checkoutButtonText} onChange={(e) => setCheckoutButtonText(e.target.value)} />

        <button type="submit">{saving ? "Saving..." : "Create"}</button>
      </form>

      {warning && <p>{warning}</p>}

      <BottomNavbar />
    </main>
  );
}
