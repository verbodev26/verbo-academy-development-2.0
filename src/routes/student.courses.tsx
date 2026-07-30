import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Target,
  Brain,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  Lock,
  Play,
  Sparkles,
  MessageSquareQuote,
  FileQuestion,
  Pencil,
  ListChecks,
  Headphones,
  Shuffle,
  X,
  Mic,
  Trophy,
  RotateCcw,
  Award,
  Info,
  
  PartyPopper,
  Medal,
  ShieldAlert,
} from "lucide-react";
import { AnimatedNumber, Card, Pill, StatRing } from "@/components/verbo/ui";
import { Confetti } from "@/components/verbo/Confetti";
import { VerboAudioPlayer } from "@/components/verbo/VerboAudioPlayer";
import airportSunsetAsset from "@/assets/airport-sunset.png.asset.json";
import mountainsSunsetAsset from "@/assets/mountains-sunset.png.asset.json";
import flamaNaranjaAsset from "@/assets/Flama_Naranja.svg.asset.json";
import flamaAmarillaPequenaAsset from "@/assets/Flama_amarilla_pequena.svg.asset.json";
import flamaAmarillaMedianaAsset from "@/assets/Flama_amarilla_mediana.svg.asset.json";
import flamaRosaAsset from "@/assets/Flama_Rosa.svg.asset.json";
import flamaNegraAsset from "@/assets/Flama_Negra.svg.asset.json";
import smokeAsset from "@/assets/smoke.svg.asset.json";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/mock-data";
import { currentLoginStreak } from "@/lib/login-streak-store";
import { markUnlockSeen } from "@/lib/unit-unlock-seen-store";
import { ReportContentIssueModal } from "@/components/verbo/ReportContentIssueModal";
import { buildProfileBadgeContext } from "@/lib/profile-badges-store";
import {
  type ProductId,
  type ProductCourse,
  type CourseLevel,
  type CourseUnit,
  loadCourses,
  subscribeCourses,
} from "@/lib/product-courses-store";
import {
  type Activity,
  type ActivityCategory,
  EXERCISE_LABELS,
  MANDATORY_CATEGORIES,
  activitiesForUnit,
  attemptsFor,
  bestScoreFor,
  categoryLabel,
  getUnitAccessOverride,
  isMandatoryCategory,
  isMilestoneUnit,
  levelIsComplete,
  loadActivityScores,
  recordActivityScore,
  setUnitCompleted,
  unitCategoryProgress,
  unitNumberOf,
  unitPassed,
} from "@/lib/activities-store";
import {
  loadEvents,
  pushEvent,
  subscribeEvents,
  type LearningPathEvent,
} from "@/lib/learning-path-events";
import { groupsByStudentId } from "@/lib/groups-store";
import {
  tailoredUnitsForStudent, tailoredUnitDoneMap,
  subscribeTailoredUnits, subscribeTailoredUnitCompletion,
  type TailoredUnit,
} from "@/lib/tailored-content-store";
import { CheckCircle2 as CheckCircle2Icon } from "lucide-react";


export const Route = createFileRoute("/student/courses")({
  component: Page,
  validateSearch: (s: Record<string, unknown>): { levelId?: string; unitId?: string } => ({
    levelId: typeof s.levelId === "string" ? s.levelId : undefined,
    unitId: typeof s.unitId === "string" ? s.unitId : undefined,
  }),
});

/* -------------------------------------------------------------------------- */
/* Product mapping (student.product may be enterprise/go/international/vip).  */
/* -------------------------------------------------------------------------- */
const PRODUCT_TO_COURSE: Record<string, ProductId> = {
  enterprise: "enterprise",
  go: "go",
  international: "international",
};

/* -------------------------------------------------------------------------- */
/* Level-state computation                                                     */
/* -------------------------------------------------------------------------- */
type LevelStateKind = "completed" | "current" | "reopened" | "locked_progress" | "locked_not_contracted";

interface LevelState {
  kind: LevelStateKind;
  passedUnits: number;
  totalUnits: number;
  readOnly: boolean;
  message?: string;
}

function passedUnitCount(level: CourseLevel, studentId: string): number {
  return level.units.filter((u) => unitPassed(studentId, u.id)).length;
}

