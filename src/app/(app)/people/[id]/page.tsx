"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Ban,
  CalendarCheck2,
  Clock,
  ExternalLink,
  GraduationCap,
  HandHeart,
  Handshake,
  Lock,
  MapPin,
  MessageCircleQuestion,
  MoreHorizontal,
  Pencil,
  Radio,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Breakdown, ConnectButton, ConnectDialog, ProfileCover, QuietInterestButton, ReasonList, roleShort, type RequestState } from "@/components/people";
import { useToast } from "@/components/toast";
import { Avatar, Badge, ButtonLink, Card, cx, DemoTag, Empty, ErrorBox, ScoreRing, Skeleton } from "@/components/ui";
import { api, firstName, fmtTime, useApi } from "@/lib/client";
import { COLLAB_LABELS, interestLabel, LEVEL_LABEL, roleLabel, skillLabel } from "@/lib/ontology";
import type { Level, LiveStatus, MatchResult, PublicProfile } from "@/lib/types";

interface PersonResponse {
  profile: PublicProfile;
  isMe: boolean;
  match: MatchResult | null;
  sharedEvents: { id: string; title: string }[];
  live: (LiveStatus & { eventId: string; eventTitle?: string; zone?: string }) | null;
  requestState: RequestState;
  quietInterestSent: boolean;
  teamsTogether: { id: string; title: string }[];
}

const ROLE_LABEL: Record<PublicProfile["role"], string> = {
  student: "Student",
  professional: "Professional",
  founder: "Founder",
  mentor: "Mentor",
  researcher: "Researcher",
  organizer: "Organizer",
};

