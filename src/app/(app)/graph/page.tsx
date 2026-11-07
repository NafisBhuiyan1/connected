"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Network, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, Card, cx, Empty, ErrorBox, PageHeader, Skeleton, Toggle } from "@/components/ui";
import { useApi } from "@/lib/client";

// Local copies of the server graph types (services.ts is server-only).
type NodeType = "me" | "person" | "skill" | "interest" | "event" | "team";
type EdgeKind = "connected" | "match" | "has-skill" | "needs" | "interest" | "attending" | "team";

interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sub?: string;
  hue?: number;
  score?: number;
  connected?: boolean;
  href?: string;
}
interface GraphEdge {
  source: string;
  target: string;
  label: string;
  kind: EdgeKind;
}

interface Placed extends GraphNode {
  x: number;
  y: number;
  hw: number; // half width of the collision box
  hh: number; // half height of the collision box
  w: number; // pill width (non-person nodes)
}

const EDGE_STYLE: Record<EdgeKind, { color: string; width: number; dash?: string; label: string }> = {
  connected: { color: "#5145e0", width: 2.2, label: "Connected" },
  match: { color: "#7f81f8", width: 1.5, dash: "5 5", label: "Recommended for you" },
  needs: { color: "#8b5cf6", width: 1.5, dash: "2 5", label: "Role you need" },
  "has-skill": { color: "#8b5cf6", width: 1.4, label: "Can fill that role" },
  interest: { color: "#0ea5e9", width: 1.3, label: "Shared interest" },
  attending: { color: "#f59e0b", width: 1.3, label: "Attending event" },
  team: { color: "#10b981", width: 2.2, label: "Team member" },
};

const NODE_STYLE: Record<Exclude<NodeType, "me" | "person">, { fill: string; stroke: string; text: string; tag: string }> = {
  skill: { fill: "#f3efff", stroke: "#c4b5fd", text: "#5b21b6", tag: "Role" },
  interest: { fill: "#f0f9ff", stroke: "#7dd3fc", text: "#075985", tag: "Interest" },
  event: { fill: "#fffbeb", stroke: "#fcd34d", text: "#92400e", tag: "Event" },
  team: { fill: "#ecfdf5", stroke: "#6ee7b7", text: "#065f46", tag: "Team" },
};