function computeLevelStates(
  levels: CourseLevel[],
  contracted: string[],
  reopened: string[],
  studentId: string,
  isGroupMember: boolean = false,
): LevelState[] {

  const contractedSet = new Set(contracted);
  const reopenedSet = new Set(reopened);
  const completion: boolean[] = levels.map((l) => levelIsComplete(l, studentId));

  // The "current" level is the first contracted level that isn't completed.
  let currentIndex = -1;
  for (let i = 0; i < levels.length; i++) {
    if (!contractedSet.has(levels[i].name)) continue;
    if (!completion[i]) { currentIndex = i; break; }
  }

  return levels.map((level, i) => {
    const passed = passedUnitCount(level, studentId);
    const base = { passedUnits: passed, totalUnits: level.units.length };
    if (!contractedSet.has(level.name)) {
      return {
        ...base,
        kind: "locked_not_contracted",
        readOnly: false,
        message: isGroupMember
          ? "Not included in your group's plan — contact your admin to expand access"
          : "Not included in your current plan — contact your advisor to upgrade",

      };
    }
    if (completion[i]) {
      if (reopenedSet.has(level.name)) {
        return { ...base, kind: "reopened", readOnly: true };
      }
      return { ...base, kind: "completed", readOnly: false };
    }
    if (i === currentIndex) return { ...base, kind: "current", readOnly: false };
    const prev = levels[i - 1];
    return {
      ...base,
      kind: "locked_progress",
      readOnly: false,
      message: prev ? `Complete ${prev.name} to unlock` : "Locked",
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Unit-state (for the units-in-level screen)                                  */
/* -------------------------------------------------------------------------- */
type UnitStateKind = "passed" | "current" | "locked" | "milestone_locked" | "milestone_ready";

function computeUnitStates(level: CourseLevel, studentId: string, readOnly: boolean): UnitStateKind[] {
  const states: UnitStateKind[] = [];
  let previousPassed = true; // first unit is always unlockable
  for (const u of level.units) {
    const passed = unitPassed(studentId, u.id);
    const ov = getUnitAccessOverride(studentId, u.id);

    // Explicit lock always wins — overrides default progression, milestone or not.
    if (ov === "locked") {
      states.push("locked");
      previousPassed = false;
      continue;
    }

    if (isMilestoneUnit(u.id)) {
      if (passed) { states.push("passed"); previousPassed = true; continue; }
      if (!previousPassed && ov !== "unlocked") { states.push("locked"); previousPassed = false; continue; }
      if (ov === "unlocked") { states.push("milestone_ready"); }
      else { states.push("milestone_locked"); }
      previousPassed = false;
      continue;
    }

    if (passed) { states.push("passed"); previousPassed = true; continue; }
    if (ov === "unlocked" || previousPassed) {
      states.push(readOnly ? "locked" : "current");
    } else {
      states.push("locked");
    }
    previousPassed = false;
  }
  return states;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */
type View =
  | { kind: "levels" }
  | { kind: "units"; levelId: string; readOnly: boolean }
  | { kind: "unit"; levelId: string; unitId: string; readOnly: boolean };

function Page() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [rev, setRev] = useState(0);
  const [view, setView] = useState<View>(() => {
    if (search.levelId && search.unitId) {
      return { kind: "unit", levelId: search.levelId, unitId: search.unitId, readOnly: false };
    }
    if (search.levelId) {
      return { kind: "units", levelId: search.levelId, readOnly: false };
    }
    return { kind: "levels" };
  });
  const [courses, setCourses] = useState<ProductCourse[]>(() => loadCourses());
  const [completionModal, setCompletionModal] = useState<CourseLevel | null>(null);

  useEffect(() => {
    setCourses(loadCourses());
    return subscribeCourses(() => { setCourses(loadCourses()); setRev((r) => r + 1); });
  }, []);
  useEffect(() => subscribeEvents(() => setRev((r) => r + 1)), []);
  useEffect(() => subscribeTailoredUnits(() => setRev((r) => r + 1)), []);
  useEffect(() => subscribeTailoredUnitCompletion(() => setRev((r) => r + 1)), []);

  const productId = user?.product ? PRODUCT_TO_COURSE[user.product] : undefined;
  if (!productId) {
    return (
      <div className="mx-auto max-w-2xl py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Learning Path unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your product does not include the self-study Learning Path. Head to your dedicated section instead.</p>
      </div>
    );
  }

  const product = courses.find((c) => c.product === productId) ?? null;
  const levels = product?.levels ?? [];
  const contracted = user?.contracted_levels ?? [];
  const reopened = user?.reopened_levels ?? [];
  const isGroupMember = !!(user && groupsByStudentId().has(user.id));
  const states = useMemo(
    () => computeLevelStates(levels, contracted, reopened, user?.id ?? "", isGroupMember),
    [levels, contracted, reopened, user?.id, rev, isGroupMember],
  );


  const onUnitCompleted = (levelId: string, unitId: string) => {
    // Record milestone events + potential level completion when unit passes.
    if (!user) return;
    if (unitPassed(user.id, unitId)) {
      pushEvent(user.id, { kind: "unit_completed", ref: unitId, label: `Completed Unit ${unitNumberOf(unitId)}` });
      const level = levels.find((l) => l.id === levelId);
      if (level && levelIsComplete(level, user.id)) {
        pushEvent(user.id, { kind: "level_completed", ref: level.name, label: `Completed ${level.name}` });
        setCompletionModal(level);
      }
    }
    setRev((r) => r + 1);
  };

  if (view.kind === "unit") {
    const level = levels.find((l) => l.id === view.levelId);
    const unit = level?.units.find((u) => u.id === view.unitId);
    if (!level || !unit) return null;
    return (
      <UnitDetail
        level={level}
        unit={unit}
        studentId={user?.id ?? ""}
        readOnly={view.readOnly}
        onBack={() => setView({ kind: "units", levelId: level.id, readOnly: view.readOnly })}
        onChange={() => onUnitCompleted(level.id, unit.id)}
        onOpenUnit={(u) => setView({ kind: "unit", levelId: level.id, unitId: u.id, readOnly: view.readOnly })}
      />
    );
  }

  if (view.kind === "units") {
    const level = levels.find((l) => l.id === view.levelId);
    if (!level) { setView({ kind: "levels" }); return null; }
    return (
      <UnitsView
        key={rev}
        level={level}
        readOnly={view.readOnly}
        studentId={user?.id ?? ""}
        onBack={() => setView({ kind: "levels" })}
        onOpenUnit={(unit) => setView({ kind: "unit", levelId: level.id, unitId: unit.id, readOnly: view.readOnly })}
      />
    );
  }

  const events = user ? loadEvents(user.id) : [];
  const tailoredUnits = user && user.access_plan === "Elite" ? tailoredUnitsForStudent(user.id) : [];
  const showTailored = user?.access_plan === "Elite" && tailoredUnits.length > 0;
  return (
    <>
      <LevelsView
        key={rev}
        studentId={user?.id ?? ""}
        user={user}
        productLabel={user?.product ?? ""}
        levels={levels}
        states={states}
        contracted={contracted}
        events={events}
        tailoredSection={showTailored ? <TailoredContentSection units={tailoredUnits} /> : null}
        onOpen={(level, state) => {
          if (state.kind === "locked_progress" || state.kind === "locked_not_contracted" || state.kind === "completed") return;
          setView({ kind: "units", levelId: level.id, readOnly: state.readOnly });
        }}
      />
      {completionModal && (
        <LevelCompletionModal level={completionModal} studentName={user?.name ?? "Student"} onClose={() => setCompletionModal(null)} />
      )}
    </>
  );
}

function TailoredContentSection({ units }: { units: TailoredUnit[] }) {
  const doneMap = tailoredUnitDoneMap();
  const doneCount = units.filter((u) => doneMap[u.id]).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <Sparkles className="h-3 w-3" /> Elite · Tailored Content
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Tailored Content</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Extra units your teacher has built for you. Each unit unlocks once the previous one is
            completed in a Performance Session.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progress</div>
          <div className="mt-0.5 text-sm font-semibold text-foreground">
            {doneCount} / {units.length} <span className="font-normal text-muted-foreground">units</span>
          </div>
        </div>
      </div>
      <Card className="!p-0">
        {units.map((u, i) => {
          const done = !!doneMap[u.id];
          const prevDone = i === 0 || !!doneMap[units[i - 1].id];
          const unlocked = done || prevDone;
          return (
            <div
              key={u.id}
              className={`flex items-center justify-between gap-4 px-6 py-4 ${i ? "border-t border-border" : ""} ${unlocked ? "" : "opacity-70"}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Unit {i + 1}</span>
                  {done ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      <CheckCircle2Icon className="h-3 w-3" /> Done
                    </span>
                  ) : unlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      Unlocked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" /> Locked until previous unit completed
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm font-medium text-foreground truncate">{u.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {unlocked && u.file_url ? (
                    <a
                      href={u.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <Download className="h-3 w-3" /> {u.file_name || "Download material"}
                    </a>
                  ) : unlocked ? (
                    <span className="italic">No material attached yet</span>
                  ) : (
                    <span className="italic">Material unlocks when this unit is available</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Levels view                                                                 */
/* -------------------------------------------------------------------------- */
const PRODUCT_GRADIENTS: Record<string, string> = {
  enterprise: "from-[#01304a] via-[#024366] to-[#0a5e88]",
  go: "from-[#7c2d12] via-[#c2410c] to-[#f97316]",
  international: "from-[#134e4a] via-[#0f766e] to-[#14b8a6]",
  vip: "from-[#4a044e] via-[#7e22ce] to-[#a855f7]",
};

/** Ring colors for the three mandatory categories (Vocabulary, Grammar, Practice). */
const CATEGORY_RING_COLORS = ["#cb6ce6", "#69d11d", "#92dfd4"];

/** Login-streak tiers, mirrored from the Profile Badges seed thresholds. */
const STREAK_TIERS = [
  { days: 100, name: "100-Day Flame" },
  { days: 60, name: "60-Day Flame" },
  { days: 30, name: "30-Day Flame" },
  { days: 10, name: "10-Day Flame" },
  { days: 3, name: "3-Day Flame" },
];

/** Flame artwork per streak tier. */
const FLAME_ART: Record<string, string> = {
  negra: flamaNegraAsset.url,
  rosa: flamaRosaAsset.url,
  amarilla_mediana: flamaAmarillaMedianaAsset.url,
  amarilla_pequena: flamaAmarillaPequenaAsset.url,
  naranja: flamaNaranjaAsset.url,
  smoke: smokeAsset.url,
};

/** Streak tiers with the background gradient + flame artwork they use.
 *  Reordered so each flame pops against its own gradient background.
 */
const STREAK_THEME = [
  { days: 100, name: "100-Day Flame", gradient: ["#fde68a", "#f59e0b"], flame: "negra" },
  { days: 60, name: "60-Day Flame", gradient: ["#0d9488", "#134e4a"], flame: "rosa" },
  { days: 30, name: "30-Day Flame", gradient: ["#fde047", "#eab308"], flame: "naranja" },
  { days: 10, name: "10-Day Flame", gradient: ["#f97316", "#9a3412"], flame: "amarilla_mediana" },
  { days: 3, name: "3-Day Flame", gradient: ["#fb923c", "#c2410c"], flame: "amarilla_pequena" },
];
const STREAK_NONE_THEME = { days: 0, name: "No streak", gradient: ["#64748b", "#334155"], flame: "smoke" };

function streakThemeFor(days: number) {
  if (days <= 0) return STREAK_NONE_THEME;
  return STREAK_THEME.find((t) => days >= t.days) ?? STREAK_THEME[STREAK_THEME.length - 1];
}

const MEDAL_METALS = ["Bronze", "Silver", "Gold", "Onyx"];

function LevelsView({
  productLabel, levels, states, contracted, events, studentId, user, onOpen, tailoredSection,
}: {
  productLabel: string;
  levels: CourseLevel[];
  states: LevelState[];
  contracted: string[];
  events: LearningPathEvent[];
  studentId: string;
  user: User | null;
  onOpen: (level: CourseLevel, state: LevelState) => void;
  tailoredSection?: React.ReactNode;
}) {
  const contractedSet = new Set(contracted);
  const contractedLevels = levels.filter((l) => contractedSet.has(l.name));
  const totalUnits = contractedLevels.reduce((s, l) => s + l.units.length, 0);
  const passedUnits = contractedLevels.reduce((s, l) => s + passedUnitCount(l, studentId), 0);
  const pct = totalUnits === 0 ? 0 : Math.round((passedUnits / totalUnits) * 100);

  // Upcoming milestone banner: within 3 non-milestone units of the next locked milestone
  // inside the current level.
  const currentLevelIdx = states.findIndex((s) => s.kind === "current");
  const currentLevel = currentLevelIdx >= 0 ? levels[currentLevelIdx] : null;
  let milestoneRemaining: number | null = null;
  if (currentLevel) {
    for (let i = 0; i < currentLevel.units.length; i++) {
      const u = currentLevel.units[i];
      if (isMilestoneUnit(u.id) && !unitPassed(studentId, u.id)) {
        // Count non-passed non-milestone units before this milestone.
        let remaining = 0;
        for (let j = 0; j < i; j++) {
          const v = currentLevel.units[j];
          if (!isMilestoneUnit(v.id) && !unitPassed(studentId, v.id)) remaining++;
        }
        if (remaining <= 3) milestoneRemaining = remaining;
        break;
      }
    }
  }

  // Streak + medal cards read the real Profile Badges catalog data.
  const streakDays = currentLoginStreak(studentId);
  const streakTier = STREAK_TIERS.find((t) => streakDays >= t.days) ?? null;
  const streakTheme = streakThemeFor(streakDays);

  const badgeCtx = user ? buildProfileBadgeContext(user) : null;
  const missionsByLevel = badgeCtx
    ? [badgeCtx.level1MissionsCompleted, badgeCtx.level2MissionsCompleted, badgeCtx.level3MissionsCompleted, badgeCtx.level4MissionsCompleted]
    : [0, 0, 0, 0];
  let topMedal: string | null = null;
  for (let i = 3; i >= 0; i--) {
    const done = missionsByLevel[i];
    if (done >= 1) {
      topMedal = done >= 3 ? `${MEDAL_METALS[i]} — Level Complete` : `${MEDAL_METALS[i]} — Mission ${done}`;
      break;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Your learning path</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Progress through your program level by level. Complete each unit's mandatory Vocabulary, Grammar, and Practice activities to move on.</p>
      </div>

      {/* Overall progress + streak + medal */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative border border-white/15 md:col-span-2">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
            <div className="card-gradient-gold absolute inset-0 rounded-[inherit]" />
          </div>
          <div className="relative z-10">
            <div className="relative z-10 flex flex-wrap items-center gap-5" style={{ color: "#01304a" }}>
              <StatRing value={pct} size={104} stroke={8} valueClassName="text-2xl font-bold" label={<AnimatedNumber value={pct} suffix="%" />} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-75">Overall progress</div>
                <AnimatedNumber value={passedUnits} className="mt-1 block text-[4.5rem] font-extrabold leading-none tabular-nums" />
                <div className="mt-1 text-lg font-semibold">of {totalUnits} units completed</div>
              </div>
              <div className="text-right">
                <div className="text-xs opacity-75">Contracted levels</div>
                <div className="mt-0.5 text-sm font-medium">{contractedLevels.length} of {levels.length}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative border border-white/15">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
            <div
              className="absolute inset-0 rounded-[inherit]"
              style={{ backgroundImage: `linear-gradient(135deg, ${streakTheme.gradient[0]} 0%, ${streakTheme.gradient[1]} 100%)` }}
            />
          </div>
          <div className="relative z-10">
            <div className="relative z-10 flex items-center justify-between gap-4 text-white">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/75">Login streak</div>
                {streakDays > 0 ? (
                  <>
                    <div className="mt-1 flex items-baseline gap-1">
                      <AnimatedNumber
                        value={streakDays}
                        className="text-[3.25rem] font-extrabold leading-none tracking-tight text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                      />
                      <span className="text-lg font-normal text-white/90">
                        {streakDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-medium text-white/85">{streakTier ? streakTier.name : "Keep going"}</div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-white/85">Log in tomorrow to start your streak</p>
                )}
              </div>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/25 ring-1 ring-white/40">
                <img src={FLAME_ART[streakTheme.flame]} alt="" aria-hidden className="h-11 w-11 object-contain" />
              </span>
            </div>
          </div>
        </Card>


        <Card className="relative border border-white/15">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
            <div className="card-gradient-violet absolute inset-0 rounded-[inherit]" />
          </div>
          <div className="relative z-10">
            <div className="relative z-10 flex items-center justify-between gap-4 text-white">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/75">Medal</div>
                {topMedal ? (
                  <div className="mt-2 text-lg font-bold leading-snug">{topMedal}</div>
                ) : (
                  <p className="mt-2 text-sm text-white/80">Complete your first Mission to earn a medal</p>
                )}
              </div>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Medal className="h-9 w-9" />
              </span>
            </div>
          </div>
        </Card>

      </div>


      {milestoneRemaining !== null && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/60 px-4 py-3.5 text-sm text-amber-900 shadow-soft dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/25 text-amber-700 dark:text-amber-200">
            <Award className="h-4 w-4" />
          </span>
          <div>
            <span className="font-semibold">Your Milestone Check is coming up in {milestoneRemaining} {milestoneRemaining === 1 ? "unit" : "units"}!</span>
            <span className="ml-2 text-amber-800/80 dark:text-amber-200/80">Your teacher will unlock it when you're ready.</span>
          </div>
        </div>
      )}

      {/* Level shell — bento for enterprise, path for go / international */}
      {productLabel === "enterprise" ? (
        <LevelsBento levels={levels} states={states} product={productLabel} onOpen={onOpen} />
      ) : (
        <LevelsPath levels={levels} states={states} product={productLabel} onOpen={onOpen} />
      )}

      {tailoredSection}
    </div>
  );
}

interface LevelShellProps {
  levels: CourseLevel[];
  states: LevelState[];
  product: string;
  onOpen: (level: CourseLevel, state: LevelState) => void;
}

function LevelsBento({ levels, states, product, onOpen }: LevelShellProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {levels.map((lvl, idx) => {
        const st = states[idx];
        return (
          <LevelCard key={lvl.id} level={lvl} state={st} product={product} onOpen={() => onOpen(lvl, st)} />
        );
      })}
    </div>
  );
}

function LevelsPath({ levels, states, product, onOpen }: LevelShellProps) {
  const gradient = PRODUCT_GRADIENTS[product] ?? PRODUCT_GRADIENTS.enterprise;
  const completed = states.filter((s) => s.kind === "completed" || s.kind === "reopened").length;
  const fillPct = levels.length === 0 ? 0 : Math.round((completed / levels.length) * 100);

  return (
    <div className="relative">
      {/* Track — vertical on mobile, horizontal from md up */}
      <div className="pointer-events-none absolute bottom-8 left-[33px] top-8 w-[3px] overflow-hidden rounded-full bg-border md:hidden" aria-hidden>
        <div className={`w-full rounded-full bg-gradient-to-b ${gradient} transition-all duration-700`} style={{ height: `${fillPct}%` }} />
      </div>
      <div className="pointer-events-none absolute left-8 right-8 top-[42px] hidden h-[3px] overflow-hidden rounded-full bg-border md:block" aria-hidden>
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`} style={{ width: `${fillPct}%` }} />
      </div>

      <ol className="relative grid gap-6 md:grid-cols-4">
        {levels.map((lvl, idx) => {
          const st = states[idx];
          const isLocked = st.kind === "locked_progress" || st.kind === "locked_not_contracted";
          const isCompleted = st.kind === "completed";
          const isCurrent = st.kind === "current";
          const clickable = !isLocked && !isCompleted;
          const pct = st.totalUnits === 0 ? 0 : Math.round((st.passedUnits / st.totalUnits) * 100);
          return (
            <li key={lvl.id} className="flex items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
              <div
                className={`relative flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-soft ${
                  isLocked ? "opacity-35 saturate-50" : ""
                } ${isCurrent ? "verbo-node-ring" : ""}`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : isLocked ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <span className="text-lg font-semibold tabular-nums">{idx + 1}</span>
                )}
              </div>
              <button
                type="button"
                onClick={clickable ? () => onOpen(lvl, st) : undefined}
                disabled={!clickable}
                title={st.message}
                className={`verbo-ease-out-expo min-w-0 flex-1 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all duration-300 md:w-full md:text-center ${
                  clickable ? "hover:-translate-y-0.5 hover:shadow-elevated" : "cursor-default"
                } ${isLocked ? "opacity-60" : ""}`}
              >
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{lvl.id}</div>
                <div className="mt-0.5 truncate text-sm font-semibold text-foreground">{lvl.name}</div>
                <div className="mt-2 text-xs text-muted-foreground">{st.passedUnits} / {st.totalUnits} units · {pct}%</div>
                <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  {isLocked ? (
                    <div className="h-full rounded-full bg-muted-foreground/40" style={{ width: `${pct}%` }} />
                  ) : (
                    <>
                      <div className="absolute inset-0 rounded-full" style={{ backgroundImage: "linear-gradient(to right, #ff914d, #ffc700, #69d11e)" }} />
                      <div className="absolute inset-y-0 right-0 rounded-r-full bg-secondary transition-all duration-500" style={{ width: `${100 - pct}%` }} />
                    </>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1.5 md:justify-center">
                  {isCompleted && <Pill tone="success">Completed</Pill>}
                  {st.kind === "reopened" && <Pill tone="warning">Reopened for Review</Pill>}
                  {isCurrent && <Pill tone="success">Current</Pill>}
                </div>
                {clickable && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent">
                    {st.kind === "reopened" ? "Review level" : "Continue"} <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LevelCard({
  level, state, product, onOpen,
}: {
  level: CourseLevel;
  state: LevelState;
  product: string;
  onOpen: () => void;
}) {
  const gradient = PRODUCT_GRADIENTS[product] ?? PRODUCT_GRADIENTS.enterprise;
  const isLocked = state.kind === "locked_progress" || state.kind === "locked_not_contracted";
  const isCompleted = state.kind === "completed";
  const isReopened = state.kind === "reopened";
  const isCurrent = state.kind === "current";
  const pct = state.totalUnits === 0 ? 0 : Math.round((state.passedUnits / state.totalUnits) * 100);
  const coverImage = level.id === "ENTERPRISE-L2" ? airportSunsetAsset.url : mountainsSunsetAsset.url;

  const clickable = !isLocked && !isCompleted;

  return (
    <button
      type="button"
      onClick={clickable ? onOpen : undefined}
      disabled={!clickable}
      title={state.message}
      className={`verbo-ease-out-expo group relative block w-full overflow-hidden rounded-2xl border text-left shadow-soft transition-all duration-300 ${
        isCurrent ? "border-accent" : "border-border"
      } ${
        isLocked
          ? "cursor-not-allowed opacity-60"
          : isCompleted
          ? "cursor-default"
          : "hover:-translate-y-1 hover:shadow-elevated hover:shadow-2xl"
      }`}
    >
      {/* Cover slot */}
      <div className={`relative w-full aspect-[16/7] overflow-hidden bg-gradient-to-br ${gradient} ${isLocked ? "opacity-40 saturate-50" : ""}`}>
        {/* Photo fades in from left to right, reaching full opacity at the right edge. */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${coverImage})`,
            maskImage: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 40%, rgba(255,255,255,1) 100%)",
            WebkitMaskImage: "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 40%, rgba(255,255,255,1) 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25), transparent 45%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">{level.id}</div>
          <div className="mt-0.5 text-lg font-semibold text-white">{level.name}</div>
        </div>
        <div className="absolute right-3 top-3">
          {isLocked && <Lock className="h-4 w-4 text-white/80" />}
          {isCompleted && !isReopened && <Pill tone="success">Completed</Pill>}
          {isReopened && <Pill tone="warning">Reopened for Review</Pill>}
          {isCurrent && <Pill tone="success">Current</Pill>}
        </div>
      </div>

      <div className="bg-card p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{state.totalUnits} units</span>
          <span className="font-medium text-foreground">{state.passedUnits} / {state.totalUnits} · {pct}%</span>
        </div>
        <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          {isLocked ? (
            <div className="h-full rounded-full bg-muted-foreground/40 transition-all" style={{ width: `${pct}%` }} />
          ) : (
            <>
              <div className="absolute inset-0 rounded-full" style={{ backgroundImage: "linear-gradient(to right, #ff914d, #ffc700, #69d11e)" }} />
              <div className="absolute inset-y-0 right-0 rounded-r-full bg-secondary transition-all duration-500" style={{ width: `${100 - pct}%` }} />
            </>
          )}
        </div>
        {state.message && (
          <div className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}
        {clickable && (
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent">
            {isReopened ? "Review level" : "Continue"} <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </button>
  );
}


/* -------------------------------------------------------------------------- */
/* Units view                                                                  */
/* -------------------------------------------------------------------------- */
function UnitsView({
  level, readOnly, studentId, onBack, onOpenUnit,
}: {
  level: CourseLevel;
  readOnly: boolean;
  studentId: string;
  onBack: () => void;
  onOpenUnit: (u: CourseUnit) => void;
}) {
  const states = computeUnitStates(level, studentId, readOnly);
  const blocks: { start: number; end: number }[] = [
    { start: 0, end: 9 },
    { start: 10, end: 19 },
    { start: 20, end: 29 },
  ];
  const unitAt = (n: number) => level.units.find((u) => unitNumberOf(u.id) === n);

  const currentUnit = level.units.find((u, i) => states[i] === "current");

  // Only the freshly unlocked unit flips, and only the first time it is seen.
  const [flipUnitId] = useState<string | null>(() => {
    if (!currentUnit) return null;
    return markUnlockSeen(studentId, currentUnit.id) ? currentUnit.id : null;
  });

  const currentBlock = currentUnit
    ? Math.min(2, Math.floor((unitNumberOf(currentUnit.id) - 1) / 10))
    : 0;
  const [openMission, setOpenMission] = useState<number | null>(currentBlock);

  return (
    <div className="space-y-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All levels
      </button>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{level.id}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{level.name}</h1>
        </div>
        {readOnly && <Pill tone="warning">Reopened for Review</Pill>}
      </div>

      <div className="space-y-5">
        {blocks.map((block, bi) => {
          const blockUnits = Array.from({ length: 10 })
            .map((_, k) => unitAt(block.start + k + 1))
            .filter((u): u is CourseUnit => !!u);
          const blockStates = blockUnits.map((u) => states[level.units.indexOf(u)]);
          const blockPassed = blockStates.filter((s) => s === "passed").length;
          const total = blockUnits.length || 10;
          const complete = blockPassed >= total && total > 0;
          const locked = blockStates.length > 0 && blockStates.every((s) => s === "locked" || s === "milestone_locked");
          const open = openMission === bi;

          const MISSION_ACCENTS = ["#cb6ce6", "#69d11e", "#ffc700"];
          const MISSION_ACCENT_GRADIENTS: (string | null)[] = [
            "linear-gradient(150deg, #dea3ee 0%, #cb6ce6 55%, #a34ac0 100%)",
            null,
            null,
          ];
          const missionAccent = MISSION_ACCENTS[bi % MISSION_ACCENTS.length];
          const missionAccentGradient = MISSION_ACCENT_GRADIENTS[bi % MISSION_ACCENT_GRADIENTS.length];
          const missionAccentFill = missionAccentGradient
            ? { backgroundImage: missionAccentGradient }
            : { backgroundColor: missionAccent };
          const available = !complete && !locked;
          const shell = complete
            ? "border-success/40 bg-gradient-to-br from-success/12 via-success/5 to-transparent"
            : locked
            ? "border-border bg-gradient-to-br from-secondary/60 via-secondary/25 to-transparent"
            : "border-[#01304a]/15 bg-gradient-to-br from-[#01304a]/8 via-[#01304a]/4 to-transparent";
          const numberCls = complete
            ? "bg-success/15 text-success"
            : locked
            ? "bg-secondary text-muted-foreground"
            : "";
          const barCls = complete ? "bg-success" : locked ? "bg-muted-foreground/40" : "";

          return (
            <section
              key={bi}
              className={`shadow-elevated rounded-3xl border ${shell}`}
            >
              <button
                type="button"
                onClick={() => setOpenMission(open ? null : bi)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 p-5 text-left sm:p-6"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold tabular-nums ${numberCls}`}
                  style={available ? { ...missionAccentFill, color: "#ffffff" } : undefined}
                >
                  {bi + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="text-base font-bold uppercase tracking-[0.14em] text-foreground"
                      style={available ? { color: missionAccent } : undefined}
                    >
                      Mission {bi + 1}
                    </h2>
                    {complete && <Pill tone="success">Completed</Pill>}
                    {locked && <Pill>Locked</Pill>}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background/70">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barCls}`}
                        style={{ width: `${Math.round((blockPassed / total) * 100)}%`, ...(available ? missionAccentFill : {}) }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {blockPassed}/{total}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
              </button>

              <div className="verbo-accordion" data-open={open ? "true" : "false"}>
                <div>
                  <div className="grid grid-cols-2 gap-3 px-8 pb-10 pt-8 sm:grid-cols-3 sm:px-10 md:grid-cols-5 lg:grid-cols-10">
                    {Array.from({ length: 10 }).map((_, k) => {
                      const n = block.start + k + 1;
                      const u = unitAt(n);
                      if (!u) {
                        return <div key={n} className="aspect-square rounded-lg border border-dashed border-border bg-secondary/30" />;
                      }
                      const idx = level.units.indexOf(u);
                      const st = states[idx];
                      const milestone = isMilestoneUnit(u.id);
                      const previewLevel: 0 | 1 | 2 | 3 =
                        (st === "locked" || st === "milestone_locked")
                          ? (k === 5 ? 1 : k === 6 ? 2 : k >= 7 ? 3 : 0)
                          : 0;
                      return (
                        <div key={u.id} className={open ? "verbo-stagger-in" : ""} style={{ animationDelay: `${Math.min(k, 9) * 25}ms` }}>
                          <UnitStone
                            unit={u}
                            number={n}
                            state={st}
                            milestone={milestone}
                            previewLevel={previewLevel}
                            unlockFlip={flipUnitId === u.id}
                            onOpen={() => onOpenUnit(u)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function UnitStone({
  unit, number, state, milestone, onOpen, previewLevel = 0, unlockFlip = false,
}: {
  unit: CourseUnit;
  number: number;
  state: UnitStateKind;
  milestone: boolean;
  onOpen: () => void;
  previewLevel?: 0 | 1 | 2 | 3;
  unlockFlip?: boolean;
}) {
  const disabled = state === "locked" || state === "milestone_locked";
  const isMilestoneReady = state === "milestone_ready";

  const circleGradient =
    state === "passed"
      ? "linear-gradient(150deg, #7ddc37 0%, #69d11e 55%, #5cb81a 100%)"
      : isMilestoneReady
      ? "linear-gradient(150deg, #c89116 0%, #a58a4e 100%)"
      : state === "current"
      ? "linear-gradient(150deg, #ffc700 0%, #f7a52c 100%)"
      : "linear-gradient(150deg, #e0e0e0 0%, #9a9a9a 100%)";

  const icon =
    state === "passed" ? (
      <Check className="h-6 w-6 text-white" strokeWidth={3} />
    ) : isMilestoneReady ? (
      <Brain className="h-6 w-6 text-white" />
    ) : state === "current" ? (
      <Target className="h-6 w-6" style={{ color: "#01304a" }} />
    ) : (
      <Lock className="h-6 w-6 text-white" strokeWidth={2.5} />
    );

  const statusLine = state === "passed" ? "Completed" : isMilestoneReady ? "Ready to take" : state === "current" ? "Current unit" : "Unit locked";

  const titleLine =
    state === "passed" ? (milestone ? "Milestone Check" : unit.title)
    : isMilestoneReady ? "Milestone Check"
    : state === "current" ? unit.title
    : "Complete the previous unit to unlock";

  const pulse = isMilestoneReady ? "verbo-milestone-glow" : state === "current" ? "verbo-current-ring" : "";

  const tooltip = milestone && state === "milestone_locked"
    ? "Your teacher will unlock this Milestone Check"
    : milestone
    ? "Milestone Check"
    : state === "locked"
    ? "Complete the previous unit first"
    : undefined;

  const blurCls = previewLevel === 1 ? "blur-[2px] opacity-80" : previewLevel === 2 ? "blur-[5px] opacity-55" : previewLevel === 3 ? "blur-[10px] opacity-30" : "";

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onOpen}
      disabled={disabled}
      title={tooltip}
      className={`verbo-ease-out-expo group flex w-full flex-col items-center gap-2 p-1 text-center transition-transform duration-300 ${unlockFlip ? "verbo-unit-unlock" : ""} ${blurCls} ${disabled ? "cursor-not-allowed" : "hover:z-10 hover:scale-110"}`}
    >
      <span
        className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${pulse}`}
        style={{
          backgroundImage: circleGradient,
          boxShadow: "0 1px 2px rgba(1, 48, 74, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.28), inset 0 -1px 2px rgba(1, 48, 74, 0.12)",
        }}
      >
        {icon}
      </span>
      <span className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-light leading-tight text-muted-foreground">{statusLine}</span>
        <span className="line-clamp-2 text-[11px] font-bold leading-tight text-foreground">{titleLine}</span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Unit detail (video + PDF + activities)                                      */
/* -------------------------------------------------------------------------- */
function getYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
  } catch { /* noop */ }
  return null;
}
function isVimeo(url: string): boolean {
  try { return new URL(url).hostname.includes("vimeo.com"); } catch { return false; }
}
function UnitVideoPlayer({ url }: { url: string }) {
  const yt = getYouTubeEmbed(url);
  if (yt) return <iframe src={yt} title="Lesson video" allowFullScreen className="absolute inset-0 h-full w-full border-0" />;
  if (isVimeo(url)) return <iframe src={url.replace("vimeo.com", "player.vimeo.com/video")} title="Lesson video" allowFullScreen className="absolute inset-0 h-full w-full border-0" />;
  return <video src={url} controls className="absolute inset-0 h-full w-full object-cover" />;
}

export function UnitDetail({
  level, unit, studentId, readOnly, previewMode = false, onBack, onChange, onOpenUnit,
}: {
  level: CourseLevel;
  unit: CourseUnit;
  studentId: string;
  readOnly: boolean;
  previewMode?: boolean;
  onBack: () => void;
  onChange: () => void;
  onOpenUnit?: (u: CourseUnit) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const activities = activitiesForUnit(unit.id);
  const catProgress = unitCategoryProgress(studentId, unit.id);
  const passed = unitPassed(studentId, unit.id);
  const milestone = isMilestoneUnit(unit.id);
  const heroGradient =
    PRODUCT_GRADIENTS[(unit.id.split("-")[0] ?? "").toLowerCase()] ?? PRODUCT_GRADIENTS.enterprise;
  const canStart = !readOnly && activities.length > 0;

  // Overall unit score = average of the best score of the mandatory categories
  // that actually apply to this unit. No attempts yet → neutral state.
  const mandatoryRows = catProgress.filter((r) => r.mandatory);
  const attemptedRows = mandatoryRows.filter((r) => r.best > 0);
  const hasScore = attemptedRows.length > 0;
  const overallScore = hasScore
    ? Math.round(mandatoryRows.reduce((s, r) => s + r.best, 0) / mandatoryRows.length)
    : null;
  const scoreShell =
    overallScore === null
      ? "border-border bg-secondary text-muted-foreground"
      : overallScore >= 85
      ? "border-transparent text-white"
      : overallScore >= 78
      ? "border-transparent bg-amber-400 text-amber-950"
      : overallScore >= 60
      ? "border-transparent bg-accent text-accent-foreground"
      : "border-transparent bg-destructive text-destructive-foreground";

  const scoreShellStyle: React.CSSProperties | undefined =
    overallScore !== null && overallScore >= 85
      ? { backgroundImage: "linear-gradient(150deg, #8fe64d 0%, #69d11e 55%, #4a9c0f 100%)" }
      : undefined;

  // Main action button state: untouched → start, in progress → continue, passed → review.
  const actionStage: "start" | "continue" | "review" = readOnly
    ? "review"
    : passed
    ? "review"
    : hasScore
    ? "continue"
    : "start";
  const actionLabel =
    actionStage === "review" ? "Review activities" : actionStage === "continue" ? "Continue activities" : "Start activities";
  const actionButtonCls =
    readOnly || actionStage === "start"
      ? "bg-accent text-accent-foreground hover:bg-[#d9731f]"
      : "text-white hover:opacity-90";
  const actionButtonStyle: React.CSSProperties | undefined =
    readOnly || actionStage === "start"
      ? undefined
      : actionStage === "review"
      ? { backgroundColor: "#69d11e" }
      : { backgroundImage: "linear-gradient(150deg, #ffc700 0%, #f38934 100%)", color: "#01304a" };

  // Next unit in the same level (consecutive number), used by the footer link.
  const nextUnit = level.units.find((u) => unitNumberOf(u.id) === unitNumberOf(unit.id) + 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {level.name}
        </button>
        {!previewMode && (
          <button
            className="verbo-report-btn"
            onClick={() => setIssueOpen(true)}
            aria-label="Report"
            title="Report a technical issue"
          >
            <span className="sign"><ShieldAlert className="h-4 w-4" /></span>
            <span className="text">Report</span>
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${heroGradient}`} aria-hidden />
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${heroGradient} opacity-[0.07]`} aria-hidden />
          <div className="relative flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {level.name} · {milestone ? "Milestone Check" : `Unit ${unitNumberOf(unit.id)}`}
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">{unit.title}</h1>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Watch the video, review the PDF guide, then complete Vocabulary, Grammar and Practice with a score of at least 60 in each to pass this unit.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {passed && <Pill tone="success">Passed</Pill>}
              {readOnly && <Pill tone="warning">Review mode</Pill>}
            </div>
          </div>
        </div>

        <div className={`relative flex flex-col justify-between rounded-2xl border p-5 shadow-soft ${scoreShell}`} style={scoreShellStyle}>
          <div className="flex items-start gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-90">
              Overall score
            </span>
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-5xl font-bold leading-none tabular-nums">
              {overallScore === null ? "—" : overallScore}
            </span>
            {overallScore !== null && <span className="pb-1 text-lg font-semibold opacity-80">%</span>}
          </div>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden !p-0">
          <div className="relative aspect-video w-full bg-primary">
            {unit.video_url ? (
              <UnitVideoPlayer url={unit.video_url} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary via-primary to-black/40 text-white/60">
                <Play className="h-8 w-8" />
                <span className="text-xs">No video assigned yet</span>
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="text-sm font-semibold text-foreground">Introduction · {unit.title}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{unit.video_url ? "HD · English subtitles available" : "Video not available yet"}</div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground"><BookOpen className="h-4 w-4" /></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">PDF Guide</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{unit.pdf_url ? "Complete unit reference" : "Guide not uploaded yet"}</div>
              </div>
            </div>
            {unit.pdf_url ? (
              previewMode ? (
                <button onClick={() => setPdfOpen(true)} className="verbo-ease-out-expo mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-accent/50 hover:bg-accent/10 hover:text-accent">
                  <BookOpen className="h-4 w-4" /> View PDF Guide
                </button>
              ) : (
                <a href={unit.pdf_url} target="_blank" rel="noopener noreferrer" className="verbo-ease-out-expo mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-accent/50 hover:bg-accent/10 hover:text-accent">
                  <Download className="h-4 w-4" /> Download PDF Guide
                </a>
              )
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-5 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <FileQuestion className="h-4 w-4" />
                </span>
                <div className="text-xs font-semibold text-foreground">Guide on the way</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Your teacher is still preparing this unit's PDF. The video and activities are ready to go.
                </p>
              </div>
            )}
          </Card>

          {unit.teaser?.trim() && (
            <Card>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <MessageSquareQuote className="h-5 w-5" />
                </span>
                <p className="font-display text-[15px] font-semibold leading-relaxed text-foreground">
                  {unit.teaser}
                </p>
              </div>
            </Card>
          )}

          <Card>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mandatory Categories</div>
            <div className="mt-4 flex items-start justify-between gap-2">
              {MANDATORY_CATEGORIES.map((c, i) => {
                const row = catProgress.find((r) => r.category === c);
                const best = row?.best ?? 0;
                const color = CATEGORY_RING_COLORS[i % CATEGORY_RING_COLORS.length];
                return (
                  <div key={c} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <StatRing
                      value={best}
                      size={62}
                      stroke={6}
                      label={row ? String(best) : "—"}
                      progressColor={color}
                      textColor={color}
                    />
                    <span className="text-[11px] font-medium leading-tight text-muted-foreground">{categoryLabel(c)}</span>
                  </div>
                );
              })}
            </div>
            {catProgress.some((r) => !r.mandatory) && (
              <div className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
                Optional practice: {catProgress.filter((r) => !r.mandatory).map((r) => categoryLabel(r.category)).join(", ")}. Doesn't affect progression.
              </div>
            )}
          </Card>

          <button
            disabled={activities.length === 0}
            onClick={() => setOpen(true)}
            style={actionButtonStyle}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-[0_8px_24px_-6px_rgba(243,137,52,0.5)] transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${actionButtonCls} ${canStart ? "verbo-pulse-once" : ""}`}
          >
            {activities.length === 0 ? "No activities yet" : <>{actionLabel} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>

      {passed && (
        nextUnit && onOpenUnit ? (
          <button
            type="button"
            onClick={() => onOpenUnit(nextUnit)}
            className="verbo-ease-out-expo group inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all duration-300 hover:gap-3"
          >
            Continue to {nextUnit.title}
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="verbo-ease-out-expo group inline-flex items-center gap-2 text-sm font-semibold text-accent transition-all duration-300 hover:gap-3"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Back to {level.name}
          </button>
        )
      )}

      {!previewMode && (
        <ReportContentIssueModal
          studentId={studentId}
          entityType="unit"
          entityId={unit.id}
          entityTitle={unit.title}
          open={issueOpen}
          onClose={() => setIssueOpen(false)}
        />
      )}



      {open && (
        <ActivityRunner
          unit={unit}
          activities={activities}
          studentId={studentId}
          readOnly={readOnly}
          previewMode={previewMode}
          onClose={() => { setOpen(false); onChange(); }}
        />
      )}

      {pdfOpen && unit.pdf_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setPdfOpen(false)}>
          <div className="flex h-[85vh] w-[85vw] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-3">
              <div className="text-sm font-semibold text-foreground">{unit.title} — PDF Guide</div>
              <button onClick={() => setPdfOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <iframe src={unit.pdf_url} title={`${unit.title} PDF`} className="flex-1 w-full bg-background" />
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity runner                                                             */
/* -------------------------------------------------------------------------- */
/** Solid tab colors per mandatory category; anything else falls back to neutral. */
const CATEGORY_TAB_COLORS: Record<string, string> = {
  vocabulary: "#7e22ce",
  grammar: "#0f766e",
  practice: "#f38934",
};
const NEUTRAL_TAB_COLOR = "#64748b";

function categoryColor(cat: string): string {
  return CATEGORY_TAB_COLORS[cat] ?? NEUTRAL_TAB_COLOR;
}

function ExerciseTypeIcon({ type, className = "" }: { type: Activity["type"]; className?: string }) {
  if (type === "fill_gaps" || type === "read_complete") return <Pencil className={className} />;
  if (type === "listen_select") return <Headphones className={className} />;
  if (type === "read_select") return <ListChecks className={className} />;
  if (type === "drag_drop" || type === "match") return <Shuffle className={className} />;
  if (type === "record") return <Mic className={className} />;
  return <Sparkles className={className} />;
}

export function ActivityRunner({
  unit, activities, studentId, readOnly, previewMode = false, onClose,
}: {
  unit: CourseUnit;
  activities: Activity[];
  studentId: string;
  readOnly: boolean;
  previewMode?: boolean;
  onClose: () => void;
}) {
  const orderedCats = useMemo(() => {
    const set = new Set<string>();
    activities.forEach((a) => set.add(a.category ?? "uncategorized"));
    return [
      ...MANDATORY_CATEGORIES.filter((c) => set.has(c)),
      ...Array.from(set).filter((c) => !(MANDATORY_CATEGORIES as readonly string[]).includes(c)),
    ];
  }, [activities]);

  const [activeCat, setActiveCat] = useState<string>(orderedCats[0] ?? "uncategorized");
  const list = activities.filter((a) => (a.category ?? "uncategorized") === activeCat);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<null | { ok: boolean; score: number }>(null);
  const [attemptBlocked, setAttemptBlocked] = useState(false);

  useEffect(() => { setIndex(0); setFeedback(null); setAttemptBlocked(false); }, [activeCat]);

  const current = list[index];

  const check = () => {
    if (!current) return;
    // Milestone units get exactly one attempt per activity (skipped in preview mode).
    if (!readOnly && !previewMode && isMilestoneUnit(unit.id) && attemptsFor(studentId, current.id) >= 1) {
      setAttemptBlocked(true);
      return;
    }
    const ok = evaluate(current, draft[current.id] ?? "");
    const score = ok ? 100 : 0;
    if (!readOnly && !previewMode) recordActivityScore(studentId, current.id, score);
    // Auto-complete unit when the mandatory rule is satisfied.
    if (!readOnly && !previewMode && unitPassed(studentId, unit.id)) setUnitCompleted(studentId, unit.id, true);
    setFeedback({ ok, score });
  };

  const next = () => {
    setFeedback(null);
    setAttemptBlocked(false);
    if (index + 1 < list.length) setIndex((i) => i + 1);
    else {
      // Try to advance to the next category tab, otherwise close.
      const nextIdx = orderedCats.indexOf(activeCat) + 1;
      if (nextIdx < orderedCats.length) setActiveCat(orderedCats[nextIdx]);
      else onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[78vh] max-h-[820px] w-[76vw] max-w-[1100px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-[#01304a] to-[#024366] px-6 py-4 text-white">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">{unit.title}</div>
            <div className="mt-0.5 text-sm font-semibold">{readOnly ? "Review · " : ""}Exercise {Math.min(index + 1, Math.max(1, list.length))} of {list.length}</div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-white/80 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="h-1 w-full bg-secondary" aria-hidden>
          <div
            className="h-full rounded-r-full transition-[width] duration-200 ease-out"
            style={{
              width: `${list.length === 0 ? 0 : (Math.min(index + 1, list.length) / list.length) * 100}%`,
              backgroundColor: categoryColor(activeCat),
            }}
          />
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border bg-secondary/40 px-6 py-3">
          {orderedCats.map((c) => {
            const active = c === activeCat;
            const mandatory = isMandatoryCategory(c);
            const best = activities.filter((a) => (a.category ?? "uncategorized") === c).reduce((m, a) => Math.max(m, bestScoreFor(studentId, a.id)), 0);
            const ok = mandatory && best >= 60;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                  active ? "border-transparent text-white shadow-sm" : "border-border bg-background text-muted-foreground hover:bg-secondary"
                }`}
                style={active ? { backgroundColor: categoryColor(c) } : undefined}
              >
                <span>{categoryLabel(c)}</span>
                {mandatory ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${active ? "bg-white/20 text-white" : ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{best}/100</span>
                ) : (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${active ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"}`}>Optional</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 overflow-y-auto">
          {current ? (
            <div key={current.id} className="verbo-crossfade mx-auto max-w-2xl px-6 py-8">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: categoryColor(current.category ?? "uncategorized") }}>
                {EXERCISE_LABELS[current.type]}
              </div>
              <h3 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: categoryColor(current.category ?? "uncategorized"),
                    backgroundColor: `${categoryColor(current.category ?? "uncategorized")}1f`,
                  }}
                >
                  <ExerciseTypeIcon type={current.type} className="h-4 w-4" />
                </span>
                {current.name}
              </h3>
              {readOnly && (
                <div className="mt-2 rounded-lg bg-secondary/50 p-2 text-[11px] text-muted-foreground">
                  Best score: <span className="font-semibold text-foreground">{bestScoreFor(studentId, current.id)}/100</span> — review only.
                </div>
              )}
              <div key={`${current.id}-${feedback ? (feedback.ok ? "ok" : "ko") : "idle"}`} className={`mt-6 ${feedback && !feedback.ok ? "verbo-shake" : ""}`}>
                <ExerciseBody activity={current} value={draft[current.id] ?? ""} onChange={(v) => setDraft((d) => ({ ...d, [current.id]: v }))} disabled={readOnly} />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><Sparkles className="h-8 w-8" /></div>
              <p className="mt-4 text-sm text-muted-foreground">No activities in this category yet.</p>
            </div>
          )}
        </div>

        {current && (
          <div className="border-t border-border bg-card p-4">
            {attemptBlocked ? (
              <div className="flex items-center justify-between gap-4 rounded-xl bg-amber-500/10 px-5 py-4 text-amber-800 dark:text-amber-200">
                <div>
                  <div className="text-sm font-semibold">Attempt already used</div>
                  <div className="text-xs opacity-80">You've already used your only attempt for this Performance Review. Ask your teacher or admin to unlock it again if you need another try.</div>
                </div>
                <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90">
                  {index + 1 < list.length ? "Next Exercise" : "Finish"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : !feedback ? (
              <div className="flex justify-end">
                <button
                  onClick={readOnly ? next : check}
                  disabled={!readOnly && !(draft[current.id] ?? "").trim() && current.type !== "record"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[0_8px_24px_-6px_rgba(243,137,52,0.5)] transition-all hover:bg-[#d9731f] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {readOnly ? "Next" : "Check Answer"}
                </button>
              </div>
            ) : (
              <div className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 ${feedback.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>
                <div className="flex items-center gap-3">
                  <span className={`verbo-pop-in flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feedback.ok ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                    {feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{feedback.ok ? "Correct!" : "Not quite"}</div>
                    <div className="text-xs opacity-80">{feedback.ok ? "Nice work — moving on." : "Try again next round — your best score is kept."}</div>
                  </div>
                </div>
                <button
                  onClick={next}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 ${feedback.ok ? "bg-emerald-600" : "bg-rose-600"}`}
                >
                  {index + 1 < list.length ? "Next Exercise" : "Finish"} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Exercise bodies + evaluators (preserved from previous implementation)       */
/* -------------------------------------------------------------------------- */
function ExerciseBody({ activity, value, onChange, disabled }: { activity: Activity; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputCls = "h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60";

  if (activity.type === "fill_gaps" || activity.type === "read_complete") {
    const parts = (activity.paragraph ?? "").split("[blank]");
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-secondary/50 p-5 text-base leading-relaxed text-foreground">
          {parts.map((p, i) => (
            <span key={i}>
              {p}
              {i < parts.length - 1 && <span className="mx-1 inline-block min-w-[80px] border-b-2 border-accent" />}
            </span>
          ))}
        </div>
        <input value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder="Type your answer" className={inputCls} autoFocus />
      </div>
    );
  }

  if (activity.type === "read_select" || activity.type === "listen_select") {
    return (
      <div className="space-y-4">
        {activity.type === "listen_select" ? (
          <VerboAudioPlayer durationSec={activity.audioDurationSec} disabled={disabled} />
        ) : activity.prompt ? (
          <div className="rounded-xl bg-secondary/50 p-5 text-sm leading-relaxed text-foreground">{activity.prompt}</div>
        ) : null}
        <div className="text-sm font-semibold text-foreground">{activity.question}</div>
        <div className="space-y-2">
          {activity.options?.filter(Boolean).map((opt, i) => (
            <label key={i} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${value === String(i) ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"} ${disabled ? "opacity-70" : ""}`}>
              <input type="radio" name={activity.id} checked={value === String(i)} onChange={() => onChange(String(i))} disabled={disabled} className="h-4 w-4 accent-[#f38934]" />
              <span className="text-xs font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}</span>
              <span className="text-sm text-foreground">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (activity.type === "drag_drop" || activity.type === "match") {
    return <MatchExercise items={activity.items ?? []} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (activity.type === "record") {
    return <RecordExercise sentence={activity.answer ?? ""} value={value} onChange={onChange} disabled={disabled} />;
  }

  return null;
}

function MatchExercise({ items, value, onChange, disabled }: { items: { text: string; key: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const map: Record<string, string> = useMemo(() => {
    try { return value ? JSON.parse(value) : {}; } catch { return {}; }
  }, [value]);
  const update = (text: string, dest: string) => onChange(JSON.stringify({ ...map, [text]: dest }));
  const destinations = Array.from(new Set(items.map((i) => i.key)));
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">Pick the correct destination for each item.</div>
      {items.map((it) => (
        <div key={it.text} className="grid grid-cols-[1fr_1fr] items-center gap-3 rounded-lg border border-border bg-background p-3">
          <div className="text-sm font-medium text-foreground">{it.text}</div>
          <select value={map[it.text] ?? ""} onChange={(e) => update(it.text, e.target.value)} disabled={disabled} className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60">
            <option value="">Select destination…</option>
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

function RecordExercise({ sentence, value, onChange, disabled }: { sentence: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const start = () => {
    alert("Microphone access requested — recording will begin.");
    setRecording(true);
    setElapsed(0);
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  };
  const stop = () => {
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
    onChange("recorded");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/50 p-5 text-base leading-relaxed text-foreground">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Say this out loud</span>
        <div className="mt-2 font-medium">"{sentence}"</div>
      </div>
      <div className="flex items-center justify-center gap-4 rounded-xl border border-border bg-background p-6">
        <button
          onClick={recording ? stop : start}
          disabled={disabled}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-60 ${recording ? "animate-pulse bg-rose-600" : "bg-accent"}`}
        >
          <Mic className="h-6 w-6" />
        </button>
        <div className="flex items-end gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={`w-1.5 rounded-full ${recording ? "bg-accent" : value ? "bg-emerald-500" : "bg-border"}`} style={{ height: `${8 + ((i * 7 + elapsed * 3) % 28)}px` }} />
          ))}
        </div>
        <div className="text-sm font-medium text-foreground">
          {recording ? `Recording… ${elapsed}s` : value ? "Recorded ✓" : "Tap to record"}
        </div>
      </div>
    </div>
  );
}

function evaluate(activity: Activity, value: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  if (activity.type === "fill_gaps" || activity.type === "read_complete") return norm(value) === norm(activity.answer ?? "");
  if (activity.type === "read_select" || activity.type === "listen_select") return Number(value) === activity.correctIndex;
  if (activity.type === "record") return value === "recorded" || !!value;
  if (activity.type === "drag_drop" || activity.type === "match") {
    try {
      const map = JSON.parse(value || "{}") as Record<string, string>;
      return (activity.items ?? []).every((it) => norm(map[it.text] ?? "") === norm(it.key));
    } catch { return false; }
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Level completion modal (confetti + certificate download)                    */
/* -------------------------------------------------------------------------- */
function LevelCompletionModal({ level, studentName, onClose }: { level: CourseLevel; studentName: string; onClose: () => void }) {
  const downloadCertificate = () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#01304a"/>
      <stop offset="100%" stop-color="#024366"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="680" fill="none" stroke="#f38934" stroke-width="4"/>
  <text x="600" y="220" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#ffffff" letter-spacing="6">CERTIFICATE OF COMPLETION</text>
  <text x="600" y="330" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f8fafc">This certifies that</text>
  <text x="600" y="410" text-anchor="middle" font-family="Georgia, serif" font-size="56" fill="#ffffff" font-weight="bold">${studentName}</text>
  <text x="600" y="480" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f8fafc">has successfully completed the level</text>
  <text x="600" y="560" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#f38934">${level.name}</text>
  <text x="600" y="680" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#cbd5e1">${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${level.name.replace(/\s+/g, "-").toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <Confetti />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="bg-gradient-to-br from-[#01304a] to-[#024366] p-6 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <PartyPopper className="h-8 w-8" />
          </div>
          <div className="mt-4 text-lg font-semibold">Congratulations!</div>
          <div className="mt-1 text-sm text-white/80">You completed <span className="font-semibold text-white">{level.name}</span>.</div>
        </div>
        <div className="space-y-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">Every unit and Milestone Check in this level is now behind you. Download your certificate as a keepsake and keep going.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button onClick={downloadCertificate} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary">
              <Download className="h-4 w-4" /> Download Certificate
            </button>
            <button onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm hover:bg-[#d9731f]">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* dev-only: ensure imports pretend-used, avoids unused-var churn for TS */
export const __unused__ = { loadActivityScores };
