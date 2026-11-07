// The skill / interest / role ontology. This is what makes matching explainable:
// every score traces back to named skills, related skills and roles defined here.

import type { CollabType, Level, MissionKind } from "./types";

export type SkillCategory =
  | "engineering"
  | "ai-data"
  | "design"
  | "business"
  | "domain"
  | "hardware"
  | "communication";

export interface SkillDef {
  id: string;
  label: string;
  category: SkillCategory;
  aliases: string[]; // lowercase phrases that mean this skill
  related: string[]; // skill ids that give partial credit
}

const s = (
  id: string,
  label: string,
  category: SkillCategory,
  aliases: string[] = [],
  related: string[] = [],
): SkillDef => ({ id, label, category, aliases, related });

export const SKILLS: SkillDef[] = [
  // Engineering — web & mobile
  s("react", "React", "engineering", ["react", "reactjs", "react.js"], ["nextjs", "typescript", "react-native", "frontend"]),
  s("nextjs", "Next.js", "engineering", ["next.js", "nextjs"], ["react", "typescript", "frontend"]),
  s("typescript", "TypeScript", "engineering", ["typescript", "ts"], ["javascript", "react", "node"]),
  s("javascript", "JavaScript", "engineering", ["javascript", "js"], ["typescript", "frontend", "node"]),
  s("frontend", "Frontend development", "engineering", ["frontend", "front-end", "front end", "web dev", "web development", "ui engineer"], ["react", "html-css", "javascript"]),
  s("html-css", "HTML & CSS", "engineering", ["html", "css", "tailwind"], ["frontend"]),
  s("ios", "iOS / Swift", "engineering", ["ios", "swift", "swiftui"], ["mobile"]),
  s("android", "Android / Kotlin", "engineering", ["android", "kotlin"], ["mobile"]),
  s("react-native", "React Native", "engineering", ["react native", "expo"], ["react", "mobile"]),
  s("mobile", "Mobile development", "engineering", ["mobile", "mobile app", "flutter"], ["ios", "android", "react-native"]),
  s("backend", "Backend development", "engineering", ["backend", "back-end", "back end", "server", "apis", "api"], ["node", "python", "databases", "go", "java"]),
  s("node", "Node.js", "engineering", ["node", "node.js", "nodejs", "express"], ["backend", "typescript", "javascript"]),
  s("python", "Python", "engineering", ["python", "django", "flask", "fastapi"], ["backend", "machine-learning", "data-analysis"]),
  s("go", "Go", "engineering", ["golang"], ["backend"]),
  s("java", "Java", "engineering", ["java", "spring"], ["backend", "android"]),
  s("cpp", "C / C++", "engineering", ["c++", "cpp"], ["embedded"]),
  s("databases", "Databases & SQL", "engineering", ["sql", "postgres", "postgresql", "database", "databases", "mongodb", "supabase", "firebase"], ["backend"]),
  s("cloud", "Cloud & DevOps", "engineering", ["aws", "gcp", "azure", "devops", "docker", "kubernetes", "cloud", "deployment"], ["backend"]),
  s("security", "Cybersecurity", "engineering", ["security", "cybersecurity", "pentest", "infosec"], ["backend", "cloud"]),
  s("blockchain", "Blockchain / Web3", "engineering", ["blockchain", "web3", "solidity", "smart contract", "crypto"], ["backend"]),
  s("game-dev", "Game development", "engineering", ["unity", "unreal", "game dev", "game development", "godot"], ["cpp"]),

  // AI & data
  s("machine-learning", "Machine learning", "ai-data", ["machine learning", "ml", "deep learning", "neural net", "pytorch", "tensorflow", "ai engineering", "ai engineer", "model training"], ["python", "data-analysis", "llm-apps", "computer-vision", "nlp"]),
  s("llm-apps", "LLM apps & AI agents", "ai-data", ["llm", "llms", "gpt", "claude", "prompt engineering", "rag", "ai agent", "ai agents", "generative ai", "genai", "langchain"], ["machine-learning", "python", "backend"]),
  s("nlp", "NLP", "ai-data", ["nlp", "natural language"], ["machine-learning", "llm-apps"]),
  s("computer-vision", "Computer vision", "ai-data", ["computer vision", "opencv", "image recognition"], ["machine-learning"]),
  s("data-analysis", "Data analysis", "ai-data", ["data analysis", "data analytics", "pandas", "excel", "analytics", "data science"], ["statistics", "python", "data-viz"]),
  s("data-viz", "Data visualization", "ai-data", ["data visualization", "dashboards", "tableau", "d3", "power bi"], ["data-analysis", "frontend"]),
  s("statistics", "Statistics", "ai-data", ["statistics", "stats", "econometrics", "probability"], ["data-analysis", "quant"]),
  s("quant", "Quantitative modeling", "ai-data", ["quant", "quantitative", "algorithmic trading", "algo trading", "trading strategies"], ["statistics", "finance", "python"]),

  // Design
  s("ui-design", "UI design", "design", ["ui design", "ui/ux", "ui", "interface design", "visual design"], ["figma", "ux-research", "product-design"]),
  s("ux-research", "UX research", "design", ["ux research", "user research", "usability", "user interviews", "ux"], ["ui-design", "product-design"]),
  s("figma", "Figma", "design", ["figma", "prototyping", "wireframes", "wireframing"], ["ui-design", "product-design"]),
  s("product-design", "Product design", "design", ["product design", "product designer", "designer", "design systems"], ["ui-design", "ux-research", "figma"]),
  s("branding", "Branding & graphic design", "design", ["branding", "graphic design", "logo", "illustration", "adobe"], ["ui-design", "marketing"]),
  s("motion-design", "Motion & video", "design", ["motion design", "animation", "video editing", "after effects"], ["branding"]),

  // Business
  s("product-management", "Product management", "business", ["product management", "product manager", "roadmap", "product strategy"], ["ux-research", "business-strategy"]),
  s("business-strategy", "Business strategy", "business", ["business strategy", "strategy", "business model", "business plan", "go-to-market", "gtm"], ["product-management", "finance"]),
  s("finance", "Finance", "business", ["finance", "financial modeling", "valuation", "investment banking", "banking", "accounting", "corporate finance"], ["business-strategy", "quant"]),
  s("fundraising", "Fundraising & pitching", "business", ["fundraising", "pitching", "pitch deck", "venture capital", "vc", "investors"], ["business-strategy", "public-speaking"]),
  s("marketing", "Marketing & growth", "business", ["marketing", "growth", "seo", "social media", "content marketing", "community growth"], ["sales", "branding", "writing"]),
  s("sales", "Sales & partnerships", "business", ["sales", "partnerships", "business development", "biz dev", "bd"], ["marketing", "business-strategy"]),
  s("operations", "Operations", "business", ["operations", "ops", "project management", "logistics"], ["product-management"]),
  s("legal", "Legal & compliance", "business", ["legal", "law", "compliance", "regulation", "contracts"], ["business-strategy"]),

  // Domain expertise
  s("healthcare", "Healthcare domain", "domain", ["healthcare", "clinical", "nursing", "medicine", "medical", "hospital", "public health", "pre-med", "premed"], ["research-methods"]),
  s("education", "Education domain", "domain", ["education", "teaching", "tutoring", "curriculum", "edtech"], []),
  s("climate", "Climate & energy domain", "domain", ["climate", "sustainability", "energy", "renewable", "environmental"], ["research-methods"]),
  s("biotech", "Biotech & life sciences", "domain", ["biology", "biotech", "bioinformatics", "chemistry", "life sciences"], ["research-methods", "healthcare"]),
  s("research-methods", "Research methods", "domain", ["research", "academic research", "lab", "literature review", "experiments"], ["statistics", "writing"]),

  // Hardware
  s("embedded", "Embedded systems", "hardware", ["embedded", "arduino", "raspberry pi", "firmware", "microcontroller", "iot"], ["cpp", "robotics"]),
  s("robotics", "Robotics", "hardware", ["robotics", "robot", "ros", "drones"], ["embedded", "cad"]),
  s("cad", "CAD & 3D printing", "hardware", ["cad", "solidworks", "3d printing", "fusion 360", "mechanical"], ["robotics"]),

  // Communication
  s("public-speaking", "Public speaking", "communication", ["public speaking", "presenting", "presentations", "demo day"], ["fundraising"]),
  s("writing", "Writing & storytelling", "communication", ["writing", "copywriting", "storytelling", "technical writing", "content"], ["marketing"]),
  s("community", "Community building", "communication", ["community building", "organizing", "student org"], ["marketing"]),
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((d) => [d.id, d]));

