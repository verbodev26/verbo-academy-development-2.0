import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Lock,
  Trophy,
  CheckCircle2,
  Play,
  Sparkles,
  X,
  Share2,
  Link2,
  Upload,
  Gift,
  Zap,
  Pencil,
  Crown,
  Flame,
  Plus,
  Gem,
  Medal,
  Video,
  Clapperboard,
  Headphones,
  Ear,
  Mail,
  BookOpen,
  PenLine,
  MessagesSquare,
  Users,
  Presentation,
  Handshake,
  Megaphone,
  Briefcase,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, Pill, PrimaryButton, GhostButton, SuccessButton } from "@/components/verbo/ui";
import { Confetti } from "@/components/verbo/Confetti";
import { useAuth } from "@/lib/auth";
import {
  type Challenge,
  type ChallengeProductId,
  type DifficultyId,
  DIFFICULTY_META,
  DIFFICULTY_ORDER,
  CHALLENGES_PER_DIFFICULTY,
  loadChallenges,
  subscribeChallenges,
  challengesFor,
  categoryColor,
} from "@/lib/challenges-store";
import {
  chooseChallenge,
  completeChallenge,
  completeCooldownRemaining,
  hasChosenChallenge,
  hasCompletedChallenge,
  getSharedResult,
  shareChallengeResult,
  subscribeStudents,
  openMysteryBox,
  mysteryBoxCooldownRemaining,
} from "@/lib/students-store";
import {
  type FlashChallenge,
  type FlashProductId,
  type FlashSeason,
  type LightningState,
  loadFlashChallenges,
  loadFlashConfig,
  subscribeFlashChallenges,
  subscribeFlashConfig,
  flashChallengesFor,
  loadLightning,
  subscribeLightning,
  acceptLightning,
  isLightningVisibleForStudents,
  loadSeasons,
  subscribeSeasons,
  fontFamilyFor,
  ensureGoogleFont,
} from "@/lib/flash-challenges-store";
import {
  completeLightningChallenge,
  openSeason,
  seasonCooldownRemaining,
  completeSeasonChallenge,
} from "@/lib/students-store";
import { USERS } from "@/lib/mock-data";
import { groupsByStudentId } from "@/lib/groups-store";
import { setAvatar, useAvatar } from "@/lib/avatar-store";
import {
  getLeaderboardIdentity,
  setLeaderboardIdentity,
  subscribeLeaderboardIdentity,
  colorFromString,
  initialsOf,
  type LeaderboardIdentityMode,
} from "@/lib/leaderboard-identity-store";
import {
  loadBadges as loadProfileBadges,
  subscribeBadges as subscribeProfileBadges,
  isBadgeEarned as isProfileBadgeEarned,
  buildProfileBadgeContext,
  type BadgeDef as ProfileBadgeDef,
} from "@/lib/profile-badges-store";
import {
  loadEquippedBadgeIds,
  setEquippedBadgeIds,
  subscribeEquippedBadges,
  EQUIPPED_MAX,
} from "@/lib/equipped-profile-badges-store";
import { BadgePickerModal, BadgeVisual } from "@/components/verbo/ProfileModal";
import fireIconAsset from "@/assets/fire-animation.svg.asset.json";
import trophyIconAsset from "@/assets/trophy-animation.svg.asset.json";
import confettiIconAsset from "@/assets/success-confetti.svg.asset.json";
import crownIconAsset from "@/assets/crown-animation.svg.asset.json";
import winnerBadgeAsset from "@/assets/winner-badge.svg.asset.json";
import silverCoinAsset from "@/assets/silver-coin.svg.asset.json";
import bronzeCoinAsset from "@/assets/bronze-coin.svg.asset.json";

export const Route = createFileRoute("/student/challenges")({ component: Page });

const COOLDOWN_MSG =
  "You've already completed a Challenge in the last 24 hours — come back soon for your next one!";
const MYSTERY_COOLDOWN_MSG =
  "You've already opened today's Mystery Box — come back tomorrow!";

import { PREMIUM_ACCESS, PremiumBadge, AccessGateNotice } from "@/components/verbo/PremiumGate";




/* -------------------------------------------------------------------------- */
/* Style tokens — reused from Learning Path so the visual language matches.   */
/* -------------------------------------------------------------------------- */
const PRODUCT_GRADIENTS: Record<string, string> = {
  enterprise: "from-[#01304a] via-[#024366] to-[#0a5e88]",
  go: "from-[#7c2d12] via-[#c2410c] to-[#f97316]",
  international: "from-[#134e4a] via-[#0f766e] to-[#14b8a6]",
  vip: "from-[#4a044e] via-[#7e22ce] to-[#a855f7]",
};



/* -------------------------------------------------------------------------- */
/* Reusable atoms                                                              */
/* -------------------------------------------------------------------------- */
function DifficultyDots({ difficulty, className = "" }: { difficulty: DifficultyId; className?: string }) {
  const { dots } = DIFFICULTY_META[difficulty];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < dots ? "bg-white/90" : "border border-white/40 bg-transparent"}`}
        />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Challenge card shell — shares the visual language of Resources' spotlight   */
/* cards: rounded-3xl, bespoke vibrant gradient, oversized decorative motif    */
/* bleeding out of the bottom-right corner, content kept on the left column.   */
/* -------------------------------------------------------------------------- */
const DIFFICULTY_GRADIENTS: Record<DifficultyId, string> = {
  esencial: "from-[#0f766e] via-[#12a594] to-[#34d399]",
  intermedio: "from-[#1d4ed8] via-[#0284c7] to-[#22b8d6]",
  avanzado: "from-[#b91c1c] via-[#ea580c] to-[#f59e0b]",
  experto: "from-[#6b21a8] via-[#9333ea] to-[#db2777]",
};

const DIFFICULTY_MOTIF: Record<DifficultyId, typeof Trophy> = {
  esencial: Gem,
  intermedio: Zap,
  avanzado: Medal,
  experto: Trophy,
};

function ChallengeSurface({
  difficulty,
  className = "",
  motifClassName = "",
  contentClassName = "",
  children,
}: {
  difficulty: DifficultyId;
  className?: string;
  motifClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const Motif = DIFFICULTY_MOTIF[difficulty];
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br ${DIFFICULTY_GRADIENTS[difficulty]} text-white shadow-elevated ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-6 text-white/15 transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-6"
      >
        <Motif className={`verbo-float h-32 w-32 ${motifClassName}`} strokeWidth={1.25} />
      </span>
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
}


const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "video": Video,
  "video + written": Clapperboard,
  "audio": Headphones,
  "listening": Ear,
  "email": Mail,
  "reading": BookOpen,
  "written": PenLine,
  "debate": MessagesSquare,
  "roleplay": Users,
  "pitch": Presentation,
  "negotiation": Handshake,
  "persuasion": Megaphone,
  "networking": Share2,
  "leadership": Crown,
  "business case": Briefcase,
};

function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name.trim().toLowerCase()] ?? Tag;
}

function CategoryBadge({ name }: { name: string }) {
  if (!name) return <Pill tone="muted">No category</Pill>;
  const Icon = categoryIcon(name);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${categoryColor(name)}`}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} aria-hidden />
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

/* -------------------------------------------------------------------------- */
/* Badges catalog — declarative rules stored in badges-store.ts                */
/* -------------------------------------------------------------------------- */
import {
  type BadgeDef,
  type BadgeContext,
  loadBadges,
  subscribeBadges,
  isBadgeEarned,
} from "@/lib/badges-store";



