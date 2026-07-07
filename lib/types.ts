export type AgentId =
  | "daoban"
  | "shouli"
  | "cailiao"
  | "zige"
  | "dangan"
  | "quanxian"
  | "fengkong"
  | "fuhe";

export type AgentDef = {
  id: AgentId;
  dept: string;
  windowNo: string;
  personName: string;
  staffId: string;
  tenureYears: number;
  persona: string;
  duty: string;
  boundary: string;
  canIssue: string[];
};

export type CaseOutcome = "办结" | "不予受理" | "终止办理";

export type CaseEvent =
  | { type: "user_message"; ts: number; agentId: AgentId; text: string }
  | { type: "agent_message"; ts: number; agentId: AgentId; text: string }
  | { type: "internal_memo"; ts: number; from: AgentId; to: AgentId; text: string }
  | { type: "internal_reply"; ts: number; from: AgentId; to: AgentId; text: string }
  | {
      type: "document_issued";
      ts: number;
      agentId: AgentId;
      docName: string;
      content: string;
    }
  | {
      type: "materials_required";
      ts: number;
      agentId: AgentId;
      items: { name: string; source?: string }[];
      note?: string;
    }
  | { type: "referral"; ts: number; from: AgentId; to: AgentId; reason: string }
  | {
      type: "case_closed";
      ts: number;
      agentId: AgentId;
      outcome: CaseOutcome;
      summary: string;
    }
  | { type: "user_abandoned"; ts: number };

export type CaseState = {
  caseId: string;
  matter: string;
  startedAt: number;
  events: CaseEvent[];
  closed: boolean;
};

export type WindowRequest = {
  caseId: string;
  matter: string;
  agentId: AgentId;
  userMessage: string;
  events: CaseEvent[];
};

export type WindowResponse = {
  newEvents: CaseEvent[];
  error?: string;
};

export type ReportRequest = {
  caseId: string;
  matter: string;
  events: CaseEvent[];
};

export type ReportResponse = {
  analysis: string;
  error?: string;
};
