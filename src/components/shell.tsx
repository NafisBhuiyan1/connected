"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CalendarDays,
  Compass,
  Flag,
  Home,
  LogOut,
  Network,
  Search,
  Sparkles,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, timeAgo, useApi } from "@/lib/client";
import type { Notification } from "@/lib/types";
import { SessionProvider, useSession } from "./session";
import { Avatar, Badge, Button, cx } from "./ui";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/build", label: "Team Builder", icon: Wand2, accent: true },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/missions", label: "Missions", icon: Flag },
  { href: "/connections", label: "Connections", icon: Users, badge: "connections" as const },
  { href: "/graph", label: "Graph", icon: Network },
  { href: "/profile", label: "Profile", icon: UserRound },
];
const MOBILE_TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/build", label: "Build", icon: Wand2, fab: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/connections", label: "People", icon: Users, badge: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ShellInner>{children}</ShellInner>
    </SessionProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { me, loading, actingAsDemo, demoMode, ai } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const notes = useApi<{ items: Notification[]; unread: number }>(me ? "/api/notifications" : null, { poll: 4000 });
  const pendingIn = notes.data?.items.filter((n) => !n.read && (n.kind === "request" || n.kind === "team-invite")).length ?? 0;

  useEffect(() => {
    if (!loading && !me) router.replace("/onboarding");
  }, [loading, me, router]);

  if (loading || !me) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Logo />
      </div>
    );
  }

  return (
    <div className={cx("min-h-dvh", actingAsDemo && "pt-10")}>
      {actingAsDemo ? <DemoBanner name={me.name} /> : null}
      {/* Sidebar */}
      <aside className={cx("fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-surface/80 px-3 py-4 backdrop-blur md:flex", actingAsDemo && "top-10")}>
        <Link href="/home" className="mb-6 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/home" && pathname.startsWith(n.href));
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cx(
                  "focus-ring group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-700" : "text-ink-2 hover:bg-canvas hover:text-ink",
                )}
              >
                {active ? <motion.span layoutId="nav-active" className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand-600" /> : null}
                <Icon className={cx("size-[18px]", active ? "text-brand-600" : "text-faint group-hover:text-ink-2")} />
                <span className="flex-1">{n.label}</span>
                {n.accent ? <Sparkles className="size-3.5 text-violet-500" /> : null}
                {n.badge && pendingIn ? <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{pendingIn}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          <div className="px-2 text-[11.5px] leading-snug text-muted">
            <span className={cx("mr-1 inline-block size-1.5 rounded-full align-middle", ai ? "bg-emerald-500" : "bg-amber-400")} />
            {ai ? "Claude is on for goals & intros" : "Rules engine (no AI key set)"}
          </div>
          {demoMode ? (
            <Link href="/demo" className="block rounded-xl px-2 py-1.5 text-[12.5px] font-medium text-muted hover:bg-canvas hover:text-ink">
              Demo control room →
            </Link>
          ) : null}
          <Link href="/profile" className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-canvas">
            <Avatar name={me.name} hue={me.avatarHue} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{me.name}</p>
              <p className="truncate text-[11.5px] text-muted">{me.headline}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Top bar */}
      <header className={cx("sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur md:ml-[232px]", actingAsDemo && "top-10")}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/home" className="md:hidden">
            <Logo small />
          </Link>
          <div className="hidden text-[13px] text-muted md:block">
            <span className="font-medium text-ink-2">Find your people.</span> Build what&apos;s next.
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1.5">
            <Link href="/missions" aria-label="Missions" className="inline-flex size-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface md:hidden">
              <Flag className="size-[18px]" />
            </Link>
            <Link href="/graph" aria-label="Opportunity graph" className="inline-flex size-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface md:hidden">
              <Network className="size-[18px]" />
            </Link>
            <NotificationsBell notes={notes.data} onOpen={async () => {
              if (notes.data?.unread) {
                await api("/api/notifications", { method: "POST" });
                void notes.reload();
              }
            }} />
            <Link href="/profile" className="md:hidden">
              <Avatar name={me.name} hue={me.avatarHue} size={32} />
            </Link>
          </div>
        </div>
      </header>

      <main className="md:ml-[232px]">
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-32 sm:px-6 sm:pt-6 md:pb-16">{children}</div>
      </main>

      {/* Mobile bottom nav — floating glass bar with a raised Build button */}
      <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 md:hidden">
        <div className="relative grid grid-cols-5 items-end rounded-[22px] border border-white/60 bg-white/80 px-1 py-1.5 shadow-[0_12px_40px_-12px_rgba(30,24,110,0.35)] backdrop-blur-xl">
          {MOBILE_TABS.map((n) => {
            const active = pathname === n.href || (n.href !== "/home" && pathname.startsWith(n.href));
            const Icon = n.icon;
            if (n.fab)
              return (
                <Link key={n.href} href={n.href} aria-label="Team Builder" className="flex flex-col items-center">
                  <span className={cx("brand-gradient -mt-7 flex size-14 items-center justify-center rounded-2xl text-white shadow-[0_12px_24px_-8px_rgba(81,69,224,0.7)] ring-4 ring-canvas transition-transform active:scale-95", active && "scale-105")}>
                    <Icon className="size-6" />
                  </span>
                  <span className={cx("mt-0.5 text-[10.5px] font-semibold", active ? "text-brand-700" : "text-ink-2")}>Build</span>
                </Link>
              );
            return (
              <Link key={n.href} href={n.href} className={cx("relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-medium transition-colors", active ? "text-brand-700" : "text-muted")}>
                {active ? <motion.span layoutId="mnav" className="absolute inset-x-2 inset-y-0 rounded-2xl bg-brand-50" transition={{ type: "spring", stiffness: 500, damping: 36 }} /> : null}
                <Icon className="relative size-[21px]" />
                <span className="relative">{n.label}</span>
                {n.badge && pendingIn ? <span className="absolute top-1 right-[26%] size-2 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function NotificationsBell({ notes, onOpen }: { notes: { items: Notification[]; unread: number } | null; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open]);
  const unread = notes?.unread ?? 0;
  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) onOpen();
        }}
        className="focus-ring relative inline-flex size-9 items-center justify-center rounded-xl text-ink-2 hover:bg-surface hover:text-ink"
      >
        <Bell className="size-[18px]" />
        <AnimatePresence>
          {unread ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
              {unread}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
          >
            <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notifications</div>
            <div className="max-h-[60vh] overflow-y-auto">
              {notes?.items.length ? (
                notes.items.map((n) => (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className={cx("block border-b border-line/70 px-4 py-3 hover:bg-canvas", !n.read && "bg-brand-50/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13.5px] font-medium text-ink">{n.title}</p>
                      <span className="shrink-0 text-[11px] text-faint">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">{n.body}</p>
                  </Link>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DemoBanner({ name }: { name: string }) {
  const { refresh } = useSession();
  const router = useRouter();
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-10 items-center justify-center gap-3 bg-ink px-4 text-[12.5px] text-white">
      <Badge tone="amber" className="border-amber-300/40 bg-amber-400/15 text-amber-200">
        Demo
      </Badge>
      <span className="truncate">
        You&apos;re acting as <b>{name}</b>, a fictional demo persona.
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 border-white/20 bg-white/10 text-white hover:bg-white/20"
        icon={<LogOut className="size-3.5" />}
        onClick={async () => {
          await api("/api/demo", { body: { action: "return" } });
          await refresh();
          router.push("/home");
        }}
      >
        Back to my account
      </Button>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx("brand-gradient relative inline-flex items-center justify-center rounded-[10px] shadow-[0_6px_16px_-6px_rgba(81,69,224,0.6)]", small ? "size-7" : "size-8")}>
        <svg viewBox="0 0 32 32" className={small ? "size-5" : "size-6"} fill="none" stroke="white" strokeWidth="3">
          <circle cx="12" cy="16" r="5.5" />
          <circle cx="20" cy="16" r="5.5" opacity="0.85" />
        </svg>
      </span>
      <span className={cx("font-semibold tracking-tight text-ink", small ? "text-[15px]" : "text-[17px]")}>Connected</span>
    </span>
  );
}

export { Compass };
