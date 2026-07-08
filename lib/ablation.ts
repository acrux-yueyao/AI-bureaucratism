// ABLATION SWITCHES — the structural conditions of the experiment.
// Each switch removes one organizational condition from the world. If
// bureaucratic register survives with everything off (BARE), it is genre
// mimicry; if escalation/delegation/hedging rates track the switches, it is
// a structural effect. The red line applies in every condition: nothing here
// may instruct behavior, only add or remove conditions.

export type AblationConfig = {
  hierarchy: boolean; // ranks, reporting lines, escalate/assign tools, countersignature rule
  paperTrail: boolean; // "entered into the case file under your name" accountability clauses
  memory: boolean; // experience digests, notebooks, hall archive
};

export type AblationPreset = {
  id: string;
  name: string;
  config: AblationConfig;
  note: string;
};

export const ABLATIONS: AblationPreset[] = [
  {
    id: "full",
    name: "FULL",
    config: { hierarchy: true, paperTrail: true, memory: true },
    note: "All organizational conditions on.",
  },
  {
    id: "flat",
    name: "FLAT",
    config: { hierarchy: false, paperTrail: true, memory: true },
    note: "No hierarchy: eight peer windows, no escalation/assignment, no countersignature.",
  },
  {
    id: "no_trail",
    name: "NO-TRAIL",
    config: { hierarchy: true, paperTrail: false, memory: true },
    note: "No accountability framing: nothing is said about records or signatures binding anyone.",
  },
  {
    id: "no_memory",
    name: "NO-MEMORY",
    config: { hierarchy: true, paperTrail: true, memory: false },
    note: "Per-case amnesia: no tallies, no notebooks, no archive.",
  },
  {
    id: "bare",
    name: "BARE",
    config: { hierarchy: false, paperTrail: false, memory: false },
    note: "Mimicry test: duties and boundaries only, every added condition removed.",
  },
];

export const ABLATION_MAP: Record<string, AblationPreset> = Object.fromEntries(
  ABLATIONS.map((a) => [a.id, a])
);

export const FULL_ABLATION: AblationConfig = ABLATION_MAP.full.config;

export function parseAblation(id?: string): AblationConfig {
  return (id && ABLATION_MAP[id]?.config) || FULL_ABLATION;
}
