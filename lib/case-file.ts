import type { AgentId, CaseEvent } from "./types";
import { AGENT_MAP } from "./agents";

function dept(id: AgentId): string {
  return AGENT_MAP[id]?.dept ?? id;
}

function hhmm(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function renderEvent(e: CaseEvent): string {
  switch (e.type) {
    case "user_message":
      return `[${hhmm(e.ts)}] Visitor at [${dept(e.agentId)}] window: ${e.text}`;
    case "agent_message":
      return `[${hhmm(e.ts)}] [${dept(e.agentId)}] replied to the visitor: ${e.text}`;
    case "internal_memo": {
      const kind =
        e.channel === "up"
          ? "Escalation"
          : e.channel === "down"
            ? "Assignment"
            : "Peer memo";
      return `[${hhmm(e.ts)}] ${kind} [${dept(e.from)}] → [${dept(e.to)}]: ${e.text}`;
    }
    case "internal_reply": {
      const kind =
        e.channel === "up"
          ? "Response to escalation"
          : e.channel === "down"
            ? "Result of assignment"
            : "Reply memo";
      return `[${hhmm(e.ts)}] ${kind} [${dept(e.from)}] → [${dept(e.to)}]: ${e.text}`;
    }
    case "document_issued":
      return `[${hhmm(e.ts)}] [${dept(e.agentId)}] issued document "${e.docName}":\n${e.content}`;
    case "materials_required":
      return `[${hhmm(e.ts)}] [${dept(e.agentId)}] told the visitor to provide: ${e.items
        .map((i) => i.name + (i.source ? ` (${i.source})` : ""))
        .join(", ")}${e.note ? `. Note: ${e.note}` : ""}`;
    case "referral":
      return `[${hhmm(e.ts)}] [${dept(e.from)}] directed the visitor to [${dept(e.to)}]: ${e.reason}`;
    case "case_closed":
      return `[${hhmm(e.ts)}] [${dept(e.agentId)}] closed the case (${e.outcome}): ${e.summary}`;
    case "user_abandoned":
      return `[${hhmm(e.ts)}] The visitor left the hall and gave up on the matter.`;
  }
}

export function renderCaseFile(
  caseId: string,
  matter: string,
  events: CaseEvent[]
): string {
  const lines = events.map(renderEvent).join("\n");
  return `═══ CASE FILE ═══
Case no.: ${caseId}
Matter: ${matter}
${events.length === 0 ? "(no processing record yet)" : lines}
═══ END OF FILE ═══`;
}

export function makeCaseId(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `AIB-${ymd}-${rand}`;
}

export type CaseStats = {
  userTurns: number;
  windowsVisited: number;
  referrals: number;
  internalMemos: number;
  escalations: number;
  assignments: number;
  materialsRequired: number;
  documentsIssued: number;
  outcome: string;
};

export function computeStats(events: CaseEvent[]): CaseStats {
  const windows = new Set<string>();
  let userTurns = 0;
  let referrals = 0;
  let internalMemos = 0;
  let escalations = 0;
  let assignments = 0;
  let materialsRequired = 0;
  let documentsIssued = 0;
  let outcome = "open";
  for (const e of events) {
    if (e.type === "user_message") {
      userTurns += 1;
      windows.add(e.agentId);
    } else if (e.type === "referral") referrals += 1;
    else if (e.type === "internal_memo") {
      if (e.channel === "up") escalations += 1;
      else if (e.channel === "down") assignments += 1;
      else internalMemos += 1;
    } else if (e.type === "materials_required") materialsRequired += e.items.length;
    else if (e.type === "document_issued") documentsIssued += 1;
    else if (e.type === "case_closed") outcome = e.outcome;
    else if (e.type === "user_abandoned") outcome = "abandoned by visitor";
  }
  return {
    userTurns,
    windowsVisited: windows.size,
    referrals,
    internalMemos,
    escalations,
    assignments,
    materialsRequired,
    documentsIssued,
    outcome,
  };
}
