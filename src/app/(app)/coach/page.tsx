"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Bot, CalendarDays, Cpu, MapPin, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session";
import { Avatar, cx, DemoTag } from "@/components/ui";
import type { AssistantEvent, AssistantPerson, AssistantResponse } from "@/lib/assistant-contract";
import { api, fmtDate } from "@/lib/client";
import { play } from "@/lib/sfx";

// Personal collaboration coach. The server decides what's grounded (people, events, build plan);
// this screen only renders it and keeps the conversation for the tab. Nothing is ever sent to anyone.

interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: AssistantResponse["source"];
  people?: AssistantPerson[];
  events?: AssistantEvent[];
  buildPlan?: AssistantResponse["buildPlan"];
}

interface Saved {
  turns: Turn[];
  goal?: string;
  suggestions: { label: string; prompt: string }[];
}

const STARTERS = [
  { label: "Pick a project idea", prompt: "What should I build this weekend with my skills?" },
  { label: "Find complementary people", prompt: "Who could complement my skills for my goal, and why?" },
  { label: "Plan my next hour", prompt: "Give me a realistic plan for the next hour using my current skills." },
  { label: "Practice my pitch", prompt: "Help me explain my project in a clear 30-second pitch." },
];

const MAX_TURNS = 10; // matches the server's history limit
const MAX_HISTORY_CHARS = 12_000;

/** The server accepts at most 10 prior turns, 2,000 chars each, 12,000 chars total. */
function historyFor(turns: Turn[]) {
  const recent = turns.slice(-MAX_TURNS).map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }));
  while (recent.length && recent.reduce((n, t) => n + t.content.length, 0) > MAX_HISTORY_CHARS) recent.shift();
  return recent;
}

const newId = () => Math.random().toString(36).slice(2, 10);

export default function CoachPage() {
  return (
    <Suspense fallback={null}>
      <Coach />
    </Suspense>
  );
}

