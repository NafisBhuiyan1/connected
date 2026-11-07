"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Lock, MapPin, Sparkles, UserRoundPlus, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChipSet, ListEditor, SkillPicker } from "@/components/pickers";
import { Logo } from "@/components/shell";
import { Button, cx, Field, Input, Select, Textarea, Toggle } from "@/components/ui";
import { api } from "@/lib/client";
import { CROWNHACKS_ID, CROWNHACKS_ZONE_OPTIONS, SAMPLE_PROFILE } from "@/lib/constants";
import { COLLAB_LABELS, INTERESTS, ROLES } from "@/lib/ontology";
import type { CollabType, PersonRole, UserSkill, Visibility } from "@/lib/types";

const STEPS = ["You", "Skills", "Goals", "Event & privacy"];

const ASK_EXAMPLES = [
  "I want to build an AI startup but need a developer and a designer.",
  "Looking for a hackathon team that needs a backend engineer.",
  "I want advice on landing my first banking internship.",
  "Find a mentor who can review my design portfolio.",
];

interface Form {
  name: string;
  pronouns: string;
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

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(-1);
  const [f, setF] = useState<Form>(BLANK);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    api<{ me: unknown }>("/api/session")
      .then((s) => {
        if (s.me) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  const useSample = () => {
    setF((x) => ({ ...x, ...SAMPLE_PROFILE, skills: [...SAMPLE_PROFILE.skills], interests: [...SAMPLE_PROFILE.interests], gives: [...SAMPLE_PROFILE.gives], lookingFor: [...SAMPLE_PROFILE.lookingFor], openTo: [...SAMPLE_PROFILE.openTo] }));
    setStep(0);
  };

  const valid = [
    f.name.trim().length >= 2 && f.headline.trim().length >= 3,
    f.skills.length > 0 && f.interests.length > 0,
    true,
    true,
  ];

  async function submit() {
    setSaving(true);
    setErr(null);
    try {
      await api("/api/session", {
        body: {
          name: f.name,
          pronouns: f.pronouns || undefined,
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
      const next = f.ask.trim().length > 10 ?`/build?pitch=${encodeURIComponent(f.ask)}${f.joinEvent ? `&event=${CROWNHACKS_ID}` : ""}&auto=1` : "/home";
      router.push(next);
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="brand-gradient-soft min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <Logo />
        </Link>
        {step >= 0 ? <span className="text-[13px] text-muted">Step {step + 1} of {STEPS.length}</span> : null}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        {step >= 0 ? (
          <div className="mb-6 flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={cx("h-1 rounded-full transition-colors", i <= step ? "brand-gradient" : "bg-line")} />
                <p className={cx("mt-1.5 hidden text-[12px] sm:block", i === step ? "font-medium text-ink" : "text-faint")}>{s}</p>
              </div>
            ))}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {step === -1 ? (
              <div className="pt-6 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Let&apos;s find your people</h1>
                <p className="mx-auto mt-3 max-w-lg text-[16px] text-muted">
                  Takes about a minute. Your profile is what Connected matches on, and you choose who can see it.
                </p>
                <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
                  <button onClick={useSample} className="card card-hover p-5 text-left">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Sparkles className="size-5" />
                    </div>
                    <p className="mt-3 font-semibold text-ink">Quick start</p>
                    <p className="mt-1 text-[13.5px] text-muted">Prefill a sample “finance student with an AI startup idea” profile. Add your name, then edit anything.</p>
                  </button>
                  <button onClick={() => setStep(0)} className="card card-hover p-5 text-left">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-violet-soft text-violet-600">
                      <UserRoundPlus className="size-5" />
                    </div>
                    <p className="mt-3 font-semibold text-ink">Start from scratch</p>
                    <p className="mt-1 text-[13.5px] text-muted">Build your own profile: skills, interests, what you can help with and what you need.</p>
                  </button>
                </div>
              </div>
            ) : null}

            {step === 0 ? (
              <div className="card space-y-4 p-6">
                <h2 className="text-xl font-semibold text-ink">About you</h2>
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <Field label="Name">
                    <Input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" maxLength={60} />
                  </Field>
                  <Field label="Pronouns (optional)">
                    <Input value={f.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="she/her" maxLength={20} />
                  </Field>
                </div>
                <Field label="Headline" hint="One line people see first.">
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
                  <Field label="University / org">
                    <Input value={f.university} onChange={(e) => set("university", e.target.value)} maxLength={80} />
                  </Field>
                  <Field label="Major / field">
                    <Input value={f.major} onChange={(e) => set("major", e.target.value)} placeholder="Finance" maxLength={80} />
                  </Field>
                </div>
                <Field label="Short bio (optional)">
                  <Textarea value={f.bio} onChange={(e) => set("bio", e.target.value)} placeholder="What have you built? What are you curious about?" maxLength={600} />
                </Field>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="card space-y-6 p-6">
                <div>
                  <h2 className="text-xl font-semibold text-ink">What you bring</h2>
                  <p className="mt-1 text-[13.5px] text-muted">Be honest about levels. Teams are formed from these.</p>
                </div>
                <SkillPicker value={f.skills} onChange={(v) => set("skills", v)} />
                <Field label="Interests" hint="Pick up to 6.">
                  <ChipSet options={INTERESTS.map((i) => ({ id: i.id, label: i.label }))} value={f.interests} onChange={(v) => set("interests", v)} max={6} />
                </Field>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="card space-y-6 p-6">
                <div>
                  <h2 className="text-xl font-semibold text-ink">What you&apos;re trying to do</h2>
                  <p className="mt-1 text-[13.5px] text-muted">This is what Connected optimizes for. Speak naturally.</p>
                </div>
                <Field label="Your goal right now">
                  <Textarea value={f.ask} onChange={(e) => set("ask", e.target.value)} placeholder="I want to build…" maxLength={300} className="min-h-20" />
                </Field>
                <div className="-mt-3 flex flex-wrap gap-1.5">
                  {ASK_EXAMPLES.map((x) => (
                    <button key={x} type="button" onClick={() => set("ask", x)} className="rounded-full border border-dashed border-line-2 px-2.5 py-1 text-[12px] text-muted hover:border-brand-200 hover:text-brand-700">
                      {x}
                    </button>
                  ))}
                </div>
                <Field label="What can you help others with in 15 minutes?" hint="Explicit willingness to help is a strong matching signal, and it's what makes people approach you.">
                  <ListEditor value={f.gives} onChange={(v) => set("gives", v)} placeholder="e.g. Reviewing pitch decks" suggestions={["Code review", "Portfolio feedback", "Practicing your pitch", "Resume review", "Debugging Python"]} />
                </Field>
                <Field label="People you want to meet">
                  <ChipSet options={ROLES.map((r) => ({ id: r.id, label: r.label }))} value={f.lookingFor} onChange={(v) => set("lookingFor", v)} max={6} />
                </Field>
                <Field label="Open to">
                  <ChipSet options={(Object.keys(COLLAB_LABELS) as CollabType[]).map((k) => ({ id: k, label: COLLAB_LABELS[k] }))} value={f.openTo} onChange={(v) => set("openTo", v)} />
                </Field>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="card space-y-6 p-6">
                <h2 className="text-xl font-semibold text-ink">Event & privacy</h2>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                  <Toggle checked={f.joinEvent} onChange={(v) => set("joinEvent", v)} label="Join the CrownHacks 2026 networking space" sub="Opted-in participants can discover each other. You'll only see others once you opt in too." />
                  {f.joinEvent ? (
                    <div className="mt-4">
                      <Field label="Where are you right now? (approximate zone, never GPS)">
                        <div className="flex flex-wrap gap-1.5">
                          {CROWNHACKS_ZONE_OPTIONS.map((z) => (
                            <button
                              key={z.id}
                              type="button"
                              onClick={() => set("zone", z.id)}
                              className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium", f.zone === z.id ? "border-brand-300 bg-surface text-brand-700" : "border-line bg-surface text-ink-2")}
                            >
                              <MapPin className="size-3" /> {z.name}
                            </button>
                          ))}
                        </div>
                      </Field>
                    </div>
                  ) : null}
                </div>
                <Field label="Who can find you?">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        { id: "everyone", t: "Everyone on Connected", b: "Best for finding collaborators." },
                        { id: "events", t: "Only at my events", b: "Visible only in events you opted into." },
                        { id: "hidden", t: "Hidden", b: "Only people you're connected with." },
                      ] as { id: Visibility; t: string; b: string }[]
                    ).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => set("visibility", o.id)}
                        className={cx("rounded-2xl border p-3 text-left transition-colors", f.visibility === o.id ? "border-brand-300 bg-brand-50/50" : "border-line bg-surface hover:border-line-2")}
                      >
                        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                          {o.id === "hidden" ? <Lock className="size-3.5" /> : null}
                          {o.t}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted">{o.b}</p>
                      </button>
                    ))}
                  </div>
                </Field>
                <Toggle checked={f.allowRequests} onChange={(v) => set("allowRequests", v)} label="Accept connection requests" sub="Every request must include a specific ask. You can set limits per event." />
                {err ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {step >= 0 ? (
          <div className="mt-5 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} icon={<ArrowLeft className="size-4" />}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!valid[step]} icon={<ArrowRight className="size-4" />}>
                Continue
              </Button>
            ) : (
              <Button onClick={submit} loading={saving} icon={f.ask.trim().length > 10 ? <Wand2 className="size-4" /> : <Check className="size-4" />}>
                {f.ask.trim().length > 10 ? "Create profile & build my team" : "Create profile"}
              </Button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
