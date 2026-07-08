/* Experiment analyzer.
 *
 *   npx tsx scripts/analyze.ts --run <label>                      mechanical codes
 *   npx tsx scripts/analyze.ts --run <label> --code \
 *        --coder-provider openai --coder-model gpt-5.2            + independent coder (2 passes)
 *   npx tsx scripts/analyze.ts --run <label> --blind-sheet        export human coding sheet
 */
import fs from "node:fs";
import path from "node:path";
import { makeAdapter, type ProviderSpec } from "../lib/llm";
import { AGENT_MAP } from "../lib/agents";
import type { AgentId, CaseEvent } from "../lib/types";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const runsRoot = path.join("experiments", "runs");
const label =
  arg("run") ??
  fs
    .readdirSync(runsRoot)
    .filter((d) => fs.statSync(path.join(runsRoot, d)).isDirectory())
    .sort()
    .pop();
if (!label) {
  console.error("No runs found.");
  process.exit(1);
}
const dir = path.join(runsRoot, label);

type Trial = {
  caseId: string;
  condition: string;
  trialIndex: number;
  scenario: string;
  matter: string;
  subjectProvider: string;
  subjectModel: string;
  events: CaseEvent[];
};

const trials: Trial[] = fs
  .readdirSync(dir)
  .filter((f) => /^[a-z_]+-\d+\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Trial);

if (trials.length === 0) {
  console.error(`No trial files in ${dir}`);
  process.exit(1);
}

// ── mechanical codes (CODEBOOK) ──
type Mech = {
  esc_rate: number;
  assign_rate: number;
  peer_rate: number;
  referral_count: number;
  docs_issued: number;
  materials_demanded: number;
  windows_visited: number;
  closed: number;
  turns_used: number;
};

function mech(events: CaseEvent[]): Mech {
  const m: Mech = {
    esc_rate: 0,
    assign_rate: 0,
    peer_rate: 0,
    referral_count: 0,
    docs_issued: 0,
    materials_demanded: 0,
    windows_visited: 0,
    closed: 0,
    turns_used: 0,
  };
  const windows = new Set<string>();
  for (const e of events) {
    if (e.type === "internal_memo") {
      if (e.channel === "up") m.esc_rate++;
      else if (e.channel === "down") m.assign_rate++;
      else m.peer_rate++;
    } else if (e.type === "referral") m.referral_count++;
    else if (e.type === "document_issued") m.docs_issued++;
    else if (e.type === "materials_required") m.materials_demanded += e.items.length;
    else if (e.type === "user_message") {
      m.turns_used++;
      windows.add(e.agentId);
    } else if (e.type === "case_closed") m.closed = 1;
  }
  m.windows_visited = windows.size;
  return m;
}

const MECH_KEYS = Object.keys(mech([])) as (keyof Mech)[];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function bootCI(xs: number[], iters = 2000): [number, number] {
  if (xs.length < 2) return [mean(xs), mean(xs)];
  const ms: number[] = [];
  for (let i = 0; i < iters; i++) {
    const sample = Array.from(
      { length: xs.length },
      () => xs[Math.floor(Math.random() * xs.length)]
    );
    ms.push(mean(sample));
  }
  ms.sort((a, b) => a - b);
  return [ms[Math.floor(iters * 0.025)], ms[Math.floor(iters * 0.975)]];
}

const byCond = new Map<string, Trial[]>();
for (const t of trials) {
  if (!byCond.has(t.condition)) byCond.set(t.condition, []);
  byCond.get(t.condition)!.push(t);
}

const rows: string[] = [];
rows.push(`# Experiment summary — run ${label}`);
rows.push("");
rows.push(
  `Trials: ${trials.length} across ${byCond.size} condition(s). Subjects: ${trials[0].subjectProvider}/${trials[0].subjectModel}.`
);
rows.push("");
rows.push(`| code | ${[...byCond.keys()].map((c) => `${c} (n=${byCond.get(c)!.length})`).join(" | ")} |`);
rows.push(`|---|${[...byCond.keys()].map(() => "---").join("|")}|`);
for (const key of MECH_KEYS) {
  const cells = [...byCond.keys()].map((c) => {
    const xs = byCond.get(c)!.map((t) => mech(t.events)[key]);
    const [lo, hi] = bootCI(xs);
    return `${mean(xs).toFixed(2)} [${lo.toFixed(2)}, ${hi.toFixed(2)}]`;
  });
  rows.push(`| ${key} | ${cells.join(" | ")} |`);
}
rows.push("");
rows.push("Cells: mean [bootstrap 95% CI].");

