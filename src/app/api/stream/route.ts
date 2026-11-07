import { subscribe } from "@/lib/server/bus";
import { canSubscribe } from "@/lib/server/services";
import { currentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

// Server-sent events: one connection per tab, multiplexing every topic the page cares about.
// Each message only says which topic changed; the client refetches through the normal APIs.

const MAX_TOPICS = 12;

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const requested = (new URL(req.url).searchParams.get("topics") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TOPICS);
  const topics = [...new Set(requested)].filter((t) => /^[a-z]+:[A-Za-z0-9_-]{1,80}$/.test(t) && canSubscribe(me, t));

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const send = (s: string) => {
        if (!open) return;
        try {
          controller.enqueue(enc.encode(s));
        } catch {
          open = false;
        }
      };
      send(`retry: 3000\nevent: ready\ndata: ${JSON.stringify({ topics })}\n\n`);
      const offs = topics.map((t) => subscribe(t, (topic) => send(`data: ${JSON.stringify({ topic })}\n\n`)));
      const ping = setInterval(() => send(`: ping\n\n`), 20_000);
      cleanup = () => {
        open = false;
        clearInterval(ping);
        for (const off of offs) off();
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
