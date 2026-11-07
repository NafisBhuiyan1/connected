"use client";

import { motion } from "motion/react";
import { Check, MapPinned, Sparkles, Zap } from "lucide-react";

const face = (id: string) => `/avatars/${id}.jpg`;

/** Phone mockup of the Nearby map: light purple streets, event towers, face bubbles popping in. */
export function PhoneMock() {
  const pins = [
    { id: "u_maya", x: "22%", y: "30%", s: 97 },
    { id: "u_alex", x: "62%", y: "24%", s: 92 },
    { id: "u_jordan", x: "70%", y: "52%", s: 78 },
    { id: "u_priya", x: "30%", y: "58%", s: 73 },
    { id: "u_leila", x: "48%", y: "40%", s: 81 },
  ];
  return (
    <div className="relative mx-auto w-[300px] sm:w-[330px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-brand-300/40 blur-3xl" />
      <div className="rounded-[46px] border-[10px] border-ink bg-ink shadow-[0_40px_80px_-30px_rgba(76,29,149,0.6)]">
        <div className="relative h-[600px] overflow-hidden rounded-[36px] bg-[#f7f5fe]">
          {/* streets */}
          <svg className="absolute inset-0 size-full" viewBox="0 0 300 600" preserveAspectRatio="none">
            <rect width="300" height="600" fill="#f4f1fd" />
            <path d="M-20 140 L320 210" stroke="#d9cdfb" strokeWidth="16" />
            <path d="M60 -20 L120 620" stroke="#ffffff" strokeWidth="12" />
            <path d="M-20 420 L320 360" stroke="#b69cf7" strokeWidth="10" />
            <path d="M230 -20 L200 620" stroke="#ffffff" strokeWidth="10" />
            <rect x="140" y="230" width="60" height="40" rx="6" fill="#e3d9fd" />
            <rect x="30" y="300" width="50" height="70" rx="6" fill="#e3d9fd" />
            <rect x="215" y="420" width="55" height="45" rx="6" fill="#dcf3e4" />
          </svg>
          {/* status bar + search */}
          <div className="absolute inset-x-3 top-3 flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 text-[11px] shadow-sm">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <b className="text-ink">CrownHacks 2026</b>
            <span className="ml-auto text-muted">31 here</span>
          </div>
          {/* event tower */}
          <motion.div className="absolute" style={{ left: "42%", top: "62%" }} animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <div className="flex size-11 rotate-45 items-center justify-center rounded-xl border-2 border-white bg-emerald-500 shadow-lg">
              <Zap className="size-5 -rotate-45 text-white" />
            </div>
          </motion.div>
          {/* face pins */}
          {pins.map((p, i) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{ left: p.x, top: p.y }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.18, type: "spring", stiffness: 260, damping: 14 }}
            >
              <div className={`relative rounded-full p-[3px] shadow-lg ${p.s >= 80 ? "bg-brand-600" : "bg-white"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={face(p.id)} alt="" className="size-11 rounded-full object-cover" />
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-brand-100 bg-white px-1.5 text-[9px] font-bold text-brand-700">{p.s}</span>
              </div>
            </motion.div>
          ))}
          {/* bottom card */}
          <motion.div
            className="absolute inset-x-3 bottom-3 rounded-3xl bg-white p-3 shadow-[0_16px_40px_-16px_rgba(76,29,149,0.5)]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.4, type: "spring" }}
          >
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={face("u_maya")} alt="" className="size-10 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink">Maya Chen</p>
                <p className="truncate text-[11px] text-muted">Product designer · near the mixer</p>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">97%</span>
            </div>
            <div className="mt-2.5 flex gap-2">
              <span className="flex h-8 flex-1 items-center justify-center rounded-xl bg-canvas text-[11.5px] font-medium text-ink-2">Profile</span>
              <span className="flex h-8 flex-1 items-center justify-center rounded-xl bg-brand-600 text-[11.5px] font-semibold text-white">Connect</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** Mini team-builder result card. */
export function TeamMock() {
  const rows = [
    { id: "u_alex", name: "Alex", role: "Backend", c: 100 },
    { id: "u_maya", name: "Maya", role: "Design", c: 99 },
    { id: "u_jordan", name: "Jordan", role: "Frontend", c: 100 },
  ];
  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-[0_20px_40px_-24px_rgba(76,29,149,0.45)]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold text-brand-700">Best team · exact search</p>
        <p className="text-[20px] font-bold text-ink">99%</p>
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={face(r.id)} alt="" className="size-8 rounded-full object-cover" />
            <div className="flex-1">
              <div className="flex justify-between text-[12px]">
                <b className="text-ink">{r.name}</b>
                <span className="text-muted">{r.role}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-50">
                <motion.div className="h-full rounded-full bg-brand-600" initial={{ width: 0 }} whileInView={{ width: `${r.c}%` }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12, duration: 0.7 }} />
              </div>
            </div>
            <Check className="size-4 text-emerald-500" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Mini explainable match card. */
export function MatchMock() {
  return (
    <div className="rounded-3xl border border-line bg-white p-4 shadow-[0_20px_40px_-24px_rgba(76,29,149,0.45)]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={face("u_priya")} alt="" className="size-11 rounded-full object-cover" />
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-ink">Priya Raman</p>
          <p className="text-[11.5px] text-muted">LLM apps & agents</p>
        </div>
        <span className="flex size-11 items-center justify-center rounded-full border-4 border-brand-500 text-[12px] font-bold text-ink">88</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-[12px] text-ink-2">
        <li className="flex gap-1.5">
          <Zap className="mt-0.5 size-3.5 shrink-0 text-brand-500" /> LLM apps (expert) — covers the AI role you need
        </li>
        <li className="flex gap-1.5">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-500" /> You both care about AI and startups
        </li>
        <li className="flex gap-1.5">
          <MapPinned className="mt-0.5 size-3.5 shrink-0 text-brand-500" /> Checked in at CrownHacks · near the main hall
        </li>
      </ul>
    </div>
  );
}

export function FaceStack({ ids, size = 36 }: { ids: string[]; size?: number }) {
  return (
    <div className="flex -space-x-3">
      {ids.map((id, i) => (
        <motion.img
          key={id}
          src={face(id)}
          alt=""
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.06 }}
          className="rounded-full object-cover ring-4 ring-white"
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
