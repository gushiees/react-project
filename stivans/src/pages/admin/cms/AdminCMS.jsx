// src/pages/admin/cms/AdminCMS.jsx
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../../supabaseClient";

// Internal route choices for the dropdown (used by Home → Services + Hero CTA)
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
];

const PAGE_SLUGS = ["home", "about", "contact"];

export default function AdminCMS() {
  const [slug, setSlug] = useState("home");

  // page (common)
  const [pageId, setPageId] = useState(null);
  const [pageTitle, setPageTitle] = useState("");
  const [published, setPublished] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  // ---------- HOME: Hero ----------
  const [hero, setHero] = useState({
    headline: "",
    subheadline: "",
    cta_label: "Get Started",
    cta_href: "/catalog",
    background_image_url: "",
  });
  const [heroFile, setHeroFile] = useState(null);

  // ---------- HOME: Services ----------
  const [services, setServices] = useState({ cards: [] });

  // ---------- ABOUT: Media (left image + overlay logo + slogan) ----------
  const [aboutMedia, setAboutMedia] = useState({
    image_url: "",
    logo_url: "",
    slogan: "Your Comfort To Heaven",
  });
  const [aboutImageFile, setAboutImageFile] = useState(null);
  const [aboutLogoFile, setAboutLogoFile] = useState(null);

  // ---------- ABOUT: Sections (accordion content) ----------
  const [aboutSections, setAboutSections] = useState({
    mission: "",
    vision: "",
    values: [{ title: "", desc: "" }],          // array of {title, desc}
    timeline: [{ year: "", event: "" }],        // array of {year, event}
    team: [""],                                 // array of strings
    faq: [{ q: "", a: "" }],                    // array of {q, a}
  });

  // ---------- helpers ----------
  const pageIsHome = useMemo(() => slug === "home", [slug]);
  const pageIsAbout = useMemo(() => slug === "about", [slug]);

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
      cards: [...(s.cards || []), { title: "", text: "", href: "", image_url: "" }],
    }));
  }
  function removeCard(i) {
    setServices((s) => {
      const cards = [...(s.cards || [])];
      cards.splice(i, 1);
      return { ...s, cards };
    });
  }

  // ABOUT – list helpers
  const listSetter = (listKey) => (idx, field, value) => {
    setAboutSections((s) => {
      const arr = [...s[listKey]];
      arr[idx] = { ...(arr[idx] || {}), [field]: value };
      return { ...s, [listKey]: arr };
    });
  };
  const listAdder = (listKey, emptyRow) => () =>
    setAboutSections((s) => ({ ...s, [listKey]: [...s[listKey], emptyRow] }));
  const listRemover = (listKey) => (idx) =>
  setAboutSections((s) => {
    const arr = [...s[listKey]];
    arr.splice(idx, 1);

    // sensible empty rows per list type
    const fallback =
      listKey === "team"     ? [""] :
      listKey === "values"   ? [{ title: "", desc: "" }] :
      listKey === "timeline" ? [{ year: "", event: "" }] :
      listKey === "faq"      ? [{ q: "", a: "" }] :
      [];

    return { ...s, [listKey]: arr.length ? arr : fallback };
  });

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

      // ---------- fetch HERO (home) ----------
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
        setHero((s) => ({ ...s }));
      }

      // ---------- fetch SERVICES (home) ----------
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

      // ---------- fetch ABOUT: media ----------
      const aboutMediaRes = await supabase
        .from("cms_blocks")
        .select("*")
        .eq("page_id", pg.id)
        .eq("key", "about_media")
        .maybeSingle();

      if (aboutMediaRes.data?.data) {
        setAboutMedia({
          image_url: aboutMediaRes.data.data.image_url || "",
          logo_url: aboutMediaRes.data.data.logo_url || "",
          slogan: aboutMediaRes.data.data.slogan || "Your Comfort To Heaven",
        });
      } else {
        setAboutMedia((s) => ({ ...s }));
      }

      // ---------- fetch ABOUT: sections ----------
      const aboutSecRes = await supabase
        .from("cms_blocks")
        .select("*")
        .eq("page_id", pg.id)
        .eq("key", "about_sections")
        .maybeSingle();

      if (aboutSecRes.data?.data) {
        const d = aboutSecRes.data.data;
        setAboutSections({
          mission: d.mission || "",
          vision: d.vision || "",
          values: Array.isArray(d.values) && d.values.length ? d.values : [{ title: "", desc: "" }],
          timeline: Array.isArray(d.timeline) && d.timeline.length ? d.timeline : [{ year: "", event: "" }],
          team: Array.isArray(d.team) && d.team.length ? d.team : [""],
          faq: Array.isArray(d.faq) && d.faq.length ? d.faq : [{ q: "", a: "" }],
        });
      } else {
        setAboutSections((s) => ({ ...s }));
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

  // HOME: Hero
  async function saveHero() {
    if (!pageId) return;

    let bgUrl = hero.background_image_url || "";
    try {
      if (heroFile) bgUrl = await uploadToCms(heroFile, "hero");

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
          { page_id: pageId, key: "hero", type: "hero", sort_order: 10, data: payload, updated_at: new Date().toISOString() },
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

  // HOME: Services
  async function saveServices() {
    if (!pageId) return;

    try {
      const uploaders = [];
      const nextCards = (services.cards || []).map((c, i) => {
        const clone = { ...c };
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
          { page_id: pageId, key: "services", type: "services", sort_order: 20, data: payload, updated_at: new Date().toISOString() },
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

  // ABOUT: Media
  async function saveAboutMedia() {
    if (!pageId) return;
    try {
      let img = aboutMedia.image_url || "";
      let logo = aboutMedia.logo_url || "";
      if (aboutImageFile) img = await uploadToCms(aboutImageFile, "about");
      if (aboutLogoFile) logo = await uploadToCms(aboutLogoFile, "about");

      const payload = { image_url: img || null, logo_url: logo || null, slogan: aboutMedia.slogan || "" };

      const { error } = await supabase
        .from("cms_blocks")
        .upsert(
          { page_id: pageId, key: "about_media", type: "about_media", sort_order: 10, data: payload, updated_at: new Date().toISOString() },
          { onConflict: "page_id,key" }
        );
      if (error) throw error;

      setAboutMedia({ image_url: img || "", logo_url: logo || "", slogan: aboutMedia.slogan || "" });
      setAboutImageFile(null);
      setAboutLogoFile(null);
      toast.success("About media saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Saving about media failed");
    }
  }

  // ABOUT: Sections
  async function saveAboutSections() {
    if (!pageId) return;
    try {
      const payload = {
        mission: aboutSections.mission || "",
        vision: aboutSections.vision || "",
        values: (aboutSections.values || []).map((v) => ({ title: v.title || "", desc: v.desc || "" })),
        timeline: (aboutSections.timeline || []).map((t) => ({ year: t.year || "", event: t.event || "" })),
        team: (aboutSections.team || []).map((m) => String(m || "")),
        faq: (aboutSections.faq || []).map((f) => ({ q: f.q || "", a: f.a || "" })),
      };

      const { error } = await supabase
        .from("cms_blocks")
        .upsert(
          { page_id: pageId, key: "about_sections", type: "about_sections", sort_order: 20, data: payload, updated_at: new Date().toISOString() },
          { onConflict: "page_id,key" }
        );
      if (error) throw error;

      toast.success("About sections saved");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Saving about sections failed");
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

      {/* PAGE SETTINGS (common) */}
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

      {/* HOME: HERO (only on home) */}
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
              <input value={hero.cta_href} onChange={(e) => onHeroChange("cta_href", e.target.value)} placeholder="/custom-path" style={{ marginTop: 6 }} />
            </div>
          </div>

          <div className="field">
            <label>Background Image URL</label>
            <input value={hero.background_image_url || ""} onChange={(e) => onHeroChange("background_image_url", e.target.value)} placeholder="https://…" />
            <small>Upload to ‘cms/hero/...’ bucket</small>
          </div>
          <div className="field">
            <input type="file" accept="image/*" onChange={(e) => setHeroFile(e.target.files?.[0] || null)} />
          </div>

          <button onClick={saveHero}>Save Hero</button>
        </section>
      )}

      {/* HOME: SERVICES (only on home) */}
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
                <select value={ROUTE_OPTIONS.find((o) => o.value === (c.href || "")) ? c.href : ""} onChange={(e) => onCardChange(i, "href", e.target.value || c.href)}>
                  {ROUTE_OPTIONS.map((o) => (
                    <option key={o.value || "none"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <small style={{ display: "block", marginTop: 6 }}>Or type a custom path:</small>
                <input value={c.href || ""} onChange={(e) => onCardChange(i, "href", e.target.value)} placeholder="/custom-path" style={{ marginTop: 6 }} />
              </div>

              <div className="field">
                <label>Image URL</label>
                <input value={c.image_url || ""} onChange={(e) => onCardChange(i, "image_url", e.target.value)} placeholder="https://…" />
              </div>
              <div className="field">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onCardChange(i, "file", file || null); // temp File; uploaded on save
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

      {/* ABOUT: Media */}
      {pageIsAbout && (
        <section className="panel" style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 16, marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>About — Media (left image, overlay logo & slogan)</div>

          <div className="field">
            <label>Main Image URL</label>
            <input
              value={aboutMedia.image_url || ""}
              onChange={(e) => setAboutMedia((s) => ({ ...s, image_url: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className="field">
            <input type="file" accept="image/*" onChange={(e) => setAboutImageFile(e.target.files?.[0] || null)} />
          </div>

          <div className="field">
            <label>Overlay Logo URL (optional)</label>
            <input value={aboutMedia.logo_url || ""} onChange={(e) => setAboutMedia((s) => ({ ...s, logo_url: e.target.value }))} placeholder="https://…" />
          </div>
          <div className="field">
            <input type="file" accept="image/*" onChange={(e) => setAboutLogoFile(e.target.files?.[0] || null)} />
          </div>

          <div className="field">
            <label>Slogan (overlay text)</label>
            <input value={aboutMedia.slogan || ""} onChange={(e) => setAboutMedia((s) => ({ ...s, slogan: e.target.value }))} />
          </div>

          <button onClick={saveAboutMedia}>Save About Media</button>
        </section>
      )}

      {/* ABOUT: Sections */}
      {pageIsAbout && (
        <section className="panel" style={{ background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 16, marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>About — Accordion Sections</div>

          {/* Mission */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong>Our Mission</strong>
            <div className="field" style={{ marginTop: 8 }}>
              <textarea value={aboutSections.mission} onChange={(e) => setAboutSections((s) => ({ ...s, mission: e.target.value }))} />
            </div>
          </div>

          {/* Vision */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong>Our Vision</strong>
            <div className="field" style={{ marginTop: 8 }}>
              <textarea value={aboutSections.vision} onChange={(e) => setAboutSections((s) => ({ ...s, vision: e.target.value }))} />
            </div>
          </div>

          {/* Values */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong>Our Values</strong>
            {(aboutSections.values || []).map((v, i) => (
              <div key={`val-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginTop: 8 }}>
                <input placeholder="Title" value={v.title || ""} onChange={(e) => listSetter("values")(i, "title", e.target.value)} />
                <input placeholder="Description" value={v.desc || ""} onChange={(e) => listSetter("values")(i, "desc", e.target.value)} />
                <button onClick={() => listRemover("values")(i)}>Remove</button>
              </div>
            ))}
            <button style={{ marginTop: 8 }} onClick={listAdder("values", { title: "", desc: "" })}>
              + Add Value
            </button>
          </div>

          {/* Timeline */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong>Company History (Timeline)</strong>
            {(aboutSections.timeline || []).map((t, i) => (
              <div key={`tl-${i}`} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 8, marginTop: 8 }}>
                <input placeholder="Year" value={t.year || ""} onChange={(e) => listSetter("timeline")(i, "year", e.target.value)} />
                <input placeholder="Event" value={t.event || ""} onChange={(e) => listSetter("timeline")(i, "event", e.target.value)} />
                <button onClick={() => listRemover("timeline")(i)}>Remove</button>
              </div>
            ))}
            <button style={{ marginTop: 8 }} onClick={listAdder("timeline", { year: "", event: "" })}>
              + Add Timeline Row
            </button>
          </div>

          {/* Team */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <strong>Meet Our Team</strong>
            {(aboutSections.team || []).map((m, i) => (
              <div key={`tm-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
                <input placeholder="Name – Role" value={m || ""} onChange={(e) => {
                  const val = e.target.value;
                  setAboutSections((s) => {
                    const arr = [...s.team];
                    arr[i] = val;
                    return { ...s, team: arr };
                  });
                }} />
                <button onClick={() => listRemover("team")(i)}>Remove</button>
              </div>
            ))}
            <button style={{ marginTop: 8 }} onClick={listAdder("team", "")}>
              + Add Team Member
            </button>
          </div>

          {/* FAQ */}
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <strong>Frequently Asked Questions</strong>
            {(aboutSections.faq || []).map((f, i) => (
              <div key={`fq-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 8 }}>
                <input placeholder="Question" value={f.q || ""} onChange={(e) => listSetter("faq")(i, "q", e.target.value)} />
                <input placeholder="Answer" value={f.a || ""} onChange={(e) => listSetter("faq")(i, "a", e.target.value)} />
                <button onClick={() => listRemover("faq")(i)}>Remove</button>
              </div>
            ))}
            <button style={{ marginTop: 8 }} onClick={listAdder("faq", { q: "", a: "" })}>
              + Add FAQ
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button onClick={saveAboutSections}>Save About Sections</button>
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
