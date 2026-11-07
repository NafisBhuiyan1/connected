"use client";

import { motion } from "motion/react";
import { ArrowLeftRight, Clapperboard, LogOut, RotateCcw, Search, ShieldAlert, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session";
import { useToast } from "@/components/toast";
import { Avatar, Badge, Button, Card, DemoTag, Empty, ErrorBox, Input, PageHeader, Skeleton } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";

interface Persona {
  id: string;
  name: string;
  headline: string;
  hue: number;
  pending: number;
}
interface DemoInfo {
  me: { id: string; name: string; isDemo: boolean } | null;
  original: { id: string; name: string } | null;
  personas: Persona[];
  realUsers: { id: string; name: string }[];
  seededAt: string;
}

const SCRIPT = [
  { t: "0:00", text: "Judge creates a profile (or uses the sample) and joins CrownHacks." },
  { t: "0:15", text: "Team Builder: “I want to build an AI startup but need a developer and designer.”" },
  { t: "0:35", text: "Connected shows the roles, the optimized team, coverage and why each person fits." },
  { t: "0:50", text: "Invite the team. Then come here → act as an invited persona → accept." },
  { t: "1:05", text: "Back to the judge's account: team formed, team room open, meeting spot suggested." },
];

export default function DemoPage() {
  const demo = useApi<DemoInfo>("/api/demo");
  const { refresh } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const personas = useMemo(() => {
    const list = demo.data?.personas ?? [];
    const t = q.trim().toLowerCase();
    return list
      .filter((p) => !t || p.name.toLowerCase().includes(t) || p.headline.toLowerCase().includes(t))
      .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));
  }, [demo.data, q]);

  async function actAs(p: Persona) {
    setBusy(p.id);
    try {
      await api("/api/demo", { body: { action: "act-as", userId: p.id } });
      await refresh();
      toast({ tone: "info", title: `Now acting as ${p.name}`, body: "A fictional demo persona. Use “Back to my account” in the banner when done." });
      router.push("/connections");
    } catch (e) {
      toast({ tone: "error", title: "Couldn't switch", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function goBack() {
    setBusy("return");
    try {
      await api("/api/demo", { body: { action: "return" } });
      await refresh();
      router.push("/home");
    } catch (e) {
      toast({ tone: "error", title: "Couldn't switch back", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    if (!window.confirm("Reset all demo data? Fictional personas, their requests and teams go back to the starting state. Real user profiles are kept.")) return;
    setBusy("reset");
    try {
      await api("/api/demo", { body: { action: "reset" } });
      toast({ tone: "success", title: "Demo data reset", body: "Personas, teams and requests are back to the starting state." });
      await demo.reload();
      await refresh();
    } catch (e) {
      toast({ tone: "error", title: "Reset failed", body: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const off = demo.error && /demo mode is off|404/i.test(demo.error);

  return (
    <div>
      <PageHeader
        eyebrow="Demo control room"
        title="Run the live demo"
        sub="For live demos: act as a fictional persona to accept a request, then come back. Every persona is clearly labeled as demo data — this never works for real accounts."
        action={
          demo.data?.original ? (
            <Button onClick={goBack} loading={busy === "return"} icon={<LogOut className="size-4" />}>
              Back to {demo.data.original.name.split(" ")[0]}
            </Button>
          ) : undefined
        }
      />

      {off ? (
        <Empty icon={<ShieldAlert className="size-5" />} title="Demo mode is off" body="Set DEMO_MODE=on in the server environment to use persona switching." />
      ) : demo.error ? (
        <ErrorBox message={demo.error} onRetry={demo.reload} />
      ) : null}

      {!off && !demo.error ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[15px] font-semibold text-ink">Demo personas</p>
                <p className="text-[13px] text-muted">People with pending requests or team invites are listed first.</p>
              </div>
              <div className="relative sm:w-60">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search personas" className="pl-9" />
              </div>
            </div>
            {demo.loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {personas.map((p, i) => {
                  const current = demo.data?.me?.id === p.id;
                  return (
                    <motion.li
                      key={p.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(0.3, i * 0.015) }}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={p.name} hue={p.hue} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[14px] font-semibold text-ink">{p.name}</p>
                            <DemoTag />
                          </div>
                          <p className="truncate text-[12.5px] text-muted">{p.headline}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {p.pending ? <Badge tone="amber">{p.pending} pending</Badge> : null}
                        {current ? (
                          <Badge tone="brand" icon={<UserRoundCheck className="size-3" />}>
                            Active
                          </Badge>
                        ) : (
                          <Button size="sm" variant={p.pending ? "primary" : "secondary"} loading={busy === p.id} onClick={() => actAs(p)} icon={<ArrowLeftRight className="size-3.5" />}>
                            Act as
                          </Button>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
                {!personas.length ? <li className="py-6 text-center text-[13px] text-muted">No personas match “{q}”.</li> : null}
              </ul>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clapperboard className="size-4 text-brand-600" />
                <p className="text-[14px] font-semibold text-ink">60–90 second demo</p>
              </div>
              <ol className="space-y-2.5">
                {SCRIPT.map((s) => (
                  <li key={s.t} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-700">{s.t}</span>
                    <span className="text-[13px] leading-snug text-ink-2">{s.text}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="p-4">
              <p className="text-[14px] font-semibold text-ink">Session</p>
              <p className="mt-1 text-[13px] text-muted">
                Signed in as <b className="text-ink">{demo.data?.me?.name ?? "—"}</b>
                {demo.data?.me?.isDemo ? " (demo persona)" : ""}.
              </p>
              {demo.data?.original ? (
                <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={goBack} loading={busy === "return"} icon={<LogOut className="size-3.5" />}>
                  Back to {demo.data.original.name}
                </Button>
              ) : null}
              {demo.data?.realUsers.length ? (
                <p className="mt-3 text-[12px] text-muted">
                  {demo.data.realUsers.length} real {demo.data.realUsers.length === 1 ? "profile" : "profiles"} on this server (kept on reset).
                </p>
              ) : null}
            </Card>

            <Card className="p-4">
              <p className="text-[14px] font-semibold text-ink">Reset demo data</p>
              <p className="mt-1 text-[13px] text-muted">
                Puts personas, their requests and teams back to the starting state. Real profiles stay.
                {demo.data?.seededAt ? ` Last seeded ${fmtDateTime(demo.data.seededAt)}.` : ""}
              </p>
              <Button variant="danger" size="sm" className="mt-3 w-full" onClick={reset} loading={busy === "reset"} icon={<RotateCcw className="size-3.5" />}>
                Reset demo data
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
