"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THEMES = [
  { id: "dark", name: "Dark", colors: ["#050510", "#8B5CF6", "#EC4899", "#3B82F6"] },
  { id: "light", name: "Light", colors: ["#f8f7ff", "#7C3AED", "#DB2777", "#2563EB"] },
  { id: "midnight", name: "Midnight", colors: ["#020617", "#3b82f6", "#e879f9", "#22d3ee"] },
  { id: "sunset", name: "Sunset", colors: ["#0f0806", "#f59e0b", "#ef4444", "#f97316"] },
  { id: "forest", name: "Forest", colors: ["#030f0a", "#10b981", "#f472b6", "#2dd4bf"] },
  { id: "neon", name: "Neon", colors: ["#0a0014", "#e040fb", "#00e5ff", "#76ff03"] },
  { id: "rose", name: "Rosé", colors: ["#0f0508", "#ec4899", "#c084fc", "#f472b6"] },
];

interface ThemePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemePicker({ isOpen, onClose }: ThemePickerProps) {
  const [current, setCurrent] = useState("dark");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(localStorage.getItem("rpb-theme") || "dark");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  function selectTheme(themeId: string) {
    setCurrent(themeId);
    document.documentElement.dataset.theme = themeId;
    localStorage.setItem("rpb-theme", themeId);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, height: 0, scale: 0.95, rotateX: 5 }}
          animate={{ opacity: 1, height: "auto", scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, height: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="overflow-hidden"
        >
          <div className="p-3 rounded-xl bg-surface/60 border border-border space-y-2.5 card-shine">
            <div className="flex items-center justify-between">
              <motion.span
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[10px] font-bold text-muted/60 uppercase tracking-wider"
              >
                🎨 Theme
              </motion.span>
              <motion.button
                onClick={onClose}
                whileHover={{ rotate: 90, scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                className="text-muted/40 hover:text-muted text-[10px] cursor-pointer"
              >
                ✕
              </motion.button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {THEMES.map((theme, i) => (
                <motion.button
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  initial={{ opacity: 0, scale: 0.7, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 20 }}
                  whileHover={{
                    scale: 1.12,
                    y: -3,
                    boxShadow: `0 6px 20px ${theme.colors[1]}30`,
                  }}
                  whileTap={{ scale: 0.88, rotate: -5 }}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all cursor-pointer ${
                    current === theme.id
                      ? "ring-2 ring-accent bg-accent/10"
                      : "hover:bg-surface-hover"
                  }`}
                >
                  <motion.div
                    className="w-9 h-9 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 ring-1 ring-border/50"
                    animate={current === theme.id ? {
                      boxShadow: [
                        `0 0 0px ${theme.colors[1]}00`,
                        `0 0 12px ${theme.colors[1]}50`,
                        `0 0 0px ${theme.colors[1]}00`,
                      ],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {theme.colors.map((color, ci) => (
                      <motion.div
                        key={ci}
                        style={{ backgroundColor: color }}
                        whileHover={{ scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 600 }}
                      />
                    ))}
                  </motion.div>
                  <span className="text-[8px] text-muted font-medium leading-none">{theme.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
