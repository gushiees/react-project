// src/hooks/useCMS.js
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export function useCMS(slug) {
  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // RLS ensures: public sees published; admins see all
        const { data: pg, error: e1 } = await supabase
          .from("cms_pages")
          .select("id, slug, title, published, seo_title, seo_description")
          .eq("slug", slug)
          .maybeSingle();
        if (e1) throw e1;
        if (!pg) {
          setPage(null);
          setBlocks([]);
          setLoading(false);
          return;
        }
        const { data: blks, error: e2 } = await supabase
          .from("cms_blocks")
          .select("*")
          .eq("page_id", pg.id)
          .order("sort_order", { ascending: true });
        if (e2) throw e2;

        if (!alive) return;
        setPage(pg);
        setBlocks(blks || []);
      } catch (err) {
        if (!alive) return;
        setError(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const byKey = useMemo(() => {
    const map = {};
    for (const b of blocks) map[b.key] = b;
    return map;
  }, [blocks]);

  const byType = useMemo(() => {
    const map = {};
    for (const b of blocks) {
      if (!map[b.type]) map[b.type] = [];
      map[b.type].push(b);
    }
    return map;
  }, [blocks]);

  return { page, blocks, byKey, byType, loading, error };
}
