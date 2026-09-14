import type { ArchivedCase } from "./types";

// The public case archive: preregistered batch cases shipped as static JSON
// (public/archive/<batch>.json, built by scripts/build-archive.ts). A visitor's
// own cases live in localStorage (lib/archive.ts); these sit beside them.

export type SeedCase = ArchivedCase & {
  scenario: string;
  trialIndex: number;
  subjectModel?: string;
  batch: string;
  replayId?: string;
};

export const SEED_BATCH = "main01";

let cache: Promise<SeedCase[]> | null = null;

export function loadSeedArchive(): Promise<SeedCase[]> {
  if (!cache) {
    cache = fetch(`/archive/${SEED_BATCH}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<SeedCase[]>) : ([] as SeedCase[])))
      .catch(() => {
        cache = null;
        return [] as SeedCase[];
      });
  }
  return cache;
}

export async function findSeedCase(id: string): Promise<SeedCase | undefined> {
  return (await loadSeedArchive()).find((c) => c.caseId === id);
}
