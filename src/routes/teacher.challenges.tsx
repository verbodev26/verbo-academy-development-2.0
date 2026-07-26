import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, X, Play } from "lucide-react";
import { Card, Pill, GhostButton } from "@/components/verbo/ui";
import {
  type Challenge,
  type ChallengeProductId,
  type DifficultyId,
  PRODUCT_META,
  PRODUCT_ORDER,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  loadChallenges,
  subscribeChallenges,
  challengesFor,
  categoryColor,
} from "@/lib/challenges-store";

export const Route = createFileRoute("/teacher/challenges")({
  head: () => ({
    meta: [
      { title: "Challenges — Verbo Academy" },
      { name: "description", content: "Preview the full challenge bank across all products." },
    ],
  }),
  component: Page,
});

const GRADIENTS: Record<DifficultyId, string> = {
  esencial: "from-emerald-500 to-emerald-700",
  intermedio: "from-sky-500 to-sky-700",
  avanzado: "from-violet-500 to-violet-700",
  experto: "from-rose-500 to-rose-700",
};

function DifficultyDots({ difficulty }: { difficulty: DifficultyId }) {
  const { dots } = DIFFICULTY_META[difficulty];
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < dots ? "bg-white/90" : "border border-white/40 bg-transparent"}`}
        />
      ))}
    </span>
  );
}

function CategoryBadge({ name }: { name: string }) {
  if (!name) return <Pill tone="muted">No category</Pill>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryColor(name)}`}>
      {name}
    </span>
  );
}

function SkillChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function Page() {
  const [challenges, setChallenges] = useState<Challenge[]>(loadChallenges);
  const [productId, setProductId] = useState<ChallengeProductId>("go");
  const [difficulty, setDifficulty] = useState<DifficultyId | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [open, setOpen] = useState<Challenge | null>(null);

  useEffect(() => {
    setChallenges(loadChallenges());
    return subscribeChallenges(() => setChallenges(loadChallenges()));
  }, []);

  const productChallenges = useMemo(
    () => challenges.filter((c) => c.product === productId),
    [challenges, productId],
  );

  const header = (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Challenges</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Browse the full challenge bank across all products — try any challenge without affecting any student's streak or badges.
      </p>
    </div>
  );

  const productPicker = (
    <div className="flex flex-wrap items-center gap-2">
      {PRODUCT_ORDER.map((pid) => {
        const active = pid === productId;
        return (
          <button
            key={pid}
            onClick={() => { setProductId(pid); setDifficulty(null); setCategory("all"); }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-[#f38934] bg-[#f38934]/10 text-[#f38934]"
                : "border-border bg-background text-muted-foreground hover:bg-secondary"
            }`}
          >
            {PRODUCT_META[pid].label}
          </button>
        );
      })}
    </div>
  );

  if (difficulty) {
    const list = challengesFor(challenges, productId, difficulty);
    const availableCategories = Array.from(
      new Set(list.map((c) => c.category).filter((c): c is string => !!c)),
    );
    const filtered = category === "all" ? list : list.filter((c) => c.category === category);
    const gradient = GRADIENTS[difficulty];

    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <GhostButton onClick={() => { setDifficulty(null); setCategory("all"); }}>
            <ArrowLeft className="h-3.5 w-3.5" /> All difficulties
          </GhostButton>
          <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-soft`}>
            <div className="flex items-center gap-3">
              <DifficultyDots difficulty={difficulty} />
              <span className="text-xs uppercase tracking-[0.18em] text-white/70">
                {PRODUCT_META[productId].label} · {DIFFICULTY_META[difficulty].label}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {DIFFICULTY_META[difficulty].label} Challenges
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {list.length} challenge{list.length === 1 ? "" : "s"} in this bank.
            </p>
          </div>
        </div>

        {availableCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === "all" ? "border-[#f38934] bg-[#f38934]/10 text-[#f38934]" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
            >
              All categories
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity ${categoryColor(cat)} ${category === cat ? "ring-2 ring-offset-1 ring-current" : "opacity-70 hover:opacity-100"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <div className="py-10 text-center text-sm text-muted-foreground">
              No challenges yet in this difficulty.
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setOpen(c)}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <CategoryBadge name={c.category} />
                  <Pill tone="muted">Preview</Pill>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{c.title}</div>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{c.description || "Tap to see the details."}</p>
                </div>
                {c.skill_tags && c.skill_tags.length > 0 && (
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {c.skill_tags.map((s) => <SkillChip key={s} label={s} />)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {open && <PreviewModal challenge={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {header}
      {productPicker}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Pick a difficulty to explore</h2>
        <p className="mt-1 text-sm text-muted-foreground">Showing challenges for {PRODUCT_META[productId].label}.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {DIFFICULTY_ORDER.map((d) => {
          const count = productChallenges.filter((c) => c.difficulty === d).length;
          const gradient = GRADIENTS[d];
          return (
            <button
              key={d}
              onClick={() => { setDifficulty(d); setCategory("all"); }}
              className={`group flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-br ${gradient} p-6 text-left text-white shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elevated`}
            >
              <DifficultyDots difficulty={d} />
              <div>
                <div className="text-lg font-semibold tracking-tight">{DIFFICULTY_META[d].label}</div>
                <div className="mt-1 text-xs text-white/80">{count} challenge{count === 1 ? "" : "s"}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewModal({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#01304a] to-[#024366] p-6 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge name={challenge.category} />
              <Pill tone="muted">Preview</Pill>
            </div>
            <div className="mt-2 text-base font-semibold tracking-tight">{challenge.title}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
              {PRODUCT_META[challenge.product].label} · {DIFFICULTY_META[challenge.difficulty].label}
            </div>
            {challenge.skill_tags && challenge.skill_tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {challenge.skill_tags.map((s) => <SkillChip key={s} label={s} />)}
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm leading-relaxed text-foreground">
            {challenge.description || "No description available."}
          </p>
          {challenge.video_url && (
            <a
              href={challenge.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              <Play className="h-3.5 w-3.5" /> Watch reference video
            </a>
          )}
          <div className="rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
            Preview mode — completing this challenge won't affect any student's streak, badges, or history.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}
