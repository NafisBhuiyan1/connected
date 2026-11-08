/** Discovery categories inferred from published event text, not academic eligibility. */
export const EVENT_SUBJECTS = [
  { id: "computing", label: "Computing & data", pattern: /\b(comput(er|ing)|software|coding|hackathon|cybersecurity|artificial intelligence|machine learning|data science|ai|robotics)\b/i },
  { id: "engineering", label: "Engineering", pattern: /\b(engineering|engineers?|mechanical|electrical|civil|manufacturing|robotics|architecture)\b/i },
  { id: "business", label: "Business & finance", pattern: /\b(business|finance|financial|accounting|economics|marketing|entrepreneur\w*|startup|management|supply chain)\b/i },
  { id: "health", label: "Health & nursing", pattern: /\b(health\w*|nurs\w*|clinical|medical|medicine|patient\w*|kinesiology|nutrition|pre-med)\b/i },
  { id: "science", label: "Natural sciences", pattern: /\b(biology|biological|chemistry|physics|mathematics|math|biotech\w*|geology|environment\w*|ecology)\b/i },
  { id: "arts", label: "Arts & design", pattern: /\b(arts?|design|theatre|theater|music|film|dance|creative|exhibition|gallery|animation)\b/i },
  { id: "humanities", label: "Humanities & languages", pattern: /\b(humanities|history|historical|philosophy|literature|writing|language\w*|linguistics|religious studies)\b/i },
  { id: "social-sciences", label: "Social sciences", pattern: /\b(psychology|psychological|sociology|anthropology|political science|social work|criminal justice|geography)\b/i },
  { id: "education", label: "Education", pattern: /\b(education|educators?|teaching|teachers?|curriculum|literacy|child development)\b/i },
  { id: "law", label: "Law & public service", pattern: /\b(law|legal|public policy|public administration|government|civic|nonprofit|public service)\b/i },
  { id: "communications", label: "Communication & media", pattern: /\b(communication\w*|journalism|media|broadcast\w*|public relations|storytelling)\b/i },
] as const;

export function eventSubjects(event: { title: string; description: string; tags?: string[] }): string[] {
  const text = `${event.title}\n${event.description}\n${event.tags?.join(" ") ?? ""}`;
  return EVENT_SUBJECTS.filter((subject) => subject.pattern.test(text)).map((subject) => subject.id);
}
