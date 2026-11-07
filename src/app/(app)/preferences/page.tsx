"use client";

import { motion } from "motion/react";
import { Eye, EyeOff, Ghost, Lock, MapPin, Shuffle, ShieldCheck, Timer, UserX, Users, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, cx, DemoTag, ErrorBox, Skeleton, Toggle } from "@/components/ui";
import { api, timeAgo, useApi } from "@/lib/client";
import { play, setSoundsEnabled } from "@/lib/sfx";
import type { Prefs, PublicProfile, Visibility } from "@/lib/types";

interface PrefsData {
  prefs: Prefs;
  visibility: Visibility;
  allowRequests: boolean;
  viewers: { at: string; profile: PublicProfile }[];
  blocked: { id: string; name: string; headline: string; avatarHue: number; isDemo: boolean }[];
  privacy: { jitterMeters: number; refreshMinutes: number; minCrowd: number; maxViewsPerHour: number };
}

type Patch = Partial<Prefs> & { visibility?: Visibility; allowRequests?: boolean; unblock?: string };

export default function PreferencesPage() {
  const { data, error, reload, setData } = useApi<PrefsData>("/api/preferences");
  const { refresh } = useSession();
  const toast = useToast();
  const [minScore, setMinScore] = useState<number | null>(null);
  const [radius, setRadius] = useState<number | null>(null);

  useEffect(() => {
    if (data) setSoundsEnabled(data.prefs.sounds);
  }, [data]);

  async function save(patch: Patch, msg?: string) {
    try {
      const next = await api<PrefsData>("/api/preferences", { method: "PATCH", body: patch });
      setData(next);
      setSoundsEnabled(next.prefs.sounds);
      play("tap");
      if (msg) toast({ tone: "success", title: msg });
      if (patch.visibility || patch.allowRequests !== undefined) void refresh();
    } catch (e) {
      toast({ tone: "error", title: "Couldn't save", body: (e as Error).message });
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  const p = data.prefs;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-serif text-[40px] leading-none tracking-tight text-ink">Preferences</h1>
        <p className="mt-2 text-[14px] text-muted">You decide who sees you, and when.</p>
      </div>

      {/* Ghost mode hero */}
      <motion.div layout className={cx("relative overflow-hidden rounded-3xl p-5 text-white transition-colors", p.ghostMode ? "bg-[#130f2e]" : "bg-ink")}>
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-violet-500/35 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className={cx("flex size-12 shrink-0 items-center justify-center rounded-2xl", p.ghostMode ? "bg-violet-400/25 text-violet-200" : "bg-white/10")}>
            <Ghost className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold">Ghost mode</p>
            <p className="text-[13px] text-white/65">{p.ghostMode ? "You're invisible on the map and in event lists." : "Vanish from the map instantly."}</p>
          </div>
          <button
            role="switch"
            aria-checked={p.ghostMode}
            onClick={() => save({ ghostMode: !p.ghostMode }, p.ghostMode ? "You're visible again" : "Ghost mode on 👻")}
            className={cx("relative h-8 w-14 shrink-0 rounded-full transition-colors", p.ghostMode ? "bg-violet-400" : "bg-white/20")}
          >
            <span className={cx("absolute top-1 size-6 rounded-full bg-white shadow transition-all", p.ghostMode ? "left-7" : "left-1")} />
          </button>
        </div>
      </motion.div>

      <Card className="divide-y divide-line">
        <Section icon={Eye} title="Who can find you">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "everyone", label: "Everyone", icon: Users },
                { id: "events", label: "My events", icon: MapPin },
                { id: "hidden", label: "Hidden", icon: Lock },
              ] as { id: Visibility; label: string; icon: typeof Users }[]
            ).map((o) => (
              <button
                key={o.id}
                onClick={() => save({ visibility: o.id }, "Visibility updated")}
                className={cx(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-[13px] font-medium transition-colors",
                  data.visibility === o.id ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2",
                )}
              >
                <o.icon className="size-4" /> {o.label}
              </button>
            ))}
          </div>
        </Section>
        <Section icon={MapPin} title="On the map">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "event", label: "Everyone at my event" },
                  { id: "compatible", label: "Only good matches" },
                ] as { id: Prefs["mapAudience"]; label: string }[]
              ).map((o) => (
                <button
                  key={o.id}
                  onClick={() => save({ mapAudience: o.id }, "Map audience updated")}
                  className={cx(
                    "rounded-2xl border p-3 text-[13px] font-medium transition-colors",
                    p.mapAudience === o.id ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line text-ink-2 hover:border-line-2",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Toggle checked={p.showZone} onChange={(v) => save({ showZone: v })} label="Show my zone" sub="Off = placed loosely around the venue." />
            <Toggle checked={data.allowRequests} onChange={(v) => save({ allowRequests: v })} label="Accept requests" />
          </div>
        </Section>
        <Section icon={Users} title="What you see">
          <div className="space-y-4">
            <Slider
              label="Minimum match on the map"
              value={minScore ?? p.minScore}
              min={0}
              max={90}
              step={5}
              suffix="%"
              onChange={setMinScore}
              onCommit={(v) => save({ minScore: v })}
            />
            <Slider
              label="Event radius"
              value={radius ?? p.radiusMiles}
              min={1}
              max={50}
              step={1}
              suffix=" mi"
              onChange={setRadius}
              onCommit={(v) => save({ radiusMiles: v })}
            />
            <Toggle checked={p.openNowOnly} onChange={(v) => save({ openNowOnly: v })} label="Only people open right now" />
          </div>
        </Section>
      </Card>

      {/* Safety */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-emerald-600" />
          <p className="text-[16px] font-semibold text-ink">Anti-stalking protection</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            { icon: Shuffle, t: `±${data.privacy.jitterMeters} m`, s: "Every pin is offset" },
            { icon: Timer, t: `${data.privacy.refreshMinutes} min`, s: "Offsets reshuffle" },
            { icon: Users, t: `${data.privacy.minCrowd}+ people`, s: "Or shown as a crowd" },
            { icon: EyeOff, t: `${data.privacy.maxViewsPerHour}/hour`, s: "Profile view limit" },
          ].map((x) => (
            <div key={x.s} className="rounded-2xl bg-canvas p-3">
              <x.icon className="size-4 text-brand-600" />
              <p className="mt-1.5 text-[15px] font-semibold text-ink">{x.t}</p>
              <p className="text-[12px] text-muted">{x.s}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-muted">No GPS is ever shared. Each viewer sees a different offset, so pins can&apos;t be triangulated.</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[16px] font-semibold text-ink">Who viewed you · 24h</p>
          <Toggle checked={p.viewTransparency} onChange={(v) => save({ viewTransparency: v })} label="" />
        </div>
        {!p.viewTransparency ? (
          <p className="mt-2 text-[13px] text-muted">Off — you also won&apos;t appear in others&apos; lists.</p>
        ) : data.viewers.length ? (
          <ul className="mt-3 space-y-2">
            {data.viewers.map((v) => (
              <li key={v.profile.id}>
                <Link href={`/people/${v.profile.id}`} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-canvas">
                  <Avatar name={v.profile.name} hue={v.profile.avatarHue} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">{v.profile.name}</span>
                    <span className="block truncate text-[12px] text-muted">{v.profile.headline}</span>
                  </span>
                  <span className="text-[11.5px] text-faint">{timeAgo(v.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted">No views yet.</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <UserX className="size-5 text-rose-500" />
          <p className="text-[16px] font-semibold text-ink">Blocked</p>
        </div>
        {data.blocked.length ? (
          <ul className="mt-3 space-y-2">
            {data.blocked.map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                <Avatar name={b.name} hue={b.avatarHue} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                    {b.name} {b.isDemo ? <DemoTag /> : null}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{b.headline}</span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => save({ unblock: b.id }, `Unblocked ${b.name.split(" ")[0]}`)}>
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted">Nobody. Block anyone from their profile — they vanish both ways.</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Volume2 className="size-5 text-brand-600" />
            <p className="text-[16px] font-semibold text-ink">Sound effects</p>
          </div>
          <Toggle
            checked={p.sounds}
            onChange={(v) => {
              setSoundsEnabled(v);
              void save({ sounds: v });
              if (v) setTimeout(() => play("success"), 50);
            }}
            label=""
          />
        </div>
      </Card>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Eye; title: string; children: React.ReactNode }) {
  return (
    <div className="p-5">
      <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Icon className="size-4 text-brand-600" /> {title}
      </p>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex justify-between text-[13.5px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-brand-700 tabular-nums">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="mt-2 w-full accent-[#6360f0]"
      />
    </label>
  );
}