export interface InterestDef {
  id: string;
  label: string;
  aliases: string[];
  related: string[];
}

const i = (id: string, label: string, aliases: string[] = [], related: string[] = []): InterestDef => ({
  id,
  label,
  aliases,
  related,
});

export const INTERESTS: InterestDef[] = [
  i("ai", "Artificial intelligence", ["ai", "artificial intelligence", "machine learning", "ml", "llm", "genai", "generative ai", "ai-powered"], ["research", "startups", "data"]),
  i("startups", "Startups", ["startup", "startups", "early-stage", "venture", "company", "founder"], ["entrepreneurship", "ai"]),
  i("entrepreneurship", "Entrepreneurship", ["entrepreneurship", "entrepreneur", "business", "build a company", "side hustle"], ["startups"]),
  i("fintech", "Fintech", ["fintech", "financial", "finance", "banking", "payments", "investing", "money", "personal finance", "financial literacy"], ["quant-finance", "startups", "crypto"]),
  i("quant-finance", "Quantitative finance", ["quant", "quantitative finance", "trading", "markets", "hedge fund", "stocks"], ["fintech", "data"]),
  i("healthtech", "Healthtech", ["health", "healthcare", "medical", "patients", "hospital", "clinic", "wellness", "mental health", "fitness"], ["biotech", "social-impact"]),
  i("biotech", "Biotech", ["biotech", "biology", "genomics", "drug discovery"], ["healthtech", "research"]),
  i("edtech", "Edtech", ["education", "edtech", "learning", "students", "tutoring", "study"], ["social-impact"]),
  i("climate", "Climate tech", ["climate", "sustainability", "carbon", "energy", "green", "environment", "recycling"], ["social-impact", "hardware"]),
  i("social-impact", "Social impact", ["social impact", "nonprofit", "community", "accessibility", "equity", "civic", "impact"], ["edtech", "healthtech"]),
  i("design", "Design", ["design", "ux", "ui", "creative"], ["consumer"]),
  i("consumer", "Consumer apps", ["consumer", "social app", "social media", "marketplace", "e-commerce", "ecommerce", "shopping"], ["design", "startups"]),
  i("dev-tools", "Developer tools", ["developer tools", "devtools", "open source", "open-source", "infrastructure"], ["ai", "data"]),
  i("data", "Data & analytics", ["data", "analytics", "big data", "dashboards"], ["ai", "quant-finance"]),
  i("cybersecurity", "Cybersecurity", ["security", "cybersecurity", "privacy", "hacking"], ["dev-tools"]),
  i("crypto", "Crypto & Web3", ["crypto", "web3", "blockchain", "defi", "nft"], ["fintech"]),
  i("gaming", "Gaming", ["gaming", "games", "esports", "game"], ["consumer"]),
  i("hardware", "Hardware & IoT", ["hardware", "iot", "robotics", "drones", "embedded", "wearables"], ["climate", "mobility"]),
  i("mobility", "Mobility & transport", ["mobility", "transportation", "cars", "ev", "autonomous"], ["hardware", "climate"]),
  i("research", "Research", ["research", "academia", "phd", "papers", "lab"], ["ai", "biotech"]),
  i("music-media", "Music & media", ["music", "media", "film", "content creation", "creator"], ["consumer"]),
  i("sports", "Sports tech", ["sports", "athletics", "fitness tracking"], ["healthtech", "consumer"]),
  i("careers", "Careers & recruiting", ["career", "careers", "jobs", "internship", "internships", "recruiting", "hiring", "resume"], ["edtech"]),
];

