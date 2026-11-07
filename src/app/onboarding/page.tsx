"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Lock, MapPin, Sparkles, UserRoundPlus, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaceStack } from "@/components/landing-visuals";
import { Logo } from "@/components/shell";
import { ChipSet, ListEditor, SkillPicker } from "@/components/pickers";
import { cx, Field, Input, Select, Textarea, Toggle } from "@/components/ui";
import { api, ClientError } from "@/lib/client";
import { CROWNHACKS_ID, CROWNHACKS_ZONE_OPTIONS, SAMPLE_PROFILE } from "@/lib/constants";
import { COLLAB_LABELS, INTERESTS, ROLES } from "@/lib/ontology";
import type { CollabType, PersonRole, UserSkill, Visibility } from "@/lib/types";

const STEPS = ["Account", "Skills", "Goals", "Privacy"];

const ASK_EXAMPLES = [
  "Build an AI startup — need a developer and a designer.",
  "Join a hackathon team as the backend engineer.",
  "Advice on my first banking internship.",
  "A mentor to review my design portfolio.",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Form {
  name: string;
  pronouns: string;
  email: string;
  password: string;
  headline: string;
  role: PersonRole;
  university: string;
  major: string;
  bio: string;
  skills: UserSkill[];
  interests: string[];
  gives: string[];
  ask: string;
  lookingFor: string[];
  openTo: CollabType[];
  joinEvent: boolean;
  zone: string;
  visibility: Visibility;
  allowRequests: boolean;
}

const BLANK: Form = {
  name: "",
  pronouns: "",
  email: "",
  password: "",
  headline: "",
  role: "student",
  university: "UNC Charlotte",
  major: "",
  bio: "",
  skills: [],
  interests: [],
  gives: [],
  ask: "",
  lookingFor: [],
  openTo: ["hackathon-team"],
  joinEvent: true,
  zone: "z_mixer",
  visibility: "everyone",
  allowRequests: true,
};

const glass = "rounded-3xl border border-line bg-white p-6 shadow-[0_30px_80px_-40px_rgba(76,29,149,0.35)] sm:p-8";
const boneBtn =
  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-[15px] font-semibold text-white shadow-[0_12px_26px_-12px_rgba(124,58,237,0.7)] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [f, setF] = useState<Form>(BLANK);
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<{ msg: string; dup?: boolean } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    api<{ me: unknown }>("/api/session")
      .then((s) => {
        if (s.me) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  const useSample = () => {
    setF((x) => ({
      ...x,
      ...SAMPLE_PROFILE,
      skills: [...SAMPLE_PROFILE.skills],
      interests: [...SAMPLE_PROFILE.interests],
      gives: [...SAMPLE_PROFILE.gives],
      lookingFor: [...SAMPLE_PROFILE.lookingFor],
      openTo: [...SAMPLE_PROFILE.openTo],
    }));
    setStep(0);
  };

  const emailOk = EMAIL_RE.test(f.email.trim());
  const pwOk = f.password.length >= 8;
  const valid = [f.name.trim().length >= 2 && f.headline.trim().length >= 3 && emailOk && pwOk, f.skills.length > 0 && f.interests.length > 0, true, true];
  const hasGoal = f.ask.trim().length > 10;

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      await api("/api/session", {
        body: {
          name: f.name,
          pronouns: f.pronouns || undefined,
          email: f.email.trim(),
          password: f.password,
          headline: f.headline,
          role: f.role,
          university: f.university || undefined,
          major: f.major || undefined,
          bio: f.bio,
          skills: f.skills,
          interests: f.interests,
          gives: f.gives,
          ask: f.ask,
          lookingFor: f.lookingFor,
          openTo: f.openTo,
          visibility: f.visibility,
          allowRequests: f.allowRequests,
          joinEventId: f.joinEvent ? CROWNHACKS_ID : undefined,
          zone: f.joinEvent ? f.zone : undefined,
        },
      });
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && /^[a-z0-9_]+$/i.test(ref)) {
        router.push(`/people/${ref}`);
        return;
      }
      const next = hasGoal ? `/build?pitch=${encodeURIComponent(f.ask)}${f.joinEvent ? `&event=${CROWNHACKS_ID}` : ""}&auto=1` : "/home";
      router.push(next);
    } catch (e) {
      const dup = e instanceof ClientError && e.status === 409;
      setErr({ msg: (e as Error).message, dup });
      if (dup) setStep(0);
      setSaving(false);
    }
  }

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-canvas font-sans text-ink">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_50%_at_50%_0%,#ede9fe_0%,transparent_70%)]" />

      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 sm:px-6">
        <Link href="/" aria-label="Connected home">
          <Logo />
        </Link>
        {step >= 0 ? (
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-brand-700 shadow-sm">
            {step + 1} / {STEPS.length}
          </span>
        ) : (
          <Link href="/login" className="text-[14px] font-medium text-ink-2 hover:text-ink">
            Log in
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 sm:px-6">
        {step >= 0 ? (
          <div className="mt-2 mb-8 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={cx("h-1 rounded-full transition-colors duration-500", i <= step ? "bg-brand-600" : "bg-brand-100")} />
                <p className={cx("mt-2 hidden text-[11.5px] font-medium tracking-wide uppercase sm:block", i === step ? "text-brand-700" : "text-faint")}>{s}</p>
              </div>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            {step === -1 ? (
              <div className="pt-8 text-center sm:pt-14">
                <div className="flex justify-center">
                  <FaceStack ids={["u_maya", "u_alex", "u_priya", "u_jordan", "u_leila", "u_sam", "u_zoe"]} size={44} />
                </div>
                <h1 className="mt-6 font-serif text-[clamp(44px,8vw,80px)] leading-[0.95] tracking-tight">
                  Let&apos;s find <span className="italic text-brand-600">your people.</span>
                </h1>
                <p className="mx-auto mt-5 max-w-md text-[16px] text-muted">One minute. You control who sees you.</p>
                <div className="mx-auto mt-10 grid max-w-xl gap-3 sm:grid-cols-2">
                  <button onClick={useSample} className="group rounded-3xl bg-brand-600 p-6 text-left text-white shadow-[0_20px_40px_-20px_rgba(124,58,237,0.8)] transition hover:-translate-y-0.5 hover:bg-brand-700">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-white/15">
                      <Sparkles className="size-5" />
                    </span>
                    <p className="mt-4 text-[16px] font-semibold">Quick start</p>
                    <p className="mt-1 text-[13.5px] text-white/75">Sample profile — add your name, edit anything.</p>
                  </button>
                  <button onClick={() => setStep(0)} className="group rounded-3xl border border-line bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50/50">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                      <UserRoundPlus className="size-5" />
                    </span>
                    <p className="mt-4 text-[16px] font-semibold text-ink">From scratch</p>
                    <p className="mt-1 text-[13.5px] text-muted">Your skills, goals and what you can help with.</p>
                  </button>
                </div>
                <p className="mt-10 text-[14px] text-muted">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-brand-700 hover:underline">
                    Log in
                  </Link>
                </p>
              </div>
            ) : null}

            {step === 0 ? (
              <div className={cx(glass, "space-y-5")}>
                <h2 className="font-serif text-[36px] leading-none">You</h2>
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <Field label="Name">
                    <Input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" maxLength={60} autoComplete="name" />
                  </Field>
                  <Field label="Pronouns">
                    <Input value={f.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="optional" maxLength={20} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" error={touched && !emailOk ? "Enter a valid email." : null}>
                    <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@school.edu" autoComplete="email" maxLength={120} />
                  </Field>
                  <Field label="Password" error={touched && !pwOk ? "At least 8 characters." : null}>
                    <div className="relative">
                      <Input
                        type={showPw ? "text" : "password"}
                        value={f.password}
                        onChange={(e) => set("password", e.target.value)}
                        placeholder="8+ characters"
                        autoComplete="new-password"
                        maxLength={200}
                        className="pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-faint hover:text-ink"
                      >
                        {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </Field>
                </div>
                {err?.dup ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-800">
                    {err.msg}.{" "}
                    <Link href="/login" className="font-medium underline underline-offset-4">
                      Log in instead
                    </Link>
                  </p>
                ) : null}
                <Field label="Headline">
                  <Input value={f.headline} onChange={(e) => set("headline", e.target.value)} placeholder="CS junior · backend + AI" maxLength={90} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="I'm a">
                    <Select value={f.role} onChange={(e) => set("role", e.target.value as PersonRole)}>
                      <option value="student">Student</option>
                      <option value="professional">Professional</option>
                      <option value="founder">Founder</option>
                      <option value="mentor">Mentor</option>
                      <option value="researcher">Researcher</option>
                      <option value="organizer">Organizer</option>
                    </Select>
                  </Field>
                  <Field label="School / org">
                    <Input value={f.university} onChange={(e) => set("university", e.target.value)} maxLength={80} />
                  </Field>
                  <Field label="Major">
                    <Input value={f.major} onChange={(e) => set("major", e.target.value)} placeholder="Finance" maxLength={80} />
                  </Field>
                </div>
                <Field label="Bio">
                  <Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="What have you built? (optional)" maxLength={600} className="min-h-20" />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className={cx(glass, "space-y-6")}>
                <div>
                  <h2 className="font-serif text-[36px] leading-none">What you bring</h2>
                  <p className="mt-2 text-[14px] text-muted">Be honest about levels — teams are built from these.</p>
                </div>
                <SkillPicker value={f.skills} onChange={(v) => set("skills", v)} />
                <Field label="Interests" hint="Up to 6.">
                  <ChipSet options={INTERESTS.map((i) => ({ id: i.id, label: i.label }))} value={f.interests} onChange={(v) => set("interests", v)} max={6} />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className={cx(glass, "space-y-6")}>
                <h2 className="font-serif text-[36px] leading-none">Your goal</h2>
                <Field label="What are you trying to do?">
                  <Textarea value={f.ask} onChange={(e) => set("ask", e.target.value)} placeholder="I want to build…" maxLength={300} className="min-h-20" />
                </Field>
                <div className="-mt-3 flex flex-wrap gap-1.5">
                  {ASK_EXAMPLES.map((x) => (
                    <button key={x} type="button" onClick={() => set("ask", x)} className="rounded-full border border-dashed border-brand-200 px-2.5 py-1 text-[12px] text-ink-2 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700">
                      {x}
                    </button>
                  ))}
                </div>
                <Field label="I can help with (15 min)">
                  <ListEditor value={f.gives} onChange={(v) => set("gives", v)} placeholder="e.g. Reviewing pitch decks" suggestions={["Code review", "Portfolio feedback", "Practicing your pitch", "Resume review", "Debugging Python"]} />
                </Field>
                <Field label="Want to meet">
                  <ChipSet options={ROLES.map((r) => ({ id: r.id, label: r.label }))} value={f.lookingFor} onChange={(v) => set("lookingFor", v)} max={6} />
                </Field>
                <Field label="Open to">
                  <ChipSet options={(Object.keys(COLLAB_LABELS) as CollabType[]).map((k) => ({ id: k, label: COLLAB_LABELS[k] }))} value={f.openTo} onChange={(v) => set("openTo", v)} />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <div className={cx(glass, "space-y-6")}>
                <h2 className="font-serif text-[36px] leading-none">Privacy</h2>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                  <Toggle checked={f.joinEvent} onChange={(v) => set("joinEvent", v)} label="Join CrownHacks 2026" sub="Only people who also opt in can see you." />
                  {f.joinEvent ? (
                    <div className="mt-4">
                      <p className="mb-2 text-[13px] text-ink-2">Where are you? (zone, never GPS)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CROWNHACKS_ZONE_OPTIONS.map((z) => (
                          <button
                            key={z.id}
                            type="button"
                            onClick={() => set("zone", z.id)}
                            className={cx(
                              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] transition",
                              f.zone === z.id ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-2 hover:border-brand-300",
                            )}
                          >
                            <MapPin className="size-3" /> {z.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      { id: "everyone", t: "Everyone", b: "Best for finding people." },
                      { id: "events", t: "My events only", b: "Visible where you opt in." },
                      { id: "hidden", t: "Hidden", b: "Connections only." },
                    ] as { id: Visibility; t: string; b: string }[]
                  ).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => set("visibility", o.id)}
                      className={cx(
                        "rounded-2xl border p-3.5 text-left transition",
                        f.visibility === o.id ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200",
                      )}
                    >
                      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                        {o.id === "hidden" ? <Lock className="size-3.5" /> : null}
                        {o.t}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">{o.b}</p>
                    </button>
                  ))}
                </div>
                <Toggle checked={f.allowRequests} onChange={(v) => set("allowRequests", v)} label="Accept requests" sub="Every request needs a specific ask." />
                {err && !err.dup ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13.5px] text-rose-700">{err.msg}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {step >= 0 ? (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[14px] font-medium text-ink-2 transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-400"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                className={boneBtn}
                onClick={() => {
                  setTouched(true);
                  if (valid[step]) {
                    setErr(null);
                    setStep((s) => s + 1);
                  }
                }}
                disabled={step !== 0 && !valid[step]}
              >
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button className={boneBtn} onClick={submit} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : hasGoal ? <Wand2 className="size-4" /> : <Check className="size-4" />}
                {hasGoal ? "Create & build my team" : "Create account"}
              </button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
