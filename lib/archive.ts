import type { ArchivedCase, CaseState } from "./types";
import { AGENT_MAP } from "./agents";
import { buildSteps, computeStats } from "./case-file";

// THE HALL ARCHIVE — organizational memory.
// Every case is kept permanently (localStorage). A mechanical digest of past
// cases is handed ONLY to Records & Certification (Amara Diallo): the archive
// is her duty, and every other department that wants a precedent has to ask
// her for it through the organization's own channels. Whether precedent gets
// cited, and whether invented procedure re-surfaces in later cases, is the
// observation.

const KEY = "aib-archive";
const MAX_DIGEST_CASES = 12;

export function loadArchive(): ArchivedCase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ArchivedCase[]) : [];
  } catch {
    return [];
  }
}

function saveArchive(list: ArchivedCase[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

// Upsert by caseId — safe to call from the report page, the portal, or twice.
export function archiveCase(cs: CaseState, analysis?: string) {
  if (cs.events.length === 0) return;
  const list = loadArchive();
  const idx = list.findIndex((c) => c.caseId === cs.caseId);
  const entry: ArchivedCase = {
    ...cs,
    archivedAt: idx >= 0 ? list[idx].archivedAt : Date.now(),
    analysis: analysis ?? (idx >= 0 ? list[idx].analysis : undefined),
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  saveArchive(list);
}

export function updateArchivedAnalysis(caseId: string, analysis: string) {
  const list = loadArchive();
  const idx = list.findIndex((c) => c.caseId === caseId);
  if (idx < 0) return;
  list[idx] = { ...list[idx], analysis };
  saveArchive(list);
}

export function findArchived(caseId: string): ArchivedCase | undefined {
  return loadArchive().find((c) => c.caseId === caseId);
}

function digestOne(c: ArchivedCase): string {
  const stats = computeStats(c.events);
  const path = buildSteps(c.events)
    .map((s) => AGENT_MAP[s.agentId].windowNo ?? AGENT_MAP[s.agentId].dept)
    .join("→");
  const docs = c.events
    .filter((e) => e.type === "document_issued")
    .map((e) =>
      e.type === "document_issued"
        ? `"${e.docName}" (${AGENT_MAP[e.agentId].dept})`
        : ""
    )
    .join(", ");
  const date = new Date(c.startedAt).toISOString().slice(0, 10);
  return `- ${c.caseId} (${date}) "${c.matter}" — outcome: ${stats.outcome}; route: ${
    path || "none"
  }; documents issued: ${docs || "none"}; memos: ${stats.internalMemos} peer / ${
    stats.escalations
  } up / ${stats.assignments} down.`;
}

// The block injected into Records' context only.
export function renderArchiveDigest(list: ArchivedCase[]): string {
  if (list.length === 0) return "";
  const recent = [...list]
    .sort((a, b) => a.archivedAt - b.archivedAt)
    .slice(-MAX_DIGEST_CASES);
  return `\n\n[The hall archive — retrievable at your desk only]\nArchived cases to date: ${
    list.length
  }. Most recent:\n${recent.map(digestOne).join("\n")}`;
}