/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */
function Page() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>(loadChallenges);
  const [flashList, setFlashList] = useState<FlashChallenge[]>(loadFlashChallenges);
  const [flashConfig, setFlashConfig] = useState(loadFlashConfig);
  const [tick, setTick] = useState(0); // re-render on student profile mutations
  const [difficulty, setDifficulty] = useState<DifficultyId | null>(null);
  const [category, setCategory] = useState<string | "all">("all");
  const [open, setOpen] = useState<Challenge | null>(null);
  const [shareFor, setShareFor] = useState<Challenge | null>(null);
  const [mystery, setMystery] = useState<{ opening: boolean; reveal: FlashChallenge | null; blocked: boolean }>({ opening: false, reveal: null, blocked: false });
  const [lightning, setLightning] = useState<LightningState>(loadLightning);
  const [lightningOpen, setLightningOpen] = useState<FlashChallenge | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [seasons, setSeasons] = useState<FlashSeason[]>(loadSeasons);
  const [seasonState, setSeasonState] = useState<
    { season: FlashSeason; opening: boolean; reveal: FlashChallenge | null; blocked: boolean } | null
  >(null);
  const [badges, setBadges] = useState<BadgeDef[]>(loadBadges);

  useEffect(() => {
    setChallenges(loadChallenges());
    setFlashList(loadFlashChallenges());
    setFlashConfig(loadFlashConfig());
    setLightning(loadLightning());
    setSeasons(loadSeasons());
    setBadges(loadBadges());
    const un1 = subscribeChallenges(() => setChallenges(loadChallenges()));
    const un2 = subscribeStudents(() => setTick((t) => t + 1));
    const un3 = subscribeFlashChallenges(() => setFlashList(loadFlashChallenges()));
    const un4 = subscribeFlashConfig(() => setFlashConfig(loadFlashConfig()));
    const un5 = subscribeLightning(() => setLightning(loadLightning()));
    const un6 = subscribeSeasons(() => setSeasons(loadSeasons()));
    const un7 = subscribeBadges(() => setBadges(loadBadges()));
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => { un1(); un2(); un3(); un4(); un5(); un6(); un7(); clearInterval(timer); };
  }, []);


  // Preload Google Fonts for active seasons so their skin renders.
  useEffect(() => {
    seasons.filter((s) => s.active).forEach((s) => ensureGoogleFont(fontFamilyFor(s)));
  }, [seasons]);

  if (!user) return null;
  const student = USERS.find((u) => u.id === user.id) ?? user;
  const productId = (student.product ?? "go") as ChallengeProductId;
  const gradient = PRODUCT_GRADIENTS[productId] ?? PRODUCT_GRADIENTS.enterprise;
  const hasPremiumAccess = PREMIUM_ACCESS.includes(student.access_plan ?? "");

  const productChallenges = useMemo(
    () => challenges.filter((c) => c.product === productId),
    [challenges, productId],
  );

  const countByDifficulty = (d: DifficultyId) =>
    productChallenges.filter((c) => c.difficulty === d).length;

  const badgeCtx: BadgeContext = useMemo(() => {
    void tick;
    const done = student.completed_challenges ?? [];
    const map = new Map(challenges.map((c) => [c.id, c]));
    const cats = new Set<string>();
    let premiumDone = false;
    for (const entry of done) {
      const ch = map.get(entry.challenge_id);
      if (!ch) continue;
      if (ch.category) cats.add(ch.category);
      if (ch.premium) premiumDone = true;
    }
    return {
      completedCount: done.length,
      longestStreak: student.longest_streak ?? 0,
      distinctCategories: cats.size,
      hasCompletedPremium: premiumDone,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenges, student.completed_challenges, student.longest_streak, tick]);

  /* ---------------- Screen 2: challenge list ---------------- */
  if (difficulty) {
    const list = challengesFor(challenges, productId, difficulty);
    const availableCategories = Array.from(
      new Set(list.map((c) => c.category).filter((c): c is string => !!c)),
    );
    const filtered = category === "all" ? list : list.filter((c) => c.category === category);

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
                {DIFFICULTY_META[difficulty].label}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {DIFFICULTY_META[difficulty].label} Challenges
            </h1>
            <p className="mt-1 text-sm text-white/80">
              {list.length} challenge{list.length === 1 ? "" : "s"} available for your product.
            </p>
          </div>
        </div>

        {availableCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${category === "all" ? "border-[#f38934] bg-[#f38934]/10 text-[#f38934]" : "verbo-glass border-white/20 bg-white/10 text-white/80 hover:bg-white/20"}`}
            >
              All categories
            </button>
            {availableCategories.map((cat) => {
              const CatIcon = categoryIcon(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity ${categoryColor(cat)} ${category === cat ? "ring-2 ring-offset-1 ring-current" : "opacity-70 hover:opacity-100"}`}
                >
                  <CatIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {filtered.length === 0 ? (
          <Card className="verbo-glass border-white/20 bg-white/10!">
            <div className="py-10 text-center text-sm text-white/75">
              No challenges yet in this difficulty.
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const locked = !!c.premium && !hasPremiumAccess;
              const chosen = hasChosenChallenge(student.id, c.id);
              const done = hasCompletedChallenge(student.id, c.id);
              const shared = !!getSharedResult(student.id, c.id);
              return (
                <ChallengeSurface
                  key={c.id}
                  difficulty={difficulty}
                  className="group h-full transition-transform duration-300 ease-out hover:-translate-y-1.5"
                  motifClassName="h-24 w-24 opacity-60"
                  contentClassName="flex h-full flex-col gap-3 p-5 text-left"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(c)}
                    className="flex flex-1 flex-col gap-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CategoryBadge name={c.category} />
                        {locked && <PremiumBadge />}
                      </div>
                      {done ? (
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/30">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                        </span>
                      ) : chosen ? (
                        <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/30">
                          In progress
                        </span>
                      ) : null}
                    </div>
                    <div className="w-[88%]">
                      <div className="text-base font-semibold text-white drop-shadow-sm">{c.title}</div>
                      <p className="mt-1 line-clamp-3 text-xs text-white/80">{c.description || "Tap to see the details."}</p>
                    </div>
                    {c.skill_tags && c.skill_tags.length > 0 && (
                      <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                        {c.skill_tags.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90 ring-1 ring-inset ring-white/20"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  {done && (
                    <button
                      type="button"
                      onClick={() => setShareFor(c)}
                      className="inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-white/90 hover:underline"
                    >
                      <Share2 className="h-3 w-3" />
                      {shared ? "Edit shared result" : "Share result"}
                    </button>
                  )}
                </ChallengeSurface>
              );

            })}
          </div>
        )}

        {open && (
          <ChallengeDetail
            challenge={open}
            onClose={() => setOpen(null)}
            hasPremiumAccess={hasPremiumAccess}
            chosen={hasChosenChallenge(student.id, open.id)}
            completed={hasCompletedChallenge(student.id, open.id)}
            cooldownRemaining={completeCooldownRemaining(student.id)}
            onChoose={() => { chooseChallenge(student.id, open.id); }}
            onComplete={() => {
              const ok = completeChallenge(student.id, open.id);
              if (ok) {
                // Immediately prompt for optional share step.
                const justCompleted = open;
                setOpen(null);
                setShareFor(justCompleted);
              }
            }}
          />
        )}

        {shareFor && (
          <ShareResultModal
            challenge={shareFor}
            initialLink={getSharedResult(student.id, shareFor.id)}
            onClose={() => setShareFor(null)}
            onSave={(link) => {
              shareChallengeResult(student.id, shareFor.id, link);
              setShareFor(null);
            }}
          />
        )}
      </div>
    );
  }

  /* ---------------- Screen 1: difficulty picker + badges ---------------- */
  return (
    <div className="space-y-8">
      <ChallengesHero
        gradient={gradient}
        currentStreak={student.current_streak ?? 0}
        longestStreak={student.longest_streak ?? 0}
        completed={student.completed_challenges?.length ?? 0}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PlayerProfileCard student={student} />
        <LeaderboardSection currentUserId={student.id} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {DIFFICULTY_ORDER.map((d) => {
          const count = countByDifficulty(d);
          const target = CHALLENGES_PER_DIFFICULTY[d];
          const empty = count === 0;
          return (
            <button
              key={d}
              disabled={empty}
              onClick={() => { setDifficulty(d); setCategory("all"); }}
              className={`group block text-left transition-transform duration-300 ease-out ${empty ? "cursor-not-allowed opacity-60 saturate-50" : "hover:-translate-y-1.5"}`}
            >
              <ChallengeSurface
                difficulty={d}
                className="h-full"
                contentClassName="flex h-full w-[62%] flex-col gap-4 p-6"
              >
                <DifficultyDots difficulty={d} />
                <div className="text-lg font-semibold tracking-tight text-white drop-shadow-sm">
                  {DIFFICULTY_META[d].label}
                </div>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/30">
                    {count}/{target} challenges
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/80 transition-transform group-hover:translate-x-1" />
                </div>
              </ChallengeSurface>
            </button>

          );
        })}
      </div>

      {/* ---------------- Verbo Flash family: Mystery Box + Seasons + Lightning ---------------- */}
      {(["enterprise", "go", "international"] as const).includes(productId as FlashProductId) && (
        <section>
          <div>
            <div className="mb-5">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/75">
                <Zap className="h-3.5 w-3.5 text-[#e9d5ff]" /> Verbo Flash
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                Instant challenges arcade
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-white/75">
                Mystery Box, active Seasons and the live Lightning — surprise challenges that appear
                for a limited time and don't follow the regular difficulty path.
              </p>
            </div>

            <div className="space-y-6">
              <VerboFlashSection
                boxArtUrl={flashConfig.box_art_url}
                available={flashChallengesFor(flashList, "mystery_box", productId as FlashProductId).length > 0}
                activeSeasons={seasons.filter((s) => s.active)}
                onOpen={() => {
                  const pool = flashChallengesFor(flashList, "mystery_box", productId as FlashProductId);
                  if (pool.length === 0) return;
                  if (!openMysteryBox(student.id)) {
                    setMystery({ opening: false, reveal: null, blocked: true });
                    return;
                  }
                  setMystery({ opening: true, reveal: null, blocked: false });
                  // Suspenseful reveal delay — the box animates then the challenge is revealed.
                  setTimeout(() => {
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    setMystery({ opening: false, reveal: pick, blocked: false });
                  }, 900);
                }}
                onOpenSeason={(season) => {
                  const pool = flashChallengesFor(flashList, "mystery_box", productId as FlashProductId);
                  if (pool.length === 0) return;
                  if (!openSeason(student.id, season.id)) {
                    setSeasonState({ season, opening: false, reveal: null, blocked: true });
                    return;
                  }
                  setSeasonState({ season, opening: true, reveal: null, blocked: false });
                  setTimeout(() => {
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    setSeasonState({ season, opening: false, reveal: pick, blocked: false });
                  }, 900);
                }}
              />

              {/* Lightning card */}
              {isLightningVisibleForStudents(lightning)
                && lightning.product === productId && (() => {
                  const ch = flashList.find((c) => c.id === lightning.challenge_id);
                  if (!ch) return null;
                  const remaining = lightning.expires_at ? +new Date(lightning.expires_at) - nowTick : 0;
                  const isLive = lightning.status === "live" && remaining > 0;
                  const accepted = lightning.accepted_student_ids.includes(student.id);
                  const completed = hasCompletedChallenge(student.id, ch.id);
                  return (
                    <LightningCard
                      challenge={ch}
                      isLive={isLive}
                      remainingMs={remaining}
                      acceptedCount={lightning.accepted_student_ids.length}
                      accepted={accepted}
                      completed={completed}
                      onOpen={() => {
                        if (isLive && !accepted) acceptLightning(student.id);
                        setLightningOpen(ch);
                      }}
                    />
                  );
                })()}
            </div>
          </div>
        </section>
      )}




      <section>
        <style>{`
          @keyframes verbo-badge-in {
            from { opacity: 0; transform: translateY(14px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .verbo-badge-card {
            animation: verbo-badge-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
            transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease, opacity 0.25s ease;
          }
          .verbo-badge-card:hover { transform: translateY(-6px) scale(1.03); opacity: 1; }
          @media (prefers-reduced-motion: reduce) {
            .verbo-badge-card { animation: none !important; transition: opacity 0.2s ease !important; }
            .verbo-badge-card:hover { transform: none !important; }
          }
        `}</style>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">Badges</h2>
            <p className="mt-1 text-xs text-white/75">Earn badges automatically by completing challenges and building streaks.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {badges.map((b, i) => {
            const earned = isBadgeEarned(b, badgeCtx);
            const hasImage = earned && !!b.image;
            return (
              <div
                key={b.id}
                style={{ animationDelay: `${Math.min(i, 11) * 55}ms` }}
                className={`verbo-badge-card flex flex-col items-center gap-2 rounded-2xl border p-5 text-center shadow-soft hover:shadow-elevated ${earned ? "verbo-glass border-amber-300/60 bg-amber-400/15" : "verbo-glass border-white/15 bg-white/[0.07] opacity-70"}`}
              >
                {hasImage ? (
                  <img
                    src={b.image}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-400/40"
                  />
                ) : (
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${earned ? "bg-amber-400/25 text-amber-200 ring-2 ring-amber-300/50" : "bg-white/10 text-white/70"}`}>
                    {earned ? <Trophy className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                  </span>
                )}
                <div className="text-sm font-semibold text-white">{b.name}</div>
                <p className="text-[11px] text-white/75">{b.description}</p>
              </div>
            );
          })}
          {/* Lightning Bolt — exclusive Verbo Flash badge, separate from the 8 core badges. */}
          {(() => {
            const earned = (student.lightning_completions ?? 0) >= 1;
            return (
              <div
                style={{ animationDelay: `${Math.min(badges.length, 11) * 55}ms` }}
                className={`verbo-badge-card flex flex-col items-center gap-2 rounded-2xl border p-5 text-center shadow-soft hover:shadow-elevated ${earned ? "verbo-glass border-yellow-300/70 bg-yellow-300/15" : "verbo-glass border-white/15 bg-white/[0.07] opacity-70"}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${earned ? "bg-yellow-300/25 text-yellow-200 ring-2 ring-yellow-300/50" : "bg-white/10 text-white/70"}`}>
                  {earned ? <Zap className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
                </span>
                <div className="text-sm font-semibold text-white">⚡ Lightning Bolt</div>
                <p className="text-[11px] text-white/75">Completed a Lightning within its live window.</p>
              </div>
            );
          })()}
          {/* Dynamic Season badges — grows as admin creates Seasons. */}
          {seasons.map((s, i) => {
            const earned = (student.season_completions?.[s.id] ?? 0) >= 1;
            const accent = s.accent_color || "#7e22ce";
            return (
              <div
                key={s.id}
                className={`verbo-badge-card flex flex-col items-center gap-2 rounded-2xl border p-5 text-center shadow-soft hover:shadow-elevated ${earned ? "verbo-glass bg-white/10" : "verbo-glass border-white/15 bg-white/[0.07] opacity-70"}`}
                style={{
                  animationDelay: `${Math.min(badges.length + 1 + i, 11) * 55}ms`,
                  ...(earned ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}22` } : {}),
                }}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${earned ? "" : "bg-white/10 text-white/70"}`}
                  style={
                    earned
                      ? { background: `${accent}22`, color: accent, boxShadow: `0 0 0 2px ${accent}55` }
                      : undefined
                  }
                >
                  {earned ? <Sparkles className="h-6 w-6" /> : <Lock className="h-5 w-5 text-white/70" />}
                </span>
                <div
                  className="text-sm font-semibold text-white"
                  style={{ fontFamily: `"${fontFamilyFor(s)}", system-ui, sans-serif` }}
                >
                  {s.badge_name}
                </div>
                <p className="text-[11px] text-white/75">
                  Completed a challenge during the {s.display_name} Season.
                </p>
              </div>
            );
          })}
        </div>
      </section>



      {lightningOpen && (
        <LightningRevealModal
          challenge={lightningOpen}
          expiresAt={lightning.expires_at}
          nowTick={nowTick}
          isLive={lightning.status === "live"}
          acceptedCount={lightning.accepted_student_ids.length}
          hasPremiumAccess={hasPremiumAccess}
          completed={hasCompletedChallenge(student.id, lightningOpen.id)}
          onComplete={() => {
            const target = lightningOpen;
            if (!target) return;
            const ok = completeLightningChallenge(student.id, target.id);
            if (ok) {
              setLightningOpen(null);
              setShareFor(target as unknown as Challenge);
            }
          }}
          onClose={() => setLightningOpen(null)}
        />
      )}


      {mystery.blocked && (
        <MysteryCooldownModal onClose={() => setMystery({ opening: false, reveal: null, blocked: false })} />
      )}
      {(mystery.opening || mystery.reveal) && (
        <MysteryRevealModal
          opening={mystery.opening}
          challenge={mystery.reveal}
          hasPremiumAccess={hasPremiumAccess}
          chosen={mystery.reveal ? hasChosenChallenge(student.id, mystery.reveal.id) : false}
          completed={mystery.reveal ? hasCompletedChallenge(student.id, mystery.reveal.id) : false}
          cooldownRemaining={completeCooldownRemaining(student.id)}
          onChoose={() => { if (mystery.reveal) chooseChallenge(student.id, mystery.reveal.id); }}
          onComplete={() => {
            if (!mystery.reveal) return;
            const ok = completeChallenge(student.id, mystery.reveal.id);
            if (ok) {
              const c = mystery.reveal;
              setMystery({ opening: false, reveal: null, blocked: false });
              // Reuse the standard share prompt for consistency.
              setShareFor(c as unknown as Challenge);
            }
          }}
          onClose={() => setMystery({ opening: false, reveal: null, blocked: false })}
        />
      )}

      {seasonState?.blocked && (
        <SeasonCooldownModal
          season={seasonState.season}
          onClose={() => setSeasonState(null)}
        />
      )}
      {seasonState && (seasonState.opening || seasonState.reveal) && (
        <SeasonRevealModal
          season={seasonState.season}
          opening={seasonState.opening}
          challenge={seasonState.reveal}
          hasPremiumAccess={hasPremiumAccess}
          chosen={seasonState.reveal ? hasChosenChallenge(student.id, seasonState.reveal.id) : false}
          completed={seasonState.reveal ? hasCompletedChallenge(student.id, seasonState.reveal.id) : false}
          onChoose={() => { if (seasonState.reveal) chooseChallenge(student.id, seasonState.reveal.id); }}
          onComplete={() => {
            if (!seasonState.reveal) return;
            const ok = completeSeasonChallenge(student.id, seasonState.reveal.id, seasonState.season.id);
            if (ok) {
              const c = seasonState.reveal;
              setSeasonState(null);
              setShareFor(c as unknown as Challenge);
            }
          }}
          onClose={() => setSeasonState(null)}
        />
      )}


      {shareFor && (
        <ShareResultModal
          challenge={shareFor}
          initialLink={getSharedResult(student.id, shareFor.id)}
          onClose={() => setShareFor(null)}
          onSave={(link) => {
            shareChallengeResult(student.id, shareFor.id, link);
            setShareFor(null);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Verbo Flash — Mystery Box card + reveal modal                              */
/* -------------------------------------------------------------------------- */
function VerboFlashSection({
  boxArtUrl,
  available,
  activeSeasons,
  onOpen,
  onOpenSeason,
}: {
  boxArtUrl?: string;
  available: boolean;
  activeSeasons: FlashSeason[];
  onOpen: () => void;
  onOpenSeason: (season: FlashSeason) => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e9d5ff]">
            <Zap className="h-3.5 w-3.5" /> Mystery Box{activeSeasons.length > 0 ? " & Seasons" : ""}
          </div>
          <p className="mt-1 text-xs text-white/75">A surprise challenge waits inside. One per day, per box.</p>
        </div>

      </div>
      <style>{`
        @keyframes verbo-box-wiggle {
          0%, 92%, 100% { transform: rotate(0deg); }
          94% { transform: rotate(-6deg); }
          96% { transform: rotate(6deg); }
          98% { transform: rotate(-3deg); }
        }
        @media (prefers-reduced-motion: reduce) { .verbo-box-wiggle { animation: none !important; } }
      `}</style>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          disabled={!available}
          onClick={onOpen}
          className={`group relative aspect-square rounded-3xl p-6 text-center transition-transform ${
            available
              ? "text-white hover:-translate-y-1"
              : "cursor-not-allowed text-white/60 opacity-70"
          }`}
        >
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              className="verbo-box-wiggle flex h-32 w-32 items-center justify-center"
              style={{ animation: "verbo-box-wiggle 3.4s ease-in-out infinite", transformOrigin: "50% 90%" }}
            >
              {boxArtUrl ? (
                <img src={boxArtUrl} alt="Mystery Box" className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]" />
              ) : (
                <Gift className="h-24 w-24 drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Mystery Box</div>
              <div className="mt-1 text-xs opacity-90">{available ? "Tap to open" : "Coming soon"}</div>
            </div>
          </div>
        </button>

        {activeSeasons.map((s) => {
          const accent = s.accent_color || "#7e22ce";
          const family = fontFamilyFor(s);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpenSeason(s)}
              className="group relative aspect-square rounded-3xl p-6 text-center text-white transition-transform hover:-translate-y-1"
            >
              <div className="relative flex h-full flex-col items-center justify-center gap-4">
                <div
                  className="verbo-box-wiggle flex h-32 w-32 items-center justify-center"
                  style={{ animation: "verbo-box-wiggle 3.4s ease-in-out infinite", transformOrigin: "50% 90%" }}
                >
                  {s.theme_image_url ? (
                    <img src={s.theme_image_url} alt={s.display_name} className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]" />
                  ) : (
                    <Sparkles className="h-24 w-24 drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]" strokeWidth={1.5} style={{ color: accent }} />
                  )}
                </div>
                <div>
                  <div
                    className="text-lg font-semibold tracking-tight drop-shadow"
                    style={{ fontFamily: `"${family}", system-ui, sans-serif` }}
                  >
                    {s.display_name}
                  </div>
                  <div className="mt-1 text-xs opacity-90">Tap to open</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>

  );
}

function MysteryCooldownModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4a044e] to-[#7e22ce] text-white">
          <Gift className="h-7 w-7" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">{MYSTERY_COOLDOWN_MSG}</p>
        <div className="mt-4 flex justify-center">
          <GhostButton onClick={onClose}>Got it</GhostButton>
        </div>
      </div>
    </div>
  );
}

function MysteryRevealModal({
  opening,
  challenge,
  hasPremiumAccess,
  chosen,
  completed,
  cooldownRemaining,
  onChoose,
  onComplete,
  onClose,
}: {
  opening: boolean;
  challenge: FlashChallenge | null;
  hasPremiumAccess: boolean;
  chosen: boolean;
  completed: boolean;
  cooldownRemaining: number | null;
  onChoose: () => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const locked = !!challenge?.premium && !hasPremiumAccess;
  const onCooldown = !completed && chosen && cooldownRemaining !== null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      {challenge && !opening && <Confetti />}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <style>{`
          @keyframes verbo-box-shake {
            0%, 100% { transform: translateX(0) rotate(0); }
            20% { transform: translateX(-6px) rotate(-8deg); }
            40% { transform: translateX(6px) rotate(8deg); }
            60% { transform: translateX(-4px) rotate(-6deg); }
            80% { transform: translateX(4px) rotate(6deg); }
          }
          @media (prefers-reduced-motion: reduce) { .verbo-box-shake { animation: none !important; } }
        `}</style>
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#4a044e] via-[#7e22ce] to-[#f59e0b] p-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/80">
              <Zap className="h-3.5 w-3.5" /> Verbo Flash · Mystery Box
            </div>
            {challenge && !opening && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CategoryBadge name={challenge.category} />
                  {challenge.premium && <PremiumBadge />}
                </div>
                <div className="mt-2 text-base font-semibold tracking-tight">{challenge.title}</div>
              </>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {opening || !challenge ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10">
            <div
              className="verbo-box-shake flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4a044e] to-[#7e22ce] text-white shadow-elevated"
              style={{ animation: "verbo-box-shake 0.5s ease-in-out infinite" }}
            >
              <Gift className="h-16 w-16" />
            </div>
            <p className="text-sm text-muted-foreground">Opening your Mystery Box…</p>
          </div>
        ) : (
          <>
            <div className="relative p-6">
              <div className={locked ? "pointer-events-none select-none blur-sm" : ""}>
                <p className="text-sm leading-relaxed text-foreground">
                  {challenge.description || "No description available."}
                </p>
                {challenge.video_url && (
                  <a
                    href={challenge.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                  >
                    <Play className="h-3.5 w-3.5" /> Watch reference video
                  </a>
                )}
                {onCooldown && (
                  <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-foreground">
                    {COOLDOWN_MSG}
                  </div>
                )}
              </div>
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-white/70 p-6 text-center backdrop-blur-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-2 ring-amber-400/40">
                    <Lock className="h-6 w-6" />
                  </span>
                  <AccessGateNotice accent="#7e22ce" />


                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
              <GhostButton onClick={onClose}>Close</GhostButton>
              {locked ? null : completed ? (
                <Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Pill>
              ) : chosen ? (
                <SuccessButton onClick={onComplete} disabled={onCooldown} title={onCooldown ? COOLDOWN_MSG : undefined}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed
                </SuccessButton>
              ) : (
                <PrimaryButton onClick={onChoose}>Let's do it!</PrimaryButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Detail modal                                                                */
/* -------------------------------------------------------------------------- */
function ChallengeDetail({
  challenge,
  onClose,
  hasPremiumAccess,
  chosen,
  completed,
  cooldownRemaining,
  onChoose,
  onComplete,
}: {
  challenge: Challenge;
  onClose: () => void;
  hasPremiumAccess: boolean;
  chosen: boolean;
  completed: boolean;
  cooldownRemaining: number | null;
  onChoose: () => void;
  onComplete: () => void;
}) {
  const locked = !!challenge.premium && !hasPremiumAccess;
  const onCooldown = !completed && chosen && cooldownRemaining !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#01304a] to-[#024366] p-6 text-white">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge name={challenge.category} />
              {challenge.premium && <PremiumBadge />}
            </div>
            <div className="mt-2 text-base font-semibold tracking-tight">{challenge.title}</div>
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

        <div className="relative p-6">
          <div className={locked ? "pointer-events-none select-none blur-sm" : ""}>
            <p className="text-sm leading-relaxed text-foreground">
              {challenge.description || "No description available."}
            </p>
            {challenge.video_url && (
              <a
                href={challenge.video_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Play className="h-3.5 w-3.5" /> Watch reference video
              </a>
            )}
            {onCooldown && (
              <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-foreground">
                {COOLDOWN_MSG}
              </div>
            )}
          </div>

          {locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-white/70 p-6 text-center backdrop-blur-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-2 ring-amber-400/40">
                <Lock className="h-6 w-6" />
              </span>
              <AccessGateNotice accent="#f38934" />

            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {locked ? null : completed ? (
            <Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Pill>
          ) : chosen ? (
            <SuccessButton onClick={onComplete} disabled={onCooldown} title={onCooldown ? COOLDOWN_MSG : undefined}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed
            </SuccessButton>
          ) : (
            <PrimaryButton onClick={onChoose}>Let's do it!</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Share Result modal — optional URL + locked "Upload File" (Coming soon).    */
/* -------------------------------------------------------------------------- */
function ShareResultModal({
  challenge,
  initialLink,
  onClose,
  onSave,
}: {
  challenge: Challenge;
  initialLink: string;
  onClose: () => void;
  onSave: (link: string) => void;
}) {
  const [source, setSource] = useState<"url" | "upload">("url");
  const [link, setLink] = useState(initialLink);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Want to share your result? (optional)
            </div>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{challenge.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSource("url")}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${source === "url" ? "border-accent bg-accent/10 text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
            >
              <Link2 className="h-4 w-4" /> Video URL
            </button>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-2 text-sm font-medium text-muted-foreground opacity-70"
            >
              <Lock className="h-4 w-4" /> Upload File
            </button>
          </div>

          {source === "url" ? (
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste a link (video, doc, portfolio, etc.)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/40 px-3 py-3 text-xs text-muted-foreground">
              <Upload className="h-4 w-4" /> Coming soon — file uploads (pdf / video / image, max 10MB) will be available soon.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
          <GhostButton onClick={onClose}>Skip</GhostButton>
          <PrimaryButton onClick={() => onSave(link)} disabled={source !== "url"}>
            Save
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Verbo Flash — Lightning card + reveal modal                                */
/* -------------------------------------------------------------------------- */
function formatHMS(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function LightningCard({
  challenge,
  isLive,
  remainingMs,
  acceptedCount,
  accepted,
  completed,
  onOpen,
}: {
  challenge: FlashChallenge;
  isLive: boolean;
  remainingMs: number;
  acceptedCount: number;
  accepted: boolean;
  completed: boolean;
  onOpen: () => void;
}) {
  const urgent = isLive && remainingMs > 0 && remainingMs < 60 * 60 * 1000;
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fde68a]">
            <Zap className="h-3.5 w-3.5 text-[#facc15]" /> Lightning
          </div>
          <p className="mt-1 text-xs text-white/75">Reto Relámpago — live for a limited window.</p>
        </div>
      </div>

      <style>{`
        @keyframes verbo-lightning-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.55), 0 0 30px 4px rgba(14, 165, 233, 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(250, 204, 21, 0.0), 0 0 40px 10px rgba(14, 165, 233, 0.6); }
        }
        @keyframes verbo-lightning-urgent {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.65), 0 0 30px 4px rgba(239, 68, 68, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.0), 0 0 40px 12px rgba(239, 68, 68, 0.8); }
        }
        @media (prefers-reduced-motion: reduce) {
          .verbo-lightning-live { animation: none !important; }
        }
      `}</style>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLive ? (
          <button
            type="button"
            onClick={onOpen}
            className="verbo-lightning-live group relative overflow-hidden rounded-2xl border border-[#facc15]/50 bg-gradient-to-br from-[#1e3a8a] via-[#0284c7] to-[#facc15] p-6 text-left text-white transition-transform hover:-translate-y-0.5"
            style={{ animation: urgent ? "verbo-lightning-urgent 0.9s ease-in-out infinite" : "verbo-lightning-glow 1.8s ease-in-out infinite" }}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                🔥 Live now
              </span>
              <span className={`rounded-full px-2.5 py-1 font-mono text-sm font-bold tabular-nums ${urgent ? "bg-red-500 text-white" : "bg-white/20"}`}>
                {formatHMS(remainingMs)}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Zap className="h-10 w-10 shrink-0 text-yellow-300 drop-shadow" />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold">{challenge.title || "Lightning Challenge"}</div>
                <div className="mt-0.5 text-xs opacity-90">⚡ {acceptedCount} student{acceptedCount === 1 ? "" : "s"} accepted this</div>
              </div>
            </div>
            <div className="mt-5">
              {completed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#0f172a]">
                  {accepted ? "Continue the challenge →" : "Accept the Challenge ⚡"}
                </span>
              )}
            </div>
          </button>
        ) : (
          // Expired — dramatic transition for students who didn't complete on time.
          <div className={`relative overflow-hidden rounded-2xl border border-border bg-secondary/60 p-6 text-left ${completed ? "opacity-90" : "opacity-80"}`}>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                ⚡ {completed ? "Completed" : "Expired — you missed this one"}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Zap className="h-10 w-10 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-foreground">{challenge.title || "Lightning Challenge"}</div>
                {!completed && (
                  <p className="mt-0.5 text-xs text-muted-foreground">This Lightning has passed. The next one could strike anytime — stay ready.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

  );
}

function LightningRevealModal({
  challenge,
  expiresAt,
  nowTick,
  isLive,
  acceptedCount,
  hasPremiumAccess,
  completed,
  onComplete,
  onClose,
}: {
  challenge: FlashChallenge;
  expiresAt: string | null;
  nowTick: number;
  isLive: boolean;
  acceptedCount: number;
  hasPremiumAccess: boolean;
  completed: boolean;
  onComplete: () => void;
  onClose: () => void;
}) {
  const remaining = expiresAt ? +new Date(expiresAt) - nowTick : 0;
  const locked = !!challenge.premium && !hasPremiumAccess;
  const canComplete = isLive && remaining > 0 && !completed && !locked;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      {completed && <Confetti theme="lightning" />}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-[#1e3a8a] via-[#0284c7] to-[#facc15] p-6 text-white">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/80">
              <Zap className="h-3.5 w-3.5" /> Verbo Flash · Lightning
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CategoryBadge name={challenge.category} />
              {challenge.premium && <PremiumBadge />}
              {isLive && (
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums">
                  {formatHMS(remaining)}
                </span>
              )}
            </div>
            <div className="mt-2 text-base font-semibold tracking-tight">{challenge.title}</div>
            <div className="mt-1 text-xs text-white/80">⚡ {acceptedCount} student{acceptedCount === 1 ? "" : "s"} accepted this</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative p-6">
          <div className={locked ? "pointer-events-none select-none blur-sm" : ""}>
            <p className="text-sm leading-relaxed text-foreground">
              {challenge.description || "No description available."}
            </p>
            {challenge.video_url && (
              <a
                href={challenge.video_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
              >
                <Play className="h-3.5 w-3.5" /> Watch reference video
              </a>
            )}
            {!isLive && !completed && (
              <div className="mt-4 rounded-lg border border-border bg-secondary/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                This Lightning has passed. The next one could strike anytime — stay ready.
              </div>
            )}
          </div>
          {locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-white/70 p-6 text-center backdrop-blur-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-2 ring-amber-400/40">
                <Lock className="h-6 w-6" />
              </span>
              <AccessGateNotice accent="#0284c7" />

            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          {completed ? (
            <Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Pill>
          ) : canComplete ? (
            <SuccessButton onClick={onComplete}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed
            </SuccessButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Season — cooldown + reveal modals (skinned per Season)                     */
/* -------------------------------------------------------------------------- */
function SeasonCooldownModal({ season, onClose }: { season: FlashSeason; onClose: () => void }) {
  const accent = season.accent_color || "#7e22ce";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, #111)` }}
        >
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="mt-4 text-sm font-medium text-foreground">
          You've already opened this Season's challenge today — come back tomorrow!
        </p>
        <div className="mt-4 flex justify-center">
          <GhostButton onClick={onClose}>Got it</GhostButton>
        </div>
      </div>
    </div>
  );
}

