import { useEffect, useMemo, useState } from "react";
import { ASSIGNMENTS, USERS } from "@/lib/mock-data";
import { cohortsForStudent } from "@/lib/workshops-store";
import {
  addConductReport,
  CONDUCT_CATEGORIES,
  type ConductCategory,
  type ConductTargetType,
} from "@/lib/conduct-reports-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GhostButton, PrimaryButton } from "@/components/verbo/ui";
import { ShieldAlert } from "lucide-react";

interface Props {
  studentId: string;
  open: boolean;
  onClose: () => void;
}

export function ReportConductModal({ studentId, open, onClose }: Props) {
  const [targetType, setTargetType] = useState<ConductTargetType>("teacher");
  const [targetId, setTargetId] = useState<string>("");
  const [category, setCategory] = useState<ConductCategory | "">("");
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmUnlocked, setConfirmUnlocked] = useState(false);

  useEffect(() => {
    if (!confirming) {
      setConfirmUnlocked(false);
      return;
    }
    const t = setTimeout(() => setConfirmUnlocked(true), 5000);
    return () => clearTimeout(t);
  }, [confirming]);

  // Teachers the student actually has a relationship with:
  // - assigned 1:1 teacher(s) via ASSIGNMENTS
  // - workshop cohort teachers (cohort.teacher_id)
  // Clubs excluded on purpose — no per-student attendee list exists today.
  const teacherOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const a of ASSIGNMENTS) if (a.student_id === studentId) ids.add(a.teacher_id);
    for (const { cohort } of cohortsForStudent(studentId)) {
      if (cohort.teacher_id) ids.add(cohort.teacher_id);
    }
    return USERS.filter((u) => u.role === "teacher" && ids.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentId]);

  const studentOptions = useMemo(
    () => USERS.filter((u) => u.role === "student" && u.id !== studentId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [studentId],
  );

  const reset = () => {
    setTargetType("teacher");
    setTargetId("");
    setCategory("");
    setText("");
    setSubmitted(false);
    setError(null);
    setConfirming(false);
    setConfirmUnlocked(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit =
    !!targetId && !!category && text.trim().length > 0;

  const handleSubmit = () => {
    setError(null);
    if (!canSubmit) {
      setError("Please complete all fields before submitting.");
      return;
    }
    setConfirming(true);
  };

  const handleConfirmSend = () => {
    addConductReport({
      reporterId: studentId,
      targetType,
      targetId,
      category: category as ConductCategory,
      text,
    });
    setConfirming(false);
    setSubmitted(true);
  };

  const options = targetType === "teacher" ? teacherOptions : studentOptions;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="-mx-6 -mt-6 space-y-0 rounded-t-none bg-destructive px-6 py-4 text-destructive-foreground shadow-soft sm:rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-destructive-foreground">
            <ShieldAlert className="h-5 w-5 text-destructive-foreground" />
            <span className="font-bold">Report misconduct</span>
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Thank you. Your report has been sent to the Verbo team for review.
            </p>
            <p className="text-xs text-muted-foreground">
              Remember: the reported person will never see your name.
            </p>
            <DialogFooter>
              <PrimaryButton onClick={handleClose}>Close</PrimaryButton>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="rounded-xl border p-3 text-xs leading-relaxed shadow-soft"
              style={{
                backgroundColor: "rgba(243, 137, 52, 0.08)",
                borderColor: "rgba(243, 137, 52, 0.35)",
                color: "#01304a",
              }}
            >
              This report is <strong>anonymous to the person you are reporting</strong> — they
              will never see your name.
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Report type</label>
              <div className="flex gap-2">
                {(["teacher", "student"] as ConductTargetType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTargetType(t); setTargetId(""); }}
                    className={`flex-1 rounded-full border px-3 py-2 text-sm transition-all duration-200 active:scale-[0.97] ${
                      targetType === t
                        ? "border-transparent bg-[#01304a] text-white shadow-soft"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {t === "teacher" ? "Report a teacher" : "Report a student"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                {targetType === "teacher" ? "Teacher" : "Student"}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  {targetType === "teacher"
                    ? teacherOptions.length === 0
                      ? "No teachers linked to your account"
                      : "Select a teacher"
                    : "Select a student"}
                </option>
                {options.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ConductCategory)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a category</option>
                {CONDUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">Details</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="Describe what happened, when, and any relevant context."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="gap-2">
              <GhostButton onClick={handleClose}>Cancel</GhostButton>
              <PrimaryButton onClick={handleSubmit} disabled={!canSubmit}>
                Send report
              </PrimaryButton>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="-mx-6 -mt-6 space-y-0 bg-destructive px-6 py-4 text-destructive-foreground sm:rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-destructive-foreground">
              <ShieldAlert className="h-5 w-5 text-destructive-foreground" />
              <span className="font-bold">Confirm your report</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed text-foreground">
            <p>
              By confirming, you declare that everything stated in this report is true.
            </p>
            <p className="text-xs text-muted-foreground">
              If it is true, the Verbo team will investigate thoroughly and apply the
              corresponding sanctions. If the report turns out to be false, sanctions will
              also be applied to the person who submitted it.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <GhostButton onClick={() => setConfirming(false)}>Cancel</GhostButton>
            <PrimaryButton onClick={handleConfirmSend} disabled={!confirmUnlocked}>
              {confirmUnlocked ? "Confirm and send" : "Please read carefully…"}
            </PrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
