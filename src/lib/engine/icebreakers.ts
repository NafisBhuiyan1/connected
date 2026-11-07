// Grounded intro + icebreaker templates. Used when no LLM is configured, and as the
// fact sheet we hand the LLM (so it can only use real, shared facts).

import { interestLabel, roleLabel, skillLabel, tagText } from "../ontology";
import type { Profile } from "../types";
import { interestSimilarity, roleCoverage } from "./match";

export interface IntroFacts {
  fromName: string;
  toName: string;
  ask: string;
  sharedInterests: string[];
  relatedInterests: [string, string][];
  theirStrengths: string[];
  yourStrengths: string[];
  theirGives: string[];
  theirAsk: string;
  roleTheyFill?: string;
  roleYouFill?: string;
  eventTitle?: string;
  zoneName?: string;
  theirProjectsHint: string;
}

export function introFacts(
  from: Profile,
  to: Profile,
  ask: string,
  opts: { eventTitle?: string; zoneName?: string; roleId?: string } = {},
): IntroFacts {
  const sim = interestSimilarity(from.interests, to.interests);
  const theirStrengths = to.skills.filter((s) => s.level >= 2).sort((a, b) => b.level - a.level).slice(0, 4).map((s) => skillLabel(s.skill));
  const yourStrengths = from.skills.filter((s) => s.level >= 2).sort((a, b) => b.level - a.level).slice(0, 4).map((s) => skillLabel(s.skill));
  let roleYouFill: string | undefined;
  let best = 0;
  for (const r of to.lookingFor) {
    const c = roleCoverage(from, r).coverage;
    if (c > best && c >= 0.5) {
      best = c;
      roleYouFill = roleLabel(r);
    }
  }
  return {
    fromName: from.name,
    toName: to.name,
    ask: ask.trim(),
    sharedInterests: sim.shared.map(interestLabel),
    relatedInterests: sim.related.map(([a, b]) => [interestLabel(a), interestLabel(b)]),
    theirStrengths,
    yourStrengths,
    theirGives: to.gives,
    theirAsk: to.ask,
    roleTheyFill: opts.roleId ? roleLabel(opts.roleId) : undefined,
    roleYouFill,
    eventTitle: opts.eventTitle,
    zoneName: opts.zoneName,
    theirProjectsHint: to.bio,
  };
}

export function templateIntro(f: IntroFacts): { intro: string; icebreakers: string[] } {
  const first = f.toName.split(" ")[0];
  const hook = f.sharedInterests.length
    ? `I saw we're both into ${f.sharedInterests.slice(0, 2).join(" and ")}.`
    : f.theirStrengths.length
      ? `I noticed your ${f.theirStrengths[0]} experience.`
      : "I came across your profile on Connected.";
  const where = f.eventTitle ? ` at ${f.eventTitle}` : "";
  const give = f.yourStrengths.length ? ` I work on ${f.yourStrengths.slice(0, 2).join(" and ")}${f.roleYouFill ? ` (you mentioned looking for a ${f.roleYouFill.toLowerCase()})` : ""}.` : "";
  const trimmedAsk = f.ask.trim().replace(/\.+$/, "");
  const ask = trimmedAsk ? ` ${capitalize(trimmedAsk)}${/[?!]$/.test(trimmedAsk) ? "" : "."}` : "";
  const close = f.zoneName ? ` Would you be up for 10 minutes near ${f.zoneName}?` : ` Would you be up for a quick chat${where}?`;
  const intro = `Hi ${first}! ${hook}${give}${ask}${close}`;

  const icebreakers: string[] = [];
  if (f.sharedInterests[0]) icebreakers.push(`What got you into ${f.sharedInterests[0].toLowerCase()}?`);
  if (f.theirGives[0]) icebreakers.push(`You offered help with “${f.theirGives[0]}” — what's the most common mistake you see there?`);
  if (f.theirStrengths[0]) icebreakers.push(`What's something you've built with ${f.theirStrengths[0]} that you're proud of?`);
  if (f.relatedInterests[0]) icebreakers.push(`You're into ${f.relatedInterests[0][1].toLowerCase()} and I'm into ${f.relatedInterests[0][0].toLowerCase()} — where do you think those overlap?`);
  if (f.theirAsk) {
    const tags = tagText(f.theirAsk);
    const t = tags.skills[0] ? skillLabel(tags.skills[0]) : tags.interests[0] ? interestLabel(tags.interests[0]) : null;
    icebreakers.push(t ? `You're looking for help with ${t.toLowerCase()} — what have you tried so far?` : `What are you hoping to get out of this event?`);
  }
  if (icebreakers.length < 3) icebreakers.push("What are you working on right now that you're excited about?");
  return { intro, icebreakers: icebreakers.slice(0, 4) };
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
