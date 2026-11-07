"use client";

import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LEVEL_LABEL, SKILLS, SKILL_BY_ID } from "@/lib/ontology";
import type { Level, UserSkill } from "@/lib/types";
import { cx } from "./ui";

/** Searchable skill picker with a 3-level proficiency selector. */
export function SkillPicker({ value, onChange, max = 12 }: { value: UserSkill[]; onChange: (v: UserSkill[]) => void; max?: number }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const taken = new Set(value.map((v) => v.skill));
    return SKILLS.filter((s) => !taken.has(s.id) && (!t || s.label.toLowerCase().includes(t) || s.aliases.some((a) => a.includes(t)))).slice(0, t ? 10 : 14);
  }, [q, value]);
  const setLevel = (skill: string, level: Level) => onChange(value.map((v) => (v.skill === skill ? { ...v, level } : v)));
  return (
    <div className="space-y-3">
      {value.length ? (
        <div className="space-y-2">
          {value.map((v) => (
            <div key={v.skill} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <span className="truncate text-sm font-medium text-ink">{SKILL_BY_ID[v.skill]?.label ?? v.skill}</span>
              <div className="flex items-center gap-1">
                {([1, 2, 3] as Level[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(v.skill, l)}
                    className={cx(
                      "rounded-lg px-2 py-1 text-[11.5px] font-medium transition-colors",
                      v.level === l ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas hover:text-ink",
                    )}
                  >
                    {LEVEL_LABEL[l]}
                  </button>
                ))}
                <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x.skill !== v.skill))} className="ml-1 rounded-lg p-1 text-faint hover:bg-canvas hover:text-ink">
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {value.length < max ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search skills — React, Figma, finance, PyTorch…"
              className="h-10 w-full rounded-xl border border-line bg-surface pr-3 pl-9 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange([...value, { skill: s.id, level: 2 }]);
                  setQ("");
                }}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] text-ink-2 hover:border-brand-200 hover:text-brand-700"
              >
                <Plus className="size-3" /> {s.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function ChipSet<T extends string>({
  options,
  value,
  onChange,
  max,
}: {
  options: { id: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  max?: number;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (on) onChange(value.filter((x) => x !== o.id));
              else if (!max || value.length < max) onChange([...value, o.id]);
            }}
            className={cx(
              "rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              on ? "border-brand-300 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ListEditor({ value, onChange, placeholder, max = 5, suggestions = [] }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number; suggestions?: string[] }) {
  const [draft, setDraft] = useState("");
  const add = (t: string) => {
    const x = t.trim();
    if (x.length < 3 || value.includes(x) || value.length >= max) return;
    onChange([...value, x]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((g) => (
          <span key={g} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1.5 pl-3 text-[13px] font-medium text-brand-700">
            {g}
            <button type="button" aria-label={`Remove ${g}`} onClick={() => onChange(value.filter((x) => x !== g))} className="rounded-full p-0.5 hover:bg-brand-100">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      {value.length < max ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder={placeholder}
            maxLength={100}
            className="h-10 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          />
          <button type="button" onClick={() => add(draft)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-2 hover:border-line-2">
            Add
          </button>
        </div>
      ) : null}
      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 5)
            .map((s) => (
              <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-line-2 px-2.5 py-1 text-[12px] text-muted hover:border-brand-200 hover:text-brand-700">
                + {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}
