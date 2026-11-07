"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

// Cinematic background layers for the dark marketing/auth pages.
// <Constellation/> — a live network: drifting nodes link up when close, sparks travel along links,
//                    and nodes near the pointer connect to it.
// <Starfield/>     — deterministic twinkling stars (SSR-safe).
// <HorizonGlow/>   — a planet-edge arc of indigo → violet → warm light along the bottom.

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
  phase: number;
}

interface Spark {
  a: number;
  b: number;
  t: number;
  speed: number;
}

export function Constellation({
  className = "",
  density = 1,
  linkDistance = 150,
  interactive = true,
}: {
  className?: string;
  density?: number;
  linkDistance?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    const sparks: Spark[] = [];
    const pointer = { x: -9999, y: -9999, active: false };
    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();

    const seedNodes = () => {
      const mobile = w < 640;
      const target = Math.round((mobile ? 34 : Math.min(88, 40 + (w * h) / 24000)) * density);
      nodes = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.4 + 0.8,
        hue: Math.random() < 0.6 ? 244 : 266,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.max(1, Math.floor(rect.width));
      const nh = Math.max(1, Math.floor(rect.height));
      const first = w === 0;
      const sx = first ? 1 : nw / w;
      const sy = first ? 1 : nh / h;
      w = nw;
      h = nh;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first || nodes.length === 0) seedNodes();
      else
        for (const n of nodes) {
          n.x *= sx;
          n.y *= sy;
        }
      if (!running) draw(0);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const maxD = linkDistance * (w < 640 ? 0.8 : 1);
      const maxD2 = maxD * maxD;

      // move
      if (dt > 0) {
        for (const n of nodes) {
          n.x += n.vx * dt * 0.06;
          n.y += n.vy * dt * 0.06;
          n.phase += dt * 0.0015;
          if (pointer.active) {
            const dx = pointer.x - n.x;
            const dy = pointer.y - n.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 220 * 220 && d2 > 1) {
              const f = 0.000012 * dt;
              n.vx += dx * f;
              n.vy += dy * f;
            }
          }
          // gentle speed limit
          const sp = Math.hypot(n.vx, n.vy);
          if (sp > 0.4) {
            n.vx *= 0.4 / sp;
            n.vy *= 0.4 / sp;
          }
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
        }
      }

      // links
      const links: [number, number][] = [];
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            const t = 1 - Math.sqrt(d2) / maxD;
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 90%, 72%, ${t * 0.32})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            if (t > 0.35) links.push([i, j]);
          }
        }
      }

      // pointer links
      if (pointer.active) {
        for (const n of nodes) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d = Math.hypot(dx, dy);
          if (d < 190) {
            const t = 1 - d / 190;
            ctx.strokeStyle = `rgba(243, 241, 234, ${t * 0.45})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      // sparks travelling along links (messages being sent)
      if (dt > 0) {
        if (sparks.length < (w < 640 ? 3 : 7) && links.length && Math.random() < 0.04) {
          const [a, b] = links[Math.floor(Math.random() * links.length)];
          sparks.push({ a, b, t: 0, speed: 0.0007 + Math.random() * 0.0008 });
        }
        for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.t += s.speed * dt;
          const A = nodes[s.a];
          const B = nodes[s.b];
          if (!A || !B || s.t >= 1 || Math.hypot(A.x - B.x, A.y - B.y) > maxD * 1.2) {
            sparks.splice(i, 1);
            continue;
          }
          const x = A.x + (B.x - A.x) * s.t;
          const y = A.y + (B.y - A.y) * s.t;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, "rgba(255, 236, 248, 0.95)");
          g.addColorStop(0.4, "rgba(176, 150, 255, 0.45)");
          g.addColorStop(1, "rgba(120, 100, 255, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // nodes
      for (const n of nodes) {
        const tw = 0.65 + Math.sin(n.phase) * 0.35;
        ctx.fillStyle = `hsla(${n.hue}, 95%, 75%, ${0.12 * tw})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `hsla(${n.hue}, 100%, 88%, ${0.55 + 0.45 * tw})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    resize();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave);
    }

    start();
    if (reduced) draw(0);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [density, linkDistance, interactive]);

  return <canvas ref={canvasRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}

// Small seeded PRNG so server and client render the same stars.
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(20261107);
  return Array.from({ length: 140 }, (_, i) => ({
    x: Math.round(rand() * 10000) / 100,
    y: Math.round(rand() * 10000) / 100,
    r: rand() < 0.08 ? 1.6 : rand() < 0.35 ? 1.1 : 0.7,
    o: Math.round((0.25 + rand() * 0.6) * 100) / 100,
    d: Math.round(rand() * 600) / 100,
    tw: i % 5 === 0,
  }));
})();

export function Starfield({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="none">
      {STARS.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="#f3f1ea"
          opacity={s.o}
          className={s.tw ? "cx-twinkle" : undefined}
          style={s.tw ? { animationDelay: `${s.d}s` } : undefined}
        />
      ))}
    </svg>
  );
}

/** A planet-edge arc glowing along the bottom of the hero. */
export function HorizonGlow({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-[70%] overflow-hidden ${className}`}>
      {/* atmospheric bloom */}
      <div
        className="absolute left-1/2 h-[90vw] w-[160vw] -translate-x-1/2 rounded-[100%] blur-3xl"
        style={{
          top: "62%",
          background: "radial-gradient(ellipse at 50% 0%, rgba(155,107,255,0.55) 0%, rgba(99,96,240,0.35) 22%, rgba(236,120,180,0.18) 38%, transparent 62%)",
        }}
      />
      {/* the planet */}
      <div
        className="absolute left-1/2 h-[160vw] w-[200vw] -translate-x-1/2 rounded-[100%]"
        style={{
          top: "78%",
          background: "radial-gradient(ellipse at 50% 0%, #17142e 0%, #0b0a17 18%, #06060b 45%)",
          boxShadow:
            "inset 0 1.5px 0 rgba(255, 222, 240, 0.85), inset 0 10px 30px rgba(190, 150, 255, 0.35), 0 -6px 40px rgba(155, 107, 255, 0.45), 0 -30px 120px rgba(99, 96, 240, 0.35)",
        }}
      />
      {/* sunrise flare on the rim */}
      <div
        className="cx-flare absolute left-[58%] h-24 w-[46vw] -translate-x-1/2 rounded-full blur-2xl"
        style={{ top: "calc(78% - 3rem)", background: "radial-gradient(ellipse, rgba(255, 196, 228, 0.55), rgba(155,107,255,0.25) 45%, transparent 70%)" }}
      />
    </div>
  );
}

/** Fade-up reveal on scroll. */
export function Reveal({ children, delay = 0, className = "", y = 18 }: { children: React.ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Floating glass chip used on the hero/login. */
export function FloatChip({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -8, 0] }}
      transition={{ opacity: { duration: 0.8, delay }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay } }}
      className={`absolute rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-[12.5px] text-bone/90 shadow-[0_20px_60px_-20px_rgba(99,96,240,0.6)] backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** The Connected mark for dark backgrounds. */
export function DarkLogo({ withWord = true, className = "" }: { withWord?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative inline-flex size-8 items-center justify-center rounded-[9px] border border-bone/70">
        <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="#f3f1ea" strokeWidth="2.2">
          <circle cx="12.5" cy="16" r="5.5" />
          <circle cx="19.5" cy="16" r="5.5" opacity="0.75" />
        </svg>
      </span>
      {withWord ? <span className="text-[16px] font-medium tracking-tight text-bone">Connected</span> : null}
    </span>
  );
}
