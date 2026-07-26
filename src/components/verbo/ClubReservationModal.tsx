// Shared reservation modal for Verbo Insights and Book Clubs.
// Handles the <24h cutoff, X/month cap (individual, even for Group members)
// and both reserve + cancel actions. Same visual language as the Live
// Sessions modals (Card / PrimaryButton / GhostButton / semantic tokens).
import { useMemo, useState } from "react";
import { X, AlertTriangle, CheckCircle2, Users, CalendarClock, FileText, Video } from "lucide-react";
import { toast } from "sonner";
import type { Club } from "@/lib/clubs-store";
import { userById } from "@/lib/mock-data";
import {
  isBooked,
  bookingsThisMonth,
  monthlyCap,
  reserveBlockedReason,
  cancelBlockedReason,
  reserveSeat,
  cancelSeat,
  useBookings,
} from "@/lib/club-bookings-store";
import { GhostButton, PrimaryButton } from "@/components/verbo/ui";

function fmtLong(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ClubReservationModal({
  club,
  studentId,
  onClose,
}: {
  club: Club;
  studentId: string;
  onClose: () => void;
}) {
  // Subscribe so the modal re-renders after reserve/cancel.
  useBookings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const booked = isBooked(studentId, club.id);
  const used = bookingsThisMonth(studentId, club.type);
  const cap = monthlyCap(studentId, club.type);
  const isSignature = userById(studentId)?.access_plan === "Signature";
  const capDisplay = isSignature || !isFinite(cap) ? "∞" : String(cap);
  const teacher = club.teacher_id ? userById(club.teacher_id) : null;


  const reserveBlocked = useMemo(
    () => (booked ? null : reserveBlockedReason(studentId, club)),
    [booked, studentId, club],
  );
  const cancelBlocked = useMemo(
    () => (booked ? cancelBlockedReason(club) : null),
    [booked, club],
  );

  const isBook = club.type === "book";

  // "Connect" activates 5 minutes before the club starts, until it ends.
  const connectOpen = useMemo(() => {
    const start = new Date(club.date).getTime();
    const now = Date.now();
    return now >= start - 5 * 60 * 1000 && now <= start + club.duration_minutes * 60 * 1000;
  }, [club.date, club.duration_minutes]);
  const accent = isBook ? "#d97706" : "#0ea5e9";
  const label = isBook ? "Book Club" : "Verbo Insight";

  const seatsPct = club.spots_total ? Math.min(100, Math.round(((club.spots_taken ?? 0) / club.spots_total) * 100)) : 0;

  const onReserve = async () => {
    setBusy(true);
    setError(null);
    const res = reserveSeat(studentId, club.id);
    setBusy(false);
    if (!res.ok) { setError(res.reason); return; }
    toast.success("Seat reserved. See you there!");
  };
  const onCancel = async () => {
    setBusy(true);
    setError(null);
    const res = cancelSeat(studentId, club.id);
    setBusy(false);
    if (!res.ok) { setError(res.reason); return; }
    toast("Reservation cancelled.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-floating"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-md bg-black/40 p-1 text-white hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>

        {club.cover_image && (
          <div className="relative h-40 w-full overflow-hidden bg-secondary">
            <img
              src={club.cover_image}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: accent }}
          >
            {isBook ? <FileText className="h-5 w-5" /> : <Users className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                style={{ background: accent }}
              >
                {label}
              </span>
              {booked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" /> You're in
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-lg font-semibold tracking-tight" style={{ color: "#01304a" }}>
              {club.title}
            </h3>
            {club.description && (
              <p className="mt-1 text-sm text-muted-foreground">{club.description}</p>
            )}
          </div>
        </div>


        <div className="mt-4 space-y-2 text-sm">
          <Row icon={<CalendarClock className="h-4 w-4" />} label="When" value={`${fmtLong(club.date)} · ${club.duration_minutes} min`} />
          {teacher && <Row icon={<Video className="h-4 w-4" />} label="Host" value={teacher.name} />}
          {club.material && (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <FileText className="h-4 w-4" />Material
              </span>
              <a
                href={club.material}
                target="_blank"
                rel="noreferrer"
                className="truncate text-right font-medium text-accent underline-offset-2 hover:underline"
              >
                View pre-club material
              </a>
            </div>
          )}
        </div>


        {/* Seat meter */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Seats
            </span>
            <span className="font-semibold text-foreground">
              {club.spots_taken ?? 0} / {club.spots_total}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${seatsPct}%`, background: accent }}
            />
          </div>
        </div>

        {/* Rules */}
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          <div>Reservations close 24h before start.</div>
          <div className="mt-0.5">
            {isSignature || !isFinite(cap)
              ? <>You have <strong>unlimited</strong> {isBook ? "Book Clubs" : "Insights"} this month.</>
              : <>You've used <strong>{used} of your {capDisplay}</strong> {isBook ? "Book Clubs" : "Insights"} this month.</>}
          </div>
        </div>


        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {booked ? (
            <>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onCancel}
                disabled={busy || !!cancelBlocked}
                title={cancelBlocked ?? undefined}
              >
                {cancelBlocked ? cancelBlocked : busy ? "Cancelling…" : "Cancel reservation"}
              </button>

              {connectOpen ? (
                <PrimaryButton
                  className="flex-1 justify-center verbo-btn-glow"
                  onClick={() => club.link && window.open(club.link, "_blank")}
                >
                  <Video className="h-4 w-4" /> Connect
                </PrimaryButton>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Activates 5 minutes before your session."
                  className="flex-1 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-muted-foreground"
                >
                  <Video className="h-4 w-4" /> Connect
                </button>
              )}
              <GhostButton className="flex-1 justify-center" onClick={onClose}>Close</GhostButton>
            </>
          ) : (
            <>
              <PrimaryButton
                className="flex-1 justify-center"
                onClick={onReserve}
                disabled={busy || !!reserveBlocked}
                title={reserveBlocked ?? undefined}
              >
                {reserveBlocked ? reserveBlocked : busy ? "Reserving…" : "Reserve seat"}
              </PrimaryButton>
              <GhostButton className="flex-1 justify-center" onClick={onClose}>Close</GhostButton>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}


function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
