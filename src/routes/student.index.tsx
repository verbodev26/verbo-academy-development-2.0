import { createFileRoute } from "@tanstack/react-router";
import experiencesClubs from "@/assets/experiences-clubs.png.asset.json";
import teamsLogo from "@/assets/teams-logo.webp.asset.json";

import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/auth";
import { userById } from "@/lib/mock-data";
import { effectiveSessionCounts, groupOfStudent } from "@/lib/groups-store";
import { subscribeSessions, getSessionsSnapshot, getServerSessionsSnapshot, submitStudentRating, studentAttendance, type ExtSession } from "@/lib/sessions-store";
import {
  getPerformanceSnapshot,
  getServerPerformanceSnapshot,
  subscribePerformance,
  type PerformanceRating,
} from "@/lib/performance-store";
import { loadCourses, subscribeCourses, PRODUCT_META, computeCurrentProgress, resolvePlanTopic } from "@/lib/product-courses-store";
import { getLessonPlan, subscribeLessonPlans, type LessonPlan } from "@/lib/lesson-plans-store";
import { unitsForStudent } from "@/lib/vip-courses-store";
import { tailoredUnitsForStudent } from "@/lib/tailored-content-store";
import { subscribeVipUnits, subscribeVipUnitCompletion } from "@/lib/vip-courses-store";
import { useComputedMacros } from "@/components/verbo/PerformanceAnalytics";
import { GhostButton, Pill, PhotoPlaceholder, PrimaryButton, SectionTitle, StatRing, SuccessButton } from "@/components/verbo/ui";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,

  Award,
  BookOpen,
  CalendarClock,
  Download,
  NotebookPen,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  loadBadges as loadProfileBadges,
  subscribeBadges as subscribeProfileBadges,
  isBadgeEarned,
  buildProfileBadgeContext,
  type BadgeDef as ProfileBadgeDef,
} from "@/lib/profile-badges-store";
import {
  loadEquippedBadgeIds,
  subscribeEquippedBadges,
} from "@/lib/equipped-profile-badges-store";
import { loadClubs, type Club } from "@/lib/clubs-store";
import { isBooked } from "@/lib/club-bookings-store";
import { ClubReservationModal } from "@/components/verbo/ClubReservationModal";
import { EVENT_KIND_META } from "@/lib/calendar-events";
import { RatingModal } from "@/components/verbo/RatingModal";
import { ReportConductModal } from "@/components/verbo/ReportConductModal";
import { CantAttendRouter, RescheduleRequestModal } from "@/components/verbo/CancelSessionFlow";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";


export const Route = createFileRoute("/student/")({
  component: StudentDashboard,
});

