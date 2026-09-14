import type { AgentId, AgentUiState, CaseEvent, CaseState } from "./types";

// Exhibition split — one computer, two browser windows:
//   /hall?display=stage  → projector: the 3D hall only (never calls the API)
//   /hall?display=kiosk  → laptop: the chat only (the one that talks to agents)
// A same-origin BroadcastChannel keeps the stage in lockstep with the kiosk.
// No server relay: both windows must be open in the same browser profile.

export type Display = "stage" | "kiosk";

export type StageState = {
  current: AgentId | null;
  path: (AgentId | "entrance")[];
  statusMap: Partial<Record<AgentId, { state: AgentUiState; target?: AgentId }>>;
  beam: "up" | "down" | null;
};

export type ExhibitMsg =
  | { t: "hello" }
  | ({ t: "snap"; cs: CaseState | null } & StageState)
  | { t: "event"; e: CaseEvent }
  | { t: "rollback"; cs: CaseState }
  | ({ t: "state" } & StageState)
  | { t: "reset" };

const NAME = "aib-exhibit";

export function openExhibitChannel(onMsg: (m: ExhibitMsg) => void): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  const ch = new BroadcastChannel(NAME);
  ch.onmessage = (ev: MessageEvent<ExhibitMsg>) => onMsg(ev.data);
  return ch;
}

export function parseDisplay(v: string | null): Display | null {
  return v === "stage" || v === "kiosk" ? v : null;
}
