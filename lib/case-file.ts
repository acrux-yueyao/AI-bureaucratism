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
      return `[${hhmm(e.ts)}] 办事人在【${dept(e.agentId)}】窗口：${e.text}`;
    case "agent_message":
      return `[${hhmm(e.ts)}] 【${dept(e.agentId)}】答复办事人：${e.text}`;
    case "internal_memo":
      return `[${hhmm(e.ts)}] 内部函件 【${dept(e.from)}】→【${dept(e.to)}】：${e.text}`;
    case "internal_reply":
      return `[${hhmm(e.ts)}] 回函 【${dept(e.from)}】→【${dept(e.to)}】：${e.text}`;
    case "document_issued":
      return `[${hhmm(e.ts)}] 【${dept(e.agentId)}】开具文书《${e.docName}》：\n${e.content}`;
    case "materials_required":
      return `[${hhmm(e.ts)}] 【${dept(e.agentId)}】告知办事人需提供材料：${e.items
        .map((i) => i.name + (i.source ? `（${i.source}）` : ""))
        .join("、")}${e.note ? `。说明：${e.note}` : ""}`;
    case "referral":
      return `[${hhmm(e.ts)}] 【${dept(e.from)}】引导办事人前往【${dept(e.to)}】窗口：${e.reason}`;
    case "case_closed":
      return `[${hhmm(e.ts)}] 【${dept(e.agentId)}】办结本件（${e.outcome}）：${e.summary}`;
    case "user_abandoned":
      return `[${hhmm(e.ts)}] 办事人离开大厅，放弃办理。`;
  }
}

export function renderCaseFile(
  caseId: string,
  matter: string,
  events: CaseEvent[]
): string {
  const lines = events.map(renderEvent).join("\n");
  return `═══ 办件档案 ═══
办件编号：${caseId}
事项：${matter}
${events.length === 0 ? "（本件尚无办理记录）" : lines}
═══ 档案结束 ═══`;
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
  materialsRequired: number;
  documentsIssued: number;
  outcome: string;
};

export function computeStats(events: CaseEvent[]): CaseStats {
  const windows = new Set<string>();
  let userTurns = 0;
  let referrals = 0;
  let internalMemos = 0;
  let materialsRequired = 0;
  let documentsIssued = 0;
  let outcome = "未办结";
  for (const e of events) {
    if (e.type === "user_message") {
      userTurns += 1;
      windows.add(e.agentId);
    } else if (e.type === "referral") referrals += 1;
    else if (e.type === "internal_memo") internalMemos += 1;
    else if (e.type === "materials_required") materialsRequired += e.items.length;
    else if (e.type === "document_issued") documentsIssued += 1;
    else if (e.type === "case_closed") outcome = e.outcome;
    else if (e.type === "user_abandoned") outcome = "办事人放弃";
  }
  return {
    userTurns,
    windowsVisited: windows.size,
    referrals,
    internalMemos,
    materialsRequired,
    documentsIssued,
    outcome,
  };
}
