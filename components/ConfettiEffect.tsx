"use client";

import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  backColor: string;
  rotation: number;
  rotSpeed: number;
  tilt: number;
  tiltSpeed: number;
  shape: "rect" | "circle" | "strip" | "star" | "streamer";
  opacity: number;
  wobblePhase: number;
  wobbleSpeed: number;
  streamerLength: number;
  sparkle: number;
}

const COLORS = [
  ["#8B5CF6", "#6D28D9"], ["#EC4899", "#DB2777"], ["#3B82F6", "#2563EB"],
  ["#10B981", "#059669"], ["#F59E0B", "#D97706"], ["#EF4444", "#DC2626"],
  ["#06B6D4", "#0891B2"], ["#F97316", "#EA580C"], ["#A855F7", "#9333EA"],
  ["#E879F9", "#D946EF"], ["#FBBF24", "#F59E0B"], ["#34D399", "#10B981"],
  ["#FB7185", "#F43F5E"], ["#818CF8", "#6366F1"], ["#2DD4BF", "#14B8A6"],
  ["#FFD700", "#FFA500"], ["#FF69B4", "#FF1493"],
];

function createBurst(
  cx: number, cy: number,
  count: number, angle: number, spread: number,
  power: number, w: number, h: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const force = power * (0.5 + Math.random() * 0.8);
    const [front, back] = COLORS[Math.floor(Math.random() * COLORS.length)];
    const shapes: Particle["shape"][] = ["rect", "rect", "circle", "strip", "strip", "star", "streamer"];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    particles.push({
      x: cx + (Math.random() - 0.5) * 30,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(a) * force + (Math.random() - 0.5) * 2,
      vy: Math.sin(a) * force - Math.random() * 2,
      size: shape === "streamer" ? 3 + Math.random() * 2 : 5 + Math.random() * 8,
      color: front,
      backColor: back,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 15,
      tilt: Math.random() * Math.PI * 2,
      tiltSpeed: 0.03 + Math.random() * 0.06,
      shape,
      opacity: 1,
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.04,
      streamerLength: shape === "streamer" ? 20 + Math.random() * 35 : 0,
      sparkle: 0,
    });
  }
  return particles;
}

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  const spikes = 5;
  const outer = size / 2;
  const inner = outer * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

export default function ConfettiEffect({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const stableOnDone = useCallback(() => onDoneRef.current(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    let particles: Particle[] = [];

    // Left cannon
    particles.push(...createBurst(w * 0.1, h * 0.85, 80, -Math.PI / 3, 0.8, 18, w, h));
    // Right cannon
    particles.push(...createBurst(w * 0.9, h * 0.85, 80, -Math.PI * 2 / 3, 0.8, 18, w, h));
    // Center burst upward
    particles.push(...createBurst(w * 0.5, h * 0.6, 100, -Math.PI / 2, 1.8, 14, w, h));
    // Top rain
    for (let i = 0; i < 60; i++) {
      const [front, back] = COLORS[Math.floor(Math.random() * COLORS.length)];
      const shapes: Particle["shape"][] = ["rect", "strip", "circle", "streamer"];
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 3,
        size: 5 + Math.random() * 7,
        color: front,
        backColor: back,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        tilt: Math.random() * Math.PI * 2,
        tiltSpeed: 0.03 + Math.random() * 0.05,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        opacity: 1,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.04,
        streamerLength: 15 + Math.random() * 25,
        sparkle: 0,
      });
    }

    // Sparkles
    for (let i = 0; i < 40; i++) {
      const [front] = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h * (0.1 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 6,
        vy: -4 - Math.random() * 8,
        size: 2 + Math.random() * 3,
        color: front,
        backColor: "#FFFFFF",
        rotation: 0,
        rotSpeed: 0,
        tilt: 0,
        tiltSpeed: 0,
        shape: "circle",
        opacity: 1,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.05 + Math.random() * 0.05,
        streamerLength: 0,
        sparkle: 1,
      });
    }

    let frame = 0;
    const maxFrames = 300;
    let animId: number;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, w, h);
      frame++;

      const fadeStart = maxFrames * 0.75;

      for (const p of particles) {
        // Physics
        p.vy += p.sparkle ? 0.08 : 0.1;
        p.vx *= 0.995;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.tilt += p.tiltSpeed;
        p.wobblePhase += p.wobbleSpeed;

        // Flutter drift
        if (!p.sparkle) {
          p.x += Math.sin(p.wobblePhase) * 1.2;
          p.vy = Math.min(p.vy, 5);
        }

        // Fade out
        if (frame > fadeStart) {
          p.opacity = Math.max(0, 1 - (frame - fadeStart) / (maxFrames - fadeStart));
        }

        if (p.opacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.opacity;

        // Sparkle particles
        if (p.sparkle) {
          const twinkle = 0.5 + 0.5 * Math.sin(frame * 0.3 + p.wobblePhase);
          ctx.globalAlpha = p.opacity * twinkle;
          ctx.fillStyle = p.backColor;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * twinkle, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          continue;
        }

        ctx.rotate((p.rotation * Math.PI) / 180);

        // 3D tumble sim: scale X based on tilt
        const tiltFactor = Math.cos(p.tilt);
        ctx.scale(tiltFactor, 1);
        ctx.fillStyle = tiltFactor > 0 ? p.color : p.backColor;

        if (p.shape === "rect") {
          const rw = p.size;
          const rh = p.size * 0.6;
          ctx.beginPath();
          const radius = 1.5;
          ctx.roundRect(-rw / 2, -rh / 2, rw, rh, radius);
          ctx.fill();
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === "strip") {
          ctx.fillRect(-p.size / 2, -1.5, p.size, 3);
        } else if (p.shape === "star") {
          drawStar(ctx, p.size);
        } else if (p.shape === "streamer") {
          ctx.strokeStyle = tiltFactor > 0 ? p.color : p.backColor;
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          const segs = 6;
          for (let s = 1; s <= segs; s++) {
            const sy = (s / segs) * p.streamerLength;
            const sx = Math.sin(p.wobblePhase + s * 0.8) * 6;
            ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate);
      } else {
        stableOnDone();
      }
    }

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      canvas.width = nw * dpr;
      canvas.height = nh * dpr;
      canvas.style.width = nw + "px";
      canvas.style.height = nh + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, [stableOnDone]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[100] pointer-events-none"
    />
  );
}
