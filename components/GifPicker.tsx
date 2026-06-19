"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { GiphyGif } from "@/lib/types";

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  useEffect(() => {
    if (apiKey) fetchTrending();
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) return;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { fetchTrending(); return; }
    searchTimeout.current = setTimeout(() => searchGifs(query), 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, apiKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  async function fetchTrending() {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`);
      const data = await res.json();
      setGifs(data.data ?? []);
    } catch {}
    setLoading(false);
  }

  async function searchGifs(q: string) {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=g`);
      const data = await res.json();
      setGifs(data.data ?? []);
    } catch {}
    setLoading(false);
  }

  if (!apiKey) {
    return (
      <motion.div ref={containerRef} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute bottom-full mb-2 left-0 w-80 glass-strong rounded-2xl overflow-hidden z-30 glow">
        <div className="p-5 text-center">
          <span className="text-3xl block mb-2">🎬</span>
          <p className="text-muted text-xs">Add <code className="text-accent font-mono">NEXT_PUBLIC_GIPHY_API_KEY</code> to enable GIFs.</p>
          <p className="text-muted/30 text-[10px] mt-2">Free key at developers.giphy.com</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div ref={containerRef} initial={{ opacity: 0, y: 15, scale: 0.9, rotateX: 5 }} animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} className="absolute bottom-full mb-2 left-0 w-80 md:w-96 glass-strong rounded-2xl overflow-hidden z-30 glow">
      <div className="p-2.5 border-b border-border">
        <div className="input-glow rounded-lg transition-all">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GIPHY..." autoFocus className="w-full bg-surface/80 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted/40 focus:outline-none transition-all" />
        </div>
      </div>
      <div className="h-64 overflow-y-auto p-2">
        {loading && gifs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <motion.span
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" }, scale: { duration: 0.5, repeat: Infinity } }}
              className="text-xl"
            >
              🎬
            </motion.span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {gifs.map((gif, i) => (
            <motion.button
              key={gif.id}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => { onSelect(gif.images.fixed_height.url); onClose(); }}
              whileHover={{ scale: 1.05, y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="rounded-xl overflow-hidden ring-1 ring-border hover:ring-accent/40 transition-all cursor-pointer"
            >
              <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-24 object-cover" loading="lazy" />
            </motion.button>
          ))}
        </div>
        {!loading && gifs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-2xl mb-2">🔍</span>
            <span className="text-muted/40 text-xs">No GIFs found</span>
          </div>
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-border flex justify-end">
        <span className="text-[9px] text-muted/25 font-medium">Powered by GIPHY</span>
      </div>
    </motion.div>
  );
}
