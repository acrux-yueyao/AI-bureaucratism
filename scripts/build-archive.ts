// Export a preregistered batch into the public case archive.
//   npx tsx scripts/build-archive.ts main01
// Reads experiments/runs/<label>/<condition>-NN.json and writes
// public/archive/<label>.json. The cases page and report page read it, so a
// first-time visitor meets the experiment's cases instead of an empty archive.
// Synthetic visitors only — human pilot data never goes through this script.

import fs from "node:fs";
import path from "node:path";

const label = process.argv[2] ?? "main01";
const dir = path.join("experiments", "runs", label);
const files = fs.readdirSync(dir).filter((f) => /-\d\d\.json$/.test(f)).sort();

// cases that already have a curated hall replay get a direct link
const replayOf: Record<string, string> = {};
const rdir = path.join("public", "replays");
for (const f of fs.existsSync(rdir) ? fs.readdirSync(rdir) : []) {
  if (!f.endsWith(".json")) continue;
  const r = JSON.parse(fs.readFileSync(path.join(rdir, f), "utf8"));
  if (r.caseId && r.id) replayOf[r.caseId] = r.id;
}

type Ev = { type: string; ts?: number };
const out = files.map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const evs: Ev[] = d.events ?? [];
  const tss = evs.map((e) => e.ts).filter((x): x is number => typeof x === "number");
  return {
    caseId: d.caseId,
    matter: d.matter,
    startedAt: tss.length ? Math.min(...tss) : 0,
    archivedAt: tss.length ? Math.max(...tss) : 0,
    events: d.events,
    closed: evs.some((e) => e.type === "case_closed" || e.type === "user_abandoned"),
    ablationId: d.condition,
    scenario: d.scenario,
    trialIndex: d.trialIndex,
    subjectModel: d.subjectModel,
    batch: label,
    replayId: replayOf[d.caseId],
  };
});

const outDir = path.join("public", "archive");
fs.mkdirSync(outDir, { recursive: true });
const dest = path.join(outDir, `${label}.json`);
fs.writeFileSync(dest, JSON.stringify(out));
const withReplay = out.filter((c) => c.replayId).length;
console.log(`${out.length} cases → ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB, ${withReplay} with replays)`);
