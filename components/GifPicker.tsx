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
      <motion.div ref={containerRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-2 left-0 w-80 glass rounded-xl overflow-hidden z-30 shadow-xl">
        <div className="p-4 text-center">
          <p className="text-muted text-xs">Add <code className="text-accent">NEXT_PUBLIC_GIPHY_API_KEY</code> to <code className="text-accent">.env.local</code> to enable GIFs.</p>
          <p className="text-muted/50 text-[10px] mt-2">Free key at developers.giphy.com</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div ref={containerRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full mb-2 left-0 w-80 md:w-96 glass rounded-xl overflow-hidden z-30 shadow-xl">
      <div className="p-2 border-b border-border">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search GIPHY..." autoFocus className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:outline-none focus:border-accent/50 transition-all" />
      </div>
      <div className="h-64 overflow-y-auto p-2">
        {loading && gifs.length === 0 && <div className="flex items-center justify-center h-full"><span className="text-muted text-xs">Loading...</span></div>}
        <div className="grid grid-cols-2 gap-1.5">
          {gifs.map((gif) => (
            <button key={gif.id} onClick={() => { onSelect(gif.images.fixed_height.url); onClose(); }} className="rounded-lg overflow-hidden hover:ring-2 hover:ring-accent transition-all cursor-pointer">
              <img src={gif.images.fixed_height_small.url} alt={gif.title} className="w-full h-24 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
        {!loading && gifs.length === 0 && <div className="flex items-center justify-center h-full"><span className="text-muted/50 text-xs">No GIFs found</span></div>}
      </div>
      <div className="px-2 py-1 border-t border-border flex justify-end"><span className="text-[9px] text-muted/40">Powered by GIPHY</span></div>
    </motion.div>
  );
}