export const INTEREST_BY_ID: Record<string, InterestDef> = Object.fromEntries(INTERESTS.map((d) => [d.id, d]));

export interface RoleDef {
  id: string;
  label: string;
  short: string;
  description: string;
  skills: string[]; // the skills that make someone good at this role
  icon: string; // lucide icon name (resolved in the UI)
}

export const ROLES: RoleDef[] = [
  { id: "frontend-engineer", label: "Frontend engineer", short: "Frontend", description: "Builds the interface people touch.", skills: ["react", "nextjs", "frontend", "typescript", "html-css", "javascript"], icon: "Monitor" },
  { id: "backend-engineer", label: "Backend engineer", short: "Backend", description: "APIs, data and the logic behind the app.", skills: ["backend", "node", "python", "databases", "cloud", "go", "java"], icon: "Server" },
  { id: "mobile-engineer", label: "Mobile engineer", short: "Mobile", description: "Native or cross-platform apps.", skills: ["mobile", "ios", "android", "react-native"], icon: "Smartphone" },
  { id: "ml-engineer", label: "AI / ML engineer", short: "AI/ML", description: "Models, LLM integration and intelligent features.", skills: ["machine-learning", "llm-apps", "nlp", "computer-vision", "python"], icon: "BrainCircuit" },
  { id: "data-scientist", label: "Data scientist", short: "Data", description: "Turns data into insight and models.", skills: ["data-analysis", "statistics", "data-viz", "python", "quant"], icon: "ChartScatter" },
  { id: "designer", label: "Product designer", short: "Design", description: "UX, UI and the product's look and feel.", skills: ["ui-design", "ux-research", "figma", "product-design", "branding"], icon: "PenTool" },
  { id: "product-lead", label: "Product lead", short: "Product", description: "Scopes the problem, the user and the roadmap.", skills: ["product-management", "ux-research", "business-strategy", "operations"], icon: "Compass" },
  { id: "business-lead", label: "Business & pitch lead", short: "Business", description: "Market, model, pitch and partnerships.", skills: ["business-strategy", "fundraising", "finance", "sales", "public-speaking"], icon: "Briefcase" },
  { id: "growth-lead", label: "Growth & marketing", short: "Growth", description: "Users, story, community and launch.", skills: ["marketing", "writing", "community", "branding", "sales"], icon: "Megaphone" },
  { id: "hardware-engineer", label: "Hardware engineer", short: "Hardware", description: "Devices, sensors and robotics.", skills: ["embedded", "robotics", "cad", "cpp"], icon: "Cpu" },
  { id: "security-engineer", label: "Security engineer", short: "Security", description: "Keeps users and data safe.", skills: ["security", "cloud", "backend"], icon: "ShieldCheck" },
  // Domain roles require the domain skill itself — general research or UX skills don't make someone a domain expert.
  { id: "health-expert", label: "Healthcare domain expert", short: "Health", description: "Knows patients, clinics and regulation.", skills: ["healthcare", "biotech"], icon: "HeartPulse" },
  { id: "finance-expert", label: "Finance domain expert", short: "Finance", description: "Knows money, markets and compliance.", skills: ["finance", "quant"], icon: "Landmark" },
  { id: "education-expert", label: "Education domain expert", short: "Education", description: "Knows learners and teachers.", skills: ["education"], icon: "GraduationCap" },
  { id: "climate-expert", label: "Climate domain expert", short: "Climate", description: "Knows energy, sustainability and policy.", skills: ["climate"], icon: "Leaf" },
  { id: "researcher", label: "Researcher", short: "Research", description: "Rigor, experiments and literature.", skills: ["research-methods", "statistics", "writing", "machine-learning"], icon: "FlaskConical" },
];

