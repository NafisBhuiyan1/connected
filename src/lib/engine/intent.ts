// Deterministic goal understanding. Always available (no API key needed) and used as the
// fallback whenever the LLM is unavailable, slow, or returns something invalid.

import { extractInterests, extractSkills, ROLE_BY_ID } from "../ontology";
import type { CollabType, Intent } from "../types";

type RoleHit = { roleId: string; weight: number; why: string };

const has = (t: string, re: RegExp) => re.test(t);

const EXPLICIT_ROLE_PATTERNS: { re: RegExp; roles: string[] }[] = [
  { re: /\b(front[- ]?end|react dev|ui engineer|web developer)\b/, roles: ["frontend-engineer"] },
  { re: /\b(back[- ]?end|api developer|server|database person)\b/, roles: ["backend-engineer"] },
  { re: /\b(full[- ]?stack)\b/, roles: ["frontend-engineer", "backend-engineer"] },
  { re: /\b(developers?|devs?|engineers?|programmers?|coders?|technical co-?founder|cto|software (person|people))\b/, roles: ["frontend-engineer", "backend-engineer"] },
  { re: /\b(designers?|ux|ui\/ux|figma)\b/, roles: ["designer"] },
  { re: /\b(mobile|ios|android)\b/, roles: ["mobile-engineer"] },
  { re: /\b(ai|ml|machine learning) (engineer|developer|person|expert)s?\b/, roles: ["ml-engineer"] },
  { re: /\b(data scientists?|data analysts?|analytics person)\b/, roles: ["data-scientist"] },
  { re: /\b(product managers?|product lead|product person)\b/, roles: ["product-lead"] },
  { re: /\b(business (person|partner|lead|side|student)|mba|business co-?founder|ceo)\b/, roles: ["business-lead"] },
  { re: /\b(marketers?|marketing|growth person|sales person)\b/, roles: ["growth-lead"] },
  { re: /\b(hardware (engineer|person)|electrical engineer|mechanical engineer)\b/, roles: ["hardware-engineer"] },
  { re: /\b(researchers?|research partner)\b/, roles: ["researcher"] },
];

const ROLE_WHY: Record<string, string> = {
  "frontend-engineer": "Someone has to build the interface people actually use.",
  "backend-engineer": "You'll need APIs, data storage and the core logic.",
  "mobile-engineer": "The idea lives on people's phones.",
  "ml-engineer": "The AI features need someone who can build and integrate models.",
  "data-scientist": "The product depends on analyzing data well.",
  designer: "Great UX is what makes judges and users care.",
  "product-lead": "Someone should own the user problem and scope.",
  "business-lead": "A startup needs a market, a model and a pitch.",
  "growth-lead": "Users have to find out it exists.",
  "hardware-engineer": "There's a physical device involved.",
  "security-engineer": "The product handles sensitive data.",
  "health-expert": "Healthcare has real workflow and privacy constraints — domain knowledge avoids naive mistakes.",
  "finance-expert": "Money products need someone who understands finance and compliance.",
  "education-expert": "Knowing how students and teachers actually work matters.",
  "climate-expert": "Climate products need someone who knows the science and policy.",
  researcher: "The idea benefits from rigorous research and evaluation.",
};

function detectKind(t: string): CollabType | undefined {
  if (has(t, /\bco-?founders?\b|\bstart(ing)? (a|my) (company|startup)\b/)) return "cofounder";
  if (has(t, /\bmentors?\b|\badvis(or|er|ice)\b|\bguidance\b/)) return "mentorship-get";
  if (has(t, /\bintern(ship)?s?\b|\bfirst job\b|\bget hired\b|\brecruit(ing|er)?\b/)) return "internship";
  if (has(t, /\bhackathon\b|\bteam ?mates?\b|\bteam\b/)) return "hackathon-team";
  if (has(t, /\bresearch (partner|collaborat)/)) return "research";
  if (has(t, /\bhiring\b|\bhire\b/)) return "hiring";
  if (has(t, /\bquick chat\b|\bcoffee\b|\b15[- ]?min/)) return "quick-chat";
  return undefined;
}

const PRODUCT_NOUN = /\b(app|apps|platform|startup|company|tool|product|website|service|game|device|bot|chatbot|assistant|marketplace|system|dashboard|robot|extension|api)\b/;

function detectProject(t: string): boolean {
  return (
    has(
      t,
      /\b(build(ing)?|creat(e|ing)|mak(e|ing)|start(ing)?|launch(ing)?|develop(ing)?|prototype)\b.*\b(app|platform|startup|company|tool|product|website|service|game|device|bot|assistant|marketplace|system|project|idea|dashboard|robot)\b|\b(my|our) (app|startup|project|idea)\b/,
    ) ||
    // A pitch written as a noun phrase: "An AI-powered scheduling platform for nurses"
    (/^(an?|the|my|our)?\s*[\w-]+/.test(t.trim()) && PRODUCT_NOUN.test(t) && !/\b(mentor|internship|advice|job)\b/.test(t))
  );
}

