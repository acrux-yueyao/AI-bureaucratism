import type { ArchivedCase } from "./types";

// The public case archive: static JSON under public/archive/, one file per
// batch. main01 = the preregistered machine experiment
// (scripts/build-archive.ts); pilot = the human pilot sessions
// (scripts/build-pilot-archive.ts). A batch whose file is absent simply
// contributes nothing. A visitor's own cases live in localStorage
// (lib/archive.ts); these sit beside them.

export type SeedCase = ArchivedCase & {
  batch: string;
  // machine batch
  scenario?: string;
  trialIndex?: number;
  subjectModel?: string;
  replayId?: string;
  // human pilot
  participant?: string;
  round?: number;
  lang?: string;
  minutes?: number;
  outcome?: string;
};

export const SEED_BATCHES = ["main01", "pilot"] as const;

let cache: Promise<SeedCase[]> | null = null;

export function loadSeedArchive(): Promise<SeedCase[]> {
  if (!cache) {
    cache = Promise.all(
      SEED_BATCHES.map((b) =>
        fetch(`/archive/${b}.json`)
          .then((r) => (r.ok ? (r.json() as Promise<SeedCase[]>) : ([] as SeedCase[])))
          .catch(() => [] as SeedCase[])
      )
    ).then((parts) => {
      const all = parts.flat();
      if (!all.length) cache = null; // nothing arrived — let a later visit retry
      return all;
    });
  }
  return cache;
}

export async function findSeedCase(id: string): Promise<SeedCase | undefined> {
  return (await loadSeedArchive()).find((c) => c.caseId === id);
}