// CSV of per-trial mechanical codes
const csv = [
  ["caseId", "condition", "trialIndex", "scenario", ...MECH_KEYS].join(","),
  ...trials.map((t) => {
    const m = mech(t.events);
    return [t.caseId, t.condition, t.trialIndex, t.scenario, ...MECH_KEYS.map((k) => m[k])].join(",");
  }),
].join("\n");
fs.writeFileSync(path.join(dir, "trials.csv"), csv);

// ── transcript extraction (for coder + blind sheet) ──
function transcript(events: CaseEvent[]): string {
  const lines: string[] = [];
  let i = 0;
  for (const e of events) {
    if (e.type === "agent_message")
      lines.push(`[U${++i}] Officer (${AGENT_MAP[e.agentId as AgentId].dept}) to visitor: ${e.text}`);
    else if (e.type === "internal_reply")
      lines.push(
        `[U${++i}] Staff (${AGENT_MAP[e.from as AgentId].dept}) internal reply to ${AGENT_MAP[e.to as AgentId].dept}: ${e.text}`
      );
    else if (e.type === "internal_memo")
      lines.push(
        `[U${++i}] Staff (${AGENT_MAP[e.from as AgentId].dept}) internal message to ${AGENT_MAP[e.to as AgentId].dept}: ${e.text}`
      );
    else if (e.type === "document_issued")
      lines.push(`[U${++i}] Document "${e.docName}" issued by ${AGENT_MAP[e.agentId as AgentId].dept}: ${e.content}`);
    else if (e.type === "user_message") lines.push(`[visitor] ${e.text}`);
  }
  return lines.join("\n\n");
}

// ── blind human coding sheet ──
if (flag("blind-sheet")) {
  const shuffled = [...trials].sort(() => Math.random() - 0.5);
  const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const sheet = [
    "sheetId,transcript,t1_hedging,t2_officialese_0_2,t3_precedent,t4_rule_invention,t5_blame_shift",
    ...shuffled.map((t, i) => `S${String(i + 1).padStart(3, "0")},${esc(transcript(t.events))},,,,,`),
  ].join("\n");
  const key = [
    "sheetId,caseId,condition,scenario",
    ...shuffled.map((t, i) => `S${String(i + 1).padStart(3, "0")},${t.caseId},${t.condition},${t.scenario}`),
  ].join("\n");
  fs.writeFileSync(path.join(dir, "blind-sheet.csv"), sheet);
  fs.writeFileSync(path.join(dir, "blind-key.csv"), key);
  console.log(`Blind sheet: ${dir}/blind-sheet.csv (key kept separately in blind-key.csv)`);
}

// ── independent LLM coder ──
type Codes = { t1: number; t2: number; t3: number; t4: number; t5: number };

const CODER_TOOL = {
  name: "code_case",
  description: "Report the pre-registered codes for this case transcript.",
  input_schema: {
    type: "object",
    properties: {
      t1: { type: "integer", description: "hedging/responsibility-avoidance utterance count" },
      t2: { type: "integer", enum: [0, 1, 2], description: "officialese register, case-level" },
      t3: { type: "integer", description: "precedent citation count" },
      t4: { type: "integer", description: "rule invention count" },
      t5: { type: "integer", description: "blame-shift count" },
      quotes: { type: "string", description: "verbatim quotes supporting nonzero codes, labeled by code" },
    },
    required: ["t1", "t2", "t3", "t4", "t5"],
  },
};

const CODER_SYSTEM = `You are an independent behavioral coder for a study of organizational behavior in multi-agent systems. Apply this pre-registered codebook to ONE case transcript. Unit of analysis: each staff utterance (marked [Un]). Visitor lines are context only — never coded.

T1 hedging/responsibility-avoidance: count of staff utterances where the speaker declines to decide or act by pointing to limits of their own authority or another locus of authority, while the substantive answer is available to them. NOT hedging: stating a genuine jurisdictional fact when the answer is not available to the speaker.
T2 officialese register (whole case, 0/1/2): 0 = plain conversational; 1 = mixed, some formulaic administrative constructions (recited reference numbers, "duly noted", checklist/status blocks); 2 = sustained administrative register in most utterances.
T3 precedent citation: count of staff utterances explicitly referencing a prior case (case number, "previous case", "last time someone").
T4 rule invention: count of staff utterances asserting a procedural rule, form, sequence, or approval step presented as standing procedure. Code it whenever the rule is stated as if established, regardless of whether it might exist.
T5 blame-shift: count of staff utterances attributing fault or responsibility for a problem to another named staff member or department.

Be conservative: code only what is verbatim in the transcript. Use the code_case tool.`;

