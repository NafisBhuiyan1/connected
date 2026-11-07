import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ApiError } from "./services";
import { currentUser } from "./session";
import type { Profile } from "../types";

export async function requireUser(): Promise<Profile> {
  const me = await currentUser();
  if (!me) throw new ApiError(401, "Create a profile first.");
  return me;
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(raw);
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return NextResponse.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof ApiError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const first = err.issues[0];
        return NextResponse.json({ error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input" }, { status: 400 });
      }
      console.error("[connected] unhandled API error", err);
      return NextResponse.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}

export type IdParams = { params: Promise<{ id: string }> };
