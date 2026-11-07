"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "./ui";

const GOAL = "I want to build an AI startup but need a developer and a designer.";
const ROLES = [
  { label: "Backend", who: "Alex R.", hue: 0, cov: 97 },
  { label: "Design", who: "Maya C.", hue: 47, cov: 99 },
  { label: "AI/ML", who: "Priya R.", hue: 141, cov: 98 },
  { label: "Business", who: "You", hue: 230, cov: 95 },
];

/** Looping product teaser: goal → roles → optimized team. Purely illustrative (demo personas). */
export function HeroVisual() {
  const [stage, setStage] = useState(0);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const run = () => {
      setStage(0);
      setTyped("");
      i = 0;
      const type = () => {
        i++;
        setTyped(GOAL.slice(0, i));
        if (i < GOAL.length) t = setTimeout(type, 28);
        else t = setTimeout(() => {
          setStage(1);
          t = setTimeout(() => {
            setStage(2);
            t = setTimeout(run, 5200);
          }, 1300);
        }, 450);
      };
      t = setTimeout(type, 500);
    };
    run();
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-brand-200/50 via-violet-200/40 to-transparent blur-2xl" />
      <div className="card overflow-hidden p-0 shadow-[var(--shadow-pop)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-canvas/70 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-rose-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11.5px] font-medium text-muted">Team Builder · CrownHacks 2026</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">What do you want to build?</p>
            <p className="min-h-[44px] text-[14.5px] leading-snug text-ink">
              {typed}
              {stage === 0 ? <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-brand-600" /> : null}
            </p>
          </div>
          <AnimatePresence mode="wait">
            {stage === 1 ? (
              <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[13px] text-brand-700">
                <Wand2 className="size-4 animate-pulse" /> Decomposing into roles · searching 33 opted-in people · optimizing…
              </motion.div>
            ) : null}
            {stage === 2 ? (
              <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                    <Sparkles className="size-3.5 text-violet-500" /> Best team found
                  </span>
                  <span className="text-muted">exact search · 3,683 teams checked</span>
                </div>
                {ROLES.map((r, i) => (
                  <motion.div
                    key={r.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2"
                  >
                    <Avatar name={r.who} hue={r.hue} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="font-medium text-ink">
                          {r.who} <span className="font-normal text-muted">· {r.label}</span>
                        </span>
                        <span className="tabular-nums text-muted">{r.cov}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                        <motion.div className="brand-gradient h-full" initial={{ width: 0 }} animate={{ width: `${r.cov}%` }} transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }} />
                      </div>
                    </div>
                    <Check className="size-4 text-emerald-500" />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <p className="mt-3 text-center text-[11.5px] text-faint">Illustration with fictional demo personas.</p>
    </div>
  );
}
