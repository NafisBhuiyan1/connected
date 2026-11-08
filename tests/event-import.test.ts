import { describe, expect, it, vi } from "vitest";
import { importCalendar, isPrivateIp } from "../src/lib/server/event-import";
import type { Profile } from "../src/lib/types";

describe("calendar fetch address guard", () => {
  it("rejects mapped loopback and complete IPv6 link-local ranges", () => {
    for (const address of ["127.0.0.1", "::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "fe81::1", "febf::1", "fd12::1", "ff02::1", "169.254.169.254"]) expect(isPrivateIp(address)).toBe(true);
  });
  it("allows public university/CDN address forms", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
  });
  it("enforces upload limits in UTF-8 bytes rather than characters", async () => {
    await expect(importCalendar({ id: "size-test" } as Profile, { ics: "BEGIN:VCALENDAR\n" + "é".repeat(1_000_001) })).rejects.toMatchObject({ status: 413 });
  });
  it("coalesces concurrent imports of one feed without touching the datastore", async () => {
    let rejectFetch!: (error: Error) => void;
    const pending = new Promise<Response>((_, reject) => { rejectFetch = reject; });
    const fetcher = vi.fn(() => pending);
    vi.stubGlobal("fetch", fetcher);
    try {
      const one = importCalendar({ id: "concurrent-one" } as Profile, { url: "https://8.8.8.8/calendar.ics" });
      const two = importCalendar({ id: "concurrent-two" } as Profile, { url: "https://8.8.8.8/calendar.ics" });
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      rejectFetch(new Error("test network failure"));
      const results = await Promise.allSettled([one, two]);
      expect(results.every((result) => result.status === "rejected")).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });
});
