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
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Database;
    if (db.version === DB_VERSION) return db;
  } catch {
    // missing or corrupt → reseed
  }
  const db = buildSeed(new Date());
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
  if (!g.__connectedDb) g.__connectedDb = load();
  return g.__connectedDb;
}

export function mutate<T>(fn: (db: Database) => T): T {
  const db = getDb();
  const result = fn(db);
  save(db);
  return result;
}

/** Reseed demo data but keep real (non-demo) users and everything they created. */
export function resetDemo(keepRealUsers = true): Database {
  const old = g.__connectedDb ?? load();
  const fresh = buildSeed(new Date());
  if (keepRealUsers) {
    const real = old.profiles.filter((p) => !p.isDemo);
    const realIds = new Set(real.map((p) => p.id));
    fresh.profiles.push(...real);
    fresh.memberships.push(...old.memberships.filter((m) => realIds.has(m.userId)));
    fresh.missions.push(...old.missions.filter((m) => realIds.has(m.userId)));
  }
  g.__connectedDb = fresh;
  save(fresh);
  return fresh;
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
