import { HandHeart, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shell";
import { interestLabel, skillLabel } from "@/lib/ontology";
import { currentUserId } from "@/lib/server/session";
import { getDb } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// Public landing page behind every personal QR code. Signed-in visitors go straight to the full
// profile (with match explanation); everyone else sees a minimal card — and only if the person
// chose "Everyone" visibility.

export default async function PublicCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await currentUserId();
  if (viewer) redirect(`/people/${id}`);

  const p = getDb().profiles.find((x) => x.id === id);
  const visible = p && p.visibility === "everyone";

  return (
    <div className="brand-gradient-soft flex min-h-dvh flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      {!visible ? (
        <div className="card w-full max-w-md p-8 text-center">
          <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-canvas text-muted">
            <Lock className="size-5" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-ink">This profile is private</h1>
          <p className="mt-1.5 text-sm text-muted">
            {p
              ? p.visibility === "events"
                ? "This person only shares their card with people in the same event networking space."
                : "This person has chosen not to share their card publicly."
              : "We couldn't find this card."}{" "}
            Join Connected to find your people at the event.
          </p>
          <Link
            href={p ? `/onboarding?ref=${encodeURIComponent(id)}` : "/onboarding"}
            className="brand-gradient focus-ring mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-white shadow-[0_6px_16px_-6px_rgba(81,69,224,0.55)] hover:brightness-110"
          >
            Join Connected
          </Link>
        </div>
      ) : (
        <div className="card w-full max-w-md overflow-hidden">
          <div className="brand-gradient h-20" />
          <div className="-mt-10 px-6 pb-6">
            <span
              className="inline-flex size-20 items-center justify-center rounded-full text-2xl font-semibold text-white ring-4 ring-white"
              style={{ background: `linear-gradient(135deg, hsl(${p.avatarHue} 70% 58%), hsl(${(p.avatarHue + 40) % 360} 72% 48%))` }}
            >
              {p.name
                .replace(/^Dr\.\s+/, "")
                .split(/\s+/)
                .map((s) => s[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div className="mt-3 flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink">{p.name}</h1>
              {p.isDemo ? (
                <span title="Fictional demo profile for the hackathon demo" className="rounded border border-dashed border-line-2 px-1 text-[10px] font-semibold tracking-wide text-faint uppercase">
                  Demo
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[14px] text-muted">{p.headline}</p>
            {p.university || p.major ? (
              <p className="mt-1 text-[13px] text-ink-2">{[p.major, p.university].filter(Boolean).join(" · ")}</p>
            ) : null}

            {p.skills.length ? (
              <div className="mt-5">
                <p className="mb-2 text-[12px] font-semibold tracking-wide text-faint uppercase">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.skills
                    .slice()
                    .sort((a, b) => b.level - a.level)
                    .slice(0, 5)
                    .map((s) => (
                      <span key={s.skill} className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-[12.5px] font-medium text-brand-700">
                        {skillLabel(s.skill)}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            {p.interests.length ? (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold tracking-wide text-faint uppercase">Into</p>
                <p className="text-[13.5px] text-ink-2">{p.interests.slice(0, 5).map(interestLabel).join(" · ")}</p>
              </div>
            ) : null}

            {p.gives.length ? (
              <div className="mt-4 rounded-2xl bg-canvas p-3.5">
                <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
                  <HandHeart className="size-3.5 text-brand-500" /> Can help with (15 min)
                </p>
                <ul className="space-y-1 text-[13.5px] text-ink">
                  {p.gives.map((g) => (
                    <li key={g}>• {g}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              href={`/onboarding?ref=${encodeURIComponent(p.id)}`}
              className="brand-gradient focus-ring mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium text-white shadow-[0_6px_16px_-6px_rgba(81,69,224,0.55)] hover:brightness-110"
            >
              <Sparkles className="size-4" /> Join Connected to connect
            </Link>
            <p className="mt-3 text-center text-[12px] text-muted">
              Connected explains why you&apos;d work well together — and nothing is sent without your OK.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
