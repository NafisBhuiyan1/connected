"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Globe, Loader2, Sparkles, Star, Wand2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import { play } from "@/lib/sfx";
import type { Level, Profile } from "@/lib/types";
import { useSession } from "./session";
import { useToast } from "./toast";
import { Button, cx, Modal } from "./ui";

type LinkKey = "linkedin" | "instagram" | "github" | "x" | "portfolio";

// Simple brand marks (inline SVG — no tracking scripts, no external widgets).
const BRAND: Record<LinkKey, { label: string; color: string; base?: string; path: string; placeholder: string }> = {
  linkedin: { label: "LinkedIn", color: "#0a66c2", base: "https://www.linkedin.com/in/", placeholder: "your-handle", path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" },
  instagram: { label: "Instagram", color: "#e1306c", base: "https://www.instagram.com/", placeholder: "yourname", path: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zm6.1-8.1a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 3.6c2.7 0 3 0 4.1.1 1 0 1.5.2 1.9.4.5.2.8.4 1.2.8.4.4.6.7.8 1.2.1.4.3.9.4 1.9 0 1 .1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.5-.4 1.9-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.1-.9.3-1.9.4-1 0-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.5-.2-1.9-.4-.5-.2-.8-.4-1.2-.8-.4-.4-.6-.7-.8-1.2-.1-.4-.3-.9-.4-1.9 0-1-.1-1.4-.1-4.1s0-3 .1-4.1c0-1 .2-1.5.4-1.9.2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.1.9-.3 1.9-.4 1 0 1.4-.1 4.1-.1M12 2c-2.7 0-3.1 0-4.1.1-1.1 0-1.8.2-2.4.5-.7.3-1.2.6-1.8 1.2-.6.6-.9 1.1-1.2 1.8-.3.6-.4 1.3-.5 2.4C2 8.9 2 9.3 2 12s0 3.1.1 4.1c0 1.1.2 1.8.5 2.4.3.7.6 1.2 1.2 1.8.6.6 1.1.9 1.8 1.2.6.3 1.3.4 2.4.5 1 0 1.4.1 4.1.1s3.1 0 4.1-.1c1.1 0 1.8-.2 2.4-.5.7-.3 1.2-.6 1.8-1.2.6-.6.9-1.1 1.2-1.8.3-.6.4-1.3.5-2.4 0-1 .1-1.4.1-4.1s0-3.1-.1-4.1c0-1.1-.2-1.8-.5-2.4-.3-.7-.6-1.2-1.2-1.8-.6-.6-1.1-.9-1.8-1.2-.6-.3-1.3-.4-2.4-.5C15.1 2 14.7 2 12 2z" },
  github: { label: "GitHub", color: "#181717", base: "https://github.com/", placeholder: "username", path: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" },
  x: { label: "X", color: "#000000", base: "https://x.com/", placeholder: "handle", path: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43z" },
  portfolio: { label: "Website", color: "#7c3aed", placeholder: "https://yoursite.com", path: "" },
};

function toUrl(key: LinkKey, raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const b = BRAND[key].base;
  return b ? `${b}${v.replace(/^@/, "").replace(/^\/+/, "")}` : `https://${v}`;
}

function handleOf(key: LinkKey, url?: string): string {
  if (!url) return "";
  const b = BRAND[key].base;
  return b && url.startsWith(b) ? url.slice(b.length).replace(/\/$/, "") : url;
}

export function BrandIcon({ k, className }: { k: LinkKey; className?: string }) {
  const b = BRAND[k];
  if (!b.path) return <Globe className={className} />;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d={b.path} />
    </svg>
  );
}

interface Suggestions {
  source: "github" | "text";
  skills: { skill: string; label: string; level: Level; evidence: string }[];
  interests: { id: string; label: string }[];
  repos?: { name: string; description: string | null; language: string | null; stars: number; url: string }[];
  profile?: { login: string; name: string | null; bio: string | null; publicRepos: number };
  headline?: string | null;
}

export function SocialConnect({ onSaved }: { onSaved?: () => void }) {
  const { me, refresh } = useSession();
  const toast = useToast();
  const [values, setValues] = useState<Record<LinkKey, string>>(() => ({
    linkedin: handleOf("linkedin", me?.links?.linkedin),
    instagram: handleOf("instagram", me?.links?.instagram),
    github: handleOf("github", me?.links?.github),
    x: handleOf("x", me?.links?.x),
    portfolio: me?.links?.portfolio ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState<"github" | "text" | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [sugg, setSugg] = useState<Suggestions | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  if (!me) return null;

  async function saveLinks() {
    setSaving(true);
    try {
      const links = Object.fromEntries((Object.keys(BRAND) as LinkKey[]).map((k) => [k, toUrl(k, values[k])]));
      await api("/api/me", { method: "PATCH", body: { links } });
      await refresh();
      play("success");
      toast({ tone: "success", title: "Accounts linked" });
      onSaved?.();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't save", body: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function runImport(source: "github" | "text") {
    setImporting(source);
    try {
      const res = await api<Suggestions>("/api/import", { body: source === "github" ? { source, username: values.github } : { source, text: pasted } });
      const have = new Set(me!.skills.map((s) => s.skill));
      setSugg(res);
      setPicked(new Set([...res.skills.filter((s) => !have.has(s.skill)).map((s) => `s:${s.skill}`), ...res.interests.filter((i) => !me!.interests.includes(i.id)).map((i) => `i:${i.id}`)]));
      setPasteOpen(false);
      play("pop");
    } catch (e) {
      toast({ tone: "error", title: "Import failed", body: (e as Error).message });
    } finally {
      setImporting(null);
    }
  }

  async function applyImport() {
    if (!sugg || !me) return;
    const skills = [...me.skills];
    for (const s of sugg.skills) {
      if (!picked.has(`s:${s.skill}`)) continue;
      const i = skills.findIndex((x) => x.skill === s.skill);
      if (i >= 0) skills[i] = { skill: s.skill, level: Math.max(skills[i].level, s.level) as Level };
      else skills.push({ skill: s.skill, level: s.level });
    }
    const interests = [...new Set([...me.interests, ...sugg.interests.filter((i) => picked.has(`i:${i.id}`)).map((i) => i.id)])].slice(0, 10);
    try {
      await api("/api/me", { method: "PATCH", body: { skills: skills.slice(0, 15), interests } });
      await refresh();
      play("success");
      toast({ tone: "success", title: `Added ${picked.size} to your profile`, body: "Your matches update instantly." });
      setSugg(null);
      onSaved?.();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't update profile", body: (e as Error).message });
    }
  }

  const toggle = (key: string) => setPicked((p) => {
    const n = new Set(p);
    if (n.has(key)) n.delete(key);
    else n.add(key);
    return n;
  });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-ink">Connected accounts</p>
          <p className="text-[13px] text-muted">Show your socials and import skills in one tap.</p>
        </div>
        <Button size="sm" onClick={saveLinks} loading={saving}>
          Save
        </Button>
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {(Object.keys(BRAND) as LinkKey[]).map((k) => (
          <label key={k} className="flex items-center gap-2.5 rounded-2xl border border-line bg-white p-2 pr-3 focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: k === "instagram" ? "linear-gradient(45deg,#f58529,#dd2a7b,#8134af)" : BRAND[k].color }}>
              <BrandIcon k={k} className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold tracking-wide text-faint uppercase">{BRAND[k].label}</span>
              <input
                value={values[k]}
                onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                placeholder={BRAND[k].placeholder}
                className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
              />
            </span>
            {values[k] ? <Check className="size-4 shrink-0 text-emerald-500" /> : null}
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="soft" onClick={() => runImport("github")} loading={importing === "github"} disabled={!values.github.trim()} icon={<BrandIcon k="github" className="size-3.5" />}>
          Import skills from GitHub
        </Button>
        <Button size="sm" variant="soft" onClick={() => setPasteOpen(true)} icon={<BrandIcon k="linkedin" className="size-3.5" />}>
          Paste from LinkedIn / résumé
        </Button>
      </div>
      <p className="mt-2 text-[11.5px] text-muted">GitHub uses only your public repos. LinkedIn import reads only text you paste — we never log in as you.</p>

      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Paste from LinkedIn">
        <p className="text-[13px] text-muted">Copy your About, Experience and Skills sections (or a résumé) and paste them here.</p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={9}
          className="mt-3 w-full rounded-2xl border border-line bg-canvas p-3 text-[13.5px] text-ink outline-none focus:border-brand-300 focus:bg-white"
          placeholder="Software Engineering Intern at …&#10;Built a React + Node app …&#10;Skills: Python, Figma, SQL …"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={() => runImport("text")} loading={importing === "text"} disabled={pasted.trim().length < 20} icon={<Wand2 className="size-4" />}>
            Find my skills
          </Button>
        </div>
      </Modal>

      <AnimatePresence>
        {sugg ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-brand-800">
              <Sparkles className="size-4" /> {sugg.source === "github" ? `Found in @${sugg.profile?.login} (${sugg.profile?.publicRepos} repos)` : "Found in your text"}
            </p>
            {sugg.repos?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sugg.repos.map((r) => (
                  <a key={r.name} href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] text-ink-2 hover:text-brand-700">
                    {r.name} {r.language ? <span className="text-faint">· {r.language}</span> : null}
                    {r.stars ? (
                      <span className="inline-flex items-center text-amber-600">
                        <Star className="size-3 fill-amber-400" />
                        {r.stars}
                      </span>
                    ) : null}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sugg.skills.map((s) => (
                <button key={s.skill} onClick={() => toggle(`s:${s.skill}`)} title={s.evidence} className={cx("rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors", picked.has(`s:${s.skill}`) ? "border-brand-500 bg-brand-600 text-white" : "border-line bg-white text-ink-2")}>
                  {s.label} <span className="opacity-70">· {["", "Familiar", "Proficient", "Expert"][s.level]}</span>
                </button>
              ))}
              {sugg.interests.map((i) => (
                <button key={i.id} onClick={() => toggle(`i:${i.id}`)} className={cx("rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors", picked.has(`i:${i.id}`) ? "border-fuchsia-500 bg-fuchsia-600 text-white" : "border-line bg-white text-ink-2")}>
                  #{i.label}
                </button>
              ))}
              {!sugg.skills.length && !sugg.interests.length ? <span className="text-[13px] text-muted">Nothing recognizable found.</span> : null}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSugg(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={applyImport} disabled={!picked.size}>
                Add {picked.size} to profile
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {importing ? (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-muted">
          <Loader2 className="size-3.5 animate-spin" /> Reading {importing === "github" ? "GitHub" : "your text"}…
        </div>
      ) : null}
    </div>
  );
}

export type { LinkKey };
export function linkEntries(links: Profile["links"]): { key: LinkKey; url: string }[] {
  if (!links) return [];
  return (Object.keys(BRAND) as LinkKey[]).filter((k) => links[k]).map((k) => ({ key: k, url: links[k]! }));
}
