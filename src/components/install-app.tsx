"use client";

import { Download, ExternalLink, Smartphone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let promptEvent: InstallPrompt | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function prepareInstall() {
  if (started || typeof window === "undefined") return;
  started = true;
  installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => { installed = true; promptEvent = null; notify(); });
  if ("serviceWorker" in navigator && window.isSecureContext) {
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* Manual installation guidance stays available. */ });
  }
}

export function InstallAppButton({ className = "", label = "Download app", desktopOnly = false }: { className?: string; label?: string; desktopOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [isInstalled, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => { setReady(Boolean(promptEvent)); setInstalled(installed); };
    listeners.add(update);
    prepareInstall();
    update();
    return () => { listeners.delete(update); };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    return () => { dialog.current?.close(); };
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };

  async function install() {
    if (!promptEvent) return;
    const event = promptEvent;
    setBusy(true);
    setMessage("");
    try {
      await event.prompt();
      const choice = await event.userChoice;
      promptEvent = null;
      if (choice.outcome === "accepted") { installed = true; setOpen(false); }
      else setMessage("No problem. You can install Connected later from your browser menu.");
      notify();
    } catch { setMessage("Open your browser menu and choose Install app to continue."); }
    finally { setBusy(false); }
  }
  const button = (
    <button ref={trigger} type="button" className={`inline-flex ${className}`} onClick={() => setOpen(true)}>
      <Download className="size-4 shrink-0" /> {isInstalled ? "App installed" : label}
    </button>
  );
  return (
    <>
      {/* desktopOnly hides via a wrapper: callers pass their own display class (inline-flex), which would override `hidden`. */}
      {desktopOnly ? <span className="hidden sm:contents">{button}</span> : button}
      {open ? <dialog ref={dialog} onCancel={close} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }} aria-labelledby="install-connected-title" className="install-connected-dialog fixed inset-0 m-auto w-[calc(100%-32px)] max-w-md overflow-hidden rounded-3xl border border-line bg-white p-0 text-ink shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Smartphone className="size-6" /></span>
            <button aria-label="Close app installation" onClick={close} className="rounded-full p-2 text-muted hover:bg-canvas"><X className="size-5" /></button>
          </div>
          <h2 id="install-connected-title" className="mt-5 text-2xl font-semibold tracking-tight">{isInstalled ? "Connected is installed." : "A little closer to your people."}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Add Connected to your home screen or desktop. It opens in its own window, with the same profile and conversations.</p>
          {ready && !isInstalled ? <button onClick={install} disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 font-semibold text-white disabled:opacity-50"><Download className="size-4" />{busy ? "Opening installation…" : "Install Connected"}</button> : null}
          {!isInstalled ? <div className="mt-5 space-y-3 rounded-2xl bg-canvas p-4 text-sm leading-relaxed">
            <p><strong className="text-ink">iPhone & iPad</strong><br /><span className="text-muted">Open in Safari, tap Share, then Add to Home Screen.</span></p>
            <p><strong className="text-ink">Android & desktop</strong><br /><span className="text-muted">Open in Chrome or Edge, then choose Install app from the browser menu.</span></p>
          </div> : null}
          <p className="mt-4 text-xs leading-relaxed text-muted">Connected is an installable web app. No App Store download is required. An internet connection is needed for people, events, and chat.</p>
          {message ? <p role="status" className="mt-3 text-sm text-brand-700">{message}</p> : null}
          <a href="/home" onClick={close} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">Continue in browser <ExternalLink className="size-3.5" /></a>
        </div>
      </dialog> : null}
      <style>{".install-connected-dialog::backdrop{background:rgba(26,18,42,.35);backdrop-filter:blur(5px)}"}</style>
    </>
  );
}
