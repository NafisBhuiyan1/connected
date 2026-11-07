"use client";

import { AnimatePresence, motion } from "motion/react";
import { Copy, Download, Eye, EyeOff, Globe, LogOut, Plus, QrCode, Save, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { ProfileCover } from "@/components/people";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, Chip, cx, DemoTag, Field, Input, SectionTitle, Select, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/client";
import { COLLAB_LABELS, INTERESTS, LEVEL_LABEL, ROLES, SKILL_BY_ID, SKILLS } from "@/lib/ontology";
import type { Availability, CollabType, Level, PersonRole, Profile, UserSkill, Visibility } from "@/lib/types";

interface Draft {
  name: string;
  pronouns: string;
  headline: string;
  role: PersonRole;
  university: string;
  major: string;
  gradYear: string;
  bio: string;
  skills: UserSkill[];
  interests: string[];
  gives: string[];
  ask: string;
  lookingFor: string[];
  openTo: CollabType[];
  introsOffered: string[];
  availability: Availability;
  area: string;
  visibility: Visibility;
  allowRequests: boolean;
  github: string;
  linkedin: string;
  portfolio: string;
}

const ROLE_OPTIONS: { value: PersonRole; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "professional", label: "Professional" },
  { value: "founder", label: "Founder" },
  { value: "mentor", label: "Mentor" },
  { value: "researcher", label: "Researcher" },
  { value: "organizer", label: "Organizer" },
];

const VISIBILITY: { value: Visibility; label: string; body: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "everyone", label: "Everyone", body: "Anyone signed in can find you.", icon: Globe },
  { value: "events", label: "My events only", body: "Only people at your opted-in events.", icon: Users },
  { value: "hidden", label: "Hidden", body: "Only connections and teammates.", icon: EyeOff },
];

function toDraft(p: Profile): Draft {
  return {
    name: p.name,
    pronouns: p.pronouns ?? "",
    headline: p.headline,
    role: p.role,
    university: p.university ?? "",
    major: p.major ?? "",
    gradYear: p.gradYear ? String(p.gradYear) : "",
    bio: p.bio,
    skills: p.skills,
    interests: p.interests,
    gives: p.gives,
    ask: p.ask,
    lookingFor: p.lookingFor,
    openTo: p.openTo,
    introsOffered: p.introsOffered,
    availability: p.availability,
    area: p.area,
    visibility: p.visibility,
    allowRequests: p.allowRequests,
    github: p.links?.github ?? "",
    linkedin: p.links?.linkedin ?? "",
    portfolio: p.links?.portfolio ?? "",
  };
}

function toPatch(d: Draft) {
  const year = Number.parseInt(d.gradYear, 10);
  return {
    name: d.name.trim(),
    pronouns: d.pronouns.trim() || undefined,
    headline: d.headline.trim(),
    role: d.role,
    university: d.university.trim() || undefined,
    major: d.major.trim() || undefined,
    gradYear: Number.isFinite(year) ? year : undefined,
    bio: d.bio.trim(),
    skills: d.skills,
    interests: d.interests,
    gives: d.gives.map((g) => g.trim()).filter((g) => g.length >= 3),
    ask: d.ask.trim(),
    lookingFor: d.lookingFor,
    openTo: d.openTo,
    introsOffered: d.introsOffered,
    availability: d.availability,
    area: d.area.trim(),
    visibility: d.visibility,
    allowRequests: d.allowRequests,
    links: { github: d.github.trim(), linkedin: d.linkedin.trim(), portfolio: d.portfolio.trim() },
  };
}

