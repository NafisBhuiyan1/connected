import "server-only";
import { extractInterests, extractSkills, interestLabel, SKILL_BY_ID, skillLabel } from "../ontology";
import type { Level } from "../types";
import { ApiError } from "./services";

// Bring in real profile data without scraping or credentials:
//  - GitHub: the public REST API (no token needed) → languages + topics → skill suggestions with evidence.
//  - LinkedIn / résumé: the user pastes their own text → ontology tagging → suggestions.
// Nothing is saved until the user picks suggestions and saves their profile.

export interface Suggestion {
  skill: string;
  label: string;
  level: Level;
  evidence: string;
}

const LANG_TO_SKILL: Record<string, string> = {
  TypeScript: "typescript",
  JavaScript: "javascript",
  Python: "python",
  Java: "java",
  Go: "go",
  "C++": "cpp",
  C: "cpp",
  Swift: "ios",
  Kotlin: "android",
  Dart: "mobile",
  HTML: "html-css",
  CSS: "html-css",
  SCSS: "html-css",
  Vue: "frontend",
  Svelte: "frontend",
  "Jupyter Notebook": "data-analysis",
  R: "statistics",
  Solidity: "blockchain",
  "C#": "game-dev",
  GDScript: "game-dev",
  Rust: "backend",
  Ruby: "backend",
  PHP: "backend",
  Shell: "cloud",
  Dockerfile: "cloud",
  HCL: "cloud",
  Arduino: "embedded",
};

interface GhRepo {
  name: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  fork: boolean;
  html_url: string;
  pushed_at: string;
}

export async function importGithub(username: string) {
  const u = username.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").split("/")[0];
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(u)) throw new ApiError(400, "That doesn't look like a GitHub username.");
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "Connected-CrownHacks" };
  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${u}`, { headers, signal: AbortSignal.timeout(10_000) }),
    fetch(`https://api.github.com/users/${u}/repos?per_page=100&sort=pushed`, { headers, signal: AbortSignal.timeout(10_000) }),
  ]);
  if (userRes.status === 404) throw new ApiError(404, "GitHub user not found.");
  if (userRes.status === 403 || repoRes.status === 403) throw new ApiError(429, "GitHub rate limit hit — try again in a few minutes.");
  if (!userRes.ok || !repoRes.ok) throw new ApiError(502, "GitHub didn't respond. Try again.");
  const user = (await userRes.json()) as { login: string; name: string | null; bio: string | null; public_repos: number; html_url: string };
  const repos = ((await repoRes.json()) as GhRepo[]).filter((r) => !r.fork);

  // Language share across original repos.
  const langCount = new Map<string, number>();
  for (const r of repos) if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1);
  const total = Math.max(1, repos.filter((r) => r.language).length);
  const bySkill = new Map<string, Suggestion>();
  for (const [lang, n] of [...langCount.entries()].sort((a, b) => b[1] - a[1])) {
    const skill = LANG_TO_SKILL[lang];
    if (!skill) continue;
    const share = n / total;
    const level: Level = share >= 0.35 || n >= 8 ? 3 : share >= 0.15 || n >= 3 ? 2 : 1;
    const prev = bySkill.get(skill);
    if (!prev || prev.level < level) bySkill.set(skill, { skill, label: skillLabel(skill), level, evidence: `${n} repo${n === 1 ? "" : "s"} in ${lang}` });
  }
  // Frameworks and domains from repo names, descriptions and topics.
  const text = repos.map((r) => `${r.name.replace(/[-_]/g, " ")} ${r.description ?? ""} ${(r.topics ?? []).join(" ")}`).join("\n");
  for (const skill of extractSkills(text)) {
    if (bySkill.has(skill)) continue;
    const hits = repos.filter((r) => extractSkills(`${r.name.replace(/[-_]/g, " ")} ${r.description ?? ""} ${(r.topics ?? []).join(" ")}`).includes(skill)).length;
    bySkill.set(skill, { skill, label: skillLabel(skill), level: hits >= 3 ? 2 : 1, evidence: `mentioned in ${hits} repo${hits === 1 ? "" : "s"}` });
  }
  const interests = extractInterests(`${user.bio ?? ""}\n${text}`).slice(0, 6);
  const top = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at)).slice(0, 4);
  return {
    source: "github" as const,
    profile: { login: user.login, name: user.name, bio: user.bio, url: user.html_url, publicRepos: user.public_repos },
    skills: [...bySkill.values()].sort((a, b) => b.level - a.level).slice(0, 12),
    interests: interests.map((id) => ({ id, label: interestLabel(id) })),
    repos: top.map((r) => ({ name: r.name, description: r.description, language: r.language, stars: r.stargazers_count, url: r.html_url })),
  };
}

/** Parse pasted LinkedIn "About/Experience/Skills" or résumé text. */
export function importText(raw: string) {
  const text = raw.slice(0, 12_000);
  if (text.trim().length < 20) throw new ApiError(400, "Paste a bit more — your About, Experience or Skills sections work best.");
  const lower = text.toLowerCase();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const skills = extractSkills(text).map((skill): Suggestion => {
    const label = skillLabel(skill);
    const terms = [label, ...(SKILL_BY_ID[skill]?.aliases ?? [])].map((t) => t.trim().toLowerCase()).filter((t) => t.length > 2);
    const mentions = terms.reduce((n, t) => n + (lower.match(new RegExp(`(^|[^a-z0-9])${esc(t)}($|[^a-z0-9])`, "g")) ?? []).length, 0);
    // Seniority only counts when the skill appears in the same sentence as a seniority cue.
    const senior = text
      .split(/[.\n]/)
      .some((s) => terms.some((t) => s.toLowerCase().includes(t)) && /\b(senior|lead|led|architect|expert|advanced|\d+\+?\s*years)\b/i.test(s));
    const level: Level = mentions >= 3 || (mentions >= 2 && senior) ? 3 : mentions >= 1 ? 2 : 1;
    return { skill, label, level, evidence: mentions ? `mentioned ${mentions}×${senior ? " with seniority" : ""}` : "related term found" };
  });
  const interests = extractInterests(text).slice(0, 6);
  const firstLine = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 8 && l.length < 90);
  return {
    source: "text" as const,
    headline: firstLine ?? null,
    skills: skills.sort((a, b) => b.level - a.level).slice(0, 15),
    interests: interests.map((id) => ({ id, label: interestLabel(id) })),
  };
}
