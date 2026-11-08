import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, sessionSecret, SESSION_MAX_AGE } from "../src/lib/server/session-codec";

const key = "test-only-session-key-32-characters";
describe("signed session expiry", () => {
  it("expires on the server at the boundary even if a browser keeps its cookie", () => {
    const now = 1_800_000_000_000;
    const token = createSessionToken("u_judge", key, now);
    expect(verifySessionToken(token, key, now + SESSION_MAX_AGE * 1000 - 1)).toBe("u_judge");
    expect(verifySessionToken(token, key, now + SESSION_MAX_AGE * 1000)).toBeNull();
  });
  it("rejects identity changes, wrong keys, malformed and legacy cookies", () => {
    const token = createSessionToken("u_judge", key);
    const [, payload, mac] = token.split(".");
    const changed = JSON.parse(Buffer.from(payload, "base64url").toString());
    changed.id = "u_other";
    expect(verifySessionToken(`v1.${Buffer.from(JSON.stringify(changed)).toString("base64url")}.${mac}`, key)).toBeNull();
    expect(verifySessionToken(token, "wrong-key")).toBeNull();
    for (const value of [undefined, "u_judge.signature", "v1.bad.bad", "x".repeat(1025)]) expect(verifySessionToken(value, key)).toBeNull();
  });
  it("fails closed when a production secret is absent or too short", () => {
    expect(sessionSecret({ NODE_ENV: "production" })).toBeNull();
    expect(sessionSecret({ NODE_ENV: "production", SESSION_SECRET: "short", CONNECTED_ALLOW_DEV_SECRET: "0" })).toBeNull();
    expect(sessionSecret({ NODE_ENV: "production", SESSION_SECRET: key })).toBe(key);
    expect(verifySessionToken(createSessionToken("u_judge", key), null)).toBeNull();
    expect(sessionSecret({ NODE_ENV: "development" })).toBeTypeOf("string");
  });
});
