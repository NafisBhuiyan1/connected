import { subscribe } from "@/lib/server/bus";
import { canSubscribe } from "@/lib/server/services";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
const MAX_TOPICS = 12;
const HEARTBEAT_MS = 20_000;
const MAX_CONNECTION_MS = 120_000;

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const raw = new URL(req.url).searchParams.get("topics") ?? "";
  if (raw.length > 2_000) return new Response("Too many topics", { status: 400 });
  const requested = [...new Set(raw.split(",").map((t) => t.trim()).filter(Boolean))];
  if (requested.length > MAX_TOPICS) return new Response("Too many topics", { status: 400 });
  const topics = requested.filter((t) => /^(user|lounge|thread):[A-Za-z0-9_-]{1,80}$/.test(t) && canSubscribe(me, t));
  if (!topics.length) return new Response("No accessible topics", { status: 403 });

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      let checking = false;
      let needsPing = false;
      let ping: ReturnType<typeof setInterval> | undefined;
      let lifetime: ReturnType<typeof setTimeout> | undefined;
      const pending = new Set<string>();
      const offs: (() => void)[] = [];
      const close = () => {
        if (!open) return;
        open = false;
        clearInterval(ping);
        clearTimeout(lifetime);
        req.signal.removeEventListener("abort", close);
        for (const off of offs) off();
        pending.clear();
        try { controller.close(); } catch { /* cancelled already */ }
      };
      cleanup = close;
      const send = (text: string) => {
        if (!open) return;
        // Bound slow-reader memory; reconnect-ready refetches durable snapshots.
        if ((controller.desiredSize ?? 0) <= 0) { close(); return; }
        try { controller.enqueue(enc.encode(text)); } catch { close(); }
      };
      const flush = async () => {
        if (checking || !open) return;
        checking = true;
        try {
          // Recheck session expiry and current access before forwarding a ping.
          const current = await currentUser();
          if (!open) return;
          if (!current || current.id !== me.id || topics.some((t) => !canSubscribe(current, t))) { close(); return; }
          const changes = [...pending];
          pending.clear();
          for (const topic of changes) send(`data: ${JSON.stringify({ topic })}\n\n`);
          if (needsPing) { needsPing = false; send(": ping\n\n"); }
        } catch { close(); }
        finally {
          checking = false;
          if (open && (pending.size || needsPing)) void flush();
        }
      };
      req.signal.addEventListener("abort", close, { once: true });
      if (req.signal.aborted) { close(); return; }
      // Register first; ready causes a snapshot refetch covering establishment gaps.
      for (const t of topics) offs.push(subscribe(t, (topic) => { pending.add(topic); void flush(); }));
      send(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({ topics })}\n\n`);
      ping = setInterval(() => { needsPing = true; void flush(); }, HEARTBEAT_MS);
      // Reconnect to pick up browser cookie deletion or identity changes, too.
      lifetime = setTimeout(close, MAX_CONNECTION_MS);
    },
    cancel() { cleanup(); },
  }, { highWaterMark: 16 });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      Vary: "Cookie",
    },
  });
}