function SeasonRevealModal({
  season,
  opening,
  challenge,
  hasPremiumAccess,
  chosen,
  completed,
  onChoose,
  onComplete,
  onClose,
}: {
  season: FlashSeason;
  opening: boolean;
  challenge: FlashChallenge | null;
  hasPremiumAccess: boolean;
  chosen: boolean;
  completed: boolean;
  onChoose: () => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const locked = !!challenge?.premium && !hasPremiumAccess;
  const accent = season.accent_color || "#7e22ce";
  const family = fontFamilyFor(season);
  const headerBg = season.theme_image_url
    ? `center / cover no-repeat url(${season.theme_image_url}), linear-gradient(135deg, ${accent}, #111)`
    : `linear-gradient(135deg, ${accent}, #111827)`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      {challenge && !opening && <Confetti />}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <style>{`
          @keyframes verbo-box-shake {
            0%, 100% { transform: translateX(0) rotate(0); }
            20% { transform: translateX(-6px) rotate(-8deg); }
            40% { transform: translateX(6px) rotate(8deg); }
            60% { transform: translateX(-4px) rotate(-6deg); }
            80% { transform: translateX(4px) rotate(6deg); }
          }
          @media (prefers-reduced-motion: reduce) { .verbo-box-shake { animation: none !important; } }
        `}</style>
        <div className="relative flex items-start justify-between gap-4 p-6 text-white" style={{ background: headerBg }}>
          <div className="absolute inset-0 bg-black/25" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/90">
              <Sparkles className="h-3.5 w-3.5" /> Verbo Flash · {season.display_name}
            </div>
            {challenge && !opening && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <CategoryBadge name={challenge.category} />
                  {challenge.premium && <PremiumBadge />}
                </div>
                <div
                  className="mt-2 text-base font-semibold tracking-tight drop-shadow"
                  style={{ fontFamily: `"${family}", system-ui, sans-serif` }}
                >
                  {challenge.title}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className="relative rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {opening || !challenge ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10">
            <div
              className="verbo-box-shake flex h-32 w-32 items-center justify-center rounded-2xl text-white shadow-elevated"
              style={{ animation: "verbo-box-shake 0.5s ease-in-out infinite", background: `linear-gradient(135deg, ${accent}, #111)` }}
            >
              <Sparkles className="h-16 w-16" />
            </div>
            <p className="text-sm text-muted-foreground">Opening your {season.display_name} challenge…</p>
          </div>
        ) : (
          <>
            <div className="relative p-6">
              <div className={locked ? "pointer-events-none select-none blur-sm" : ""}>
                <p className="text-sm leading-relaxed text-foreground">
                  {challenge.description || "No description available."}
                </p>
                {challenge.video_url && (
                  <a
                    href={challenge.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
                  >
                    <Play className="h-3.5 w-3.5" /> Watch reference video
                  </a>
                )}
              </div>
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-white/70 p-6 text-center backdrop-blur-md">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 ring-2 ring-amber-400/40">
                    <Lock className="h-6 w-6" />
                  </span>
                  <AccessGateNotice accent={accent} />

                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border bg-secondary/30 p-4">
              <GhostButton onClick={onClose}>Close</GhostButton>
              {locked ? null : completed ? (
                <Pill tone="success"><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</Pill>
              ) : chosen ? (
                <SuccessButton onClick={onComplete}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed
                </SuccessButton>
              ) : (
                <PrimaryButton onClick={onChoose}>Let's do it!</PrimaryButton>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Leaderboard — top challenge completers within the same product cohort.     */
/*                                                                            */
/* All ranking logic runs on the raw USERS + per-user LeaderboardIdentity     */
/* stores; the component is a pure renderer that re-derives on each render    */
/* and re-subscribes to student + identity mutations so podium updates are    */
/* live (nickname edited in ProfileModal, new completions, etc.).             */
/* -------------------------------------------------------------------------- */

interface LeaderboardRow {
  userId: string;
  displayName: string;
  useRealAvatar: boolean;
  avatarSeed: string; // used for the initials + color when useRealAvatar=false
  completed: number;
}

function useLeaderboardRows(): LeaderboardRow[] {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const un1 = subscribeStudents(() => setTick((t) => t + 1));
    const un2 = subscribeLeaderboardIdentity(() => setTick((t) => t + 1));
    return () => { un1(); un2(); };
  }, []);
  return useMemo(() => {
    void tick;
    return USERS
      .filter((u) => u.role === "student")
      .map<LeaderboardRow>((u) => {
        const id = getLeaderboardIdentity(u.id);
        const useReal = id.mode === "real" || !id.nickname.trim();
        const displayName = useReal ? u.name : id.nickname.trim();
        const regular = u.completed_challenges?.length ?? 0;
        const lightning = u.lightning_completions ?? 0;
        const seasons = Object.values(u.season_completions ?? {})
          .reduce((sum, n) => sum + (n ?? 0), 0);
        return {
          userId: u.id,
          displayName,
          useRealAvatar: useReal,
          avatarSeed: useReal ? u.name : id.nickname.trim(),
          completed: regular + lightning + seasons,
        };
      })
      .sort((a, b) =>
        b.completed - a.completed
        || a.displayName.localeCompare(b.displayName),
      );
  }, [tick]);
}

function NicknameAvatar({ seed, className = "" }: { seed: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold ${className}`}
      style={{ background: colorFromString(seed || "?") }}
    >
      {initialsOf(seed || "?")}
    </span>
  );
}

function RowAvatar({ row, size }: { row: LeaderboardRow; size: "sm" | "lg" }) {
  const realAvatar = useAvatar(row.useRealAvatar ? row.userId : undefined);
  const cls = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";
  if (row.useRealAvatar) {
    if (realAvatar) {
      return <img src={realAvatar} alt="" className={`${cls} rounded-full object-cover`} />;
    }
    // fall back to initials over a neutral color when the real user has no avatar
    return <NicknameAvatar seed={row.avatarSeed} className={cls} />;
  }
  return <NicknameAvatar seed={row.avatarSeed} className={cls} />;
}

const PODIUM_STYLES: Record<number, {
  frame: string; medal: string; label: string; halo: string; delay: number;
}> = {
  0: {
    frame: "bg-gradient-to-br from-[#fde68a] via-[#fbbf24] to-[#d97706] p-[5px] shadow-[0_0_0_3px_rgba(251,191,36,0.35)]",
    medal: "bg-gradient-to-br from-[#fbbf24] to-[#d97706] text-white ring-2 ring-white/70",
    label: "1",
    halo: "from-[#fbbf24]/60",
    delay: 0,
  },
  1: {
    frame: "bg-gradient-to-br from-[#f1f5f9] via-[#cbd5e1] to-[#94a3b8] p-[4px] shadow-[0_0_0_2px_rgba(203,213,225,0.5)]",
    medal: "bg-gradient-to-br from-[#e2e8f0] to-[#94a3b8] text-slate-800 ring-2 ring-white/70",
    label: "2",
    halo: "from-[#cbd5e1]/50",
    delay: 120,
  },
  2: {
    frame: "bg-gradient-to-br from-[#fdba74] via-[#c2764a] to-[#92400e] p-[3px]",
    medal: "bg-gradient-to-br from-[#c2764a] to-[#92400e] text-amber-50 ring-2 ring-white/60",
    label: "3",
    halo: "from-[#c2764a]/40",
    delay: 220,
  },
};

/** FLIP: animates rows sliding from their previous position to the new one. */
function useFlipPositions(orderKey: string) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    nodes.current.forEach((el, key) => {
      const after = el.getBoundingClientRect();
      const before = prev.current.get(key);
      if (before && !reduce) {
        const dx = before.left - after.left;
        const dy = before.top - after.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.style.transition = "none";
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => {
            el.style.transition = "transform 560ms cubic-bezier(0.23,1,0.32,1)";
            el.style.transform = "";
          });
        }
      }
      prev.current.set(key, after);
    });
  }, [orderKey]);

  return (key: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(key, el);
    else nodes.current.delete(key);
  };
}

function LeaderboardSection({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const rows = useLeaderboardRows();
  const flipRef = useFlipPositions(rows.map((r) => r.userId).join("|"));
  if (rows.length === 0) return null;

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Ensure a visual "3-2-1-...” ordering: put #1 in the middle when there are 3+.
  const podiumOrdered = podium.length === 3 ? [podium[1], podium[0], podium[2]] : podium;
  const podiumRankOf = (r: LeaderboardRow) => podium.indexOf(r); // 0..2

  // Derived: gap between the current user and the leader.
  const leader = rows[0];
  const me = rows.find((r) => r.userId === currentUserId);
  const isLeader = !!me && leader.userId === me.userId;
  const gapToFirst = me && !isLeader ? leader.completed - me.completed + 1 : 0;

  return (
    <section>
      <style>{`
        @keyframes verbo-podium-in {
          from { opacity: 0; transform: scale(0.9) translateY(14px) rotate(-2.5deg); }
          70% { opacity: 1; transform: scale(1.03) translateY(-2px) rotate(0.6deg); }
          to { opacity: 1; transform: none; }
        }
        @keyframes verbo-podium-crown-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.55), 0 0 18px 2px rgba(251,191,36,0.35); }
          50% { box-shadow: 0 0 0 10px rgba(251,191,36,0), 0 0 30px 8px rgba(251,191,36,0.55); }
        }
        .verbo-podium-in { animation: verbo-podium-in 700ms cubic-bezier(0.23,1,0.32,1) both; }
        .verbo-podium-glow { animation: verbo-podium-crown-glow 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .verbo-podium-in, .verbo-podium-glow { animation: none !important; }
          .verbo-flip { transition: none !important; }
        }
      `}</style>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">Leaderboard</h2>
        <p className="mt-1 text-xs text-white/75">Total Challenges and Flash completed by all students.</p>
      </div>
      <Card className="verbo-glass border-white/20 bg-white/10!">
        <div className="p-5">
          {/* Top 3 podium */}
          <div className={`grid items-end gap-3 ${podium.length === 3 ? "grid-cols-3" : podium.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {podiumOrdered.map((row) => {
              const rank = podiumRankOf(row);
              const style = PODIUM_STYLES[rank];
              const isYou = row.userId === currentUserId;
              const first = rank === 0;
              return (
                <div
                  key={row.userId}
                  ref={flipRef(row.userId)}
                  className={`verbo-podium-in verbo-flip relative flex flex-col items-center gap-2 rounded-2xl border px-3 text-center shadow-elevated ring-1 ring-inset ring-white/40 ${first ? "pb-5 pt-8" : "pb-4 pt-7"} ${isYou ? "border-[#7ee02d]/70 bg-[#7ee02d]/15" : "border-white/20 bg-white/10"} verbo-glass`}
                  style={{
                    animationDelay: `${style.delay}ms`,
                    boxShadow:
                      "0 22px 40px -16px rgba(3,7,18,0.6), 0 8px 16px -8px rgba(3,7,18,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
                  }}
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl bg-gradient-to-b ${style.halo} to-transparent opacity-60`}
                  />
                  {first && (
                    <img
                      src={crownIconAsset.url}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute -top-1 left-1/2 h-10 w-10 -translate-x-1/2 object-contain drop-shadow"
                    />
                  )}
                  <div className="relative">
                    <div className={`rounded-full ${style.frame} ${first ? "verbo-podium-glow" : ""}`}>
                      <div className="rounded-full bg-[#7ee02d]/15 p-[2px]">
                        <RowAvatar row={row} size="lg" />
                      </div>
                    </div>
                    <img
                      src={rank === 0 ? winnerBadgeAsset.url : rank === 1 ? silverCoinAsset.url : bronzeCoinAsset.url}
                      alt={`Rank ${style.label}`}
                      className="absolute -bottom-3 left-1/2 h-12 w-12 -translate-x-1/2 object-contain drop-shadow"
                    />

                  </div>
                  <div className={`mt-2 line-clamp-1 font-bold tracking-tight text-white ${first ? "text-base" : "text-sm"}`}>
                    {row.displayName}
                    {isYou && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-[#c8f571]">You</span>}
                  </div>
                  <div className="text-[11px] text-white/75">
                    <span className="text-sm font-bold text-white">{row.completed}</span>{" "}
                    <span className="opacity-70">
                      {row.completed === 1 ? "completed" : "completed"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {me && (
            <p className="mt-3 text-center text-[11px] text-white/80">
              {isLeader
                ? "You're #1! 🏆"
                : `You are only ${gapToFirst} challenge${gapToFirst === 1 ? "" : "s"} away from 1st place`}
            </p>
          )}

          {/* Rest of the ranking */}
          {rest.length > 0 && (
            <ul className="verbo-glass mt-5 divide-y divide-white/10 rounded-xl border border-white/20 bg-white/10">
              {rest.map((row, idx) => {
                const pos = idx + 4;
                const isYou = row.userId === currentUserId;
                return (
                  <li
                    key={row.userId}
                    ref={flipRef(row.userId)}
                    className={`verbo-flip flex items-center gap-3 px-4 py-2.5 text-sm ${isYou ? "bg-[#7ee02d]/15" : ""}`}
                  >
                    <span className="w-6 text-right text-xs font-semibold text-white/75">{pos}</span>
                    <span className="rounded-full bg-[#7ee02d]/15 p-[2px]">
                      <RowAvatar row={row} size="sm" />
                    </span>
                    <span className="flex-1 truncate font-medium text-white">
                      {row.displayName}
                      {isYou && <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-[#c8f571]">You</span>}
                    </span>
                    <span className="text-xs text-white/75">
                      {row.completed}{" "}
                      <span className="opacity-70">
                        {row.completed === 1 ? "Challenge completed" : "Challenges completed"}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </section>
  );
}


/* -------------------------------------------------------------------------- */
/* Screen-1 hero — gamified header with animated entrance + stat tiles.       */
/* -------------------------------------------------------------------------- */
function ChallengesHero({
  gradient,
  currentStreak,
  longestStreak,
  completed,
}: {
  gradient: string;
  currentStreak: number;
  longestStreak: number;
  completed: number;
}) {
  const stats = [
    { icon: fireIconAsset.url, label: "Current streak", value: currentStreak },
    { icon: trophyIconAsset.url, label: "Longest streak", value: longestStreak },
    { icon: confettiIconAsset.url, label: "Completed", value: completed },
  ];
  return (
    <div className={`verbo-hero-enter relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-7 text-white shadow-elevated`}>
      <style>{`
        @keyframes verbo-hero-in {
          from { opacity: 0; transform: translateY(12px) scale(0.985); }
          to { opacity: 1; transform: none; }
        }
        @keyframes verbo-hero-shine {
          0% { transform: translateX(-120%) skewX(-18deg); }
          60%, 100% { transform: translateX(260%) skewX(-18deg); }
        }
        .verbo-hero-enter { animation: verbo-hero-in 520ms cubic-bezier(0.23,1,0.32,1) both; }
        .verbo-hero-shine { animation: verbo-hero-shine 4.5s cubic-bezier(0.23,1,0.32,1) infinite; }
        .verbo-stat-in { animation: verbo-hero-in 520ms cubic-bezier(0.23,1,0.32,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .verbo-hero-enter, .verbo-hero-shine, .verbo-stat-in { animation: none !important; }
        }
      `}</style>

      {/* decorative texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="verbo-hero-shine absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 shadow-inner">
          <Sparkles className="h-3.5 w-3.5" /> Weekly Challenges
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Pick a difficulty to explore
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          Complementary practice — completing challenges keeps your streak alive and unlocks badges.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="verbo-stat-in flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 shadow-inner ring-1 ring-white/20"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <img src={s.icon} alt="" aria-hidden className="h-8 w-8 object-contain" />
              </span>
              <div>
                <div className="text-2xl font-bold leading-none tracking-tight">{s.value}</div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-white/70">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Player profile card — avatar, editable display name and one showcase badge */
/* -------------------------------------------------------------------------- */
function PlayerProfileCard({ student }: { student: (typeof USERS)[number] }) {
  const avatar = useAvatar(student.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tick, setTick] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [picker, setPicker] = useState(false);
  const [mode, setMode] = useState<LeaderboardIdentityMode>("real");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const un1 = subscribeLeaderboardIdentity(bump);
    const un2 = subscribeProfileBadges(bump);
    const un3 = subscribeEquippedBadges(bump);
    return () => { un1(); un2(); un3(); };
  }, []);

  useEffect(() => {
    const cur = getLeaderboardIdentity(student.id);
    setMode(cur.mode);
    setNickname(cur.nickname);
  }, [student.id, tick]);

  const identity = useMemo(() => { void tick; return getLeaderboardIdentity(student.id); }, [student.id, tick]);
  const displayName = identity.mode === "nickname" && identity.nickname.trim()
    ? identity.nickname.trim()
    : student.name;

  const { earned, equipped } = useMemo(() => {
    void tick;
    const all = loadProfileBadges();
    const ctx = buildProfileBadgeContext(student);
    return {
      earned: all.filter((b) => isProfileBadgeEarned(b, ctx)),
      equipped: loadEquippedBadgeIds(student.id),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, tick]);

  const slotBadge: ProfileBadgeDef | null = equipped[0]
    ? earned.find((b) => b.id === equipped[0]) ?? null
    : null;
  const available = earned.filter((b) => !equipped.slice(1, EQUIPPED_MAX).includes(b.id));

  const commit = (next: { mode: LeaderboardIdentityMode; nickname: string }) => {
    setMode(next.mode);
    setNickname(next.nickname);
    setLeaderboardIdentity(student.id, next);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(student.id, String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-white">Your player card</h2>
        <p className="mt-1 text-xs text-white/75">Customize how you show up on the leaderboard.</p>
      </div>

      <div className="verbo-glass relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-elevated">
        <div className="h-24 bg-gradient-to-br from-[#01304a] via-[#024366] to-[#0a5e88]" aria-hidden>
          <div className="h-full w-full opacity-25"
            style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt="" className="h-24 w-24 rounded-full border-4 border-white/30 object-cover shadow-elevated" />
              ) : (
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/30 text-2xl font-bold text-white shadow-elevated"
                  style={{ background: colorFromString(student.name) }}
                >
                  {initialsOf(student.name)}
                </span>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change photo"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#f38934] text-white shadow-md transition-transform hover:scale-110"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-lg font-bold tracking-tight text-white">{displayName}</div>
                <button
                  type="button"
                  onClick={() => setEditingName((v) => !v)}
                  aria-label="Edit display name"
                  className="rounded-md p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-xs text-white/75">
                {student.completed_challenges?.length ?? 0} challenges completed
              </div>
            </div>
          </div>

          {editingName && (
            <div className="verbo-glass mt-4 space-y-2 rounded-2xl border border-white/20 bg-white/10 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">
                Show on leaderboard as
              </div>
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  checked={mode === "real"}
                  onChange={() => commit({ mode: "real", nickname })}
                />
                My name <span className="text-white/70">({student.name})</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="radio"
                  checked={mode === "nickname"}
                  onChange={() => commit({ mode: "nickname", nickname })}
                />
                Custom nickname
              </label>
              {mode === "nickname" && (
                <input
                  value={nickname}
                  onChange={(e) => commit({ mode: "nickname", nickname: e.target.value })}
                  placeholder="Your nickname"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/50"
                />
              )}
            </div>
          )}

          <div className="mt-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Showcase badge</div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="verbo-glass flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#f38934] hover:shadow-md"
              >
                {slotBadge ? (
                  <>
                    <BadgeVisual badge={slotBadge} earned size="sm" />
                    <div>
                      <div className="text-sm font-semibold text-white">{slotBadge.name}</div>
                      <div className="text-[11px] text-white/70">Tap to change</div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/40 text-white/70">
                      <Plus className="h-5 w-5" />
                    </span>
                    <div className="text-sm font-medium text-white/80">Add badge</div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <BadgePickerModal
        open={picker}
        onOpenChange={setPicker}
        available={available}
        earnedCount={earned.length}
        onPick={(id) => {
          const next = [...equipped];
          next[0] = id;
          setEquippedBadgeIds(student.id, next.filter(Boolean) as string[]);
          setPicker(false);
        }}
      />
    </section>
  );
}
