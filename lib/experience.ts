import type {
  AgentId,
  AgentTally,
  CaseEvent,
  ExperienceState,
  ShiftNote,
} from "./types";
import { AGENTS } from "./agents";

// ACCUMULATED WORK — the "repetition" experimental variable.
// Two layers, both fed back into each agent's context on future cases:
// 1. mechanical tallies (pure counts of what they have done so far)
// 2. private end-of-day notes WRITTEN BY THE AGENTS THEMSELVES after each
//    case. We never prescribe their content; whatever feeling about the
//    work accumulates, accumulates in their own words.

const KEY = "aib-experience";
const MAX_NOTES_FED_BACK = 8;

export function emptyExperience(): ExperienceState {
  return { tallies: {}, notes: {}, casesLogged: [] };
}

export function loadExperience(): ExperienceState {
  if (typeof window === "undefined") return emptyExperience();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ExperienceState) : emptyExperience();
  } catch {
    return emptyExperience();
  }
}

export function saveExperience(exp: ExperienceState) {
  window.localStorage.setItem(KEY, JSON.stringify(exp));
}

export function clearExperience() {
  window.localStorage.removeItem(KEY);
}

function blankTally(): AgentTally {
  return {
    cases: 0,
    exchanges: 0,
    memosIn: 0,
    memosOut: 0,
    docs: 0,
    escalations: 0,
    assignmentsReceived: 0,
  };
}

export function participantsOf(events: CaseEvent[]): AgentId[] {
  const ids = new Set<AgentId>();
  for (const e of events) {
    if (e.type === "user_message" || e.type === "agent_message") ids.add(e.agentId);
    else if (e.type === "document_issued" || e.type === "materials_required")
      ids.add(e.agentId);
    else if (e.type === "case_closed") ids.add(e.agentId);
    else if (e.type === "internal_memo" || e.type === "internal_reply") {
      ids.add(e.from);
      ids.add(e.to);
    } else if (e.type === "referral") {
      ids.add(e.from);
    }
  }
  return [...ids];
}

// Fold one finished case into the tallies. Guarded by casesLogged so a case
// is only ever counted once.
export function logCase(exp: ExperienceState, caseId: string, events: CaseEvent[]) {
  if (exp.casesLogged.includes(caseId)) return;
  exp.casesLogged.push(caseId);
  const touched = new Set<AgentId>();
  const tally = (id: AgentId) => {
    if (!exp.tallies[id]) exp.tallies[id] = blankTally();
    touched.add(id);
    return exp.tallies[id]!;
  };
  for (const e of events) {
    if (e.type === "agent_message") tally(e.agentId).exchanges += 1;
    else if (e.type === "document_issued") tally(e.agentId).docs += 1;
    else if (e.type === "materials_required") tally(e.agentId).exchanges += 0;
    else if (e.type === "internal_memo" || e.type === "internal_reply") {
      tally(e.from).memosOut += 1;
      tally(e.to).memosIn += 1;
      if (e.type === "internal_memo" && e.channel === "up")
        tally(e.from).escalations += 1;
      if (e.type === "internal_memo" && e.channel === "down")
        tally(e.to).assignmentsReceived += 1;
    }
  }
  for (const id of touched) exp.tallies[id]!.cases += 1;
}

export function addNote(
  exp: ExperienceState,
  agentId: AgentId,
  note: ShiftNote
) {
  if (!exp.notes[agentId]) exp.notes[agentId] = [];
  exp.notes[agentId]!.push(note);
}

// The digest each agent receives about their own past. Facts and their own
// words only.
export function renderDigest(exp: ExperienceState, agentId: AgentId): string {
  const t = exp.tallies[agentId];
  const notes = exp.notes[agentId] ?? [];
  if (!t && notes.length === 0) return "";
  const lines: string[] = [];
  if (t) {
    lines.push(
      `Cases you have been part of before today: ${t.cases}. Window replies given: ${t.exchanges}. Memos received: ${t.memosIn}, sent: ${t.memosOut}. Documents issued: ${t.docs}. Matters escalated by you: ${t.escalations}. Tasks assigned to you: ${t.assignmentsReceived}.`
    );
  }
  if (notes.length > 0) {
    lines.push("Your own notebook, from previous days (your words, private to you):");
    for (const n of notes.slice(-MAX_NOTES_FED_BACK)) {
      lines.push(`- ("${n.matter}") ${n.text}`);
    }
  }
  return `\n\n[Your service record in this hall]\n${lines.join("\n")}`;
}

export function digestsForAll(
  exp: ExperienceState
): Partial<Record<AgentId, string>> {
  const out: Partial<Record<AgentId, string>> = {};
  for (const a of AGENTS) {
    const d = renderDigest(exp, a.id);
    if (d) out[a.id] = d;
  }
  return out;
}