export const ROLE_BY_ID: Record<string, RoleDef> = Object.fromEntries(ROLES.map((r) => [r.id, r]));

export const COLLAB_LABELS: Record<CollabType, string> = {
  cofounder: "Finding a cofounder",
  "hackathon-team": "Joining a hackathon team",
  project: "Side projects",
  "mentorship-get": "Looking for a mentor",
  "mentorship-give": "Mentoring others",
  internship: "Looking for an internship",
  hiring: "Hiring",
  research: "Research collaboration",
  "quick-chat": "Quick 15-min chats",
};

/** Which collaboration intents are compatible with which (symmetric unless noted). 1 = perfect, 0.5 = partial. */
export const COLLAB_COMPAT: Partial<Record<CollabType, Partial<Record<CollabType, number>>>> = {
  cofounder: { cofounder: 1, project: 0.5, "hackathon-team": 0.4 },
  "hackathon-team": { "hackathon-team": 1, project: 0.7, cofounder: 0.4 },
  project: { project: 1, "hackathon-team": 0.7, cofounder: 0.5, research: 0.4 },
  "mentorship-get": { "mentorship-give": 1, "quick-chat": 0.6, hiring: 0.4 },
  "mentorship-give": { "mentorship-get": 1, internship: 0.6, "quick-chat": 0.4 },
  internship: { hiring: 1, "mentorship-give": 0.6, "quick-chat": 0.4 },
  hiring: { internship: 1, "mentorship-get": 0.4 },
  research: { research: 1, project: 0.4 },
  "quick-chat": { "quick-chat": 1, "mentorship-give": 0.6, "mentorship-get": 0.6 },
};

