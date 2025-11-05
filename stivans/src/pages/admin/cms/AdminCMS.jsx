import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import toast from "react-hot-toast";
import "./AdminCMS.css";

/**
 * AdminCMS
 * - Lists pages from cms_pages (home/about/contact…)
 * - Lets you edit page meta (title, published)
 * - Lets you edit the "hero" block for the selected page:
 *      headline, subheadline, cta_label, cta_href, background_image_url
 * - Upload hero image to storage bucket 'cms' and auto-fill URL
 *
 * RLS: write requires admin (profiles.role='admin'); reads work for admins
 */

const KNOWN_PAGES = ["home", "about", "contact"];

export default function AdminCMS() {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("home");
  const [pageRow, setPageRow] = useState(null);

  // hero block state (null until loaded)
  const [heroBlock, setHeroBlock] = useState(null); // full block row: { id, key, type, data, ... }
  const [heroData, setHeroData] = useState({
    headline: "",
    subheadline: "",
    cta_label: "",
    cta_href: "",
    background_image_url: "",
  });

  const currentPageId = pageRow?.id || null;

  const canEditHero = useMemo(() => {
    // We allow hero on any page if you want, but you asked for homepage first
    return Boolean(currentPageId);
  }, [currentPageId]);

  // Load pages
  async function loadPages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("id, slug, title, published, seo_title, seo_description")
        .order("slug", { ascending: true });
      if (error) throw error;

      setPages(data || []);

      // Ensure selected slug exists — if not, pick first available or "home"
      const chosen =
        data?.find((p) => p.slug === selectedSlug)?.slug ||
        data?.[0]?.slug ||
        "home";
      setSelectedSlug(chosen);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load pages");
    } finally {
      setLoading(false);
    }
  }

  // Ensure a page row exists (create if missing)
  async function ensurePage(slug) {
    // if exists in state, use it
    const found = pages.find((p) => p.slug === slug);
    if (found) return found;

    // create it
    const { data, error } = await supabase
      .from("cms_pages")
      .insert({ slug, title: slug[0].toUpperCase() + slug.slice(1), published: false })
      .select("id, slug, title, published, seo_title, seo_description")
      .single();
    if (error) throw error;

    // refresh list & return newly created page
    await loadPages();
    return data;
  }

  // Load selected page meta + hero
  async function loadPageAndHero(slug) {
    try {
      setLoading(true);

      let page = pages.find((p) => p.slug === slug);
      if (!page) {
        page = await ensurePage(slug);
      }

      setPageRow(page || null);

      if (!page?.id) {
        setHeroBlock(null);
        setHeroData({
          headline: "",
          subheadline: "",
          cta_label: "",
          cta_href: "",
          background_image_url: "",
        });
        return;
      }

      // fetch hero block for this page
      const { data: blocks, error: bErr } = await supabase
        .from("cms_blocks")
        .select("id, key, type, data, sort_order, page_id")
        .eq("page_id", page.id)
        .order("sort_order", { ascending: true });

      if (bErr) throw bErr;

      const hero = (blocks || []).find((b) => b.key === "hero");
      setHeroBlock(hero || null);

      const d = hero?.data || {};
      setHeroData({
        headline: d.headline || "",
        subheadline: d.subheadline || "",
        cta_label: d.cta_label || "",
        cta_href: d.cta_href || "",
        background_image_url: d.background_image_url || "",
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load page content");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pages.length) {
      loadPageAndHero(selectedSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug, pages.length]);

  function onHeroChange(field, value) {
    setHeroData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUploadHeroImage(evt) {
    try {
      const file = evt.target.files?.[0];
      if (!file) return;

      const filename = `${Date.now()}_${file.name}`;
      const path = `hero/${filename}`;

      const { error: upErr } = await supabase.storage
        .from("cms")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("cms").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Failed to resolve public URL for image");

      onHeroChange("background_image_url", publicUrl);
      toast.success("Hero image uploaded");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Upload failed");
    } finally {
      // clear file input to allow re-uploading same file name
      evt.target.value = "";
    }
  }

  async function savePageMeta() {
    try {
      if (!pageRow?.id) return;
      const patch = {
        title: pageRow.title || null,
        published: !!pageRow.published,
        seo_title: pageRow.seo_title || null,
        seo_description: pageRow.seo_description || null,
      };
      const { error } = await supabase
        .from("cms_pages")
        .update(patch)
        .eq("id", pageRow.id);
      if (error) throw error;
      toast.success("Page settings saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save page");
    }
  }

  async function saveHeroBlock() {
    try {
      if (!currentPageId) return;

      const payload = {
        headline: heroData.headline || "",
        subheadline: heroData.subheadline || "",
        cta_label: heroData.cta_label || "",
        cta_href: heroData.cta_href || "",
        background_image_url: heroData.background_image_url || "",
      };

      if (heroBlock?.id) {
        const { error } = await supabase
          .from("cms_blocks")
          .update({ data: payload })
          .eq("id", heroBlock.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cms_blocks")
          .insert({
            page_id: currentPageId,
            key: "hero",
            type: "hero",
            sort_order: 10,
            data: payload,
          });
        if (error) throw error;
      }

      toast.success("Hero saved");
      // re-load to refresh IDs/rows
      await loadPageAndHero(selectedSlug);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save hero");
    }
  }

  return (
    <div className="cms-admin">
      <div className="cms-head">
        <h1>CMS</h1>
        <div className="cms-head__right">
          <label>
            Page:
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
            >
              {KNOWN_PAGES.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
              {/* also show any custom slugs present in DB */}
              {pages
                .map((p) => p.slug)
                .filter((s) => !KNOWN_PAGES.includes(s))
                .map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          </label>
          {loading && <span className="cms-loading">Loading…</span>}
        </div>
      </div>

      {/* Page meta */}
      <div className="cms-card">
        <div className="cms-card__head">Page Settings</div>
        {!pageRow ? (
          <div className="cms-empty">No page selected</div>
        ) : (
          <div className="cms-form">
            <div className="row">
              <label>Title</label>
              <input
                value={pageRow.title || ""}
                onChange={(e) =>
                  setPageRow((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Page title"
              />
            </div>

            <div className="row">
              <label>Published</label>
              <select
                value={pageRow.published ? "true" : "false"}
                onChange={(e) =>
                  setPageRow((prev) => ({
                    ...prev,
                    published: e.target.value === "true",
                  }))
                }
              >
                <option value="false">Unpublished</option>
                <option value="true">Published</option>
              </select>
            </div>

            <div className="row">
              <label>SEO Title</label>
              <input
                value={pageRow.seo_title || ""}
                onChange={(e) =>
                  setPageRow((prev) => ({ ...prev, seo_title: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            <div className="row">
              <label>SEO Description</label>
              <textarea
                value={pageRow.seo_description || ""}
                onChange={(e) =>
                  setPageRow((prev) => ({
                    ...prev,
                    seo_description: e.target.value,
                  }))
                }
                placeholder="Optional"
                rows={3}
              />
            </div>

            <div className="actions">
              <button className="btn" onClick={savePageMeta}>
                Save Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hero block */}
      <div className="cms-card">
        <div className="cms-card__head">Hero</div>
        {!canEditHero ? (
          <div className="cms-empty">Select a page to edit hero</div>
        ) : (
          <div className="cms-form">
            <div className="row">
              <label>Headline</label>
              <input
                value={heroData.headline}
                onChange={(e) => onHeroChange("headline", e.target.value)}
                placeholder="Your Shepherd | to the Light"
              />
              <small className="hint">
                Use "|" or a newline to split into two lines on the homepage.
              </small>
            </div>

            <div className="row">
              <label>Subheadline</label>
              <input
                value={heroData.subheadline}
                onChange={(e) => onHeroChange("subheadline", e.target.value)}
                placeholder="We guide families with care."
              />
            </div>

            <div className="row2">
              <div>
                <label>CTA Label</label>
                <input
                  value={heroData.cta_label}
                  onChange={(e) => onHeroChange("cta_label", e.target.value)}
                  placeholder="Begin Arrangements"
                />
              </div>
              <div>
                <label>CTA Href</label>
                <input
                  value={heroData.cta_href}
                  onChange={(e) => onHeroChange("cta_href", e.target.value)}
                  placeholder="/login"
                />
              </div>
            </div>

            <div className="row">
              <label>Background Image URL</label>
              <input
                value={heroData.background_image_url}
                onChange={(e) =>
                  onHeroChange("background_image_url", e.target.value)
                }
                placeholder="https://…"
              />
              <div className="upload">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadHeroImage}
                />
                <span className="hint">Upload to ‘cms/hero/…’ bucket</span>
              </div>
            </div>

            <div className="actions">
              <button className="btn primary" onClick={saveHeroBlock}>
                Save Hero
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
