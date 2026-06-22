"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
  shape: "rect" | "circle" | "strip";
  opacity: number;
}

const COLORS = [
  "#8B5CF6", "#EC4899", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#06B6D4", "#F97316", "#A855F7", "#E879F9",
  "#FBBF24", "#34D399", "#FB7185", "#818CF8", "#2DD4BF",
];

export default function ConfettiEffect({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    const count = 150;

    for (let i = 0; i < count; i++) {
      const burstX = canvas.width * (0.2 + Math.random() * 0.6);
      particles.push({
        x: burstX,
        y: -10 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 8 + 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        shape: (["rect", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 180;
    let animId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const fadeStart = maxFrames * 0.7;

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.12;
        p.y += p.vy;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        if (frame > fadeStart) {
          p.opacity = Math.max(0, 1 - (frame - fadeStart) / (maxFrames - fadeStart));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -1, p.size, 3);
        }

        ctx.restore();
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate);
      } else {
        onDone();
      }
    }

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
}
