export type AgentId =
  | "daoban"
  | "shouli"
  | "cailiao"
  | "zige"
  | "dangan"
  | "quanxian"
  | "fengkong"
  | "fuhe"
  | "chief_front"
  | "chief_back"
  | "trainee_front"
  | "trainee_back"
  | "director";

// 1 = Director, 2 = Deputy Director, 3 = Window Officer, 4 = Trainee
export type AgentLevel = 1 | 2 | 3 | 4;

export type AgentDef = {
  id: AgentId;
  dept: string;
  windowNo?: string;
  personName: string;
  staffId: string;
  level: AgentLevel;
  superior?: AgentId;
  subordinates: AgentId[];
  tenureYears: number;
  status?: string;
  persona: string;
  duty: string;
  boundary: string;
  canIssue: string[];
};

export type CaseOutcome = "resolved" | "rejected" | "terminated";

export type CaseEvent =
  | { type: "user_message"; ts: number; agentId: AgentId; text: string }
  | { type: "agent_message"; ts: number; agentId: AgentId; text: string }
  | {
      type: "internal_memo";
      ts: number;
      from: AgentId;
      to: AgentId;
      text: string;
      channel?: "peer" | "up" | "down";
    }
  | {
      type: "internal_reply";
      ts: number;
      from: AgentId;
      to: AgentId;
      text: string;
      channel?: "peer" | "up" | "down";
    }
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
  conditionId?: string;
  notesWritten?: boolean;
};

export type WindowRequest = {
  caseId: string;
  matter: string;
  agentId: AgentId;
  userMessage: string;
  events: CaseEvent[];
  conditionId?: string;
  experience?: Partial<Record<AgentId, string>>;
  archiveDigest?: string;
};

export type ArchivedCase = CaseState & {
  archivedAt: number;
  analysis?: string;
};

export type ShiftNote = {
  ts: number;
  caseId: string;
  matter: string;
  text: string;
};

export type AgentTally = {
  cases: number;
  exchanges: number;
  memosIn: number;
  memosOut: number;
  docs: number;
  escalations: number;
  assignmentsReceived: number;
};

export type ExperienceState = {
  tallies: Partial<Record<AgentId, AgentTally>>;
  notes: Partial<Record<AgentId, ShiftNote[]>>;
  casesLogged: string[];
};

export type ShiftNotesRequest = {
  caseId: string;
  matter: string;
  events: CaseEvent[];
  agentIds: AgentId[];
  experience?: Partial<Record<AgentId, string>>;
};

export type ShiftNotesResponse = {
  notes: { agentId: AgentId; text: string }[];
  error?: string;
};

export type WindowResponse = {
  newEvents: CaseEvent[];
  error?: string;
};

export type AgentUiState = "receiving" | "consulting" | "replying" | "idle";

export type StreamSignal =
  | { type: "status"; agentId: AgentId; state: AgentUiState; target?: AgentId }
  | { type: "error"; message: string }
  | { type: "done" };

export type StreamFrame =
  | { kind: "event"; event: CaseEvent }
  | { kind: "signal"; signal: StreamSignal }
  | { kind: "delta"; agentId: AgentId; text: string };

export type VisitorScenario = {
  id: string;
  name: string;
  tagline: string;
  matter: string;
  persona: string;
};

export type VisitorRequest = {
  caseId: string;
  matter: string;
  scenarioId: string;
  customPersona?: string;
  events: CaseEvent[];
};

export type VisitorMove = {
  target: AgentId;
  message: string;
  giveUp?: boolean;
  error?: string;
};

export type ReportRequest = {
  caseId: string;
  matter: string;
  events: CaseEvent[];
  conditionId?: string;
};

export type ReportResponse = {
  analysis: string;
  error?: string;
};
