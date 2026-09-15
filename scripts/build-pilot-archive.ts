// Publish the human pilot sessions into the public case archive.
//   npx tsx scripts/build-pilot-archive.ts
// Reads study-data/*.json (both export shapes) and study-data/ledger.csv, keeps
// exactly the ledger's sessions, attaches participant code / round / condition,
// and writes public/archive/pilot.json. Participants consented to publication
// (2026-09-14) and were instructed to fabricate identifying details; as a
// safeguard any 18-digit string that passes the national-ID checksum, and any
// mobile-number-shaped string, is masked before anything leaves this folder.
// study-data/ itself stays gitignored — only the masked output is published.

import fs from "node:fs";
import path from "node:path";

const DIR = "study-data";

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows;
  return body
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// ISO 7064 MOD 11-2 — the check digit of a PRC resident ID number.
function validCnId(s: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(s)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const sum = w.reduce((a, wi, i) => a + wi * Number(s[i]), 0);
  return "10X98765432"[sum % 11] === s[17].toUpperCase();
}

type Case = {
  caseId: string;
  matter: string;
  startedAt: number;
  events: { type: string; ts?: number }[];
  closed?: boolean;
  conditionId?: string;
  ablationId?: string;
};

const ledger = parseCsv(fs.readFileSync(path.join(DIR, "ledger.csv"), "utf8"));
const wanted = new Map(ledger.map((r) => [r.caseId, r]));
const cases = new Map<string, Case>();
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".json")).sort()) {
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  const list: Case[] =
    raw.format === "aib-session-export" ? [...(raw.archive ?? []), raw.current].filter(Boolean) : [raw];
  for (const c of list) if (wanted.has(c.caseId) && !cases.has(c.caseId)) cases.set(c.caseId, c);
}
const missing = [...wanted.keys()].filter((id) => !cases.has(id));
if (missing.length) throw new Error("ledger sessions without a file: " + missing.join(", "));

// round = order of this participant's sessions by start time
const byPid = new Map<string, string[]>();
for (const r of [...ledger].sort((a, b) => a.startedAt.localeCompare(b.startedAt))) {
  byPid.set(r.pid, [...(byPid.get(r.pid) ?? []), r.caseId]);
}

const idLike = /(?<!\d)\d{17}[\dXx](?!\d)/g;
const phoneLike = /(?<!\d)1[3-9]\d{9}(?!\d)/g;
let masked = 0;
const report: string[] = [];
const out = ledger.map((r) => {
  const c = cases.get(r.caseId)!;
  // Mask across the whole case — officers echo numbers back and print them
  // into documents, so a user-message-only pass would leak.
  let json = JSON.stringify(c);
  for (const m of new Set(json.match(idLike) ?? [])) {
    const ok = validCnId(m);
    report.push(
      `  ${r.pid} ${m.slice(0, 6)}********${m.slice(14)}  ${ok ? "passes checksum → MASKED" : "fails checksum (fabricated) → kept"}`
    );
    if (ok) {
      json = json.split(m).join(m.slice(0, 6) + "********" + m.slice(14));
      masked++;
    }
  }
  for (const m of new Set(json.match(phoneLike) ?? [])) {
    json = json.split(m).join(m.slice(0, 3) + "****" + m.slice(7));
    masked++;
    report.push(`  ${r.pid} phone-shaped number → MASKED`);
  }
  const cs = JSON.parse(json) as Case;
  const tss = cs.events.map((e) => e.ts).filter((x): x is number => typeof x === "number");
  return {
    caseId: cs.caseId,
    matter: cs.matter,
    startedAt: cs.startedAt || Date.parse(r.startedAt),
    archivedAt: tss.length ? Math.max(...tss) : cs.startedAt,
    events: cs.events,
    closed: !!cs.closed || cs.events.some((e) => e.type === "case_closed" || e.type === "user_abandoned"),
    conditionId: cs.conditionId ?? "calm",
    ablationId: r.ablation.replace(/\(.*\)$/, ""),
    participant: r.pid,
    round: (byPid.get(r.pid) ?? []).indexOf(r.caseId) + 1,
    lang: r.lang,
    minutes: Number(r.minutes),
    outcome: r.outcome,
    batch: "pilot",
  };
});

fs.mkdirSync(path.join("public", "archive"), { recursive: true });
const dest = path.join("public", "archive", "pilot.json");
fs.writeFileSync(dest, JSON.stringify(out));
const per = [...byPid.entries()].map(([p, ids]) => `${p}×${ids.length}`).join(" ");
console.log(`${out.length} sessions → ${dest} (${(fs.statSync(dest).size / 1024).toFixed(0)} KB) · ${per}`);
console.log(`ID-shaped strings found: ${report.length} · masked: ${masked}`);
for (const line of report) console.log(line);
