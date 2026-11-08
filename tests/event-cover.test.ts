import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { eventArtwork, eventCoverSource, publishedImageUrl } from "../src/lib/event-cover";
import { parseIcs } from "../src/lib/ics";

const event = { title: "Community gathering", description: "", tags: [], kind: "meetup" as const };

describe("honest event covers", () => {
  it("provides distinct local artwork for broad subjects, including non-tech majors", () => {
    const titles = ["Software hackathon", "Nursing research", "Music and arts", "History seminar", "Finance career fair", "Community gathering"];
    const covers = titles.map((title) => eventArtwork({ ...event, title }));
    expect(new Set(covers.map((cover) => cover.src)).size).toBe(6);
    for (const cover of covers) {
      expect(cover.kind).toBe("artwork");
      expect(cover.label).toBe("Topic artwork");
      expect(fs.existsSync(path.join(process.cwd(), "public", cover.src))).toBe(true);
    }
  });
  it("prefers explicit HTTPS publisher metadata and labels it separately", () => {
    expect(eventCoverSource({ ...event, imageUrl: "https://publisher.example/poster.jpg" })).toMatchObject({ kind: "published", label: "Calendar image" });
  });
  it("rejects unsafe addresses and generic calendar placeholders", () => {
    for (const url of ["javascript:alert(1)", "data:image/png;base64,abc", "http://publisher.example/a.png", "https://localhost/a.png", "https://127.0.0.1/a.png", "https://[::1]/a.png", "https://user:secret@publisher.example/a.png", "https://localist-images.azureedge.net/assets/main/thumbs/event-huge.png"]) expect(publishedImageUrl(url)).toBeUndefined();
  });
  it("reads URI IMAGE and image ATTACH properties, but ignores binary and non-image attachments", () => {
    const calendar = (line: string) => parseIcs(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261120T180000Z\nSUMMARY:Workshop\n${line}\nEND:VEVENT\nEND:VCALENDAR`).events[0];
    expect(calendar("IMAGE;VALUE=URI:https://publisher.example/image.jpg").imageUrl).toBe("https://publisher.example/image.jpg");
    expect(calendar("ATTACH;FMTTYPE=image/png:https://publisher.example/image.png").imageUrl).toBe("https://publisher.example/image.png");
    expect(calendar("ATTACH;FMTTYPE=application/pdf:https://publisher.example/document.pdf").imageUrl).toBeUndefined();
    expect(calendar("IMAGE;VALUE=BINARY;ENCODING=BASE64:abc").imageUrl).toBeUndefined();
  });
});
