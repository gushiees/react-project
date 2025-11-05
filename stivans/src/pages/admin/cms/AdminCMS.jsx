// src/pages/admin/cms/AdminCMS.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../../supabaseClient";

// Internal route choices for the dropdown
const ROUTE_OPTIONS = [
  { label: "— choose a route —", value: "" },
  { label: "Home", value: "/" },
  { label: "Catalog", value: "/catalog" },
  { label: "Chapels", value: "/chapels" },
  { label: "About", value: "/about" },
  { label: "Contact", value: "/contact" },
  { label: "Login", value: "/login" },
  { label: "Signup", value: "/signup" },
  { label: "Cart", value: "/cart" },
  { label: "Checkout", value: "/checkout" },
  { label: "Profile", value: "/profile" },
  // add more if you expose new pages
];

const PAGE_SLUGS = ["home", "about", "contact"];

export default function AdminCMS() {
  const [slug, setSlug] = useState("home");

  // page
  const [pageId, setPageId] = useState(null);
  const [pageTitle, setPageTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  // hero
  const [hero, setHero] = useState({
    headline: "",
    subheadline: "",
    cta_label: "Get Started",
    cta_href: "/catalog",
    background_image_url: "",
  });
  const [heroFile, setHeroFile] = useState(null);

  // services
  const [services, setServices] = useState({
    cards: [],
  });

  // ---------- helpers ----------
  const pageIsHome = useMemo(() => slug === "home", [slug]);

  function onHeroChange(k, v) {
    setHero((s) => ({ ...s, [k]: v }));
  }

  function onCardChange(i, k, v) {
    setServices((s) => {
      const cards = [...(s.cards || [])];
      cards[i] = { ...(cards[i] || {}), [k]: v };
      return { ...s, cards };
    });
  }

  function addCard() {
    setServices((s) => ({
      ...s,
      cards: [
        ...(s.cards || []),
        { title: "", text: "", href: "", image_url: "" },
      ],
    }));
  }

  function removeCard(i) {
    setServices((s) => {
      const cards = [...(s.cards || [])];
      cards.splice(i, 1);
      return { ...s, cards };
    });
  }

  async function uploadToCms(file, prefix = "services") {
    if (!file) return null;
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("cms").upload(path, file, { upsert: false });
    if (error) throw error;
    const publicUrl = supabase.storage.from("cms").getPublicUrl(path).data.publicUrl;
    return publicUrl;
  }

  async function ensurePage() {
    // get existing page (or create)
    const { data } = await supabase.from("cms_pages").select("*").eq("slug", slug).maybeSingle();
    if (data?.id) return data;

    const ins = await supabase
      .from("cms_pages")
      .insert({ slug, title: slug[0].toUpperCase() + slug.slice(1), published: false })
      .select()
      .single();
    if (ins.error) throw ins.error;
    return ins.data;
  }

  async function fetchAll() {
    try {
      const pg = await ensurePage();
      setPageId(pg.id);
      setPageTitle(pg.title || "");
      setPublished(!!pg.published);
      setSeoTitle(pg.seo_title || "");
      setSeoDesc(pg.seo_description || "");

      // hero block
      const heroRes = await supabase
        .from("cms_blocks")
        .select("*")
        .eq("page_id", pg.id)
        .eq("key", "hero")
        .maybeSingle();

      if (heroRes.data?.data) {
        setHero({
          headline: heroRes.data.data.headline || "",
          subheadline: heroRes.data.data.subheadline || "",
          cta_label: heroRes.data.data.cta_label || "Get Started",
          cta_href: heroRes.data.data.cta_href || "/catalog",
          background_image_url: heroRes.data.data.background_image_url || "",
        });
      } else {
        setHero((s) => ({ ...s })); // leave defaults
      }

      // services block
      const svcRes = await supabase
        .from("cms_blocks")
        .select("*")
        .eq("page_id", pg.id)
        .eq("key", "services")
        .maybeSingle();

      if (svcRes.data?.data?.cards) {
        setServices({ cards: svcRes.data.data.cards });
      } else {
        setServices({ cards: [] });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load CMS");
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ---------- saves ----------
  async function savePage() {
    if (!pageId) return;
    const { error } = await supabase
      .from("cms_pages")
      .update({
        title: pageTitle || null,
        published,
        seo_title: seoTitle || null,
        seo_description: seoDesc || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pageId);
    if (error) {
      toast.error(error.message || "Saving page failed");
      return;
    }
    toast.success("Page settings saved");
  }

  async function saveHero() {
    if (!pageId) return;

    let bgUrl = hero.background_image_url || "";
    try {
      if (heroFile) {
        bgUrl = await uploadToCms(heroFile, "hero");
      }

      const payload = {
        headline: hero.headline || "",
        subheadline: hero.subheadline || "",
        cta_label: hero.cta_label || "",
        cta_href: hero.cta_href || "",
        background_image_url: bgUrl || null,
      };

      const { error } = await supabase
        .from("cms_blocks")
        .upsert(
          {
            page_id: pageId,
            key: "hero",
            type: "hero",
            sort_order: 10,
            data: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "page_id,key" }
        );
      if (error) throw error;
      setHero((s) => ({ ...s, background_image_url: bgUrl || "" }));
      setHeroFile(null);
      toast.success("Hero saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Saving hero failed");
    }
  }

  async function saveServices() {
    if (!pageId) return;

    try {
      // Upload any new files first and replace image_url if needed
      const uploaders = [];
      const nextCards = (services.cards || []).map((c, i) => {
        const clone = { ...c };
        // if we temporarily stashed a File object on `file`
        if (clone.file instanceof File) {
          uploaders.push(
            uploadToCms(clone.file, "services").then((url) => {
              clone.image_url = url;
              delete clone.file;
              return { idx: i, value: clone };
            })
          );
        }
        return clone;
      });

      if (uploaders.length) {
        const uploaded = await Promise.all(uploaders);
        uploaded.forEach(({ idx, value }) => {
          nextCards[idx] = value;
        });
      }

      const payload = { cards: nextCards };

      const { error } = await supabase
        .from("cms_blocks")
        .upsert(
          {
            page_id: pageId,
            key: "services",
            type: "services",
            sort_order: 20,
            data: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "page_id,key" }
        );
      if (error) throw error;
      setServices({ cards: nextCards });
      toast.success("Services saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Saving services failed");
    }
  }

  // ---------- UI ----------
  return (
    <div className="admin-cms" style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>CMS</h1>
        <div style={{ marginLeft: "auto" }}>
          <label style={{ fontSize: 12, color: "#555", marginRight: 6 }}>Page:</label>
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>
            {PAGE_SLUGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PAGE SETTINGS */}
      <section className="panel" style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Page Settings</div>
        <div className="field">
          <label>Title</label>
          <input value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} placeholder="Page title" />
        </div>

        <div className="field">
          <label>Published</label>
          <select value={published ? "1" : "0"} onChange={(e) => setPublished(e.target.value === "1")}>
            <option value="1">Published</option>
            <option value="0">Unpublished</option>
          </select>
        </div>

        <div className="field">
          <label>SEO Title</label>
          <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Optional" />
        </div>

        <div className="field">
          <label>SEO Description</label>
          <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} placeholder="Optional" />
        </div>

        <button onClick={savePage}>Save Page</button>
      </section>

      {/* HERO */}
      {pageIsHome && (
        <section className="panel" style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Hero</div>
          <div className="field">
            <label>Headline</label>
            <input
              value={hero.headline}
              onChange={(e) => onHeroChange("headline", e.target.value)}
              placeholder="Use '|' or a newline to split into two lines on the homepage."
            />
          </div>
          <div className="field">
            <label>Subheadline</label>
            <input value={hero.subheadline} onChange={(e) => onHeroChange("subheadline", e.target.value)} />
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <div className="field">
              <label>CTA Label</label>
              <input value={hero.cta_label} onChange={(e) => onHeroChange("cta_label", e.target.value)} />
            </div>
            <div className="field">
              <label>CTA Href</label>
              <select
                value={ROUTE_OPTIONS.find((o) => o.value === hero.cta_href) ? hero.cta_href : ""}
                onChange={(e) => onHeroChange("cta_href", e.target.value || hero.cta_href)}
              >
                {ROUTE_OPTIONS.map((o) => (
                  <option key={o.value || "none"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <small style={{ display: "block", marginTop: 6 }}>If you need a custom path, type it directly in the input below.</small>
              <input
                value={hero.cta_href}
                onChange={(e) => onHeroChange("cta_href", e.target.value)}
                placeholder="/custom-path"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>

          <div className="field">
            <label>Background Image URL</label>
            <input
              value={hero.background_image_url || ""}
              onChange={(e) => onHeroChange("background_image_url", e.target.value)}
              placeholder="https://…"
            />
            <small>Upload to ‘cms/hero/...’ bucket</small>
          </div>
          <div className="field">
            <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
          </div>

          <button onClick={saveHero}>Save Hero</button>
        </section>
      )}

      {/* SERVICES */}
      {pageIsHome && (
        <section className="panel" style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Services (Home cards)</div>

          {(services.cards || []).map((c, i) => (
            <div key={i} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div className="field">
                <label>Title</label>
                <input value={c.title || ""} onChange={(e) => onCardChange(i, "title", e.target.value)} />
              </div>
              <div className="field">
                <label>Text</label>
                <textarea value={c.text || ""} onChange={(e) => onCardChange(i, "text", e.target.value)} />
              </div>

              <div className="field">
                <label>Link</label>
                <select
                  value={ROUTE_OPTIONS.find((o) => o.value === (c.href || "")) ? c.href : ""}
                  onChange={(e) => onCardChange(i, "href", e.target.value || c.href)}
                >
                  {ROUTE_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <small style={{ display: "block", marginTop: 6 }}>Or type a custom path:</small>
                <input
                  value={c.href || ""}
                  onChange={(e) => onCardChange(i, "href", e.target.value)}
                  placeholder="/custom-path"
                  style={{ marginTop: 6 }}
                />
              </div>

              <div className="field">
                <label>Image URL</label>
                <input
                  value={c.image_url || ""}
                  onChange={(e) => onCardChange(i, "image_url", e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="field">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onCardChange(i, "file", file || null); // temp store File; uploaded on save
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => removeCard(i)} style={{ background: "#ffe5e5", borderColor: "#ffcccc" }}>
                  Remove Card
                </button>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addCard}>+ Add Card</button>
            <button onClick={saveServices} style={{ marginLeft: "auto" }}>
              Save Services
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* minimal styles for fields (scoped) */
const css = `
.admin-cms .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.admin-cms .field > label { font-size:12px; color:#555; }
.admin-cms input, .admin-cms select, .admin-cms textarea { padding:8px; border:1px solid #ddd; border-radius:8px; }
.admin-cms textarea { min-height:88px; resize:vertical; }
.admin-cms button { padding:8px 12px; border:1px solid #ddd; border-radius:8px; background:#fff; cursor:pointer; }
.admin-cms button:hover { background:#f8f8f8; }
`;
if (typeof document !== "undefined" && !document.getElementById("admin-cms-css")) {
  const tag = document.createElement("style");
  tag.id = "admin-cms-css";
  tag.textContent = css;
  document.head.appendChild(tag);
}
