// Technical content issues a student reports from a unit detail view
// (broken PDF, video, audio, exercise, score not saving...).
// Persisted only — no admin inbox is wired yet, same as student-reports-store.ts.

export const CONTENT_ISSUE_TYPES = [
  "PDF won't download",
  "Video won't play",
  "Audio won't record",
  "Exercise won't load",
  "Score not saving",
  "Other",
] as const;

export type ContentIssueType = (typeof CONTENT_ISSUE_TYPES)[number];

export interface ContentIssueReport {
  id: string;
  studentId: string;
  unitId: string;
  unitTitle: string;
  issueType: ContentIssueType;
  detail: string;
  createdAt: string; // ISO
}

export const CONTENT_ISSUE_KEY = "verbo:content-issue-reports";
export const CONTENT_ISSUE_EVENT = "verbo:content-issue-reports-updated";

function readAll(): ContentIssueReport[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CONTENT_ISSUE_KEY) || "[]") as ContentIssueReport[]; }
  catch { return []; }
}

function writeAll(list: ContentIssueReport[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONTENT_ISSUE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(CONTENT_ISSUE_EVENT));
  } catch { /* noop */ }
}

export function addContentIssueReport(input: {
  studentId: string;
  unitId: string;
  unitTitle: string;
  issueType: ContentIssueType;
  detail?: string;
}): ContentIssueReport {
  const report: ContentIssueReport = {
    id: `cir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId: input.studentId,
    unitId: input.unitId,
    unitTitle: input.unitTitle,
    issueType: input.issueType,
    detail: (input.detail ?? "").trim(),
    createdAt: new Date().toISOString(),
  };
  writeAll([report, ...readAll()]);
  return report;
}

export function loadContentIssueReports(): ContentIssueReport[] {
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function contentIssuesForUnit(unitId: string): ContentIssueReport[] {
  return loadContentIssueReports().filter((r) => r.unitId === unitId);
}
