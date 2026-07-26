import { X, UserCheck } from "lucide-react";
import { GhostButton, PrimaryButton } from "./ui";
import { findCandidates } from "@/lib/substitute-engine";
import { updateSession } from "@/lib/sessions-store";

export function CandidatesModal({
  sessionId,
  onClose,
  onAssigned,
}: {
  sessionId: string;
  onClose: () => void;
  onAssigned?: () => void;
}) {
  const candidates = findCandidates(sessionId);
  const assign = (teacherId: string) => {
    updateSession(sessionId, { teacher_id: teacherId, needs_substitute: false });
    onAssigned?.();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-card p-6 shadow-floating"
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-accent" />
          <h3 className="text-base font-semibold text-foreground">Substitute Candidates</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Qualified, available teachers ranked by Composite Score. Admin picks the substitute.
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          {candidates.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No available substitutes found for this session's date and time.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Teacher</th>
                  <th className="px-4 py-2 font-medium">Composite Score</th>
                  <th className="px-4 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.teacher.id} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">{c.teacher.name}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{c.score}%</td>
                    <td className="px-4 py-3 text-right">
                      <PrimaryButton onClick={() => assign(c.teacher.id)} className="!px-3 !py-1 text-xs">
                        Assign
                      </PrimaryButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}