/** Section heading with a colored icon circle (Class Details modal). */
function SectionHeadIcon({ icon, circleClass, label }: { icon: React.ReactNode; circleClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${circleClass}`}>{icon}</span>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function dayKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayKey(iso: string) {
  return dayKeyOf(new Date(iso));
}

function PremiumCard({ children, className = "", hover = false, style }: { children: React.ReactNode; className?: string; hover?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`rounded-3xl border border-border p-6 verbo-card ${hover ? "verbo-card-hover" : ""} ${className}`}>
      {children}
    </div>
  );
}

const ProgressRing = StatRing;

const SKILL_COLORS: Record<string, string> = {
  Speaking: "#f38934",
  Writing: "#7e22ce",
  Listening: "#01304a",
  Reading: "oklch(0.6 0.104 185)",
};

// Attendance color scale (shared by the % value and the mini bar chart).
function attendanceColorFor(pct: number): string {
  if (pct >= 90) return "var(--green-500)";
  if (pct >= 80) return "#ABFF32";
  if (pct >= 70) return "#FEED0C";
  if (pct >= 65) return "#FFC515";
  if (pct >= 60) return "#FF9100";
  return "#F10202";
}

const ATTENDANCE_SCORES: Record<string, number> = {
  completed: 100,
  delayed: 65,
  absent: 0,
  no_show: 0,
};


function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const sessions = useSyncExternalStore(
    subscribeSessions,
    getSessionsSnapshot,
    getServerSessionsSnapshot,
  );
  const performance = useSyncExternalStore(
    subscribePerformance,
    getPerformanceSnapshot,
    getServerPerformanceSnapshot,
  );
  // Real macro-skill scoring, scoped to this student (single source of
  // truth shared with Student > Performance and Teacher > Mis Alumnos).
  const macros = useComputedMacros(user?.id ?? "");
  const [classDetail, setClassDetail] = useState<ExtSession | null>(null);
  const [clubCardModal, setClubCardModal] = useState<Club | null>(null);

  const [plansRev, setPlansRev] = useState(0);
  useEffect(() => subscribeLessonPlans(() => setPlansRev((r) => r + 1)), []);

  // Shared "Can't Attend" flow (same real logic as Live Sessions).
  const [cantAttendFor, setCantAttendFor] = useState<ExtSession | null>(null);
  const [rescheduleFor, setRescheduleFor] = useState<ExtSession | null>(null);

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [coursesRev, setCoursesRev] = useState(0);
  useEffect(() => subscribeCourses(() => setCoursesRev((r) => r + 1)), []);
  useEffect(() => subscribeVipUnits(() => setCoursesRev((r) => r + 1)), []);
  useEffect(() => subscribeVipUnitCompletion(() => setCoursesRev((r) => r + 1)), []);

  if (!user) return null;

  const mySessions = sessions.filter((s) => s.student_id === user.id);
  const upcoming = mySessions
    .filter((s) => {
      const isUpcomingStatus = s.status === "scheduled" || s.status === "rescheduled" || s.status === "ready";
      if (!isUpcomingStatus) return false;
      const endsAt = +new Date(s.date_time) + s.duration_minutes * 60_000;
      return endsAt >= Date.now();
    })
    .sort((a, b) => +new Date(a.date_time) - +new Date(b.date_time));

  const history = mySessions
    .filter((s) => !["scheduled", "rescheduled", "ready"].includes(s.status))
    .sort((a, b) => +new Date(b.date_time) - +new Date(a.date_time));

  // Level Progress + Current Course — mirror Learning Path (/student/courses)
  // for GO/Enterprise/International and My Course (/student/my-course) for VIP.
  // The legacy LEVELS catalog / user.current_level are no longer used here.
  const progress = computeCurrentProgress(user.id, user.product, user.contracted_levels ?? [], coursesRev);
  const levelProgress = progress?.progressPct ?? 0;
  const currentUnitTitle = progress?.currentUnitTitle ?? null;
  const currentLevelName = progress?.levelName ?? null;

  // Product label — VIP lives outside PRODUCT_META, handle it literally.
  const productLabel = user.product === "vip"
    ? "VIP"
    : (user.product && (user.product === "enterprise" || user.product === "go" || user.product === "international")
        ? PRODUCT_META[user.product].label
        : undefined);

  // Ordinal position of current level within contracted levels ("2/3").
  const contractedLevels = user.contracted_levels ?? [];
  const currentLevelIdx = currentLevelName ? contractedLevels.indexOf(currentLevelName) : -1;
  const currentLevelRingLabel =
    currentLevelIdx >= 0 && contractedLevels.length > 0
      ? `${currentLevelIdx + 1}/${contractedLevels.length}`
      : "";


  // Overall Attendance — shared helper (studentAttendance) so Admin, Teacher
  // and Student always show the exact same % for a given student.
  const { pct: attendancePct } = studentAttendance(mySessions, user);

  // Mini attendance sparkline — last 6 gradeable sessions (oldest → newest).
  const gradeable = history.filter((s) => s.status in ATTENDANCE_SCORES);
  const attendanceBars: number[] = gradeable
    .slice(0, 6)
    .map((s) => ATTENDANCE_SCORES[s.status])
    .reverse();

  // Trend: last 30 days vs the 31–60 day window. No data → no arrow.
  const attendanceTrend: "up" | "down" | null = (() => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const avg = (from: number, to: number) => {
      const scores = gradeable
        .filter((s) => {
          const age = now - +new Date(s.date_time);
          return age >= from && age < to;
        })
        .map((s) => ATTENDANCE_SCORES[s.status]);
      if (scores.length === 0) return null;
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    };
    const recent = avg(0, 30 * day);
    const previous = avg(30 * day, 60 * day);
    if (recent === null || previous === null) return null;
    return recent >= previous ? "up" : "down";
  })();

  const openLevels = () => {
    if (!progress) return;
    if (progress.isVip) {
      navigate({ to: "/student/my-course" });
    } else {
      navigate({ to: "/student/courses" });
    }
  };

  const openCurrentLevel = () => {
    if (!progress) return;
    if (progress.isVip) {
      navigate({ to: "/student/my-course" });
    } else {
      navigate({ to: "/student/courses", search: { levelId: progress.levelId } });
    }
  };


  // Quick Review Dock — real teacher notes (report_comments) from completed
  // sessions. No synthetic tips. Empty state kept when no session has one.
  const recentFeedback = useMemo(() => {
    return history
      .filter((s) => typeof s.report_comments === "string" && s.report_comments.trim().length > 0)
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        teacher: userById(s.teacher_id)?.name ?? "Teacher",
        date: new Date(s.date_time).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        tip: (s.report_comments ?? "").trim(),
      }));
  }, [history]);


  // Rating popup logic (untouched)
  const [ratingSession, setRatingSession] = useState<ExtSession | null>(null);
  const [handled, setHandled] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("verbo:rated-sessions");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const persistHandled = (next: Set<string>) => {
    setHandled(next);
    try { localStorage.setItem("verbo:rated-sessions", JSON.stringify([...next])); } catch { /* noop */ }
  };

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const s of upcoming) {
        if (handled.has(s.id)) continue;
        const start = +new Date(s.date_time);
        const end = start + s.duration_minutes * 60_000;
        const triggerAt = end - 10 * 60_000;
        if (now >= triggerAt && now <= end) { setRatingSession(s); return; }
      }
      setRatingSession(null);
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [upcoming, handled]);

  const handleSubmit = (rating: number, note: string) => {
    if (!ratingSession) return;
    submitStudentRating(ratingSession.id, rating, note ? note : undefined);
    persistHandled(new Set(handled).add(ratingSession.id));
    setRatingSession(null);
  };

  const handleClose = () => {
    if (!ratingSession) return;
    persistHandled(new Set(handled).add(ratingSession.id));
    setRatingSession(null);
  };


  // Status badge tone classes (polished).
  const statusBadge = (status: string) => {
    const base = "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide capitalize";
    switch (status) {
      case "completed":
        return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`;
      case "absent":
        return `${base} bg-rose-50 text-rose-700 ring-1 ring-rose-200`;
      case "delayed":
        return `${base} bg-amber-50 text-amber-800 ring-1 ring-amber-200`;
      case "rescheduled":
      case "rearranged":
        return `${base} bg-sky-50 text-sky-700 ring-1 ring-sky-200`;
      default:
        return `${base} bg-slate-100 text-slate-700 ring-1 ring-slate-200`;
    }
  };

  // Dynamic welcome line — first matching condition wins.
  const welcomeLine = (() => {
    const now = Date.now();
    const soon = upcoming.find((s) => {
      const dt = +new Date(s.date_time);
      return dt >= now && dt - now <= 48 * 60 * 60 * 1000;
    });
    if (soon) {
      const t = userById(soon.teacher_id)?.name?.split(" ")[0] ?? "your teacher";
      return `Your next session with ${t} is ${fmtDay(soon.date_time)} at ${fmtTime(soon.date_time)}.`;
    }
    if (levelProgress >= 80) return "You're close to leveling up to your next stage — keep going.";
    if (attendancePct >= 90) return `Your ${attendancePct}% attendance is paying off. Keep it up.`;
    return "Every session brings you closer to fluency.";
  })();

  return (
    <div className="space-y-10">
      <header className="verbo-fade-up motion-reduce:animate-none flex flex-wrap items-center justify-between gap-4" style={{ animationDelay: "0ms" }}>
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#01304a" }}>
              {user.name.split(" ")[0]}
            </h1>
            <FeaturedProfileBadge user={user} />
            {user.access_plan === "Elite" && <Pill tone="elite">Elite</Pill>}
            {productLabel && <Pill tone="muted">{productLabel}</Pill>}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{welcomeLine}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.product_type === "performance" && (() => {
            const c = effectiveSessionCounts(user.id, { hired: user.hired_sessions, remaining: user.remaining_sessions });
            const grp = groupOfStudent(user.id);
            return (
              <div
                className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                title={grp ? "Shared with your group" : undefined}
              >
                {c.remaining} of {c.hired} sessions remaining
                {grp && <span className="ml-1 font-normal text-muted-foreground">· group</span>}
              </div>
            );
          })()}
          <button className="verbo-report-btn" onClick={() => setReportOpen(true)} aria-label="Report" title="Report">
            <span className="sign"><ShieldAlert className="h-4 w-4" /></span>
            <span className="text">Report</span>
          </button>
        </div>
      </header>

      {/* KPI Metrics with circular SVG progress — Level Progress is the hero */}
      <section
        className="verbo-fade-up motion-reduce:animate-none grid gap-4 md:grid-cols-[1fr_1.6fr_1fr]"
        style={{ animationDelay: "60ms" }}
      >
        {/* Current Level */}
        <div
          className="relative cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
          role="button"
          tabIndex={0}
          onClick={openLevels}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLevels(); }
          }}
        >
          <div className="card-gradient-navy shadow-card verbo-card-hover relative flex h-full min-h-[168px] items-center overflow-hidden rounded-[2rem] px-6 py-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-[140px] w-[140px] rounded-3xl"
              style={{ background: "rgba(255,255,255,0.08)", transform: "rotate(14deg)" }}
              aria-hidden
            />
            <div className="relative flex w-full items-center justify-between gap-4">
              <div className="pr-2">
                <div className="text-xs font-medium uppercase tracking-wider text-white/60">Current Level</div>
                <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                  {currentLevelName ?? "—"}
                </div>
                <div className="mt-1 text-xs text-white/60">{productLabel}</div>
              </div>
              <StatRing
                value={levelProgress}
                label={currentLevelRingLabel}
                trackColor="rgba(255,255,255,0.25)"
                progressColor="#ffffff"
                textColor="#ffffff"
              />
            </div>
          </div>
        </div>

        {/* Level Progress — hero */}
        <div
          className="relative cursor-pointer transition-transform duration-200 hover:scale-[1.01]"
          role="button"
          tabIndex={0}
          onClick={openCurrentLevel}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCurrentLevel(); }
          }}
        >
          <div className="card-gradient-orange shadow-card verbo-card-hover relative flex h-full min-h-[168px] items-center overflow-hidden rounded-[2rem] px-6 py-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-[140px] w-[140px] rounded-3xl"
              style={{ background: "rgba(1,48,74,0.06)", transform: "rotate(14deg)" }}
              aria-hidden
            />
            <div className="relative flex w-full items-center justify-between gap-5">
              <div className="pr-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "rgba(1,48,74,0.8)" }}>Level Progress</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-6xl font-bold leading-none tracking-tight" style={{ color: "#ffffff" }}>{levelProgress}</span>
                  <span className="text-2xl font-bold" style={{ color: "#ffffff" }}>%</span>

                </div>
                <div className="mt-1.5 text-xs font-semibold" style={{ color: "rgba(1,48,74,0.8)" }}>of {currentLevelName ?? "—"}</div>
              </div>
              <StatRing
                value={levelProgress}
                size={104}
                stroke={9}
                trackColor="rgba(1,48,74,0.18)"
                progressColor="#01304a"
                textColor="#01304a"
              />
            </div>
          </div>
        </div>

        {/* Overall Attendance */}
        <div className="relative">
          <div className="card-gradient-lime shadow-card verbo-card-hover relative flex h-full min-h-[168px] items-center overflow-hidden rounded-[2rem] px-6 py-6">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-[140px] w-[140px] rounded-3xl"
              style={{ background: "rgba(1,48,74,0.06)", transform: "rotate(14deg)" }}
              aria-hidden
            />
            <div className="relative flex w-full items-center justify-between gap-4">
              <div className="pr-2">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(1,48,74,0.8)" }}>Overall Attendance</div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight" style={{ color: "#ffffff" }}>{attendancePct}%</span>
                </div>
                <div className="mt-1 text-xs font-semibold" style={{ color: "rgba(1,48,74,0.8)" }}>last 90 days</div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex h-14 items-end gap-1.5">
                  {attendanceBars.map((b, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{
                        height: `${Math.max(8, (b / 100) * 56)}px`,
                        backgroundColor: attendanceColorFor(b),
                      }}
                      aria-hidden
                    />
                  ))}
                </div>
                {attendanceTrend === "up" && <ArrowUp className="h-5 w-5" style={{ color: "var(--green-500)" }} aria-label="Attendance trending up" />}
                {attendanceTrend === "down" && <ArrowDown className="h-5 w-5" style={{ color: "#F10202" }} aria-label="Attendance trending down" />}
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* Linguistic Asset Performance — replaces Performance Metrics + Quote of the Week */}
      <section className="verbo-fade-up motion-reduce:animate-none" style={{ animationDelay: "120ms" }}>
        <PremiumCard>
          <div className="mb-5 flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold tracking-tight" style={{ color: "#01304a" }}>
              Linguistic Asset Performance
            </h3>
            <Link
              to="/student/performance"
              className="inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: "#01304a" }}
            >
              View Detailed Analytics <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {macros.map((m) => {
              const Icon = m.icon;
              const color = SKILL_COLORS[m.key] ?? "#01304a";
              const pct = m.overall === null ? 0 : m.overall;
              return (
                <div
                  key={m.key}
                  className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-white/60 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                      style={{ background: color, boxShadow: `0 6px 16px -4px color-mix(in oklab, ${color} 25%, transparent)` }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.key}</div>
                      <div className="text-base font-semibold tabular-nums" style={{ color: "#01304a" }}>
                        {m.overall === null ? "--" : `${m.overall}%`}
                      </div>
                    </div>
                  </div>
                  <div
                    className="h-[3px] w-full overflow-hidden rounded-full"
                    style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </section>

      {/* Two-column productivity layout */}
      <section className="grid gap-6 lg:grid-cols-[1.85fr_1fr]">
        {/* LEFT COLUMN ~65% */}
        <div className="verbo-fade-up motion-reduce:animate-none space-y-8" style={{ animationDelay: "180ms" }}>
          {/* Current Course */}
          <div>
            <SectionTitle>Current Course</SectionTitle>
            <PremiumCard hover className="group verbo-card-hover relative flex flex-col items-start justify-between gap-6 overflow-hidden md:flex-row md:items-center">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{ background: "radial-gradient(circle at top right, var(--orange-500), transparent 65%)" }}
                aria-hidden
              />
              <div className="relative flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-transform duration-300 group-hover:scale-105"
                  style={{ color: "#01304a" }}
                  aria-hidden
                >
                  <BookOpen className="h-6 w-6" strokeWidth={1.6} />
                </div>
                <div>
                  <Pill tone="muted">{currentLevelName ?? "Learning Path"}</Pill>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight" style={{ color: "#01304a" }}>
                    {currentUnitTitle ?? "No unit available yet"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick up exactly where you left off. Video, materials and practice activities included.
                  </p>
                </div>
              </div>
              <PrimaryButton
                className="verbo-btn-glow"
                disabled={!progress || (!progress.isVip && !progress.currentUnitId)}
                onClick={() => {
                  if (!progress) return;
                  if (progress.isVip) {
                    navigate({ to: "/student/my-course" });
                  } else if (progress.levelId && progress.currentUnitId) {
                    navigate({
                      to: "/student/courses",
                      search: { levelId: progress.levelId, unitId: progress.currentUnitId },
                    });
                  }
                }}
              >
                Continue unit <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </PremiumCard>
          </div>



          {/* Upcoming Sessions — week strip + selected day session */}
          {(() => {
            const today = new Date();
            const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const week = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(weekStart);
              d.setDate(weekStart.getDate() + i);
              return d;
            });
            const sessionsForDay = (d: Date) =>
              upcoming
                .filter((s) => dayKey(s.date_time) === dayKeyOf(d))
                .sort((a, b) => +new Date(a.date_time) - +new Date(b.date_time));
            const visibleClubs = loadClubs().filter(
              (c) => (c.type === "insight" || c.type === "book") && c.status !== "cancelled",
            );
            const clubsForDay = (d: Date) =>
              visibleClubs
                .filter((c) => dayKey(c.date) === dayKeyOf(d))
                .sort((a, b) => +new Date(a.date) - +new Date(b.date));
            const sessionForDay = (d: Date) => sessionsForDay(d)[0];
            const clubForDay = (d: Date) => clubsForDay(d)[0];
            const CLASS_COLOR = "#cb6ce6";
            const CLUB_COLOR = "#ffc802";
            const SPOTLIGHT_COLOR = "#b2ece3";
            const isImminentSession = (s: ExtSession) => {
              const ms = +new Date(s.date_time) - Date.now();
              return ms > 0 && ms <= 60 * 60 * 1000;
            };
            const defaultDay = week.find((d) => sessionForDay(d)) ?? today;
            const activeDay = selectedDay ?? dayKeyOf(defaultDay);
            const active = week.find((d) => dayKeyOf(d) === activeDay);
            type DayEvent =
              | { kind: "session"; start: number; session: ExtSession }
              | { kind: "club"; start: number; club: ReturnType<typeof loadClubs>[number] };
            const dayEvents: DayEvent[] = active
              ? [
                  ...sessionsForDay(active).map((s) => ({
                    kind: "session" as const,
                    start: +new Date(s.date_time),
                    session: s,
                  })),
                  ...clubsForDay(active).map((c) => ({
                    kind: "club" as const,
                    start: +new Date(c.date),
                    club: c,
                  })),
                ].sort((a, b) => a.start - b.start)
              : [];



            return (
              <div>
                <SectionTitle>Upcoming Sessions</SectionTitle>
                <PremiumCard>
                <div className="grid grid-cols-7 gap-2">

                  {week.map((d) => {
                    const key = dayKeyOf(d);
                    const ds = sessionForDay(d);
                    const dc = clubForDay(d);
                    const isActive = key === activeDay;
                    const tokens: string[] = [];
                    if (ds) tokens.push(ds.origin === "spotlight" ? SPOTLIGHT_COLOR : CLASS_COLOR);
                    if (dc) tokens.push(CLUB_COLOR);
                    const multi = `linear-gradient(135deg, ${tokens.join(", ")})`;
                    const cellBg = tokens.length === 0
                      ? undefined
                      : tokens.length === 1
                        ? `color-mix(in srgb, ${tokens[0]} 18%, white)`
                        : `linear-gradient(135deg, ${tokens.map((t) => `color-mix(in srgb, ${t} 22%, white)`).join(", ")})`;
                    const dotBg = tokens.length === 0
                      ? "transparent"
                      : tokens.length === 1
                        ? tokens[0]
                        : multi;
                    const dsImminent = !!ds && isImminentSession(ds);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDay(key)}
                        className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 transition-transform duration-200 active:scale-[0.97] ${
                          isActive
                            ? "shadow-card text-white"
                            : "border border-border bg-white text-foreground hover:-translate-y-0.5"
                        }`}
                        style={
                          isActive
                            ? { backgroundColor: "var(--calendar-accent)" }
                            : cellBg
                              ? { background: cellBg }
                              : undefined
                        }

                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${isActive ? "text-white/70" : "text-muted-foreground"}`}>
                          {d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
                        </span>
                        <span className="text-lg font-bold leading-none">{d.getDate()}</span>
                        <span
                          className={`verbo-status-dot ${dsImminent ? "verbo-live-pulse" : ""}`}
                          style={{ background: dsImminent ? "var(--green-500)" : dotBg }}
                          aria-hidden
                        />
                      </button>
                    );
                  })}

                </div>

                <div className="mt-6">
                  {dayEvents.length === 0 ? (
                    <div className="max-w-xl mx-auto w-full rounded-2xl border border-[var(--navy-100)] bg-[var(--navy-50)] p-6 text-sm text-muted-foreground">
                      No upcoming sessions scheduled.
                    </div>
                  ) : (
                    <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
                      {dayEvents.map((ev) => {
                        if (ev.kind === "session") {
                          const s = ev.session;
                          const teacher = userById(s.teacher_id);
                          const plan = getLessonPlan(s.id);
                          const imminent = isImminentSession(s);
                          const stripeColor =
                            s.origin === "spotlight"
                              ? EVENT_KIND_META.spotlight.color
                              : EVENT_KIND_META.class.color;
                          return (
                            <div
                              key={`s-${s.id}`}
                              className="relative w-full overflow-hidden rounded-2xl border border-[var(--navy-100)] bg-[var(--navy-50)] shadow-elevated verbo-card-hover"
                            >
                              <div className="absolute inset-x-0 top-0 z-10 h-px" style={{ background: stripeColor }} />
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <PhotoPlaceholder tone="dark" shape="circle" className="h-9 w-9 bg-[#01304a]" />
                                      {imminent && (
                                        <span
                                          className="verbo-status-dot verbo-live-pulse absolute -right-0.5 -top-0.5"
                                          style={{ background: "var(--green-500)" }}
                                          aria-label="Starts within the next hour"
                                        />
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Teacher</div>
                                      <div className="text-sm font-semibold" style={{ color: "#01304a" }}>{teacher?.name ?? "—"}</div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    title="Session Details"
                                    aria-label="Session Details"
                                    onClick={() => setClassDetail(s)}
                                    className="group flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary/10 active:scale-[0.97]"
                                  >
                                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" style={{ color: "#01304a" }} />
                                  </button>
                                </div>

                                <div className="mt-3">
                                  <div className="text-base font-bold tracking-tight" style={{ color: "#01304a" }}>
                                    {plan?.title || "Live English Session"}
                                  </div>
                                  <div className="mt-0.5 text-sm text-muted-foreground">
                                    {currentUnitTitle ?? "—"}
                                  </div>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <img src={teamsLogo.url} alt="Microsoft Teams" className="h-5 w-5 shrink-0 object-contain" />
                                    <span>Microsoft Teams Meeting · {fmt(s.date_time)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      title="Can't attend"
                                      aria-label="Can't attend"
                                      onClick={() => setCantAttendFor(s)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-soft transition-opacity hover:opacity-90 active:scale-[0.97]"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Connect"
                                      aria-label="Connect"
                                      onClick={() => window.open(s.teams_link, "_blank")}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground shadow-soft transition-opacity hover:opacity-90 active:scale-[0.97]"
                                    >
                                      <Video className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const club = ev.club;
                        const clubHost = club.teacher_id ? userById(club.teacher_id)?.name : undefined;
                        const clubBooked = isBooked(user.id, club.id);
                        const start = +new Date(club.date);
                        const now = Date.now();
                        const clubConnectOpen =
                          now >= start - 5 * 60 * 1000 && now <= start + club.duration_minutes * 60 * 1000;
                        const stripeColor =
                          club.type === "book" ? EVENT_KIND_META.book_club.color : EVENT_KIND_META.insight.color;
                        return (
                          <div
                            key={`c-${club.id}`}
                            className="relative w-full overflow-hidden rounded-2xl border border-[var(--navy-100)] bg-[var(--navy-50)] shadow-elevated verbo-card-hover"
                          >
                            <div className="absolute inset-x-0 top-0 z-10 h-px" style={{ background: stripeColor }} />
                            <div className="p-3">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <PhotoPlaceholder tone="dark" shape="circle" className="h-9 w-9 bg-[#01304a]" />
                                  <div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Host</div>
                                    <div className="text-sm font-semibold" style={{ color: "#01304a" }}>{clubHost ?? "Verbo Team"}</div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  title="Session Details"
                                  aria-label="Session Details"
                                  onClick={() => setClubCardModal(club)}
                                  className="group flex h-8 w-8 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-primary/10 active:scale-[0.97]"
                                >
                                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" style={{ color: "#01304a" }} />
                                </button>
                              </div>

                              <div className="mt-3">
                                <div className="text-base font-bold tracking-tight" style={{ color: "#01304a" }}>
                                  {club.title}
                                </div>
                                <div className="mt-0.5 text-sm text-muted-foreground">
                                  {club.type === "book" ? "Book Club" : "Verbo Insight"}
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <img src={teamsLogo.url} alt="Microsoft Teams" className="h-5 w-5 shrink-0 object-contain" />
                                  <span>Microsoft Teams Meeting · {fmt(club.date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {clubBooked ? (
                                    <button
                                      type="button"
                                      title={clubConnectOpen ? "Connect" : "Activates 5 minutes before the club starts."}
                                      aria-label="Connect"
                                      disabled={!clubConnectOpen}
                                      onClick={() => { if (clubConnectOpen && club.link) window.open(club.link, "_blank"); }}
                                      className={`flex h-8 w-8 items-center justify-center rounded-full shadow-soft transition-opacity active:scale-[0.97] ${
                                        clubConnectOpen
                                          ? "bg-success text-success-foreground hover:opacity-90"
                                          : "cursor-not-allowed bg-secondary text-muted-foreground"
                                      }`}
                                    >
                                      <Video className="h-4 w-4" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setClubCardModal(club)}
                                      className="inline-flex items-center gap-1.5 rounded-full bg-[#01304a] px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition-opacity hover:opacity-90 active:scale-[0.97]"
                                    >
                                      Reserve seat <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>

                </PremiumCard>
              </div>

            );
          })()}

        </div>

        {/* RIGHT SIDEBAR ~35% */}
        <aside className="verbo-fade-up motion-reduce:animate-none space-y-6" style={{ animationDelay: "240ms" }}>
          {/* Verbo Experiences */}
          <PremiumCard hover className="group card-gradient-violet relative overflow-visible">
            <img
              src={experiencesClubs.url}
              alt="Two students laughing together during a live conversation club"
              className="shadow-elevated pointer-events-none absolute right-2 top-[-28%] w-[48%] -rotate-6 rounded-2xl object-cover"
            />
            <div className="relative">

              <div className="flex items-center gap-2">
                <div
                  className="verbo-float flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white transition-transform duration-300 group-hover:scale-110"
                >
                  <Users className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold tracking-tight text-white">
                  Verbo Experiences
                </h3>
              </div>
              <p className="mt-3 max-w-[52%] text-xs leading-relaxed text-white/80">
                Join today's live conversation clubs and immerse yourself with peers across the network.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-sm font-semibold transition-transform duration-200 active:scale-[0.97]"
                style={{ color: "var(--violet-900)" }}
                onClick={() => navigate({ to: "/student/sessions", search: { focus: "clubs" } })}
              >
                <Sparkles className="h-3.5 w-3.5" /> View Active Clubs
              </button>
            </div>
          </PremiumCard>


          {/* Quick Review Dock */}
          <PremiumCard hover>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight" style={{ color: "#01304a" }}>
                Quick Review Dock
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest</span>
            </div>
            {recentFeedback.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Your teacher's notes and vocabulary tips will appear here after your first rated session.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentFeedback.map((f) => (
                  <li
                    key={f.id}
                    className="flex gap-3 rounded-lg border border-border/70 bg-white/70 p-3 transition-colors duration-200 hover:bg-secondary/60"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: "#01304a" }}
                      aria-hidden
                    >
                      {(f.teacher ?? "?").trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span className="truncate">{f.teacher}</span>
                        <span className="shrink-0 pl-2">{f.date}</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-foreground">{f.tip}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PremiumCard>
        </aside>
      </section>

      {/* History */}
      <section className="verbo-fade-up motion-reduce:animate-none" style={{ animationDelay: "300ms" }}>
        <SectionTitle>Session History</SectionTitle>
        <PremiumCard className="verbo-card-hover">
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_110px_140px] gap-4 px-4 pb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div>Date</div>
            <div>Teacher</div>
            <div>Status</div>
            <div>Rating</div>
          </div>
          <div className="divide-y divide-border">
            {history.map((s) => {
              const teacher = userById(s.teacher_id);
              const teacherName = teacher?.name ?? "Teacher";
              const initial = teacherName.charAt(0).toUpperCase();
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setClassDetail(s)}
                  className="grid w-full grid-cols-1 items-center gap-4 rounded-xl px-4 py-4 text-left transition-all duration-150 ease-out hover:bg-secondary/40 active:scale-[0.97] md:grid-cols-[1fr_1fr_110px_140px]"
                >
                  <div className="truncate text-sm text-foreground">{fmt(s.date_time)}</div>
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold"
                      style={{ color: "#01304a" }}
                      aria-hidden
                    >
                      {initial}
                    </div>
                    <div className="truncate text-sm font-semibold" style={{ color: "#01304a" }}>{teacherName}</div>
                  </div>
                  <div className="md:justify-self-start">
                    <span className={statusBadge(s.status)}>{s.status}</span>
                  </div>
                  <div className="md:justify-self-start">
                    {s.student_rating ? <RatingStarsCompact value={s.student_rating} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </button>

              );
            })}
          </div>
        </PremiumCard>
      </section>



      {ratingSession && (
        <RatingModal
          session={ratingSession as any}
          onSubmit={(rating, note) => handleSubmit(rating, note)}
          onClose={handleClose}
        />
      )}

      <ReportConductModal
        studentId={user.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />

      {/* Cancellation flow — shared with Live Sessions (real policy, quota
          and group handling live in CancelSessionFlow). */}
      {cantAttendFor && user && (
        <CantAttendRouter
          session={cantAttendFor}
          user={user}
          onClose={() => setCantAttendFor(null)}
          onReschedule={() => {
            const s = cantAttendFor;
            setCantAttendFor(null);
            setRescheduleFor(s);
          }}
        />
      )}
      {rescheduleFor && (
        <RescheduleRequestModal
          session={rescheduleFor}
          onClose={() => setRescheduleFor(null)}
        />
      )}


      {clubCardModal && (
        <ClubReservationModal
          club={clubCardModal}
          studentId={user.id}
          onClose={() => setClubCardModal(null)}
        />
      )}

      {/* Class Details Modal — unified view (replaces the old standalone
          "Session Performance Breakdown" popup and the row-level icons). */}
      <Dialog open={!!classDetail} onOpenChange={(o) => !o && setClassDetail(null)}>
        <DialogContent className="max-w-lg">
          {classDetail && (() => {
            const s = classDetail;
            const teacher = userById(s.teacher_id);
            const plan: LessonPlan | undefined = getLessonPlan(s.id);
            void plansRev; // re-render on lesson plan updates
            const rating = performance[s.id];
            const isAbsent = s.status === "absent";
            const cause = s.absent_cause;
            const absentMsg = cause === "student"
              ? "You marked yourself unavailable"
              : cause === "teacher"
              ? "Your teacher canceled this session"
              : null;
            // Resolve real curriculum topic when the plan links a unit.
            let topic: { levelName: string; unitTitle: string } | null = null;
            if (plan) {
              if (plan.vip_unit_id) {
                const u = unitsForStudent(user.id).find((x) => x.id === plan.vip_unit_id);
                if (u) topic = { levelName: "VIP Course", unitTitle: u.title };
              } else if (plan.tailored_unit_id) {
                const u = tailoredUnitsForStudent(user.id).find((x) => x.id === plan.tailored_unit_id);
                if (u) topic = { levelName: "Tailored Content", unitTitle: u.title };
              } else {
                topic = resolvePlanTopic(user.product, plan.level_id, plan.unit_id);
              }
            }
            const hasRealPdf = !!s.report_pdf_url && s.report_pdf_url !== "/mock-report.pdf";
            const isUpcoming = s.status === "scheduled" || s.status === "rescheduled" || s.status === "ready";
            const headerBlock = (
              <div className="rounded-lg border border-border bg-secondary/40 p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{fmt(s.date_time)}</div>
                    <div className="mt-0.5 text-muted-foreground">
                      {s.duration_minutes} min · with {teacher?.name ?? "Teacher"}
                    </div>
                  </div>
                  <span className={statusBadge(s.status)}>{s.status}</span>
                </div>
                {isAbsent && absentMsg && (
                  <div className="mt-2 text-muted-foreground">{absentMsg}.</div>
                )}
              </div>
            );
            if (isUpcoming) {
              return (
                <>
                  <DialogHeader>
                    <DialogTitle style={{ color: "#01304a" }}>Session Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {headerBlock}
                    <section>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        What we'll cover
                      </h4>
                      {plan ? (
                        <div className="mt-2 space-y-1 text-sm text-foreground">
                          <div><span className="text-muted-foreground">Type:</span> {plan.type}</div>
                          <div><span className="text-muted-foreground">Title:</span> {plan.title}</div>
                          {topic && (
                            <div className="text-muted-foreground">
                              {topic.levelName} — {topic.unitTitle}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Your teacher hasn't set today's topic yet.
                        </p>
                      )}
                    </section>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-2">
                    <GhostButton
                      onClick={() => { setClassDetail(null); setCantAttendFor(s); }}
                    >
                      <X className="h-3.5 w-3.5" /> Can't attend
                    </GhostButton>
                    <PrimaryButton
                      className="verbo-btn-glow"
                      onClick={() => s.teams_link && window.open(s.teams_link, "_blank")}
                    >
                      <Video className="h-3.5 w-3.5" /> Connect
                    </PrimaryButton>
                  </DialogFooter>
                </>
              );
            }
            return (
              <>
                <DialogHeader>
                  <DialogTitle style={{ color: "#01304a" }}>Session Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Header block */}
                  <div className="rounded-lg border border-[var(--navy-100)] bg-[var(--navy-50)] p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{fmt(s.date_time)}</div>
                        <div className="mt-0.5 text-muted-foreground">
                          {s.duration_minutes} min · with {teacher?.name ?? "Teacher"}
                        </div>
                      </div>
                      <span className={statusBadge(s.status)}>{s.status}</span>
                    </div>
                    {isAbsent && absentMsg && (
                      <div className="mt-2 text-muted-foreground">{absentMsg}.</div>
                    )}
                  </div>

                  {/* What we covered */}
                  <section>
                    <SectionHeadIcon
                      icon={<BookOpen className="h-4 w-4" />}
                      circleClass="bg-[var(--navy-100)] text-[#01304a]"
                      label="What we covered"
                    />
                    {plan ? (
                      <div className="mt-2 space-y-1 text-sm text-foreground">
                        <div><span className="text-muted-foreground">Type:</span> {plan.type}</div>
                        <div><span className="text-muted-foreground">Title:</span> {plan.title}</div>
                        {topic && (
                          <div className="text-muted-foreground">
                            {topic.levelName} — {topic.unitTitle}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        No lesson plan was recorded for this session.
                      </p>
                    )}
                  </section>

                  {/* Teacher's notes */}
                  <section>
                    <SectionHeadIcon
                      icon={<NotebookPen className="h-4 w-4" />}
                      circleClass="bg-[var(--orange-100)] text-[var(--orange-600)]"
                      label="Teacher's notes"
                    />
                    {s.report_comments && s.report_comments.trim().length > 0 ? (
                      <p className="mt-2 text-sm leading-relaxed text-foreground">{s.report_comments.trim()}</p>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No notes were left for this session.</p>
                    )}
                  </section>

                  {/* Your rating */}
                  <section>
                    <SectionHeadIcon
                      icon={<Star className="h-4 w-4" />}
                      circleClass="bg-[var(--orange-100)] text-[var(--orange-600)]"
                      label="Your rating"
                    />
                    {s.student_rating ? (
                      <div className="mt-2"><RatingStarsCompact value={s.student_rating} /></div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">You haven't rated this session.</p>
                    )}
                  </section>

                  {/* Performance breakdown */}
                  <section>
                    <SectionHeadIcon
                      icon={<Award className="h-4 w-4" />}
                      circleClass="bg-[var(--violet-100)] text-[var(--violet-700)]"
                      label="Performance breakdown"
                    />
                    {rating ? (
                      <div className="mt-2 space-y-3">
                        <PerfStars label="Fluency" value={rating.fluency} />
                        <PerfStars label="Vocabulary Range" value={rating.vocabulary} />
                        <PerfStars label="Confidence" value={rating.confidence} />
                        <PerfStars label="Grammar Accuracy" value={rating.grammar} />
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your teacher hasn't logged a detailed performance rating for this session yet.
                      </p>
                    )}
                  </section>
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <GhostButton
                    disabled={!hasRealPdf}
                    title={!hasRealPdf ? "Coming soon" : undefined}
                    onClick={() => hasRealPdf && window.open(s.report_pdf_url!, "_blank")}
                  >
                    <Download className="h-3.5 w-3.5" /> Download report
                  </GhostButton>
                  <PrimaryButton className="verbo-btn-glow" onClick={() => setClassDetail(null)}>Close</PrimaryButton>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function PerfStars({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium" style={{ color: "#01304a" }}>{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= value;
          return (
            <Star
              key={n}
              className="h-4 w-4"
              style={{
                color: active ? "#f38934" : "#e5e7eb",
                fill: active ? "#f38934" : "transparent",
              }}
            />
          );
        })}
        <span className="ml-2 text-xs tabular-nums text-muted-foreground">{value}/5</span>
      </div>
    </div>
  );
}

function RatingStarsCompact({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Rating ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <Star
            key={n}
            className="h-3.5 w-3.5"
            style={{
              color: active ? "#f38934" : "#e5e7eb",
              fill: active ? "#f38934" : "transparent",
            }}
          />
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * FeaturedProfileBadge — replaces the old fixed "On Fire" flame in the
 * dashboard header. Renders the student's currently featured profile badge
 * (equipped-first, else highest-threshold earned) or nothing at all if the
 * student has not earned any badge yet.
 * ------------------------------------------------------------------------ */
function FeaturedProfileBadge({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const un1 = subscribeProfileBadges(bump);
    const un2 = subscribeEquippedBadges(bump);
    const un3 = subscribeCourses(bump);
    return () => { un1(); un2(); un3(); };
  }, []);

  // The subscriptions above bump `tick`, which invalidates the memo below.
  const featured = useMemo<ProfileBadgeDef | null>(() => {
    const badges = loadProfileBadges();
    const ctx = buildProfileBadgeContext(user);
    const earned = badges.filter((b) => isBadgeEarned(b, ctx));
    if (earned.length === 0) return null;
    const equipped = loadEquippedBadgeIds(user.id);
    for (const id of equipped) {
      const hit = earned.find((b) => b.id === id);
      if (hit) return hit;
    }
    return earned.slice().sort((a, b) => (b.rule.threshold ?? 1) - (a.rule.threshold ?? 1))[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tick]);

  if (!featured) return null;

  return (
    <div
      title={`Equipped: ${featured.name}`}
      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full shadow-md"
      style={{ background: "linear-gradient(135deg, #01304a, #0a4a6e)" }}
    >
      {featured.image ? (
        <img src={featured.image} alt={featured.name} className="h-full w-full object-cover" />
      ) : (
        <Award className="h-5 w-5 text-white" />
      )}
    </div>
  );
}
