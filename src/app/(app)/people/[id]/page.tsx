"use client";

import { motion } from "motion/react";
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
  Radio,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Breakdown, ConnectButton, ConnectDialog, QuietInterestButton, ReasonList, roleShort, type RequestState } from "@/components/people";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, ButtonLink, Card, DemoTag, Empty, ErrorBox, ScoreRing, Skeleton } from "@/components/ui";
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
  "heads-down": "Heads-down — not taking requests",
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
            title="This profile isn't visible to you"
            body="People control who can find them. Their profile may be hidden, limited to events you haven't joined, or they may not exist."
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
    if (!confirm(`Block ${p.name}? They won't see you in discovery and pending requests between you will be withdrawn.`)) return;
    setBlocking(true);
    try {
      await api("/api/interest", { body: { toId: p.id, action: "block" } });
      toast({ tone: "info", title: `${name} is blocked`, body: "You won't see each other in discovery." });
      router.push("/discover");
    } catch (e) {
      toast({ tone: "error", title: "Couldn't block", body: (e as Error).message });
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div className="space-y-5">
      <BackLink />

      {/* Header */}
      <Card className="brand-gradient-soft overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={p.name} hue={p.avatarHue} size={72} live={Boolean(liveActive)} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">{p.name}</h1>
                {p.pronouns ? <span className="text-[13px] text-muted">{p.pronouns}</span> : null}
                {p.isDemo ? <DemoTag /> : null}
              </div>
              <p className="mt-0.5 text-[15px] text-ink-2">{p.headline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                <Badge tone="neutral">{ROLE_LABEL[p.role]}</Badge>
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
          </div>
          {isMe ? (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Badge tone="brand">This is you</Badge>
              <ButtonLink href="/profile" variant="secondary" size="sm">
                Edit your profile
              </ButtonLink>
            </div>
          ) : null}
        </div>

        {live ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={
              liveActive
                ? "mt-5 flex flex-col gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                : "mt-5 flex flex-col gap-2 rounded-2xl border border-line bg-surface/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            }
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <Radio className={liveActive ? "mt-0.5 size-4 shrink-0 text-emerald-600" : "mt-0.5 size-4 shrink-0 text-faint"} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">
                  {MODE_LABEL[live.mode]}
                  {live.eventTitle ? <span className="font-normal text-ink-2"> at {live.eventTitle}</span> : null}
                </p>
                {live.topics.length ? <p className="mt-0.5 text-[13px] text-ink-2">Topics: {live.topics.join(" · ")}</p> : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> until {fmtTime(live.until)}
              </span>
              {live.zone ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" /> near {live.zone}
                </span>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left column */}
        <div className="min-w-0 space-y-5">
          {p.bio ? (
            <Card className="p-5">
              <SectionLabel>About</SectionLabel>
              <p className="text-[14.5px] leading-relaxed text-ink-2">{p.bio}</p>
            </Card>
          ) : null}

          {p.ask || p.gives.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {p.gives.length ? (
                <Card className="p-5">
                  <SectionLabel icon={<HandHeart className="size-4 text-brand-500" />}>Can help with (15 min)</SectionLabel>
                  <ul className="space-y-1.5">
                    {p.gives.map((g) => (
                      <li key={g} className="rounded-xl bg-canvas px-3 py-2 text-[13.5px] text-ink-2">
                        {g}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {p.ask ? (
                <Card className="p-5">
                  <SectionLabel icon={<MessageCircleQuestion className="size-4 text-brand-500" />}>Current ask</SectionLabel>
                  <p className="text-[14px] leading-relaxed text-ink-2">“{p.ask}”</p>
                </Card>
              ) : null}
            </div>
          ) : null}

          <Card className="p-5">
            <SectionLabel>Skills</SectionLabel>
            {byLevel.length ? (
              <div className="space-y-3">
                {byLevel.map((g) => (
                  <div key={g.lvl} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
                    <span className="w-24 shrink-0 pt-1 text-[12px] font-medium text-muted">{LEVEL_LABEL[g.lvl]}</span>
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
              <p className="text-sm text-muted">No skills listed yet.</p>
            )}

            {p.interests.length ? (
              <>
                <div className="my-4 border-t border-line" />
                <SectionLabel>Interests</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {p.interests.map((i) => (
                    <Badge key={i} tone="violet">
                      {interestLabel(i)}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-5">
              <SectionLabel icon={<Target className="size-4 text-brand-500" />}>Open to</SectionLabel>
              {p.openTo.length ? (
                <ul className="space-y-1 text-[13.5px] text-ink-2">
                  {p.openTo.map((k) => (
                    <li key={k}>• {COLLAB_LABELS[k]}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Nothing specified.</p>
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
            </Card>
            <Card className="p-5">
              <SectionLabel icon={<Handshake className="size-4 text-brand-500" />}>Will consider intros in</SectionLabel>
              {p.introsOffered.length ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {p.introsOffered.map((d) => (
                      <Badge key={d} tone="green">
                        {interestLabel(d)}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] leading-relaxed text-muted">
                    {name} chose to list these. Any intro is their decision, case by case — never guaranteed, and their own contacts stay private.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{name} hasn&apos;t offered to make intros.</p>
              )}
            </Card>
          </div>

          {data.sharedEvents.length || data.teamsTogether.length ? (
            <Card className="p-5">
              <SectionLabel icon={<Users className="size-4 text-brand-500" />}>What you share</SectionLabel>
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

          {p.links && (p.links.github || p.links.linkedin || p.links.portfolio) ? (
            <div className="flex flex-wrap gap-2">
              {(["github", "linkedin", "portfolio"] as const).map((k) =>
                p.links?.[k] ? (
                  <a key={k} href={p.links[k]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] text-ink-2 capitalize hover:text-brand-700">
                    {k} <ExternalLink className="size-3" />
                  </a>
                ) : null,
              )}
            </div>
          ) : null}
        </div>

        {/* Right column */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {match ? (
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium tracking-wide text-muted uppercase">Compatibility estimate</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">Based on your profile and current ask</p>
                </div>
                <ScoreRing score={match.score} size={60} />
              </div>
              {match.bestRole && match.bestRole.coverage >= 0.5 ? (
                <div className="mt-3">
                  <Badge tone="brand">
                    Could fill: {roleShort(match.bestRole.roleId)} ({Math.round(match.bestRole.coverage * 100)}%)
                  </Badge>
                </div>
              ) : null}
              {match.reasons.length ? (
                <>
                  <p className="mt-4 mb-2 text-[12.5px] font-semibold text-ink">Why Connected suggests {name}</p>
                  <ReasonList reasons={match.reasons} max={10} />
                </>
              ) : (
                <p className="mt-4 text-[13px] text-muted">No strong overlap with your current goal — that&apos;s okay, explore anyway.</p>
              )}
              <div className="mt-5 border-t border-line pt-4">
                <Breakdown breakdown={match.breakdown} score={match.score} />
              </div>
            </Card>
          ) : null}

          {!isMe ? (
            <Card className="space-y-3 p-5">
              <p className="text-[13px] font-semibold text-ink">Next step</p>
              {match ? <p className="text-[13px] text-muted">{match.nextStep}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <ConnectButton person={p} state={data.requestState} onOpen={() => setOpen(true)} size="md" />
                {data.requestState === "none" || data.requestState === "declined" ? (
                  <QuietInterestButton personId={p.id} name={p.name} sent={data.quietInterestSent} onMutual={() => void reload()} />
                ) : null}
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted">
                <b className="font-medium text-ink-2">Quiet interest</b> is double opt-in: {name} is only told if they also want to meet you.
              </p>
              <div className="border-t border-line pt-3">
                <Button variant="ghost" size="sm" onClick={doBlock} loading={blocking} icon={<Ban className="size-3.5" />} className="text-muted hover:text-rose-700">
                  Block {name}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
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

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
      {icon}
      {children}
    </p>
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
    <div className="space-y-5">
      <Skeleton className="h-4 w-16" />
      <div className="card flex items-center gap-4 p-6">
        <div className="skeleton size-[72px] rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}
