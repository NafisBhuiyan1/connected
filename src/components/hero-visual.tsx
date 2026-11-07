"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

const GOAL = "AI startup — need a developer and a designer.";
const ROLES = [
  { label: "Backend", who: "Alex R.", hue: 250, cov: 97 },
  { label: "Design", who: "Maya C.", hue: 290, cov: 99 },
  { label: "AI/ML", who: "Priya R.", hue: 210, cov: 98 },
  { label: "Business", who: "You", hue: 330, cov: 95 },
];

function Dot({ name, hue }: { name: string; hue: number }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold text-white ring-1 ring-white/20"
      style={{ background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 40) % 360} 75% 45%))` }}
    >
      {initials}
    </span>
  );
}

/** Looping product teaser on dark glass: goal → roles → optimized team. Demo personas only. */
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
        if (i < GOAL.length) t = setTimeout(type, 34);
        else
          t = setTimeout(() => {
            setStage(1);
            t = setTimeout(() => {
              setStage(2);
              t = setTimeout(run, 5600);
            }, 1300);
          }, 450);
      };
      t = setTimeout(type, 500);
    };
    run();
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[480px]">
      <div className="absolute -inset-10 -z-10 rounded-[48px] bg-[radial-gradient(closest-side,rgba(99,96,240,0.35),transparent)] blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_-40px_rgba(99,96,240,0.6)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="size-2 rounded-full bg-white/20" />
          <span className="ml-3 text-[11px] tracking-wide text-bone/50 uppercase">Team Builder</span>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-3.5">
            <p className="min-h-[40px] text-[15px] leading-snug text-bone">
              {typed}
              {stage === 0 ? <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-bone" /> : null}
            </p>
          </div>
          <div className="min-h-[196px]">
            <AnimatePresence mode="wait">
              {stage === 1 ? (
                <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2 text-[13px] text-bone/70">
                  <Wand2 className="size-4 animate-pulse text-violet-300" /> Finding roles · searching the room…
                </motion.div>
              ) : null}
              {stage === 2 ? (
                <motion.div key="team" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-bone">
                      <Sparkles className="size-3.5 text-violet-300" /> Best team
                    </span>
                    <span className="text-bone/45">3,683 teams checked</span>
                  </div>
                  {ROLES.map((r, i) => (
                    <motion.div
                      key={r.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2"
                    >
                      <Dot name={r.who} hue={r.hue} />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between text-[12.5px]">
                          <span className="text-bone">
                            {r.who} <span className="text-bone/45">· {r.label}</span>
                          </span>
                          <span className="tabular-nums text-bone/50">{r.cov}%</span>
                        </div>
                        <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-brand-400 via-violet-400 to-pink-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${r.cov}%` }}
                            transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }}
                          />
                        </div>
                      </div>
                      <Check className="size-3.5 text-emerald-300" />
                    </motion.div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-bone/35">Illustration · fictional demo personas</p>
    </div>
  );
}
