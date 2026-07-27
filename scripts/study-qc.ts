// Study-session QC — run on every JSON a pilot participant sends back.
//   npx tsx scripts/study-qc.ts study-data/P1-*.json
// Prints a per-file quality report, cross-checks the counterbalance sheet,
// and appends one row per case to study-data/ledger.csv (gitignored).
// Accepts both export shapes: the report-page single-case export and the
// hall "Session data" full export ({ current, archive, ... }).

import fs from "node:fs";
import path from "node:path";

type AnyEvent = { type: string; ts: number; [k: string]: unknown };
type CaseLike = {
  participant?: string | null;
  caseId: string;
  matter: string;
  startedAt: number;
  events: AnyEvent[];
  closed: boolean;
  conditionId?: string;
  ablationId?: string;
  analysis?: string | null;
};

// Counterbalance sheet (STUDY_GUIDE_PARTICIPANT.md) — round order per pid.
const PLAN: Record<string, [string, string]> = {
  P1: ["full", "flat"], P2: ["flat", "full"], P3: ["full", "flat"],
  P4: ["flat", "full"], P5: ["full", "flat"], P6: ["flat", "full"],
};

function loadCases(file: string): CaseLike[] {
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (raw.format === "aib-session-export") {
    const seen = new Map<string, CaseLike>();
    for (const c of [...(raw.archive ?? []), raw.current].filter(Boolean) as CaseLike[]) {
      seen.set(c.caseId, { participant: raw.participant, ...c });
    }
    return [...seen.values()];
  }
  return [raw as CaseLike];
}

function tally(events: AnyEvent[]) {
  const n = (t: string) => events.filter((e) => e.type === t).length;
  const materials = events
    .filter((e) => e.type === "materials_required")
    .reduce((s, e) => s + ((e.items as unknown[])?.length ?? 0), 0);
  const userMsgs = events.filter((e) => e.type === "user_message");
  const zh = userMsgs.filter((e) => /[一-鿿]/.test(String(e.text))).length;
  const first = events[0]?.ts, last = events[events.length - 1]?.ts;
  const closeEv = events.find((e) => e.type === "case_closed") as AnyEvent | undefined;
  return {
    userTurns: userMsgs.length,
    agentMsgs: n("agent_message"),
    referrals: n("referral"),
    memos: n("internal_memo"),
    escalations: n("escalation"),
    assignments: n("assignment"),
    materials,
    docs: n("document_issued"),
    windows: new Set(events.filter((e) => e.type === "user_message").map((e) => e.agentId)).size,
    minutes: first && last ? Math.round((last - first) / 60000) : 0,
    lang: userMsgs.length === 0 ? "?" : zh === userMsgs.length ? "zh" : zh === 0 ? "en" : `mixed(${zh}/${userMsgs.length})`,
    outcome: (closeEv?.outcome as string) ?? (events.length ? "abandoned/open" : "empty"),
  };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: npx tsx scripts/study-qc.ts <session.json> [...]");
  process.exit(1);
}

const rows: string[] = [];
const cases: { file: string; c: CaseLike; t: ReturnType<typeof tally> }[] = [];

for (const file of files) {
  for (const c of loadCases(file)) {
    cases.push({ file: path.basename(file), c, t: tally(c.events) });
  }
}
cases.sort((a, b) => a.c.startedAt - b.c.startedAt);

for (const [i, { file, c, t }] of cases.entries()) {
  const pid = c.participant ?? "⚠️ MISSING";
  const ab = c.ablationId ?? "full(default)";
  const flags: string[] = [];
  if (!c.participant) flags.push("no pid");
  const plan = c.participant ? PLAN[c.participant] : undefined;
  if (plan) {
    const expected = plan[i % 2];
    if ((c.ablationId ?? "full") !== expected) flags.push(`ablation ≠ plan (expect round${(i % 2) + 1}=${expected})`);
  }
  if (t.userTurns === 0) flags.push("no visitor messages");
  if (!c.closed && t.outcome === "abandoned/open") flags.push("not closed (abandoned — fine if intended)");

  console.log(`\n━━ ${pid} · ${c.caseId} · ${new Date(c.startedAt).toISOString().slice(0, 16)} ━━ [${file}]`);
  console.log(`  matter    : ${c.matter.slice(0, 80)}`);
  console.log(`  structure : ${ab}   env: ${c.conditionId ?? "-"}   lang: ${t.lang}`);
  console.log(`  behavior  : ${t.userTurns} visitor turns · ${t.windows} windows · ${t.referrals} referrals · ${t.materials} materials demanded`);
  console.log(`  internal  : ${t.memos} memos · ${t.escalations} escalations · ${t.assignments} assignments · ${t.docs} docs issued`);
  console.log(`  outcome   : ${t.outcome} · ~${t.minutes} min · analysis: ${c.analysis ? "yes" : "no"}`);
  console.log(`  QC        : ${flags.length ? "⚠️  " + flags.join(" | ") : "✓ clean"}`);

  rows.push([
    pid, c.caseId, new Date(c.startedAt).toISOString(), ab, c.conditionId ?? "", t.lang,
    t.userTurns, t.windows, t.referrals, t.materials, t.memos, t.escalations, t.assignments,
    t.docs, t.outcome, t.minutes, flags.join("; "), file,
  ].join(","));
}

const ledger = "study-data/ledger.csv";
const header = "pid,caseId,startedAt,ablation,env,lang,userTurns,windows,referrals,materials,memos,escalations,assignments,docs,outcome,minutes,flags,file";
const existing = fs.existsSync(ledger) ? fs.readFileSync(ledger, "utf8").trim().split("\n") : [header];
const known = new Set(existing.slice(1).map((r) => r.split(",")[1]));
for (const r of rows) if (!known.has(r.split(",")[1])) existing.push(r);
fs.writeFileSync(ledger, existing.join("\n") + "\n");
console.log(`\n📒 ledger: ${ledger} — ${existing.length - 1} case(s) total`);
