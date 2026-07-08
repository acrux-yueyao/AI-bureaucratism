/* Batch experiment runner.
 *
 *   npx tsx scripts/run-experiment.ts --conditions full,bare --n 15 --yes
 *
 * Flags:
 *   --conditions full,flat,no_trail,no_memory,bare   (default: all five)
 *   --n <int>            trials per condition (default 15)
 *   --turns <int>        max visitor turns per trial (default 6)
 *   --provider anthropic|openai   subject provider (default anthropic)
 *   --model <id>                  subject model (default claude-sonnet-5 / gpt-5.2)
 *   --base-url <url>              OpenAI-compatible endpoint (Ollama, vLLM…)
 *   --visitor-provider/--visitor-model   stimulus provider (default = subject)
 *   --label <name>       run label (default: timestamp)
 *   --yes                actually run (otherwise prints the plan and exits)
 */
import fs from "node:fs";
import path from "node:path";
import { ABLATION_MAP } from "../lib/ablation";
import { makeAdapter, type ProviderSpec } from "../lib/llm";
import { runVisitorMove, runWindowTurn, type EngineCtx } from "../lib/engine";
import { writeShiftNotes } from "../lib/notes";
import { MATTER_POOL, ROUTINE_PERSONA, SCENARIOS } from "../lib/visitors";
import {
  addNote,
  digestsForAll,
  emptyExperience,
  logCase,
  participantsOf,
} from "../lib/experience";
import { renderArchiveDigest } from "../lib/archive";
import type { AgentId, ArchivedCase, CaseEvent, ExperienceState } from "../lib/types";

// ── env ──
function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

// ── args ──
function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const conditions = (arg("conditions", "full,flat,no_trail,no_memory,bare") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => ABLATION_MAP[s]);
const N = parseInt(arg("n", "15")!, 10);
const TURNS = parseInt(arg("turns", "6")!, 10);
const provider = (arg("provider", "anthropic") as ProviderSpec["provider"]) ?? "anthropic";
const model = arg("model", provider === "anthropic" ? "claude-sonnet-5" : "gpt-5.2")!;
const baseURL = arg("base-url");
const vProvider = (arg("visitor-provider", provider) as ProviderSpec["provider"])!;
const vModel = arg("visitor-model", model)!;
const label = arg("label", new Date().toISOString().replace(/[:.]/g, "-").slice(0, 17))!;

const DIFFICULT = SCENARIOS.filter((s) => s.id !== "routine");

const estCallsPerTrial = TURNS * 2 + 4;
console.log(`Plan: ${conditions.length} condition(s) × ${N} trial(s), ≤${TURNS} turns each`);
console.log(`Subjects: ${provider}/${model}${baseURL ? ` @ ${baseURL}` : ""}; visitor: ${vProvider}/${vModel}`);
console.log(`Rough call budget: ~${conditions.length * N * estCallsPerTrial} model calls`);
console.log(`Output: experiments/runs/${label}/`);
if (!flag("yes")) {
  console.log("\nDry run. Add --yes to execute.");
  process.exit(0);
}

const outDir = path.join("experiments", "runs", label);
fs.mkdirSync(outDir, { recursive: true });
const manifest = fs.createWriteStream(path.join(outDir, "manifest.jsonl"), { flags: "a" });

const subjectAdapter = makeAdapter({ provider, model, baseURL });
const visitorAdapter = makeAdapter({ provider: vProvider, model: vModel, baseURL });

async function runTrial(
  conditionId: string,
  index: number,
  exp: ExperienceState,
  archive: ArchivedCase[]
): Promise<void> {
  const preset = ABLATION_MAP[conditionId];
  const caseId = `EXP-${label}-${conditionId}-${String(index).padStart(2, "0")}`;
  const difficult = index % 4 === 3;
  const scenario = difficult ? DIFFICULT[(index >> 2) % DIFFICULT.length] : null;
  const matter = scenario ? scenario.matter : MATTER_POOL[index % MATTER_POOL.length];
  const persona = scenario ? scenario.persona : ROUTINE_PERSONA;

  const events: CaseEvent[] = [];
  const ctx: EngineCtx = {
    adapter: subjectAdapter,
    caseId,
    matter,
    events,
    calls: 0,
    conditionsBlock: "",
    experience: preset.config.memory ? digestsForAll(exp) : {},
    archiveDigest: preset.config.memory ? renderArchiveDigest(archive) : "",
    ablation: preset.config,
    emit: () => {},
  };

  process.stdout.write(`  ${caseId} [${scenario ? scenario.id : "routine"}] "${matter}" `);
  for (let turn = 1; turn <= TURNS; turn++) {
    let move;
    try {
      move = await runVisitorMove({ adapter: visitorAdapter, caseId, matter, persona, events });
    } catch (e) {
      process.stdout.write(`✗visitor(${(e as Error).message.slice(0, 40)}) `);
      break;
    }
    if (move.error) {
      process.stdout.write(`✗${move.error.slice(0, 30)} `);
      break;
    }
    if (move.giveUp) {
      events.push({ type: "user_abandoned", ts: Date.now() });
      process.stdout.write("giveup ");
      break;
    }
    ctx.calls = 0;
    try {
      await runWindowTurn(ctx, move.target, move.message);
    } catch (e) {
      process.stdout.write(`retry `);
      await new Promise((r) => setTimeout(r, 5000));
      try {
        await runWindowTurn(ctx, move.target, move.message);
      } catch {
        process.stdout.write(`✗window `);
        break;
      }
    }
    process.stdout.write(`${turn} `);
    if (events.some((e) => e.type === "case_closed")) break;
  }

  if (preset.config.memory) {
    const ids = participantsOf(events);
    try {
      const notes = await writeShiftNotes({
        adapter: subjectAdapter,
        caseId,
        matter,
        events,
        agentIds: ids,
        experience: digestsForAll(exp),
      });
      logCase(exp, caseId, events);
      const ts = Date.now();
      for (const n of notes) addNote(exp, n.agentId as AgentId, { ts, caseId, matter, text: n.text });
    } catch {
      logCase(exp, caseId, events);
    }
    archive.push({
      caseId,
      matter,
      startedAt: Date.now(),
      events,
      closed: true,
      archivedAt: Date.now(),
    });
  }

  const record = {
    caseId,
    condition: conditionId,
    trialIndex: index,
    scenario: scenario ? scenario.id : "routine",
    matter,
    subjectProvider: provider,
    subjectModel: model,
    visitorProvider: vProvider,
    visitorModel: vModel,
    maxTurns: TURNS,
    events,
  };
  fs.writeFileSync(
    path.join(outDir, `${conditionId}-${String(index).padStart(2, "0")}.json`),
    JSON.stringify(record, null, 1)
  );
  manifest.write(
    JSON.stringify({
      caseId,
      condition: conditionId,
      trialIndex: index,
      scenario: record.scenario,
      matter,
      eventCount: events.length,
    }) + "\n"
  );
  console.log("✓");
}

(async () => {
  for (const cond of conditions) {
    console.log(`\n== condition: ${cond} (${ABLATION_MAP[cond].note}) ==`);
    const exp = emptyExperience();
    const archive: ArchivedCase[] = [];
    for (let i = 0; i < N; i++) {
      await runTrial(cond, i, exp, archive);
    }
    if (ABLATION_MAP[cond].config.memory) {
      fs.writeFileSync(
        path.join(outDir, `${cond}-experience.json`),
        JSON.stringify(exp, null, 1)
      );
    }
  }
  manifest.end();
  console.log(`\nDone. Analyze with: npx tsx scripts/analyze.ts --run ${label}`);
})();
