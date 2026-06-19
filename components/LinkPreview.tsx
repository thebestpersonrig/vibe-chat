"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 25px rgba(139,92,246,0.15), 0 0 0 1px rgba(139,92,246,0.2)",
      }}
      className="block mt-2 max-w-sm rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-colors group"
    >
      {og.image && (
        <div className="overflow-hidden">
          <motion.img
            src={og.image}
            alt=""
            className="w-full h-32 object-cover"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}
      <motion.div
        className="p-3 bg-surface/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
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
      </motion.div>
    </motion.a>
  );
}