const MODE_LABEL: Record<LiveStatus["mode"], string> = {
  "quick-chat": "Open for a quick chat",
  "team-up": "Looking to team up",
  mentoring: "Mentoring now",
  "heads-down": "Heads-down",
};

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, error, loading, reload } = useApi<PersonResponse>(id ? `/api/people/${id}` : null);
  const [open, setOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

  if (loading && !data) return <PersonSkeleton />;
  if (error && !data) {
    const notVisible = /not visible|not found/i.test(error);
    return (
      <div className="space-y-4">
        <BackLink />
        {notVisible ? (
          <Empty
            icon={<Lock className="size-5" />}
            title="Profile not visible"
            body="They control who can see them."
            action={
              <ButtonLink href="/discover" variant="secondary">
                Back to Discover
              </ButtonLink>
            }
          />
        ) : (
          <ErrorBox message={error} onRetry={() => void reload()} />
        )}
      </div>
    );
  }
  if (!data) return null;

  const { profile: p, match, live, isMe } = data;
  const name = firstName(p.name);
  const liveActive = live && live.mode !== "heads-down";
  const byLevel = ([3, 2, 1] as Level[]).map((lvl) => ({ lvl, skills: p.skills.filter((s) => s.level === lvl) })).filter((g) => g.skills.length);

  async function doBlock() {
    if (!confirm(`Block ${p.name}? You'll disappear from each other's discovery.`)) return;
    setBlocking(true);
    try {
      await api("/api/interest", { body: { toId: p.id, action: "block" } });
      toast({ tone: "info", title: `${name} is blocked` });
      router.push("/discover");
    } catch (e) {
      toast({ tone: "error", title: "Couldn't block", body: (e as Error).message });
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackLink />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          {/* Hero card — LinkedIn-style cover + overlapping avatar */}
          <Card className="overflow-hidden">
            <ProfileCover hue={p.avatarHue} />
            <div className="relative px-5 pb-5 sm:px-6">
              <div className="-mt-12 flex items-end justify-between gap-3 sm:-mt-14">
                <span className="rounded-full ring-4 ring-surface">
                  <Avatar name={p.name} hue={p.avatarHue} size={104} live={Boolean(liveActive)} />
                </span>
                {match ? (
                  <div className="mb-1 hidden items-center gap-2 rounded-2xl border border-line bg-surface/90 py-1.5 pr-3 pl-1.5 shadow-[var(--shadow-card)] backdrop-blur sm:flex">
                    <ScoreRing score={match.score} size={40} />
                    <span className="text-[12px] leading-tight text-muted">
                      fit
                      <br />
                      estimate
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-ink">{p.name}</h1>
                  {p.pronouns ? <span className="text-[13px] text-muted">{p.pronouns}</span> : null}
                  {p.isDemo ? <DemoTag /> : null}
                </div>
                <p className="mt-0.5 text-[15px] text-ink-2">{p.headline}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                  <span className="font-medium text-ink-2">{ROLE_LABEL[p.role]}</span>
                  {p.university || p.major ? (
                    <span className="inline-flex items-center gap-1">
                      <GraduationCap className="size-3.5" />
                      {[p.major, p.university].filter(Boolean).join(" · ")}
                      {p.gradYear ? ` '${String(p.gradYear).slice(2)}` : ""}
                    </span>
                  ) : null}
                  {p.area ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {p.area}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Action row */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {isMe ? (
                  <ButtonLink href="/profile" variant="secondary" size="md" icon={<Pencil className="size-4" />}>
                    Edit profile
                  </ButtonLink>
                ) : (
                  <>
                    <ConnectButton person={p} state={data.requestState} onOpen={() => setOpen(true)} size="md" />
                    {data.requestState === "none" || data.requestState === "declined" ? (
                      <QuietInterestButton personId={p.id} name={p.name} sent={data.quietInterestSent} onMutual={() => void reload()} />
                    ) : null}
                    <MoreMenu onBlock={doBlock} blocking={blocking} name={name} links={p.links} />
                  </>
                )}
              </div>

              {live ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cx(
                    "mt-4 flex flex-col gap-1.5 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between",
                    liveActive ? "border-emerald-100 bg-emerald-50/70" : "border-line bg-canvas",
                  )}
                >
                  <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-ink">
                    <Radio className={cx("size-4 shrink-0", liveActive ? "text-emerald-600" : "text-faint")} />
                    <span className="truncate">
                      {MODE_LABEL[live.mode]}
                      {live.eventTitle ? <span className="font-normal text-ink-2"> · {live.eventTitle}</span> : null}
                    </span>
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                    {live.topics.length ? <span>{live.topics.join(" · ")}</span> : null}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {fmtTime(live.until)}
                    </span>
                    {live.zone ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" /> {live.zone}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </div>
          </Card>

          {p.bio ? (
            <Section title="About">
              <p className="text-[14.5px] leading-relaxed text-ink-2">{p.bio}</p>
            </Section>
          ) : null}

          {p.gives.length || p.ask ? (
            <div className="grid gap-4 md:grid-cols-2">
              {p.gives.length ? (
                <Section title="Can help with" icon={<HandHeart className="size-4 text-brand-500" />}>
                  <ul className="space-y-1.5">
                    {p.gives.map((g) => (
                      <li key={g} className="rounded-xl bg-canvas px-3 py-2 text-[13.5px] text-ink-2">
                        {g}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
              {p.ask ? (
                <Section title="Looking for" icon={<MessageCircleQuestion className="size-4 text-brand-500" />}>
                  <p className="text-[14px] leading-relaxed text-ink-2">“{p.ask}”</p>
                </Section>
              ) : null}
            </div>
          ) : null}

          <Section title="Skills">
            {byLevel.length ? (
              <div className="divide-y divide-line">
                {byLevel.map((g) => (
                  <div key={g.lvl} className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
                    <span className="w-24 shrink-0 text-[12px] font-medium text-muted">{LEVEL_LABEL[g.lvl]}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.skills.map((s) => (
                        <Badge key={s.skill} tone={g.lvl === 3 ? "brand" : g.lvl === 2 ? "sky" : "neutral"}>
                          {skillLabel(s.skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No skills yet.</p>
            )}
          </Section>

          {p.interests.length ? (
            <Section title="Interests">
              <div className="flex flex-wrap gap-1.5">
                {p.interests.map((i) => (
                  <Badge key={i} tone="violet">
                    {interestLabel(i)}
                  </Badge>
                ))}
              </div>
            </Section>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Open to" icon={<Target className="size-4 text-brand-500" />}>
              {p.openTo.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {p.openTo.map((k) => (
                    <Badge key={k}>{COLLAB_LABELS[k]}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Nothing set.</p>
              )}
              {p.lookingFor.length ? (
                <>
                  <p className="mt-4 mb-1.5 text-[12px] font-medium text-muted">Wants to meet</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.lookingFor.map((r) => (
                      <Badge key={r} tone="brand">
                        {roleLabel(r)}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}
            </Section>
            <Section title="Open to intros in" icon={<Handshake className="size-4 text-brand-500" />}>
              {p.introsOffered.length ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {p.introsOffered.map((d) => (
                      <Badge key={d} tone="green">
                        {interestLabel(d)}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] text-muted">Their call, case by case.</p>
                </>
              ) : (
                <p className="text-sm text-muted">None listed.</p>
              )}
            </Section>
          </div>
        </div>

        {/* Side column */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {match ? (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-ink">Why {name}</p>
                  <p className="text-[12px] text-muted">Fit estimate</p>
                </div>
                <ScoreRing score={match.score} size={56} />
              </div>
              {match.bestRole && match.bestRole.coverage >= 0.5 ? (
                <div className="mt-3">
                  <Badge tone="brand">
                    Could fill {roleShort(match.bestRole.roleId)} · {Math.round(match.bestRole.coverage * 100)}%
                  </Badge>
                </div>
              ) : null}
              {match.reasons.length ? (
                <ReasonList reasons={match.reasons} max={10} className="mt-4" />
              ) : (
                <p className="mt-4 text-[13px] text-muted">Low overlap with your goal.</p>
              )}
              {match.nextStep && !isMe ? (
                <p className="mt-4 rounded-xl bg-brand-50/70 px-3 py-2 text-[12.5px] font-medium text-brand-700">Next: {match.nextStep}</p>
              ) : null}
              <details className="group mt-4 border-t border-line pt-3">
                <summary className="cursor-pointer list-none text-[12.5px] font-medium text-muted hover:text-ink">
                  <span className="group-open:hidden">Show score breakdown</span>
                  <span className="hidden group-open:inline">Hide breakdown</span>
                </summary>
                <div className="mt-3">
                  <Breakdown breakdown={match.breakdown} score={match.score} />
                </div>
              </details>
            </Card>
          ) : null}

          {data.sharedEvents.length || data.teamsTogether.length ? (
            <Card className="p-5">
              <p className="mb-2.5 flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                <Users className="size-4 text-brand-500" /> In common
              </p>
              <div className="flex flex-wrap gap-2">
                {data.sharedEvents.map((e) => (
                  <Link key={e.id} href={`/events/${e.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:border-brand-200 hover:text-brand-700">
                    <CalendarCheck2 className="size-3.5" /> {e.title}
                  </Link>
                ))}
                {data.teamsTogether.map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-1.5 text-[13px] text-brand-700 hover:border-brand-200">
                    <Users className="size-3.5" /> {t.title}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}
        </aside>
      </div>

      {!isMe ? (
        <ConnectDialog
          open={open}
          onClose={() => setOpen(false)}
          person={p}
          eventId={live?.eventId ?? data.sharedEvents[0]?.id}
          reasons={match?.reasons.map((r) => r.text)}
          onSent={() => {
            setOpen(false);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-3 flex items-center gap-1.5 text-[16px] font-semibold tracking-tight text-ink">
        {icon}
        {title}
      </h2>
      {children}
    </Card>
  );
}

function MoreMenu({ onBlock, blocking, name, links }: { onBlock: () => void; blocking: boolean; name: string; links?: PublicProfile["links"] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  const linkKeys = (["github", "linkedin", "portfolio"] as const).filter((k) => links?.[k]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-ink-2 hover:border-line-2"
      >
        <MoreHorizontal className="size-4" /> More
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 z-20 mt-1.5 w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]"
          >
            {linkKeys.map((k) => (
              <a key={k} href={links![k]} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px] text-ink-2 capitalize hover:bg-canvas">
                {k} <ExternalLink className="size-3.5 text-faint" />
              </a>
            ))}
            <button
              type="button"
              disabled={blocking}
              onClick={() => {
                setOpen(false);
                onBlock();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            >
              <Ban className="size-3.5" /> Block {name}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BackLink() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="focus-ring inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" /> Back
    </button>
  );
}

function PersonSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-16" />
      <div className="card overflow-hidden">
        <div className="skeleton h-28 rounded-none sm:h-36" />
        <div className="space-y-2 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