const TYPE_LABEL: Record<NodeType, string> = {
  me: "You",
  person: "Person",
  skill: "Role",
  interest: "Interest",
  event: "Event",
  team: "Team",
};

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const initials = (name: string) =>
  name
    .replace(/^Dr\.\s+/, "")
    .split(/\s+/)
    .map((x) => x[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
const firstName = (name: string) => name.replace(/^Dr\.\s+/, "").split(" ")[0] ?? name;

function scoreColor(score?: number) {
  if (score === undefined) return "#c7cbff";
  if (score >= 80) return "#5145e0";
  if (score >= 60) return "#7a5af8";
  return "#a3a8c4";
}

/** Deterministic radial layout + a short collision-relaxation pass. */
function layout(nodes: GraphNode[], edges: GraphEdge[]): Placed[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const placed = new Map<string, Placed>();
  const target = new Map<string, { x: number; y: number }>();

  const boxFor = (n: GraphNode): { hw: number; hh: number; w: number } => {
    if (n.type === "me") return { hw: 46, hh: 50, w: 0 };
    if (n.type === "person") return { hw: 42, hh: 38, w: 0 };
    const w = Math.max(76, Math.min(176, trunc(n.label, 22).length * 6.6 + 30));
    return { hw: w / 2 + 6, hh: 20, w };
  };

  const me = nodes.find((n) => n.type === "me");
  if (me) {
    placed.set(me.id, { ...me, x: 0, y: 0, ...boxFor(me) });
    target.set(me.id, { x: 0, y: 0 });
  }

  const people = nodes
    .filter((n) => n.type === "person")
    .sort((a, b) => Number(Boolean(b.connected)) - Number(Boolean(a.connected)) || (b.score ?? 0) - (a.score ?? 0));
  const angleOf = new Map<string, number>();
  people.forEach((p, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, people.length);
    const r = people.length <= 3 ? 190 : p.connected ? 200 : 275;
    angleOf.set(p.id, a);
    const pos = { x: Math.cos(a) * r, y: Math.sin(a) * r };
    placed.set(p.id, { ...p, ...pos, ...boxFor(p) });
    target.set(p.id, pos);
  });

  // Outer ring: place each concept node at the circular mean of the people it links to.
  const outer = nodes.filter((n) => n.type !== "me" && n.type !== "person");
  const withAngle: { n: GraphNode; a: number }[] = [];
  const orphans: GraphNode[] = [];
  for (const n of outer) {
    let sx = 0;
    let sy = 0;
    let k = 0;
    for (const e of edges) {
      const other = e.source === n.id ? e.target : e.target === n.id ? e.source : null;
      if (!other) continue;
      const a = angleOf.get(other);
      if (a === undefined) continue;
      sx += Math.cos(a);
      sy += Math.sin(a);
      k++;
    }
    if (k && (Math.abs(sx) > 1e-6 || Math.abs(sy) > 1e-6)) withAngle.push({ n, a: Math.atan2(sy, sx) });
    else orphans.push(n);
  }
  orphans.forEach((n, i) => withAngle.push({ n, a: -Math.PI / 2 + Math.PI / Math.max(1, orphans.length) + (i * 2 * Math.PI) / Math.max(1, orphans.length) }));

  // Spread nodes that would overlap on the ring.
  withAngle.sort((a, b) => a.a - b.a);
  const sep = Math.min(0.5, (2 * Math.PI) / Math.max(1, withAngle.length));
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < withAngle.length; i++) {
      const a = withAngle[i];
      const b = withAngle[(i + 1) % withAngle.length];
      if (withAngle.length < 2) break;
      let d = b.a - a.a;
      if (i === withAngle.length - 1) d += 2 * Math.PI;
      if (d < sep) {
        const push = (sep - d) / 2;
        a.a -= push;
        b.a += push;
      }
    }
  }
  const outerR = people.length > 6 ? 440 : 380;
  withAngle.forEach(({ n, a }, i) => {
    const r = outerR + (i % 2 ? 34 : 0); // stagger to give long labels room
    const pos = { x: Math.cos(a) * r, y: Math.sin(a) * r };
    placed.set(n.id, { ...n, ...pos, ...boxFor(n) });
    target.set(n.id, pos);
  });

  // Collision relaxation: resolve box overlaps, gently pull toward the radial targets.
  const list = [...placed.values()];
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const ox = a.hw + b.hw - Math.abs(dx);
        const oy = a.hh + b.hh - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          const aFixed = a.type === "me";
          const bFixed = b.type === "me";
          const share = aFixed || bFixed ? 1 : 0.5;
          if (ox < oy) {
            const s = (dx >= 0 ? 1 : -1) * ox * share;
            if (!aFixed) a.x -= s;
            if (!bFixed) b.x += s;
          } else {
            const s = (dy >= 0 ? 1 : -1) * oy * share;
            if (!aFixed) a.y -= s;
            if (!bFixed) b.y += s;
          }
        }
      }
    }
    for (const n of list) {
      if (n.type === "me") continue;
      const t = target.get(n.id);
      if (!t) continue;
      n.x += (t.x - n.x) * 0.04;
      n.y += (t.y - n.y) * 0.04;
    }
  }
  void byId;
  return list;
}

