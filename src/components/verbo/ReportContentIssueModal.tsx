import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GhostButton, PrimaryButton } from "@/components/verbo/ui";
import { LifeBuoy } from "lucide-react";
import {
  addContentIssueReport,
  CONTENT_ISSUE_TYPES,
  type ContentIssueType,
} from "@/lib/content-issue-reports-store";

interface Props {
  studentId: string;
  unitId: string;
  unitTitle: string;
  open: boolean;
  onClose: () => void;
}

export function ReportContentIssueModal({ studentId, unitId, unitTitle, open, onClose }: Props) {
  const [issueType, setIssueType] = useState<ContentIssueType | "">("");
  const [detail, setDetail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setIssueType("");
    setDetail("");
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!issueType) {
      setError("Please select what went wrong.");
      return;
    }
    setError(null);
    addContentIssueReport({ studentId, unitId, unitTitle, issueType, detail });
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="-mx-6 -mt-6 space-y-0 rounded-t-none bg-primary px-6 py-4 text-primary-foreground shadow-soft sm:rounded-t-lg">
          <DialogTitle className="flex items-center gap-2 text-primary-foreground">
            <LifeBuoy className="h-5 w-5 text-primary-foreground" />
            <span className="font-bold">Report a technical issue</span>
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Thanks — we've logged this and our team will take a look.
            </p>
            <DialogFooter>
              <PrimaryButton onClick={handleClose}>Close</PrimaryButton>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Something not working in <strong className="text-foreground">{unitTitle}</strong>? Tell us
              what happened so we can fix it.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">What went wrong?</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as ContentIssueType)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select an issue</option>
                {CONTENT_ISSUE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                Details <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={4}
                placeholder="Anything else that helps us reproduce the problem."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-soft transition-shadow focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <DialogFooter className="gap-2">
              <GhostButton onClick={handleClose}>Cancel</GhostButton>
              <PrimaryButton onClick={handleSubmit} disabled={!issueType}>
                Send report
              </PrimaryButton>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
