// Session Details modal used by the Teacher Calendar for Ready and
// Completed Performance Sessions. Read-only view of the plan/report plus
// action shortcuts (Join Live Session, Can't Attend, Edit Lesson Plan).
import { Video, CalendarClock, FileEdit, NotebookPen } from "lucide-react";
import { GhostButton, PrimaryButton, AccentModalHeader } from "@/components/verbo/ui";
import type { ExtSession } from "@/lib/sessions-store";
import type { LessonPlan } from "@/lib/lesson-plans-store";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SessionDetailsModal({
  session, plan, title, mode, coverageNote, background, iconTint, textTone = "light",
  onClose, onJoin, onCantAttend, onEditPlan,
}: {
  session: ExtSession;
  plan?: LessonPlan;
  title: string;
  mode: "ready" | "completed";
  /** Coverage Notes authored by the titular teacher for this student. When
   *  set, a highlighted callout is rendered so a substitute sees it the
   *  moment they open the session — no need to open the Lesson Plan. */
  coverageNote?: string;
  /** Header accent background (solid or gradient), from calendarEventTheme(). */
  background?: string;
  /** Solid version of the accent, used for the header icon tint. */
  iconTint?: string;
  /** "dark" when the accent background is light. */
  textTone?: "light" | "dark";
  onClose: () => void;
  onJoin?: () => void;
  onCantAttend?: () => void;
  onEditPlan?: () => void;
}) {
  const comments = mode === "completed"
    ? (session.report_comments ?? plan?.comments ?? "No comments were left with the Session Report.")
    : (plan?.comments || "No plan comments yet.");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-floating">
        <AccentModalHeader
          background={background ?? "linear-gradient(135deg, #01304a 0%, #02466b 100%)"}
          iconTint={iconTint ?? "#01304a"}
          icon={CalendarClock}
          eyebrow="Session Details"
          title={title}
          watermark={{ type: "icon", icon: CalendarClock }}
          textTone={textTone}
          onClose={onClose}
        />
        <div className="space-y-4 px-6 py-5 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info icon={<CalendarClock className="h-3.5 w-3.5" />} label="Date" value={fmtDate(session.date_time)} />
            <Info icon={<CalendarClock className="h-3.5 w-3.5" />} label="Time" value={`${fmtTime(session.date_time)} · ${session.duration_minutes} min`} />
          </div>
          {coverageNote && coverageNote.trim() && (
            <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                <NotebookPen className="h-3.5 w-3.5" /> Coverage Notes from titular teacher
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                {coverageNote}
              </p>
            </div>
          )}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Comments</div>
            <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-foreground">
              {comments}
            </div>
          </div>
          {mode === "ready" && onEditPlan && (
            <button
              type="button"
              onClick={onEditPlan}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent underline-offset-4 hover:underline"
            >
              <FileEdit className="h-3.5 w-3.5" /> Edit Lesson Plan
            </button>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-4">
          {mode === "ready" ? (
            <>
              <GhostButton onClick={onCantAttend}>Can't Attend</GhostButton>
              <a
                href={session.teams_link || "#"}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => { if (!session.teams_link) e.preventDefault(); onJoin?.(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                <Video className="h-3.5 w-3.5" /> Join Live Session
              </a>
            </>
          ) : (
            <PrimaryButton onClick={onClose}>Close</PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}