function extractProjectTitle(raw: string): string | undefined {
  const verbless = raw.trim().match(/^(?:an?\s+|the\s+|my\s+|our\s+)?(.+?)(?:[.,;]|\s+but\b|\s+and\s+(?:i\s+)?need\b|$)/i);
  const hasVerb = /\b(build|create|make|start|launch|develop|prototype|building|creating|making|starting|launching|developing)\b/i.test(raw);
  if (!hasVerb && verbless && PRODUCT_NOUN.test(verbless[1].toLowerCase())) {
    const title = verbless[1].trim();
    return title.length > 70 ? `${title.slice(0, 67)}…` : title.charAt(0).toUpperCase() + title.slice(1);
  }
  const m = raw.match(
    /\b(?:build|create|make|start|launch|develop|prototype|building|creating|making|starting|launching|developing)\s+(?:an?\s+|the\s+|my\s+)?(.+?)(?:,|\.|;|\s+but\b|\s+and\s+(?:i\s+)?need\b|\s+and\s+(?:i'm|i am)\s+looking\b|\s+that\b|\s+so\b|$)/i,
  );
  if (!m) return undefined;
  const title = m[1].trim().replace(/\s+/g, " ");
  if (title.length < 3) return undefined;
  return title.length > 70 ? `${title.slice(0, 67)}…` : title;
}

function projectRoles(t: string, skills: string[], interests: string[]): RoleHit[] {
  const out: RoleHit[] = [];
  const add = (roleId: string, weight: number) => out.push({ roleId, weight, why: ROLE_WHY[roleId] ?? "" });
  const mobile = has(t, /\b(mobile|ios|android|phone app)\b/);
  const hardware = has(t, /\b(hardware|device|robot|robotics|iot|sensor|wearable|drone)\b/) || skills.includes("embedded");
  const software = !hardware || has(t, /\b(app|platform|website|dashboard|software)\b/);
  if (software) {
    if (mobile) add("mobile-engineer", 1);
    add("frontend-engineer", mobile ? 0.6 : 1);
    add("backend-engineer", 1);
    add("designer", 0.8);
  }
  if (hardware) add("hardware-engineer", 1);
  if (interests.includes("ai") || has(t, /\b(ai|ml|llm|smart|intelligent|predict|recommend|chatbot|agent|personaliz)/)) add("ml-engineer", 1);
  if (has(t, /\b(data|analytics|dashboard|insights|forecast)\b/)) add("data-scientist", 0.6);
  if (has(t, /\b(startup|company|business|market|launch|investors?|revenue|customers|pitch)\b/)) {
    add("business-lead", 0.8);
    add("product-lead", 0.5);
  } else {
    add("product-lead", 0.4);
  }
  if (interests.includes("healthtech")) add("health-expert", 0.7);
  if (interests.includes("fintech") || interests.includes("quant-finance")) add("finance-expert", 0.6);
  if (interests.includes("edtech")) add("education-expert", 0.6);
  if (interests.includes("climate")) add("climate-expert", 0.6);
  if (interests.includes("cybersecurity") || has(t, /\b(security|privacy|hipaa)\b/)) add("security-engineer", 0.5);
  return out;
}

export function parseIntentRules(raw: string): Intent {
  const text = raw.trim();
  const t = text.toLowerCase();
  const skills = extractSkills(text);
  const interests = extractInterests(text);
  const kind = detectKind(t);
  const isProject = detectProject(t);

  // Roles explicitly asked for get top weight.
  const explicit = new Map<string, RoleHit>();
  for (const p of EXPLICIT_ROLE_PATTERNS) {
    if (p.re.test(t)) {
      for (const r of p.roles) explicit.set(r, { roleId: r, weight: 1.2, why: "You asked for this role." });
    }
  }
  // "AI developer" shouldn't also mean generic frontend+backend only — keep both, ML gets a boost.
  if (explicit.has("frontend-engineer") && has(t, /\b(ai|ml|machine learning) (developer|engineer)/)) {
    explicit.set("ml-engineer", { roleId: "ml-engineer", weight: 1.2, why: "You asked for an AI/ML engineer." });
  }

  const roles = new Map<string, RoleHit>();
  if (isProject) for (const r of projectRoles(t, skills, interests)) roles.set(r.roleId, r);
  for (const [id, r] of explicit) {
    const prev = roles.get(id);
    roles.set(id, { roleId: id, weight: Math.max(prev?.weight ?? 0, r.weight), why: prev?.why ? `${prev.why} You also asked for it.` : r.why });
  }
  if (kind === "mentorship-get" && roles.size === 0) {
    // A mentor in the user's area of interest — pick roles from mentioned skills.
    for (const sk of skills) {
      for (const role of Object.values(ROLE_BY_ID)) {
        if (role.skills.slice(0, 3).includes(sk)) roles.set(role.id, { roleId: role.id, weight: 1, why: "Experience you want guidance on." });
      }
    }
  }

  const roleList = [...roles.values()].sort((a, b) => b.weight - a.weight).slice(0, 7);
  const projectTitle = isProject ? extractProjectTitle(text) : undefined;
  const helpTopics = [...new Set([...skills, ...interests])];

  const parts: string[] = [];
  if (projectTitle) parts.push(`Building ${projectTitle}`);
  else if (kind) parts.push(kindPhrase(kind));
  if (roleList.length) parts.push(`needs ${roleList.slice(0, 4).map((r) => ROLE_BY_ID[r.roleId]?.short ?? r.roleId).join(", ")}`);
  const summary = parts.length ? parts.join(" · ") : "Meet people who share your interests";

  return { summary, kind, roles: roleList, skills, interests, helpTopics, isProject, projectTitle };
}

function kindPhrase(k: CollabType): string {
  switch (k) {
    case "cofounder":
      return "Looking for a cofounder";
    case "mentorship-get":
      return "Looking for a mentor";
    case "internship":
      return "Looking for internship advice";
    case "hackathon-team":
      return "Building a hackathon team";
    case "research":
      return "Looking for research collaborators";
    case "hiring":
      return "Hiring";
    case "quick-chat":
      return "Looking for a quick chat";
    default:
      return "Looking for collaborators";
  }
}
