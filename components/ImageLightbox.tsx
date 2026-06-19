"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

interface ImageLightboxProps {
  url: string;
  onClose: () => void;
}

export default function ImageLightbox({ url, onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 cursor-zoom-out"
    >
      <motion.div
        initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
        animate={{ opacity: 1, backdropFilter: "blur(16px)" }}
        exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/85"
      />
      <motion.button
        initial={{ opacity: 0, y: -20, scale: 0 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
        onClick={onClose}
        whileHover={{ scale: 1.15, rotate: 90 }}
        whileTap={{ scale: 0.85 }}
        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl cursor-pointer z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
      >
        ✕
      </motion.button>
      <motion.img
        initial={{ scale: 0.3, opacity: 0, rotateY: -15, rotateX: 10 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0, rotateX: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotateY: 10 }}
        transition={{ type: "spring", stiffness: 250, damping: 22, mass: 0.8 }}
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl cursor-default relative z-10"
        style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 120px rgba(139,92,246,0.1)" }}
      />
    </motion.div>
  );
}
