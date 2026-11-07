"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Brain, CalendarDays, Cpu, Gauge, Search, Sparkles, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { LoadingCards, MatchCard, roleShort, type MatchWithState } from "@/components/people";
import { useSession } from "@/components/session";
import { Badge, Button, ButtonLink, Card, Chip, cx, Empty, ErrorBox, PageHeader, Select, Textarea } from "@/components/ui";
import { api, useApi } from "@/lib/client";
import { interestLabel, skillLabel } from "@/lib/ontology";
import type { ConnectedEvent, Intent } from "@/lib/types";

interface DiscoverResponse {
  intent: Intent | null;
  source: "claude" | "rules";
  aiMs: number;
  rankMs: number;
  poolSize: number;
  matches: MatchWithState[];
}

interface EventsResponse {
  events: { event: ConnectedEvent; optedIn: boolean; joined: boolean; live: boolean }[];
}

const EXAMPLES = [
  "Find a technical cofounder for my fintech idea",
  "Mentor who can review my design portfolio",
  "Teammates for CrownHacks: need backend + AI",
  "Advice on landing a banking internship",
];

export default function DiscoverPage() {
  return (
    <Suspense fallback={<LoadingCards n={6} />}>
      <Discover />
    </Suspense>
  );
}

function Discover() {
  const { me } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const initialQ = params.get("q");
  const initialEvent = params.get("event") ?? "";
  const [query, setQuery] = useState(initialQ ?? me?.ask ?? "");
  const [eventId, setEventId] = useState(initialEvent);
  const [result, setResult] = useState<DiscoverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<{ q: string; ev: string } | null>(null);
  const events = useApi<EventsResponse>("/api/events");
  const ran = useRef(false);

  const run = useCallback(
    async (q: string, ev: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<DiscoverResponse>("/api/discover", { body: { query: q, eventId: ev || undefined } });
        setResult(res);
        setLastQuery({ q, ev });
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Deep link (?q=) or the profile's current ask runs automatically on load.
  useEffect(() => {
    if (ran.current || !me) return;
    ran.current = true;
    const q = initialQ ?? me.ask ?? "";
    if (!initialQ && !query) setQuery(q);
    void run(q, initialEvent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  function submit(q = query) {
    const next = new URLSearchParams();
    if (q.trim()) next.set("q", q.trim());
    if (eventId) next.set("event", eventId);
    router.replace(`/discover${next.toString() ? `?${next}` : ""}`, { scroll: false });
    void run(q, eventId);
  }

  const evOptions = events.data?.events ?? [];
  const intent = result?.intent ?? null;

  return (
    <div>
      <PageHeader
        eyebrow="Discover"
        title="Who should you meet?"
        sub="Describe what you're trying to do. Connected understands the goal, then ranks the people who opted in — and explains every match from their real profile."
      />

      <Card className="brand-gradient-soft overflow-hidden p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-3"
        >
          <label htmlFor="discover-q" className="block text-[13px] font-medium text-ink-2">
            What are you trying to do?
          </label>
          <Textarea
            id="discover-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="e.g. I'm a finance student with a fintech idea and I need a developer who might become my cofounder."
            className="min-h-24 text-[15px]"
            maxLength={1200}
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <Chip
                key={ex}
                selected={query === ex}
                onClick={() => {
                  setQuery(ex);
                  submit(ex);
                }}
                icon={<Sparkles className="size-3 text-violet-500" />}
              >
                {ex}
              </Chip>
            ))}
          </div>
          <div className="flex flex-col gap-2 border-t border-line/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-faint" />
              <Select aria-label="Limit to an event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-9 w-full text-[13px] sm:w-72">
                <option value="">Everyone discoverable</option>
                {evOptions.map((e) => (
                  <option key={e.event.id} value={e.event.id}>
                    {e.event.title}
                    {e.live ? " · live now" : ""}
                    {e.optedIn ? " · you're opted in" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={loading} icon={<Search className="size-4" />} className="sm:w-auto">
              Find my people
            </Button>
          </div>
        </form>
      </Card>

      <AnimatePresence mode="wait">
        {result && intent ? (
          <motion.div key={`${lastQuery?.q}-${lastQuery?.ev}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
            <Interpretation result={result} intent={intent} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mt-6">
        {error ? (
          <ErrorBox message={error} onRetry={() => void run(lastQuery?.q ?? query, lastQuery?.ev ?? eventId)} />
        ) : loading && !result ? (
          <LoadingCards n={6} />
        ) : result ? (
          result.matches.length ? (
            <div className={cx("transition-opacity", loading && "opacity-60")}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">
                  {result.matches.length} {result.matches.length === 1 ? "match" : "matches"}
                  {lastQuery?.ev ? ` at ${evOptions.find((e) => e.event.id === lastQuery.ev)?.event.title ?? "this event"}` : ""}
                </h2>
                <span className="hidden text-[12px] text-muted sm:block">Ordered by fit, diversified across the roles you need</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {result.matches.map((m, i) => (
                  <MatchCard key={m.profile.id} match={m} rank={i} eventId={lastQuery?.ev || undefined} onChanged={() => void run(lastQuery?.q ?? query, lastQuery?.ev ?? eventId)} />
                ))}
              </div>
            </div>
          ) : (
            <Empty
              icon={<Users className="size-5" />}
              title="No one matches yet"
              body={
                lastQuery?.ev
                  ? "Nobody who opted in at this event fits that goal right now. Try everyone discoverable, or broaden the goal."
                  : "Try describing the goal differently — mention the skills or roles you need."
              }
              action={
                lastQuery?.ev ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEventId("");
                      void run(lastQuery?.q ?? query, "");
                    }}
                  >
                    Search everyone
                  </Button>
                ) : (
                  <ButtonLink href="/build" variant="secondary" icon={<ArrowRight className="size-4" />}>
                    Try the Team Builder
                  </ButtonLink>
                )
              }
            />
          )
        ) : (
          <Empty icon={<Search className="size-5" />} title="Describe a goal to start" body="Connected works best with a specific goal — what you're building and who you need." />
        )}
      </div>
    </div>
  );
}

function Interpretation({ result, intent }: { result: DiscoverResponse; intent: Intent }) {
  const roles = [...intent.roles].sort((a, b) => b.weight - a.weight);
  const maxW = Math.max(1, ...roles.map((r) => r.weight));
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Brain className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-medium tracking-wide text-muted uppercase">Connected understood</p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">{intent.summary}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {result.source === "claude" ? (
            <Badge tone="violet" icon={<Sparkles className="size-3" />}>
              Understood by Claude
            </Badge>
          ) : (
            <Badge tone="amber" icon={<Cpu className="size-3" />}>
              Rules engine
            </Badge>
          )}
        </div>
      </div>

      {roles.length ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-medium text-ink-2">Roles to look for</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((r) => (
              <span key={r.roleId} title={r.why} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 py-1 pr-2.5 pl-1.5 text-[12.5px] font-medium text-brand-800">
                <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-brand-100">
                  <span className="brand-gradient absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.weight / maxW) * 100}%` }} />
                </span>
                {roleShort(r.roleId)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {intent.skills.length || intent.interests.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {intent.skills.map((s) => (
            <Badge key={`s-${s}`} tone="sky">
              {skillLabel(s)}
            </Badge>
          ))}
          {intent.interests.map((i) => (
            <Badge key={`i-${i}`} tone="neutral">
              {interestLabel(i)}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="size-3.5" />
          Ranked {result.poolSize} discoverable {result.poolSize === 1 ? "person" : "people"} in {result.rankMs} ms
        </span>
        {result.source === "claude" ? <span>Goal understood in {(result.aiMs / 1000).toFixed(1)} s</span> : null}
        <span>Hidden and blocked profiles are never ranked.</span>
      </div>
    </Card>
  );
}