const toggleIn = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function ProfilePage() {
  const { me, refresh } = useSession();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (me) setDraft(toDraft(me));
  }, [me]);

  const dirty = useMemo(() => (me && draft ? JSON.stringify(toDraft(me)) !== JSON.stringify(draft) : false), [me, draft]);

  if (!me || !draft) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErr(null);
    try {
      await api("/api/me", { method: "PATCH", body: toPatch(draft) });
      await refresh();
      toast({ tone: "success", title: "Profile saved", body: "Your matches update right away." });
    } catch (e) {
      setErr((e as Error).message);
      toast({ tone: "error", title: "Couldn't save profile", body: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await api("/api/session", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div>
      <Card className="mb-5 overflow-hidden">
        <ProfileCover hue={me.avatarHue} />
        <div className="relative px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
            <span className="rounded-full ring-4 ring-surface">
              <Avatar name={draft.name || me.name} hue={me.avatarHue} size={104} />
            </span>
            <div className="mb-1 flex gap-2">
              <a href={`/people/${me.id}`} className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-medium text-ink-2 hover:border-line-2">
                <Eye className="size-4" /> <span className="hidden sm:inline">View as others</span>
              </a>
              <Button variant="secondary" size="sm" onClick={signOut} icon={<LogOut className="size-4" />} className="h-9">
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[26px] leading-tight font-semibold tracking-tight text-ink">{draft.name || "Your name"}</h1>
              {me.isDemo ? <DemoTag /> : null}
            </div>
            <p className="truncate text-[15px] text-ink-2">{draft.headline || "Add a headline"}</p>
            <p className="mt-1 text-[12.5px] text-muted">Matches only quote what you write here.</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          {/* Basics */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Basics" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="p-name">
                <Input id="p-name" value={draft.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />
              </Field>
              <Field label="Pronouns (optional)" htmlFor="p-pronouns">
                <Input id="p-pronouns" value={draft.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="she/her, they/them…" maxLength={20} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Headline" htmlFor="p-headline">
                  <Input id="p-headline" value={draft.headline} onChange={(e) => set("headline", e.target.value)} maxLength={90} />
                </Field>
              </div>
              <Field label="I am a" htmlFor="p-role">
                <Select id="p-role" value={draft.role} onChange={(e) => set("role", e.target.value as PersonRole)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Grad year (optional)" htmlFor="p-year">
                <Input id="p-year" inputMode="numeric" value={draft.gradYear} onChange={(e) => set("gradYear", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} placeholder="2027" />
              </Field>
              <Field label="School or organization" htmlFor="p-uni">
                <Input id="p-uni" value={draft.university} onChange={(e) => set("university", e.target.value)} maxLength={80} />
              </Field>
              <Field label="Major or field" htmlFor="p-major">
                <Input id="p-major" value={draft.major} onChange={(e) => set("major", e.target.value)} maxLength={80} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="General area" htmlFor="p-area" hint="General area only — never precise.">
                  <Input id="p-area" value={draft.area} onChange={(e) => set("area", e.target.value)} placeholder="UNC Charlotte area" maxLength={80} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Bio" htmlFor="p-bio" hint={`${draft.bio.length}/600`}>
                  <Textarea id="p-bio" value={draft.bio} onChange={(e) => set("bio", e.target.value)} maxLength={600} placeholder="A project you're proud of, what you're building next…" />
                </Field>
              </div>
            </div>
          </Card>

          {/* Skills */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Skills" sub="Teams form around these" />
            <SkillsEditor skills={draft.skills} onChange={(s) => set("skills", s)} />
          </Card>

          {/* Interests */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Interests" sub={`${draft.interests.length}/10`} />
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i.id}
                  selected={draft.interests.includes(i.id)}
                  onClick={() => {
                    if (!draft.interests.includes(i.id) && draft.interests.length >= 10) return;
                    set("interests", toggleIn(draft.interests, i.id));
                  }}
                >
                  {i.label}
                </Chip>
              ))}
            </div>
          </Card>

          {/* Gives & Asks */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Gives & asks" sub="What you offer and need" />
            <GivesEditor gives={draft.gives} onChange={(g) => set("gives", g)} />
            <div className="mt-5">
              <Field label="What do you need right now?" htmlFor="p-ask">
                <Textarea id="p-ask" value={draft.ask} onChange={(e) => set("ask", e.target.value)} maxLength={300} className="min-h-20" placeholder="e.g. I want to build an AI startup but need a developer and a designer." />
              </Field>
            </div>
          </Card>

          {/* Looking for & open to */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Who I want to meet" />
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Chip
                  key={r.id}
                  selected={draft.lookingFor.includes(r.id)}
                  onClick={() => {
                    if (!draft.lookingFor.includes(r.id) && draft.lookingFor.length >= 6) return;
                    set("lookingFor", toggleIn(draft.lookingFor, r.id));
                  }}
                >
                  {r.label}
                </Chip>
              ))}
            </div>
            <div className="mt-6">
              <SectionTitle title="Open to" />
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLLAB_LABELS) as CollabType[]).map((k) => (
                  <Chip key={k} selected={draft.openTo.includes(k)} onClick={() => set("openTo", toggleIn(draft.openTo, k))}>
                    {COLLAB_LABELS[k]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-6">
              <SectionTitle title="Intros I'd consider" sub="Never a promise" />
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => (
                  <Chip
                    key={i.id}
                    selected={draft.introsOffered.includes(i.id)}
                    onClick={() => {
                      if (!draft.introsOffered.includes(i.id) && draft.introsOffered.length >= 5) return;
                      set("introsOffered", toggleIn(draft.introsOffered, i.id));
                    }}
                  >
                    {i.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-6 max-w-xs">
              <Field label="Availability" htmlFor="p-avail">
                <Select id="p-avail" value={draft.availability} onChange={(e) => set("availability", e.target.value as Availability)}>
                  <option value="high">High — happy to meet this week</option>
                  <option value="medium">Medium — a few chats</option>
                  <option value="low">Low — only very relevant asks</option>
                </Select>
              </Field>
            </div>
          </Card>

          {/* Links */}
          <Card className="p-5 sm:p-6">
            <SectionTitle title="Links" sub="Optional" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="GitHub" htmlFor="p-gh">
                <Input id="p-gh" value={draft.github} onChange={(e) => set("github", e.target.value)} placeholder="https://github.com/…" />
              </Field>
              <Field label="LinkedIn" htmlFor="p-li">
                <Input id="p-li" value={draft.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="https://linkedin.com/in/…" />
              </Field>
              <Field label="Portfolio" htmlFor="p-pf">
                <Input id="p-pf" value={draft.portfolio} onChange={(e) => set("portfolio", e.target.value)} placeholder="https://…" />
              </Field>
            </div>
          </Card>

          {/* Privacy */}
          <Card className="p-5 sm:p-6">
            <SectionTitle
              title={
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-brand-600" /> Privacy
                </span>
              }
              sub="No GPS — only zones you pick"
            />
            <div className="grid gap-2">
              {VISIBILITY.map((v) => {
                const on = draft.visibility === v.value;
                const Icon = v.icon;
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => set("visibility", v.value)}
                    aria-pressed={on}
                    className={cx(
                      "focus-ring flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                      on ? "border-brand-300 bg-brand-50/60" : "border-line bg-surface hover:border-line-2",
                    )}
                  >
                    <span className={cx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl", on ? "bg-brand-600 text-white" : "bg-canvas text-muted")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-ink">{v.label}</span>
                      <span className="mt-0.5 block text-[12.5px] text-muted">{v.body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 border-t border-line pt-5">
              <Toggle
                checked={draft.allowRequests}
                onChange={(v) => set("allowRequests", v)}
                label="Accept connection requests"
                sub="Quiet interest still works when off."
              />
            </div>
          </Card>

          {err ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{err}</p> : null}
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <QrCard id={me.id} name={me.name} visibility={draft.visibility} />
          <Card className="p-4">
            <p className="text-[13.5px] font-semibold text-ink">Top skills</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {draft.skills
                .slice()
                .sort((a, b) => b.level - a.level)
                .slice(0, 5)
                .map((s) => (
                  <Badge key={s.skill} tone={s.level === 3 ? "brand" : "neutral"}>
                    {SKILL_BY_ID[s.skill]?.label ?? s.skill}
                  </Badge>
                ))}
            </div>
            {draft.gives.length ? <p className="mt-3 text-[12.5px] text-ink-2">Helps with: {draft.gives.join(" · ")}</p> : null}
            <a href={`/people/${me.id}`} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-700 hover:underline">
              <Eye className="size-3.5" /> Open my profile page
            </a>
          </Card>
        </div>
      </div>

      {/* Sticky save bar */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6"
          >
            <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-pop)] backdrop-blur">
              <span className="pl-1 text-[13px] text-ink-2">Unsaved changes</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDraft(toDraft(me))}>
                  Discard
                </Button>
                <Button size="sm" onClick={save} loading={saving} icon={<Save className="size-3.5" />}>
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SkillsEditor({ skills, onChange }: { skills: UserSkill[]; onChange: (s: UserSkill[]) => void }) {
  const [q, setQ] = useState("");
  const have = new Set(skills.map((s) => s.skill));
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return SKILLS.filter((s) => !have.has(s.id) && (!t || s.label.toLowerCase().includes(t) || s.aliases.some((a) => a.includes(t)))).slice(0, t ? 10 : 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, skills]);
  const full = skills.length >= 15;

  return (
    <div>
      {skills.length ? (
        <ul className="mb-4 divide-y divide-line rounded-2xl border border-line">
          {skills.map((s) => (
            <li key={s.skill} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <span className="text-[14px] font-medium text-ink">{SKILL_BY_ID[s.skill]?.label ?? s.skill}</span>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-line bg-canvas p-0.5" role="radiogroup" aria-label={`Level for ${SKILL_BY_ID[s.skill]?.label}`}>
                  {([1, 2, 3] as Level[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      role="radio"
                      aria-checked={s.level === lvl}
                      onClick={() => onChange(skills.map((x) => (x.skill === s.skill ? { ...x, level: lvl } : x)))}
                      className={cx(
                        "focus-ring cursor-pointer rounded-lg px-2 py-1 text-[12px] font-medium transition-colors",
                        s.level === lvl ? "bg-surface text-brand-700 shadow-sm" : "text-muted hover:text-ink",
                      )}
                    >
                      {LEVEL_LABEL[lvl]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${SKILL_BY_ID[s.skill]?.label}`}
                  onClick={() => onChange(skills.filter((x) => x.skill !== s.skill))}
                  className="focus-ring rounded-lg p-1.5 text-faint hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 rounded-2xl border border-dashed border-line-2 px-4 py-5 text-center text-[13px] text-muted">No skills yet. Add a few.</p>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={full ? "15 skills max — remove one to add more" : "Search skills: React, Figma, finance…"} className="pl-9" disabled={full} />
      </div>
      {!full ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange([...skills, { skill: s.id, level: 2 }]);
                setQ("");
              }}
              className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-brand-200 hover:text-brand-700"
            >
              <Plus className="size-3" /> {s.label}
            </button>
          ))}
          {!results.length ? <span className="text-[12.5px] text-muted">No matching skills.</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function GivesEditor({ gives, onChange }: { gives: string[]; onChange: (g: string[]) => void }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (t.length < 3 || gives.length >= 5 || gives.includes(t)) return;
    onChange([...gives, t.slice(0, 100)]);
    setV("");
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-ink-2">I can help with (15 min)</p>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {gives.map((g) => (
          <span key={g} className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 py-1 pr-1.5 pl-3 text-[13px] text-brand-800">
            {g}
            <button type="button" aria-label={`Remove ${g}`} onClick={() => onChange(gives.filter((x) => x !== g))} className="rounded-full p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {!gives.length ? <span className="text-[12.5px] text-muted">e.g. “Portfolio feedback”</span> : null}
      </div>
      {gives.length < 5 ? (
        <div className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Add something you can help with…"
            maxLength={100}
          />
          <Button variant="secondary" onClick={add} disabled={v.trim().length < 3} icon={<Plus className="size-4" />}>
            Add
          </Button>
        </div>
      ) : (
        <p className="text-[12px] text-muted">5 max.</p>
      )}
    </div>
  );
}

function QrCard({ id, name, visibility }: { id: string; name: string; visibility: Visibility }) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const link = `${window.location.origin}/p/${id}`;
    setUrl(link);
    let cancelled = false;
    QRCode.toDataURL(link, { width: 560, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0d1021", light: "#ffffff" } })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Link copied" });
    } catch {
      toast({ tone: "error", title: "Couldn't copy", body: url });
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="brand-gradient flex items-center gap-2 px-4 py-3 text-white">
        <QrCode className="size-4" />
        <p className="text-[13.5px] font-semibold">Your QR</p>
      </div>
      <div className="p-4">
        <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border border-line bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR code linking to ${name}'s Connected card`} className="size-full" />
          ) : (
            <div className="skeleton size-full" />
          )}
        </div>
        <p className="mt-3 text-center text-[12.5px] text-muted">Scan to open your card.</p>
        {visibility !== "everyone" ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-800">Shows as private to signed-out viewers.</p>
        ) : null}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={copy} icon={<Copy className="size-3.5" />}>
            Copy link
          </Button>
          {dataUrl ? (
            <a
              href={dataUrl}
              download={`connected-${name.replace(/\s+/g, "-").toLowerCase()}.png`}
              className="focus-ring inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-canvas"
            >
              <Download className="size-3.5" /> Save
            </a>
          ) : null}
        </div>
        <p className="mt-2 truncate text-center font-mono text-[11px] text-faint">{url}</p>
      </div>
    </Card>
  );
}