export default function GraphPage() {
  const g = useApi<{ nodes: GraphNode[]; edges: GraphEdge[] }>("/api/graph");
  const [onlyConnections, setOnlyConnections] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const allNodes = g.data?.nodes ?? [];
    const ids = new Set(allNodes.map((n) => n.id));
    const allEdges = (g.data?.edges ?? []).filter((e) => ids.has(e.source) && ids.has(e.target));
    if (!onlyConnections) return { nodes: allNodes, edges: allEdges };
    const keepPeople = new Set(allNodes.filter((n) => n.type === "person" && n.connected).map((n) => n.id));
    const keep = new Set<string>([...allNodes.filter((n) => n.type === "me").map((n) => n.id), ...keepPeople]);
    for (const n of allNodes) {
      if (n.type === "me" || n.type === "person") continue;
      if (allEdges.some((e) => (e.source === n.id && keepPeople.has(e.target)) || (e.target === n.id && keepPeople.has(e.source)))) keep.add(n.id);
    }
    return {
      nodes: allNodes.filter((n) => keep.has(n.id)),
      edges: allEdges.filter((e) => keep.has(e.source) && keep.has(e.target)),
    };
  }, [g.data, onlyConnections]);

  const placed = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const pos = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);

  const viewBox = useMemo(() => {
    if (!placed.length) return { x: -300, y: -200, w: 600, h: 400 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of placed) {
      minX = Math.min(minX, p.x - p.hw);
      maxX = Math.max(maxX, p.x + p.hw);
      minY = Math.min(minY, p.y - p.hh);
      maxY = Math.max(maxY, p.y + p.hh);
    }
    const pad = 28;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }, [placed]);

  const focusId = hovered ?? selected;
  const neighborhood = useMemo(() => {
    if (!focusId) return null;
    const s = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.source === focusId) s.add(e.target);
      if (e.target === focusId) s.add(e.source);
    }
    return s;
  }, [focusId, edges]);

  const selectedNode = selected ? pos.get(selected) : undefined;
  const selectedEdges = selected ? edges.filter((e) => e.source === selected || e.target === selected) : [];

  const people = nodes.filter((n) => n.type === "person");
  const connectedCount = people.filter((n) => n.connected).length;
  const recommendedCount = people.length - connectedCount;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div>
      <PageHeader
        eyebrow="Connection graph"
        title="Your opportunity map"
        sub="Why each person is recommended, which roles they could fill, and where you'll actually meet them. Hover to trace a connection, click for details."
      />

      {g.error ? <ErrorBox message={g.error} onRetry={g.reload} /> : null}

      {g.loading ? (
        <Card className="p-6">
          <Skeleton className="mx-auto aspect-[4/3] w-full max-w-3xl rounded-3xl" />
        </Card>
      ) : null}

      {!g.loading && !g.error && people.length === 0 && !onlyConnections ? (
        <Empty
          icon={<Network className="size-5" />}
          title="Your graph is empty for now"
          body="Add skills, interests and a current ask to your profile, or join an event — Connected will map who you should meet and why."
          action={
            <ButtonLink href="/discover" icon={<Search className="size-4" />}>
              Discover people
            </ButtonLink>
          }
        />
      ) : null}

      {!g.loading && g.data && (people.length > 0 || onlyConnections) ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="brand">{connectedCount} connected</Badge>
                <Badge tone="violet">{recommendedCount} recommended</Badge>
                <Badge>{nodes.filter((n) => n.type !== "me" && n.type !== "person").length} roles, interests &amp; events</Badge>
              </div>
              <div className="w-full sm:w-auto">
                <Toggle checked={onlyConnections} onChange={(v) => { setOnlyConnections(v); setSelected(null); }} label="Only connections" />
              </div>
            </div>
            {onlyConnections && connectedCount === 0 ? (
              <div className="p-6">
                <Empty title="No connections yet" body="Turn the toggle off to see who Connected recommends — then send a request with a specific ask." />
              </div>
            ) : (
              <div className="relative bg-[radial-gradient(circle_at_center,rgba(99,96,240,0.06),transparent_70%)]">
                <svg
                  viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                  className="block h-auto max-h-[72vh] w-full select-none"
                  role="img"
                  aria-label="Graph of your connections and recommendations"
                  onClick={() => setSelected(null)}
                >
                  <defs>
                    <linearGradient id="g-me" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#5145e0" />
                      <stop offset="1" stopColor="#9b6bff" />
                    </linearGradient>
                  </defs>
                  {/* guide rings */}
                  <circle cx={0} cy={0} r={200} fill="none" stroke="#e6e7ef" strokeDasharray="2 6" />
                  <circle cx={0} cy={0} r={275} fill="none" stroke="#eef0f5" strokeDasharray="2 8" />

                  {edges.map((e, i) => {
                    const a = pos.get(e.source);
                    const b = pos.get(e.target);
                    if (!a || !b) return null;
                    const st = EDGE_STYLE[e.kind];
                    const active = !neighborhood || (neighborhood.has(e.source) && neighborhood.has(e.target) && (e.source === focusId || e.target === focusId));
                    const mx = (a.x + b.x) / 2;
                    const my = (a.y + b.y) / 2;
                    const cx2 = mx * 0.92;
                    const cy2 = my * 0.92;
                    return (
                      <path
                        key={`${e.source}-${e.target}-${i}`}
                        d={`M ${a.x} ${a.y} Q ${cx2} ${cy2} ${b.x} ${b.y}`}
                        fill="none"
                        stroke={st.color}
                        strokeWidth={active && focusId ? st.width + 0.8 : st.width}
                        strokeDasharray={st.dash}
                        strokeLinecap="round"
                        opacity={active ? (focusId ? 0.95 : 0.55) : 0.07}
                        style={{ transition: "opacity 180ms, stroke-width 180ms" }}
                      >
                        <title>{e.label}</title>
                      </path>
                    );
                  })}

                  {placed.map((n, i) => {
                    const dim = neighborhood ? !neighborhood.has(n.id) : false;
                    const isSel = selected === n.id;
                    return (
                      <g
                        key={n.id}
                        transform={`translate(${n.x} ${n.y})`}
                        className="cursor-pointer"
                        opacity={dim ? 0.18 : 1}
                        style={{ transition: "opacity 180ms" }}
                        onMouseEnter={() => setHovered(n.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setSelected((s) => (s === n.id ? null : n.id));
                        }}
                        role="button"
                        aria-label={`${TYPE_LABEL[n.type]}: ${n.label}`}
                      >
                        <motion.g
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4, delay: Math.min(0.6, i * 0.025), ease: [0.2, 0.7, 0.2, 1] }}
                          style={{ transformBox: "fill-box", transformOrigin: "center" }}
                        >
                          <NodeShape n={n} selected={isSel} />
                        </motion.g>
                      </g>
                    );
                  })}
                </svg>
                <p className="pointer-events-none absolute bottom-2 left-3 text-[11px] text-faint">Scores are algorithmic compatibility estimates.</p>
              </div>
            )}
            <Legend />
          </Card>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div key={selectedNode.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18 }}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge tone={selectedNode.type === "person" ? "brand" : selectedNode.type === "event" ? "amber" : selectedNode.type === "team" ? "green" : selectedNode.type === "interest" ? "sky" : selectedNode.type === "me" ? "brand" : "violet"}>
                          {selectedNode.type === "person" ? (selectedNode.connected ? "Connected" : "Recommended") : TYPE_LABEL[selectedNode.type]}
                        </Badge>
                        <p className="mt-2 text-[16px] font-semibold tracking-tight text-ink">{selectedNode.label}</p>
                        {selectedNode.sub ? <p className="mt-0.5 text-[13px] text-muted">{selectedNode.sub}</p> : null}
                      </div>
                      <button aria-label="Close details" onClick={() => setSelected(null)} className="focus-ring -m-1 rounded-lg p-1 text-faint hover:bg-canvas hover:text-ink">
                        <X className="size-4" />
                      </button>
                    </div>
                    {selectedNode.type === "person" && selectedNode.score !== undefined ? (
                      <p className="mt-2 text-[12.5px] text-ink-2">
                        Compatibility estimate: <b className="tabular-nums">{selectedNode.score}</b>/100
                      </p>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {selectedEdges.length ? (
                        selectedEdges.map((e, i) => {
                          const otherId = e.source === selectedNode.id ? e.target : e.source;
                          const other = nodeById.get(otherId);
                          return (
                            <li key={i} className="flex gap-2 rounded-xl bg-canvas px-3 py-2">
                              <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: EDGE_STYLE[e.kind].color }} />
                              <div className="min-w-0">
                                <p className="text-[13px] leading-snug text-ink">{e.label}</p>
                                {other ? (
                                  <button onClick={() => setSelected(otherId)} className="mt-0.5 text-[11.5px] font-medium text-brand-700 hover:underline">
                                    {other.type === "me" ? "You" : other.label}
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-[13px] text-muted">No links in this view.</li>
                      )}
                    </ul>
                    {selectedNode.href ? (
                      <ButtonLink href={selectedNode.href} size="sm" className="mt-4 w-full" icon={<ArrowUpRight className="size-3.5" />}>
                        {selectedNode.type === "person" ? "View profile & connect" : selectedNode.type === "event" ? "Open event" : "Open team"}
                      </ButtonLink>
                    ) : null}
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card className="p-4">
                    <p className="text-[14px] font-semibold text-ink">How to read this</p>
                    <ul className="mt-2 space-y-2 text-[13px] leading-snug text-ink-2">
                      <li>• <b>Inner ring</b>: people you&apos;re connected to. <b>Outer ring</b>: people Connected recommends.</li>
                      <li>• <b>Violet tags</b> are the roles your goal needs. A line from a person means they can fill that role.</li>
                      <li>• <b>Blue</b> = shared interests, <b>amber</b> = where you&apos;ll both be, <b>green</b> = your teams.</li>
                      <li>• Click anyone to see every reason in plain English, then connect from their profile.</li>
                    </ul>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {people
                        .filter((p) => !p.connected)
                        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                        .slice(0, 4)
                        .map((p) => (
                          <button key={p.id} onClick={() => setSelected(p.id)} className="focus-ring rounded-xl border border-line px-2.5 py-2 text-left hover:border-brand-200 hover:bg-brand-50/40">
                            <p className="truncate text-[12.5px] font-semibold text-ink">{p.label}</p>
                            <p className="text-[11px] text-muted tabular-nums">{p.score ?? "—"} fit</p>
                          </button>
                        ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NodeShape({ n, selected }: { n: Placed; selected: boolean }) {
  if (n.type === "me") {
    return (
      <>
        <circle r={44} fill="#5145e0" opacity={0.08} />
        <circle r={34} fill="url(#g-me)" stroke={selected ? "#0d1021" : "#fff"} strokeWidth={selected ? 3 : 4} />
        <text textAnchor="middle" dy="0.35em" fontSize={17} fontWeight={700} fill="#fff">
          {initials(n.label) || "You"}
        </text>
        <text textAnchor="middle" y={52} fontSize={12.5} fontWeight={600} fill="#0d1021">
          You
        </text>
      </>
    );
  }
  if (n.type === "person") {
    const hue = n.hue ?? 240;
    const ring = n.connected ? "#10b981" : scoreColor(n.score);
    return (
      <>
        <circle r={25} fill="#fff" stroke={ring} strokeWidth={selected ? 4 : 3} />
        <circle r={21} fill={`hsl(${hue} 68% 56%)`} />
        <text textAnchor="middle" dy="0.35em" fontSize={12.5} fontWeight={700} fill="#fff">
          {initials(n.label)}
        </text>
        {n.score !== undefined && !n.connected ? (
          <g transform="translate(19 -19)">
            <circle r={10} fill="#fff" stroke={ring} strokeWidth={1.5} />
            <text textAnchor="middle" dy="0.35em" fontSize={9} fontWeight={700} fill="#33374d">
              {n.score}
            </text>
          </g>
        ) : null}
        <text textAnchor="middle" y={40} fontSize={12} fontWeight={600} fill="#0d1021">
          {trunc(firstName(n.label), 12)}
        </text>
      </>
    );
  }
  const st = NODE_STYLE[n.type];
  const w = n.w;
  return (
    <>
      <rect x={-w / 2} y={-14} width={w} height={28} rx={14} fill={st.fill} stroke={selected ? st.text : st.stroke} strokeWidth={selected ? 2 : 1.2} />
      <text textAnchor="middle" dy="0.35em" fontSize={12} fontWeight={600} fill={st.text}>
        {trunc(n.label, 22)}
      </text>
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-3">
      {(Object.keys(EDGE_STYLE) as EdgeKind[]).map((k) => {
        const st = EDGE_STYLE[k];
        return (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11.5px] text-muted">
            <svg width="22" height="6" aria-hidden>
              <line x1="1" y1="3" x2="21" y2="3" stroke={st.color} strokeWidth={2} strokeDasharray={st.dash} strokeLinecap="round" />
            </svg>
            {st.label}
          </span>
        );
      })}
      <span className={cx("inline-flex items-center gap-1.5 text-[11.5px] text-muted")}>
        <span className="inline-block size-2.5 rounded-full border-2 border-emerald-500" /> Green ring = connected
      </span>
    </div>
  );
}
