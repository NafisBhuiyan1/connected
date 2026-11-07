import "server-only";
import fs from "node:fs";
import path from "node:path";
import { buildSeed, DB_VERSION } from "../seed";
import type { Database } from "../types";

// A tiny JSON-file datastore. Good enough for a hackathon demo on one machine, swappable for
// Postgres/Supabase (see supabase/schema.sql) because every access goes through getDb/mutate.

const DATA_DIR = process.env.CONNECTED_DATA_DIR || (process.env.VERCEL ? "/tmp/connected" : path.join(process.cwd(), ".data"));
const DB_FILE = path.join(DATA_DIR, "connected-db.json");

const g = globalThis as unknown as { __connectedDb?: Database };

function load(): Database {
  let old: Database | null = null;
  try {
    old = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
    if (old.version === DB_VERSION) return old;
  } catch {
    // missing or corrupt → reseed
  }
  const db = reseedKeepingRealUsers(old);
  save(db);
  return db;
}

function save(db: Database) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error("[connected] failed to persist datastore", err);
  }
}

export function getDb(): Database {
  // Hot reloads keep the old in-memory copy around; migrate it when the schema version changes.
  if (g.__connectedDb && g.__connectedDb.version !== DB_VERSION) {
    g.__connectedDb = reseedKeepingRealUsers(g.__connectedDb);
    save(g.__connectedDb);
  }
  if (!g.__connectedDb) g.__connectedDb = load();
  return g.__connectedDb;
}

export function mutate<T>(fn: (db: Database) => T): T {
  const db = getDb();
  const result = fn(db);
  save(db);
  return result;
}

/** Fresh demo data that keeps real (non-demo) users, their logins, posts, missions and event memberships. */
function reseedKeepingRealUsers(old: Partial<Database> | null): Database {
  const fresh = buildSeed(new Date());
  if (!old?.profiles) return fresh;
  const real = old.profiles.filter((p) => !p.isDemo);
  const realIds = new Set(real.map((p) => p.id));
  fresh.profiles.push(...real);
  // Events imported from real calendars survive demo reseeds.
  const seededIds = new Set(fresh.events.map((e) => e.id));
  fresh.events.push(...(old.events ?? []).filter((e) => e.source?.kind === "ics" && !seededIds.has(e.id)));
  fresh.feeds = old.feeds;
  fresh.memberships.push(...(old.memberships ?? []).filter((m) => realIds.has(m.userId)));
  fresh.missions.push(...(old.missions ?? []).filter((m) => realIds.has(m.userId)));
  fresh.accounts.push(...(old.accounts ?? []).filter((a) => realIds.has(a.userId)));
  fresh.posts.push(...(old.posts ?? []).filter((p) => realIds.has(p.authorId)));
  fresh.lounge.push(...(old.lounge ?? []).filter((m) => realIds.has(m.userId)));
  fresh.photos.push(...(old.photos ?? []).filter((p) => realIds.has(p.userId)));
  return fresh;
}

export function resetDemo(): Database {
  const fresh = reseedKeepingRealUsers(g.__connectedDb ?? null);
  g.__connectedDb = fresh;
  save(fresh);
  return fresh;
}

/** Where uploaded event photos live (next to the JSON store). */
export function photosDir(): string {
  const dir = path.join(DATA_DIR, "photos");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
