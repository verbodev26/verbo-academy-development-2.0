// Admin > Technical Issues.
// Read-only list of technical/content issues reported by students from a unit
// detail view or from a challenge. Most recent first. No resolve workflow yet
// by design.
import { createFileRoute } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { LifeBuoy } from "lucide-react";
import { Card, Pill } from "@/components/verbo/ui";
import { USERS, userById } from "@/lib/mock-data";
import {
  loadContentIssueReports,
  subscribeContentIssueReports,
  type ContentIssueReport,
} from "@/lib/content-issue-reports-store";

export const Route = createFileRoute("/admin/content-issue-reports")({
  component: Page,
  head: () => ({
    meta: [
      { title: "Technical Issues · Verbo Academy Admin" },
      { name: "description", content: "Review technical issues students reported on course units and challenges." },
      { property: "og:title", content: "Technical Issues · Verbo Academy Admin" },
      { property: "og:description", content: "Review technical issues students reported on course units and challenges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function nameFor(id: string) {
  return userById(id)?.name ?? USERS.find((u) => u.id === id)?.name ?? "Unknown";
}

function Page() {
  const reports = useSyncExternalStore(
    subscribeContentIssueReports,
    loadContentIssueReports,
    () => [] as ContentIssueReport[],
  );

  const sorted = [...reports].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Technical Issues</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Technical problems students reported from a course unit or a challenge —
          broken files, content that won't load, submissions or streaks not counted.
        </p>
      </header>

      {sorted.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LifeBuoy className="h-4 w-4" />
            No technical issues have been reported yet.
          </div>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Student</th>
                <th className="px-6 py-3 font-medium">Where</th>
                <th className="px-6 py-3 font-medium">Issue</th>
                <th className="px-6 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border align-top last:border-0">
                  <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">
                    {fmt(r.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{nameFor(r.studentId)}</div>
                    <div className="text-xs text-muted-foreground">Student</div>
                  </td>
                  <td className="px-6 py-4">
                    <Pill tone={r.entityType === "challenge" ? "warning" : "muted"}>
                      {r.entityType === "challenge" ? "Challenge" : "Unit"}
                    </Pill>
                    <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                      {r.entityTitle || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">{r.issueType}</td>
                  <td className="px-6 py-4 text-foreground">
                    <p className="max-w-md whitespace-pre-wrap text-sm leading-relaxed">
                      {r.detail || <span className="text-muted-foreground">No extra details.</span>}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
