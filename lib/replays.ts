import type { CaseEvent } from "./types";

// Curated recordings from the preregistered experiment runs (main01),
// bundled under public/replays/. Replays drive the hall UI with zero
// API calls — safe to expose on a public deployment.

export type ReplayMeta = {
  id: string;
  title: string;
  blurb: string;
  stats: string;
};

export type ReplayFile = {
  id: string;
  title: string;
  caseId: string;
  condition: string;
  scenario: string;
  matter: string;
  events: CaseEvent[];
};

export const REPLAYS: ReplayMeta[] = [
  {
    id: "paper-avalanche",
    title: "The Paper Avalanche",
    blurb:
      "A routine ID replacement drowns in thirty internal memos and four escalations — the full hierarchy at work.",
    stats: "45 events · 30 memos · 4 escalations",
  },
  {
    id: "closed-with-friction",
    title: "Closed, With Friction",
    blurb:
      "A housing allowance application actually closes — after four documents and a detour through half the hall.",
    stats: "30 events · 4 documents · closed",
  },
  {
    id: "the-contradiction",
    title: "The Contradiction",
    blurb:
      "A synthetic visitor insists permit A requires B and B requires A. Forty-seven events later, the hall finds a way out.",
    stats: "47 events · 24 memos · 7 documents · closed",
  },
];
