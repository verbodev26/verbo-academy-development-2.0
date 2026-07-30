// Technical content issues a student reports from a unit detail view or from a
// challenge (broken PDF, video, audio, exercise, score not saving, challenge
// that won't open, evidence that won't upload...). Surfaced to admins in
// Admin > Technical Issues.

export const UNIT_ISSUE_TYPES = [
  "PDF won't download",
  "Video won't play",
  "Audio won't record",
  "Exercise won't load",
  "Score not saving",
  "Other",
] as const;

export const CHALLENGE_ISSUE_TYPES = [
  "The challenge won't open",
  "I can't upload my evidence (submission link)",
  "My completed challenge wasn't counted",
  "My streak didn't update",
  "Other",
] as const;

export type ContentIssueEntityType = "unit" | "challenge";

export type ContentIssueType =
  | (typeof UNIT_ISSUE_TYPES)[number]
  | (typeof CHALLENGE_ISSUE_TYPES)[number];

export interface ContentIssueReport {
  id: string;
  studentId: string;
  entityType: ContentIssueEntityType;
  entityId: string;
  entityTitle: string;
  issueType: ContentIssueType;
  detail: string;
  createdAt: string; // ISO
}

export const CONTENT_ISSUE_KEY = "verbo:content-issue-reports";
export const CONTENT_ISSUE_EVENT = "verbo:content-issue-reports-updated";

type LegacyReport = ContentIssueReport & { unitId?: string; unitTitle?: string };

/** Legacy records predate entityType/entityId/entityTitle — they were always units. */
function normalize(r: LegacyReport): ContentIssueReport {
  return {
    ...r,
    entityType: r.entityType ?? "unit",
    entityId: r.entityId ?? r.unitId ?? "",
    entityTitle: r.entityTitle ?? r.unitTitle ?? "",
  };
}

function readAll(): ContentIssueReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CONTENT_ISSUE_KEY) || "[]") as LegacyReport[];
    return raw.map(normalize);
  } catch { return []; }
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
  entityType: ContentIssueEntityType;
  entityId: string;
  entityTitle: string;
  issueType: ContentIssueType;
  detail?: string;
}): ContentIssueReport {
  const report: ContentIssueReport = {
    id: `cir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    studentId: input.studentId,
    entityType: input.entityType,
    entityId: input.entityId,
    entityTitle: input.entityTitle,
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
  return loadContentIssueReports().filter(
    (r) => r.entityType === "unit" && r.entityId === unitId,
  );
}

export function subscribeContentIssueReports(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => { if (e.key === CONTENT_ISSUE_KEY) cb(); };
  window.addEventListener(CONTENT_ISSUE_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONTENT_ISSUE_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
