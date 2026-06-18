"use client";

import { useState, useEffect } from "react";

interface OgData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const cache = new Map<string, OgData>();

export default function LinkPreview({ url }: { url: string }) {
  const [og, setOg] = useState<OgData | null>(cache.get(url) || null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cache.has(url)) return;
    let cancelled = false;
    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          cache.set(url, data);
          setOg(data);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed || !og || (!og.title && !og.description && !og.image)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 max-w-sm rounded-xl overflow-hidden border border-border hover:border-border-bright transition-colors group"
    >
      {og.image && <img src={og.image} alt="" className="w-full h-32 object-cover" loading="lazy" />}
      <div className="p-3 bg-surface/50">
        {og.siteName && (
          <p className="text-[9px] text-muted/50 uppercase tracking-wider mb-0.5">{og.siteName}</p>
        )}
        {og.title && (
          <p className="text-xs font-semibold text-foreground/80 group-hover:text-foreground line-clamp-2 transition-colors">
            {og.title}
          </p>
        )}
        {og.description && (
          <p className="text-[11px] text-muted/60 line-clamp-2 mt-0.5">{og.description}</p>
        )}
      </div>
    </a>
  );
}
