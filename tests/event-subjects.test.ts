import { expect, it } from "vitest";
import { eventSubjects } from "../src/lib/event-subjects";

it("finds opportunities beyond technology from the actual event text", () => {
  expect(eventSubjects({ title: "Nursing careers panel", description: "Clinical practice and patient care" })).toContain("health");
  expect(eventSubjects({ title: "History research symposium", description: "Literature and languages" })).toContain("humanities");
  expect(eventSubjects({ title: "Gallery networking evening", description: "Meet artists and designers" })).toContain("arts");
  expect(eventSubjects({ title: "Legal careers workshop", description: "Public policy and government" })).toContain("law");
});
it("allows interdisciplinary events and leaves unknown topics unclassified", () => {
  const subjects = eventSubjects({ title: "Healthcare robotics", description: "Engineering and clinical collaboration" });
  expect(subjects).toContain("health");
  expect(subjects).toContain("engineering");
  expect(eventSubjects({ title: "Welcome mixer", description: "Meet your peers" })).toEqual([]);
});