export function collabCompat(a: CollabType, b: CollabType): number {
  return COLLAB_COMPAT[a]?.[b] ?? COLLAB_COMPAT[b]?.[a] ?? 0;
}

export const LEVEL_LABEL: Record<Level, string> = { 1: "Familiar", 2: "Proficient", 3: "Expert" };

export const MISSION_TEMPLATES: { kind: MissionKind; title: string; goal: string; targets: { roleId: string; count: number }[] }[] = [
  { kind: "hackathon-team", title: "Build a hackathon team", goal: "Form a balanced team for this hackathon", targets: [{ roleId: "frontend-engineer", count: 1 }, { roleId: "backend-engineer", count: 1 }, { roleId: "designer", count: 1 }] },
  { kind: "cofounder", title: "Find a technical cofounder", goal: "Meet engineers who want to start a company", targets: [{ roleId: "backend-engineer", count: 2 }, { roleId: "ml-engineer", count: 1 }] },
  { kind: "mentor", title: "Find a mentor", goal: "Meet someone experienced who has offered to mentor", targets: [{ roleId: "product-lead", count: 1 }] },
  { kind: "internship", title: "Land my first internship", goal: "Talk to people who can advise on internships", targets: [{ roleId: "business-lead", count: 2 }] },
  { kind: "meet-professionals", title: "Meet 3 professionals in my field", goal: "Have three useful conversations with professionals", targets: [{ roleId: "product-lead", count: 3 }] },
];

// ---------- Text → ontology tagging (used by the rules engine and to tag "gives") ----------

function normalize(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9+#./\- ]+/g, " ").replace(/\s+/g, " ")} `;
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (!p) return false;
  // word-boundary-ish match on the normalized text
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack);
}

export function extractSkills(text: string): string[] {
  const t = normalize(text);
  const found = new Set<string>();
  for (const d of SKILLS) {
    if (containsPhrase(t, d.label) || d.aliases.some((a) => containsPhrase(t, a))) found.add(d.id);
  }
  return [...found];
}

export function extractInterests(text: string): string[] {
  const t = normalize(text);
  const found = new Set<string>();
  for (const d of INTERESTS) {
    if (containsPhrase(t, d.label) || d.aliases.some((a) => containsPhrase(t, a))) found.add(d.id);
  }
  return [...found];
}

/** Tags for a piece of free text, as skill and interest ids. */
export function tagText(text: string): { skills: string[]; interests: string[] } {
  return { skills: extractSkills(text), interests: extractInterests(text) };
}

export function skillLabel(id: string): string {
  return SKILL_BY_ID[id]?.label ?? id;
}
export function interestLabel(id: string): string {
  return INTEREST_BY_ID[id]?.label ?? id;
}
export function roleLabel(id: string): string {
  return ROLE_BY_ID[id]?.label ?? id;
}

export function skillsRelated(a: string, b: string): boolean {
  if (a === b) return true;
  return Boolean(SKILL_BY_ID[a]?.related.includes(b) || SKILL_BY_ID[b]?.related.includes(a));
}

export function interestsRelated(a: string, b: string): boolean {
  if (a === b) return true;
  return Boolean(INTEREST_BY_ID[a]?.related.includes(b) || INTEREST_BY_ID[b]?.related.includes(a));
}
