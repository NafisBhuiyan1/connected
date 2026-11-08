import { describe, expect, it } from "vitest";
import { classifyKind, nextOccurrence, parseDuration, parseIcs, relevance, sameEvent, tagEvent } from "../src/lib/ics";

const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "X-WR-CALNAME:Charlotte Tech Calendar",
  "X-WR-TIMEZONE:America/New_York",
  "BEGIN:VEVENT",
  "UID:abc-1@example.com",
  "DTSTART;TZID=America/New_York:20261120T180000",
  "DTEND;TZID=America/New_York:20261120T200000",
  "SUMMARY:Charlotte AI Meetup: LLM agents\\, evals & more",
  "LOCATION:Packard Place\\, 222 S Church St\\, Charlotte\\, NC",
  "DESCRIPTION:Lightning talks on machine learning.\\nPizza provided.",
  " Folded continuation.",
  "URL:https://example.com/e/1",
  "BEGIN:VALARM",
  "TRIGGER:-PT15M",
  "DESCRIPTION:Reminder",
  "END:VALARM",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abc-2@example.com",
  "DTSTART:20261205T150000Z",
  "DURATION:PT90M",
  "SUMMARY:Resume Workshop",
  "LOCATION:Atkins Library\\, UNC Charlotte",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abc-3@example.com",
  "DTSTART;VALUE=DATE:20261212",
  "DTEND;VALUE=DATE:20261214",
  "SUMMARY:Queen City Hackathon",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:abc-4@example.com",
  "DTSTART:20260105T230000Z",
  "DTEND:20260106T010000Z",
  "RRULE:FREQ=WEEKLY;INTERVAL=1",
  "SUMMARY:Weekly Hack Night",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("iCalendar import", () => {
  const cal = parseIcs(FEED);

  it("reads calendar name and every VEVENT (ignoring VALARM)", () => {
    expect(cal.name).toBe("Charlotte Tech Calendar");
    expect(cal.events).toHaveLength(4);
    expect(cal.events[0].description).toContain("Pizza provided.Folded continuation.");
    expect(cal.events[0].description).not.toContain("Reminder");
  });

  it("unescapes text and keeps URL", () => {
    expect(cal.events[0].title).toBe("Charlotte AI Meetup: LLM agents, evals & more");
    expect(cal.events[0].location).toBe("Packard Place, 222 S Church St, Charlotte, NC");
    expect(cal.events[0].url).toBe("https://example.com/e/1");
  });

  it("converts TZID wall-clock time to UTC (EST = UTC-5 in November)", () => {
    expect(cal.events[0].start.toISOString()).toBe("2026-11-20T23:00:00.000Z");
    expect(cal.events[0].end.toISOString()).toBe("2026-11-21T01:00:00.000Z");
  });

  it("handles DURATION, all-day and CANCELLED", () => {
    expect(cal.events[1].end.getTime() - cal.events[1].start.getTime()).toBe(90 * 60_000);
    expect(cal.events[2].allDay).toBe(true);
    expect(cal.events[2].cancelled).toBe(true);
    expect(parseDuration("P1DT2H")).toBe(26 * 3_600_000);
  });

  it("rolls a weekly series forward to its next occurrence", () => {
    const now = new Date("2026-11-07T12:00:00Z");
    const next = nextOccurrence(cal.events[3], now)!;
    expect(next.start >= new Date("2026-11-07T00:00:00Z")).toBe(true);
    expect(next.start.getUTCDay()).toBe(cal.events[3].start.getUTCDay());
    expect(next.start.getTime() - now.getTime()).toBeLessThan(7 * 86_400_000);
    expect(nextOccurrence(cal.events[0], new Date("2027-01-01"))).toBeNull();
  });

  it("classifies event types and tags interests", () => {
    expect(classifyKind("Weekly Hack Night", "")).toBe("hackathon");
    expect(classifyKind("Resume Workshop", "")).toBe("workshop");
    expect(classifyKind("Spring Career & Internship Fair", "")).toBe("career-fair");
    expect(classifyKind("Founder Pitch Night", "")).toBe("pitch");
    expect(classifyKind("Charlotte AI Meetup", "")).toBe("meetup");
    expect(classifyKind("Distinguished Lecture: Quantum", "")).toBe("seminar");
    expect(tagEvent("Charlotte AI Meetup", "machine learning talks", "meetup")).toContain("ai");
    expect(tagEvent("Untitled", "", "career-fair")).toEqual(["careers"]);
    expect(classifyKind("Info night", "", ["Career Development"])).toBe("career-fair");
  });

  it("filters campus-calendar noise and ranks networking events first", () => {
    const ev = (title: string, categories: string[] = [], description = "") => ({ title, categories, description });
    expect(relevance(ev("Peer-led study session for ECON 2102"))).toBeLessThan(0);
    expect(relevance(ev("AWAY GAME (VS NC STATE)", ["Athletics"]))).toBeLessThan(0);
    expect(relevance(ev("Women's Club Soccer", ["Athletics"]))).toBeLessThan(0);
    const hack = relevance(ev("Charlotte AI Hackathon", [], "Build machine learning projects with startups"));
    const fair = relevance(ev("Engineering Career Fair", ["Career"]));
    const social = relevance(ev("Pizza social", ["Social"]));
    expect(hack).toBeGreaterThan(fair - 1);
    expect(fair).toBeGreaterThan(social);
    expect(relevance(ev("Movie Night on the Green"))).toBeLessThan(0);
  });

  it("spots the same event listed twice", () => {
    expect(classifyKind("CrownHacks - Hosted by CAIR", "")).toBe("hackathon");
    expect(sameEvent({ title: "CrownHacks 2026", start: "2026-11-07T16:00:00Z" }, { title: "CrownHacks - Hosted by CAIR - Club for AI Research", start: "2026-11-07T15:00:00Z" })).toBe(true);
    expect(sameEvent({ title: "Business After Hours: Casino Night", start: "2026-11-17T22:00:00Z" }, { title: "Business After Hours: Casino Night", start: "2026-11-17T22:00:00Z" })).toBe(true);
    expect(sameEvent({ title: "CrownHacks 2026", start: "2026-11-07T16:00:00Z" }, { title: "CrownHacks 2027", start: "2027-11-07T16:00:00Z" })).toBe(false);
    expect(sameEvent({ title: "AI Day: Project Expo", start: "2026-11-16T16:00:00Z" }, { title: "AI Ethics Seminar", start: "2026-11-16T16:00:00Z" })).toBe(false);
    expect(relevance({ title: "Flu Vaccine Clinic", description: "", categories: [] })).toBeLessThan(0);
  });

  it("reads CATEGORIES and X-HOSTS", () => {
    const c = parseIcs(
      ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:x", "DTSTART:20261201T170000Z", "SUMMARY:Pitch Night", "CATEGORIES:Entrepreneurship,Networking", "CATEGORIES:Public", "X-HOSTS:Niner Startup Club", "GEO:35.3075;-80.7357", "END:VEVENT", "END:VCALENDAR"].join("\n"),
    );
    expect(c.events[0].categories).toEqual(["Entrepreneurship", "Networking", "Public"]);
    expect(c.events[0].hosts).toBe("Niner Startup Club");
    expect(c.events[0].geo).toEqual({ lat: 35.3075, lng: -80.7357 });
  });

  it("rejects impossible calendar dates instead of rolling them into a different day", () => {
    const c = parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260230T180000Z\nSUMMARY:Invalid date\nEND:VEVENT\nEND:VCALENDAR");
    expect(c.events).toHaveLength(0);
  });

  it("preserves local weekly wall time across daylight-saving changes", () => {
    const c = parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:weekly\nDTSTART;TZID=America/New_York:20261025T180000\nDURATION:PT1H\nRRULE:FREQ=WEEKLY\nSUMMARY:Weekly workshop\nEND:VEVENT\nEND:VCALENDAR");
    const next = nextOccurrence(c.events[0], new Date("2026-10-30T12:00:00Z"))!;
    expect(next.start.toISOString()).toBe("2026-11-01T23:00:00.000Z");
  });

  it("honors recurrence exceptions, COUNT, and exclusive event end boundaries", () => {
    const c = parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:daily\nDTSTART:20261101T180000Z\nDURATION:PT1H\nRRULE:FREQ=DAILY;COUNT=3\nEXDATE:20261102T180000Z\nSUMMARY:Daily workshop\nEND:VEVENT\nEND:VCALENDAR");
    expect(nextOccurrence(c.events[0], new Date("2026-11-01T19:00:00Z"))!.start.toISOString()).toBe("2026-11-03T18:00:00.000Z");
    expect(nextOccurrence(c.events[0], new Date("2026-11-03T19:00:00Z"))).toBeNull();
  });

  it("skips nonexistent monthly dates and refuses to invent unsupported recurrence schedules", () => {
    const c = parseIcs("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20260131T180000Z\nDURATION:PT1H\nRRULE:FREQ=MONTHLY;COUNT=2\nSUMMARY:Monthly workshop\nEND:VEVENT\nEND:VCALENDAR");
    expect(nextOccurrence(c.events[0], new Date("2026-02-01T12:00:00Z"))!.start.toISOString()).toBe("2026-03-31T18:00:00.000Z");
    expect(nextOccurrence({ ...c.events[0], rrule: "FREQ=WEEKLY;BYDAY=MO,WE" }, new Date("2026-02-01T12:00:00Z"))).toBeNull();
  });

  it("does not tag unknown arts or humanities events as startup/developer events", () => {
    expect(tagEvent("Poetry workshop", "A literature discussion", "workshop")).toEqual([]);
    expect(tagEvent("History colloquium", "", "seminar")).toEqual([]);
    expect(relevance({ title: "History seminar", description: "Literature discussion", categories: [] })).toBeGreaterThanOrEqual(2);
    expect(relevance({ title: "Nursing research panel", description: "Clinical research", categories: ["Health & Wellness"] })).toBeGreaterThanOrEqual(2);
  });
});