function Coach() {
  const { me } = useSession();
  const params = useSearchParams();
  const eventId = /^[A-Za-z0-9_-]{1,80}$/.test(params.get("event") ?? "") ? params.get("event")! : undefined;
  const storageKey = me ? `cx-coach:${me.id}` : null;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [goal, setGoal] = useState<string | undefined>();
  const [suggestions, setSuggestions] = useState<Saved["suggestions"]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: string } | null>(null);
  const [restored, setRestored] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);

  // Restore this tab's conversation (sessionStorage can be unavailable — the page works without it).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        setTurns(Array.isArray(saved.turns) ? saved.turns : []);
        setGoal(saved.goal);
        setSuggestions(Array.isArray(saved.suggestions) ? saved.suggestions : []);
      }
    } catch {
      // ignore unreadable storage
    }
    setRestored(true);
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !restored) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ turns: turns.slice(-30), goal, suggestions } satisfies Saved));
    } catch {
      // storage full or blocked — keep going in memory
    }
  }, [storageKey, restored, turns, goal, suggestions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, busy]);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim().slice(0, 1200);
      if (!message || busy) return;
      const prior = turns;
      setTurns((t) => [...t, { id: newId(), role: "user", content: message }]);
      setText("");
      setError(null);
      setBusy(true);
      play("send");
      try {
        const res = await api<AssistantResponse>("/api/assistant", {
          body: { message, history: historyFor(prior), ...(goal ? { goal: goal.slice(0, 1200) } : {}), ...(eventId ? { eventId } : {}) },
        });
        setTurns((t) => [
          ...t,
          { id: newId(), role: "assistant", content: res.reply, source: res.source, people: res.people, events: res.events, buildPlan: res.buildPlan },
        ]);
        if (res.goal) setGoal(res.goal);
        setSuggestions(res.suggestions ?? []);
      } catch (e) {
        // Put the message back so nothing typed is lost.
        setTurns(prior);
        setText(message);
        setError({ message: (e as Error).message || "The coach didn't answer. Try again.", retry: message });
      } finally {
        setBusy(false);
      }
    },
    [busy, turns, goal, eventId],
  );

  // /coach?q=… asks once on arrival (used by links from other screens).
  useEffect(() => {
    const q = params.get("q");
    if (!q || autoAsked.current || !restored || !me) return;
    autoAsked.current = true;
    void send(q);
  }, [params, restored, me, send]);

  const reset = () => {
    setTurns([]);
    setGoal(undefined);
    setSuggestions([]);
    setError(null);
  };

  const first = me?.name.split(/\s+/)[0] ?? "there";
  const lastSource = [...turns].reverse().find((t) => t.role === "assistant")?.source;
  const starters = me?.ask && me.ask.trim().length > 10 ? [{ label: "Work on my goal", prompt: `Help me make progress on my goal: ${me.ask.trim()}` }, ...STARTERS.slice(0, 3)] : STARTERS;
  const chips = turns.length ? suggestions : [];

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-180px)] max-w-2xl flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="brand-gradient flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.8)]">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-ink">Coach</h1>
          <p className="truncate text-[13px] text-muted">Plan, pitch, find people. You decide every step.</p>
        </div>
        {lastSource ? <ModeBadge source={lastSource} /> : null}
        {turns.length ? (
          <button onClick={reset} className="focus-ring flex size-9 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-white hover:text-ink" aria-label="Start a new chat" title="New chat">
            <RotateCcw className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-4" aria-live="polite">
        {!turns.length && restored ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <p className="text-[19px] font-semibold tracking-tight text-ink">Hi {first} 👋 What are you working on?</p>
            <p className="mt-1 text-[14px] text-muted">I can shrink an idea to a first version, plan your next hour, sharpen a pitch, or suggest people who complement you.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {starters.map((s) => (
                <button
                  key={s.label}
                  onClick={() => void send(s.prompt)}
                  disabled={busy}
                  className="rounded-2xl border border-line bg-canvas px-3.5 py-3 text-left text-[13.5px] font-semibold text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:opacity-60"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}

        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              {t.role === "user" ? (
                <div className="flex justify-end">
                  <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-brand-600 px-4 py-2.5 text-[14.5px] leading-snug whitespace-pre-line text-white">{t.content}</p>
                </div>
              ) : (
                <AssistantTurn turn={t} previous={[...turns.slice(0, i)].reverse().find((x) => x.role === "assistant")} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {busy ? (
          <div className="flex items-center gap-2 pl-1 text-[13px] text-muted" role="status">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-brand-500" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
            Thinking…
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
            <span>{error.message}</span>
            <button onClick={() => void send(error.retry)} className="shrink-0 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        ) : null}
        {/* Scroll target sits above the sticky composer (and the phone tab bar) instead of under it. */}
        <div ref={endRef} className="scroll-mb-[250px] md:scroll-mb-44" />
      </div>

      {/* Composer: a canvas-colored fade masks the conversation scrolling underneath. */}
      <div className="sticky bottom-[calc(80px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-2 bg-gradient-to-t from-canvas from-75% to-canvas/0 px-4 pt-6 pb-3 sm:-mx-6 sm:px-6 md:bottom-0 md:pb-4">
        {chips.length && !busy ? (
          <div className="scrollbar-none -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {chips.map((s) => (
              <button
                key={s.label}
                onClick={() => void send(s.prompt)}
                className="shrink-0 rounded-full border border-brand-200 bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-brand-700 shadow-sm backdrop-blur hover:bg-brand-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="flex items-end gap-2 rounded-3xl border border-line bg-white/95 p-2 shadow-[0_16px_40px_-18px_rgba(76,29,149,0.45)] backdrop-blur-xl focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={1}
            maxLength={1200}
            placeholder={turns.length ? "Ask a follow-up…" : "Describe your idea or what you need help with"}
            aria-label="Message your coach"
            className="max-h-36 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] text-ink outline-none placeholder:text-faint [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-brand-200"
          >
            <ArrowUp className="size-5" />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-faint">The coach never messages anyone for you. Demo profiles are fictional.</p>
      </div>
    </div>
  );
}

function ModeBadge({ source }: { source: AssistantResponse["source"] }) {
  return source === "claude" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700" title="Replies written by Claude from your approved profile facts">
      <Bot className="size-3.5" /> Claude
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 ring-1 ring-line" title="No AI model is configured or reachable; replies come from Connected's built-in rules">
      <Cpu className="size-3.5" /> Rules mode
    </span>
  );
}

const sameIds = (a?: { id: string }[], b?: { id: string }[]) => (a ?? []).map((x) => x.id).join() === (b ?? []).map((x) => x.id).join();

function AssistantTurn({ turn, previous }: { turn: Turn; previous?: Turn }) {
  // Follow-ups usually return the same suggestions; only show cards when they change, to keep the chat readable.
  const people = previous && sameIds(turn.people, previous.people) ? [] : turn.people;
  const events = previous && sameIds(turn.events, previous.events) ? [] : turn.events;
  const plan = previous?.buildPlan && turn.buildPlan && previous.buildPlan.pitch === turn.buildPlan.pitch ? null : turn.buildPlan;
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-3xl rounded-tl-lg border border-line bg-white px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-line text-ink shadow-[var(--shadow-card)]">{turn.content}</div>
          <p className="mt-1 pl-1 text-[10.5px] text-faint">{turn.source === "claude" ? "Claude · from your profile facts" : "Built-in coach (rules mode)"}</p>
        </div>
      </div>

      {people?.length ? (
        <div className="pl-10">
          <div className="scrollbar-none -mr-4 flex snap-x scroll-px-0 gap-2 overflow-x-auto pr-4 sm:mr-0 sm:pr-0">
            {people.map((p) => (
              <Link
                key={p.id}
                href={`/people/${p.id}`}
                className="w-64 shrink-0 snap-start rounded-2xl border border-line bg-white p-3 transition-colors hover:border-brand-200"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} size={36} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                      {p.name} {p.isDemo ? <DemoTag /> : null}
                    </p>
                    <p className="truncate text-[12px] text-muted">{p.headline}</p>
                  </div>
                </div>
                {p.skills.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.skills.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-ink-2">{p.why}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {events?.length ? (
        <div className="flex flex-col gap-1.5 pl-10">
          {events.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2.5 transition-colors hover:border-brand-200">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarDays className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{e.title}</span>
                <span className="flex items-center gap-1 truncate text-[12px] text-muted">
                  {fmtDate(e.start)} <MapPin className="size-3 shrink-0" /> <span className="truncate">{e.venue}</span>
                </span>
              </span>
              {e.isSample ? <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-semibold text-muted ring-1 ring-line">Sample</span> : null}
            </Link>
          ))}
        </div>
      ) : null}

      {plan ? (
        <div className="pl-10">
          <Link
            href={`/build?pitch=${encodeURIComponent(plan.pitch)}${plan.eventId ? `&event=${encodeURIComponent(plan.eventId)}` : ""}&auto=1`}
            className={cx("inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-600 px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.8)] hover:bg-brand-700")}
          >
            <Wand2 className="size-4" /> Build a team for this
          </Link>
        </div>
      ) : null}
    </div>
  );
}
