"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Compass,
  Flag,
  Home,
  LogOut,
  MapPinned,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, timeAgo, useApi } from "@/lib/client";
import { useLive } from "@/lib/live";
import type { Notification } from "@/lib/types";
import { InstallAppButton } from "./install-app";
import { SessionProvider, useSession } from "./session";
import { Avatar, Badge, Button, cx } from "./ui";

const TOP_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/map", label: "Nearby", icon: MapPinned },
  { href: "/build", label: "Build", icon: Wand2, accent: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/coach", label: "Coach", icon: Sparkles },
  { href: "/connections", label: "Network", icon: Users, badge: true },
];

const MOBILE_TABS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/map", label: "Nearby", icon: MapPinned },
  { href: "/build", label: "Build", icon: Wand2, fab: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/connections", label: "Network", icon: Users, badge: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ShellInner>{children}</ShellInner>
    </SessionProvider>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/home" && pathname.startsWith(href));
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { me, loading, actingAsDemo } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const notes = useApi<{ items: Notification[]; unread: number }>(me ? "/api/notifications" : null, { poll: 30_000 });
  useLive([me && `user:${me.id}`], () => void notes.reload());
  const pendingIn = notes.data?.items.filter((n) => !n.read && (n.kind === "request" || n.kind === "team-invite")).length ?? 0;

  useEffect(() => {
    if (!loading && !me) router.replace("/login");
  }, [loading, me, router]);

  if (loading || !me) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.6, repeat: Infinity }}>
          <Logo />
        </motion.div>
      </div>
    );
  }

  const markRead = async () => {
    if (notes.data?.unread) {
      await api("/api/notifications", { method: "POST" });
      void notes.reload();
    }
  };

  return (
    <div className={cx("min-h-dvh bg-canvas", actingAsDemo && "pt-10")}>
      {actingAsDemo ? <DemoBanner name={me.name} /> : null}

      {/* Top navigation — LinkedIn-style layout, Connected colors */}
      <header className={cx("sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl", actingAsDemo && "top-10")}>
        <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/home" className="shrink-0" aria-label="Connected home">
            <Logo compact />
          </Link>
          <SearchBox />
          <nav className="ml-auto hidden h-full items-stretch md:flex">
            {TOP_NAV.map((n) => {
              const active = isActive(pathname, n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cx(
                    "group relative flex w-[78px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium transition-colors",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <span className={cx("relative flex size-7 items-center justify-center rounded-lg", n.accent && "bg-brand-600 text-white")}>
                    <Icon className={cx("size-[19px]", n.accent ? "text-white" : active ? "text-brand-600" : "")} />
                    {n.badge && pendingIn ? (
                      <span className="absolute -top-1 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                        {pendingIn}
                      </span>
                    ) : null}
                  </span>
                  {n.label}
                  {active ? <motion.span layoutId="topnav" className="absolute inset-x-3 bottom-0 h-[2.5px] rounded-full bg-brand-600" /> : null}
                </Link>
              );
            })}
            <NotificationsBell notes={notes.data} onOpen={markRead} labeled />
            <MeMenu />
          </nav>
          <div className="ml-auto flex items-center gap-0.5 md:hidden">
            <Link
              href="/coach"
              aria-label="AI coach"
              className={cx("focus-ring flex size-9 items-center justify-center rounded-xl transition-colors", isActive(pathname, "/coach") ? "bg-brand-50 text-brand-700" : "text-brand-600 hover:bg-brand-50")}
            >
              <Sparkles className="size-[19px]" />
            </Link>
            <NotificationsBell notes={notes.data} onOpen={markRead} />
            <MeMenu compact />
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-32 sm:px-6 sm:pt-6 md:pb-16">{children}</div>
      </main>

      {/* Mobile bottom nav — floating glass bar with a raised Build button */}
      <nav className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-30 md:hidden">
        <div className="relative grid grid-cols-5 items-end rounded-[22px] border border-line bg-white/90 px-1 py-1.5 shadow-[0_12px_32px_-12px_rgba(76,29,149,0.28)] backdrop-blur-xl">
          {MOBILE_TABS.map((n) => {
            const active = isActive(pathname, n.href);
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

function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/discover?q=${encodeURIComponent(q.trim())}` : "/discover");
      }}
      className="relative hidden w-full max-w-[280px] sm:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people, skills, goals"
        aria-label="Search"
        className="h-9 w-full rounded-xl border border-transparent bg-canvas pr-3 pl-9 text-[13.5px] text-ink outline-none placeholder:text-faint focus:border-brand-200 focus:bg-white focus:ring-4 focus:ring-brand-100"
      />
    </form>
  );
}

function useClickOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [open, close]);
  return ref;
}

function NotificationsBell({ notes, onOpen, labeled }: { notes: { items: Notification[]; unread: number } | null; onOpen: () => void; labeled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  const unread = notes?.unread ?? 0;
  return (
    <div className="relative flex" ref={ref}>
      <button
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) onOpen();
        }}
        className={cx(
          "focus-ring relative flex items-center justify-center text-muted transition-colors hover:text-ink",
          labeled ? "w-[78px] flex-col gap-0.5 text-[11.5px] font-medium" : "size-9 rounded-xl hover:bg-canvas",
        )}
      >
        <span className="relative flex size-7 items-center justify-center">
          <Bell className="size-[19px]" />
          <AnimatePresence>
            {unread ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-1 -right-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
        {labeled ? "Alerts" : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
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
                <p className="px-4 py-8 text-center text-sm text-muted">All caught up.</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MeMenu({ compact }: { compact?: boolean }) {
  const { me, demoMode, ai } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(open, () => setOpen(false));
  if (!me) return null;
  const items = [
    { href: "/profile", label: "My profile", icon: UserRound },
    { href: "/preferences", label: "Preferences & safety", icon: ShieldCheck },
    { href: "/discover", label: "Discover people", icon: Compass },
    { href: "/missions", label: "Missions", icon: Flag },
    ...(demoMode ? [{ href: "/demo", label: "Demo control room", icon: Settings2 }] : []),
  ];
  return (
    <div className="relative flex" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className={cx("focus-ring flex items-center justify-center text-muted hover:text-ink", compact ? "size-9 rounded-xl" : "w-[78px] flex-col gap-0.5 text-[11.5px] font-medium")}
      >
        <Avatar name={me.name} hue={me.avatarHue} size={compact ? 30 : 26} />
        {compact ? null : (
          <span className="flex items-center gap-0.5">
            Me <ChevronDown className="size-3" />
          </span>
        )}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]"
          >
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-line p-4 hover:bg-canvas">
              <Avatar name={me.name} hue={me.avatarHue} size={42} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink">{me.name}</p>
                <p className="truncate text-[12px] text-muted">{me.headline}</p>
              </div>
            </Link>
            <div className="p-1.5">
              {items.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] text-ink-2 hover:bg-canvas hover:text-ink">
                  <it.icon className="size-4 text-faint" /> {it.label}
                </Link>
              ))}
              {/* The landing's install button is desktop-only; this is the phone (and desktop) entry point. */}
              <InstallAppButton label="Install the app" className="w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] text-ink-2 hover:bg-canvas hover:text-ink [&>svg]:text-faint" />
              <button
                onClick={async () => {
                  await api("/api/session", { method: "DELETE" });
                  router.push("/login");
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] text-ink-2 hover:bg-canvas hover:text-ink"
              >
                <LogOut className="size-4 text-faint" /> Sign out
              </button>
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted">
              <span className={cx("mr-1.5 inline-block size-1.5 rounded-full align-middle", ai ? "bg-emerald-500" : "bg-amber-400")} />
              {ai ? "Claude on" : "Rules engine (no AI key)"}
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
        Acting as <b>{name}</b> (fictional)
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
        Back
      </Button>
    </div>
  );
}

/** Brand mark. `onDark` for cinematic pages; `compact` hides the wordmark on small screens. */
export function Logo({ small, onDark, compact }: { small?: boolean; onDark?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx("brand-gradient relative inline-flex items-center justify-center rounded-[10px] shadow-[0_6px_16px_-6px_rgba(81,69,224,0.6)]", small ? "size-7" : "size-8")}>
        <svg viewBox="0 0 32 32" className={small ? "size-5" : "size-6"} fill="none" stroke="white" strokeWidth="3">
          <circle cx="12" cy="16" r="5.5" />
          <circle cx="20" cy="16" r="5.5" opacity="0.85" />
        </svg>
      </span>
      <span className={cx("font-semibold tracking-tight", onDark ? "text-bone" : "text-ink", small ? "text-[15px]" : "text-[17px]", compact && "hidden lg:inline")}>Connected</span>
    </span>
  );
}

export { Compass };