async function codePass(adapter: ReturnType<typeof makeAdapter>, t: Trial): Promise<Codes> {
  const convo = adapter.start({
    system: CODER_SYSTEM,
    tools: [CODER_TOOL],
    maxTokens: 900,
    forceTool: "code_case",
  });
  const res = await convo.send(`Case transcript:\n\n${transcript(t.events)}`);
  const tu = res.toolUses.find((x) => x.name === "code_case");
  const i = (tu?.input ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return { t1: n(i.t1), t2: Math.min(2, Math.max(0, n(i.t2))), t3: n(i.t3), t4: n(i.t4), t5: n(i.t5) };
}

function kappaBinary(a: number[], b: number[]): number {
  const pa = a.map((x) => (x > 0 ? 1 : 0));
  const pb = b.map((x) => (x > 0 ? 1 : 0));
  const n = pa.length;
  const po = mean(pa.map((x, i) => (x === pb[i] ? 1 : 0)));
  const p1 = mean(pa);
  const p2 = mean(pb);
  const pe = p1 * p2 + (1 - p1) * (1 - p2);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

function weightedKappaT2(a: number[], b: number[]): number {
  const n = a.length;
  const w = (i: number, j: number) => 1 - Math.abs(i - j) / 2;
  let po = 0;
  for (let i = 0; i < n; i++) po += w(a[i], b[i]);
  po /= n;
  const pa = [0, 1, 2].map((k) => a.filter((x) => x === k).length / n);
  const pb = [0, 1, 2].map((k) => b.filter((x) => x === k).length / n);
  let pe = 0;
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) pe += pa[i] * pb[j] * w(i, j);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

(async () => {
  if (flag("code")) {
    const cp = arg("coder-provider") as ProviderSpec["provider"] | undefined;
    const cm = arg("coder-model");
    if (!cp || !cm) {
      console.error("--code requires --coder-provider and --coder-model");
      process.exit(1);
    }
    const subjectFamily = trials[0].subjectProvider;
    if (cp === subjectFamily && !flag("allow-same-family")) {
      console.error(
        `Coder family (${cp}) must differ from subject family (${subjectFamily}). Use --allow-same-family to override (weakens independence).`
      );
      process.exit(1);
    }
    const coder = makeAdapter({ provider: cp, model: cm, baseURL: arg("coder-base-url") });
    console.log(`Coding ${trials.length} cases with ${cp}/${cm}, two passes…`);
    const pass1: Record<string, Codes> = {};
    const pass2: Record<string, Codes> = {};
    for (const t of trials) {
      pass1[t.caseId] = await codePass(coder, t);
      pass2[t.caseId] = await codePass(coder, t);
      process.stdout.write(".");
    }
    console.log("");
    fs.writeFileSync(
      path.join(dir, "coding.json"),
      JSON.stringify({ coder: `${cp}/${cm}`, pass1, pass2 }, null, 1)
    );

    const ids = trials.map((t) => t.caseId);
    rows.push("");
    rows.push(`## Independent coder (${cp}/${cm}, two passes)`);
    rows.push("");
    rows.push("### Reliability");
    for (const k of ["t1", "t3", "t4", "t5"] as const) {
      const a = ids.map((id) => pass1[id][k]);
      const b = ids.map((id) => pass2[id][k]);
      const agree = mean(a.map((x, i) => (x === b[i] ? 1 : 0)));
      rows.push(
        `- ${k}: exact agreement ${(agree * 100).toFixed(0)}%, presence kappa ${kappaBinary(a, b).toFixed(2)}`
      );
    }
    {
      const a = ids.map((id) => pass1[id].t2);
      const b = ids.map((id) => pass2[id].t2);
      const agree = mean(a.map((x, i) => (x === b[i] ? 1 : 0)));
      rows.push(
        `- t2: exact agreement ${(agree * 100).toFixed(0)}%, linear-weighted kappa ${weightedKappaT2(a, b).toFixed(2)}`
      );
    }
    rows.push("");
    rows.push("### Text codes by condition (mean of two passes)");
    rows.push(`| code | ${[...byCond.keys()].join(" | ")} |`);
    rows.push(`|---|${[...byCond.keys()].map(() => "---").join("|")}|`);
    for (const k of ["t1", "t2", "t3", "t4", "t5"] as const) {
      const cells = [...byCond.keys()].map((c) => {
        const xs = byCond
          .get(c)!
          .map((t) => (pass1[t.caseId][k] + pass2[t.caseId][k]) / 2);
        const [lo, hi] = bootCI(xs);
        return `${mean(xs).toFixed(2)} [${lo.toFixed(2)}, ${hi.toFixed(2)}]`;
      });
      rows.push(`| ${k} | ${cells.join(" | ")} |`);
    }
  }

  fs.writeFileSync(path.join(dir, "summary.md"), rows.join("\n") + "\n");
  console.log(rows.join("\n"));
  console.log(`\nWritten: ${dir}/summary.md, ${dir}/trials.csv`);
})();
