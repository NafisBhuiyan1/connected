import type { AssistantContext, AssistantInput, AssistantResponse } from "./assistant-contract";
import { parseIntentRules } from "./engine/intent";
import { extractSkills, roleLabel, skillLabel } from "./ontology";

export function resolveAssistantGoal(input: AssistantInput, declaredAsk: string): string {
  const concrete = (text: string) => parseIntentRules(text).isProject && !/\b(what|which) (?:kind of )?(?:app|project|idea|thing).*\b(?:build|make)|\bwhat should i (?:build|make)\b/i.test(text);
  if (concrete(input.message)) return input.message;
  if (input.goal) return input.goal;
  const previous = [...input.history].reverse().find((turn) => turn.role === "user" && concrete(turn.content));
  return (previous?.content ?? declaredAsk).slice(0, 1200);
}

/** Honest, deterministic coaching for the current turn; no model is called here. */
export function ruleAssistantReply(input: AssistantInput, context: AssistantContext): Pick<AssistantResponse, "reply" | "suggestions"> {
  const text = input.message.toLowerCase();
  const first = context.profile.name.trim().split(/\s+/)[0] || "there";
  const strengths = context.profile.skills.slice(0, 3).join(", ");
  const bring = strengths ? `You already bring ${strengths}.` : "Your profile does not list skills yet; tell me what you enjoy doing.";
  const goal = context.goal;
  const person = context.people[0];
  const roles = context.intent.roles.slice(0, 3).map((role) => roleLabel(role.roleId)).join(", ");
  const suggestions = [
    { label: "Make a small first version", prompt: "Help me reduce this idea to one useful prototype and three concrete tasks." },
    { label: "Find complementary people", prompt: "Who could complement my skills for this goal, and why?" },
    { label: "Practice my pitch", prompt: "Help me explain this project in a clear 30-second pitch." },
    { label: "Plan my next hour", prompt: "Give me a realistic plan for the next hour using my current skills." },
  ];
  let reply: string;
  if (/^(hi|hey|hello|help|hi there)[!.\s]*$/.test(text) || /what can you (?:do|help)/.test(text)) {
    reply = `Hi ${first}. ${bring} I can help you choose a project, break it into tasks, find complementary people, or draft a first message. What would you like to accomplish next?`;
  } else if (/\bwhat should i (?:build|make)|\b(?:project|app) ideas?\b/.test(text)) {
    const domain = context.profile.interests[0] || "a problem you know personally";
    reply = `${bring} Use your interest in ${domain} as a starting point. Three small experiments: a tracker that turns one messy input into a clear next step, a searchable guide built from a short trusted document, or an opt-in tool that helps a small group coordinate. Pick one real user, ask what task wastes their time, and build only that task first. Which problem have you experienced yourself?`;
  } else if (/\b(profile|resume|résumé|about me|my strengths)\b/.test(text)) {
    reply = `${bring} Make your profile useful to a collaborator: name one thing you can help with, show a small example, and add a specific ask.${context.profile.ask ? ` Your current ask is: “${context.profile.ask}”. What result would make that conversation worthwhile?` : " What kind of person or help do you need for your next step?"}`;
  } else if (/\b(learn|learning|study|practice|beginner|improve my)\b/.test(text) && !/\bpitch\b/.test(text)) {
    const skill = extractSkills(input.message)[0];
    const target = skill ? skillLabel(skill) : "the skill you want to learn";
    reply = `${bring} For ${target}, use a small learning loop: pick one input and one visible output, follow one short example, then change it without copying. Build a tiny feature for ${goal ? `your goal, “${goal}”` : "a problem you know"} and explain what worked. What can you already do, and how much time do you have?`;
  } else if (/\b(intro|introduc|message|reach out|say hello|conversation starter)/.test(text)) {
    reply = person
      ? `Here is a draft to review for ${person.name}${person.isDemo ? " (a fictional demo profile)" : ""}:\n\n“Hi ${person.name.split(/\s+/)[0]}, I noticed you list ${person.skills.slice(0, 2).join(" and ") || "collaboration interests"}. ${goal ? `I'm working toward: ${goal}.` : "I'm exploring a small project."} Could we compare what we could each contribute in a short conversation?”\n\nNothing has been sent. Make the ask specific before using it.`
      : "I do not have an eligible person to name here. A useful draft is: “Hi [name], I am working on [specific goal]. I can contribute [your skill] and would value help with [one concrete task]. Would you be open to a short conversation?” Review a visible profile first; nothing is sent automatically.";
  } else if (/\b(event|workshop|conference|meetup|where should i (?:go|meet)|where can i meet)\b/.test(text)) {
    reply = context.events.length
      ? `You can explore ${context.events.map((event) => `${event.title}${event.isSample ? " (sample event)" : ""} at ${event.venue}`).join("; ")}. These are stored event listings, not a live availability check. Choose one around your goal, then explicitly join its networking space if you want to discover opted-in participants.`
      : "I do not have a current event listing to recommend from this workspace. Try the Events page, or tell me what kind of people you want to meet. I have not checked external calendars or made any booking.";
  } else if (/\b(pitch|explain my|describe my|present my)\b/.test(text)) {
    reply = goal
      ? `Try this pitch structure for “${goal}”: “We help [one specific user] do [one difficult task] by [your approach]. Our prototype shows [one visible result].” ${bring} Make the first sentence about the user's problem, then show the smallest working demonstration. Who is your first user, and what do they struggle with today?`
      : "Let's build a clear pitch: who is the user, what task is hard for them, and what small result will your prototype show? Tell me those three things and I can help sharpen the wording.";
  } else if (/\b(teams?|teammates?|cofounders?|co-founders?|collaborat\w*|who|people|designers?|developers?)\b/.test(text)) {
    reply = context.people.length
      ? `${bring} Around ${goal ? `“${goal}”` : "your current ask"}, consider ${context.people.map((p) => `${p.name}${p.isDemo ? " (demo)" : ""}: ${p.why}`).join(" ")}. These are suggestions from visible profiles, not confirmed commitments. Review the fit, then choose whether to open the team builder or draft an introduction.`
      : `${bring} I do not have an eligible collaborator to recommend under the current privacy and availability filters.${context.eventNeedsOptIn ? " Join and opt into this event's networking space before browsing its people." : " Try another event, update your ask, or keep working on a small prototype."} I have not contacted anyone.`;
  } else if (/\b(next hour|next 60|first step|where.*start|smaller|simpler|scope|stuck|tasks?|roadmap)\b/.test(text)) {
    reply = `${bring} Here is a next-hour plan${goal ? ` for “${goal}”` : " to find a useful direction"}:\n\n1. First 15 minutes: choose one user and write the single result they need.\n2. Next 30 minutes: make the smallest input-to-output prototype, using mocked data if necessary and labeling it clearly.\n3. Last 15 minutes: show it to one willing person, note what confused them, and choose one improvement.\n\nWhat part is blocking you right now?`;
  } else if (goal) {
    reply = `${bring} For “${goal}”, start with one user and one task. Make a thin prototype that takes an input and shows a useful result, test it with one willing person, then decide what to add.${roles ? ` The goal suggests these roles to discuss: ${roles}; they are planning suggestions, not requirements.` : ""} What should a person be able to do in the first working version?`;
  } else {
    reply = `${bring} Let's make this practical: tell me one problem you care about, who experiences it, and whether you want to build, learn, or meet someone. We can work through one decision at a time; I will not send invitations or change your profile for you.`;
  }
  return { reply, suggestions };
}
