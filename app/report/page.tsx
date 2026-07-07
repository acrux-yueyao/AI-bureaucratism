"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats, renderEvent, renderCaseFile } from "@/lib/case-file";
import { clearCase, loadAnalysis, loadCase, saveAnalysis, saveCase } from "@/lib/storage";
import { CONDITION_MAP } from "@/lib/conditions";
import {
  addNote,
  digestsForAll,
  loadExperience,
  logCase,
  participantsOf,
  saveExperience,
} from "@/lib/experience";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import { AGENTS, AGENT_MAP } from "@/lib/agents";
import { ENTRANCE, HALL_LAYOUT } from "@/lib/layout";
import type {
  AgentId,
  CaseEvent,
  CaseState,
  ReportResponse,
  ShiftNotesResponse,
} from "@/lib/types";

type Step = {
  agentId: AgentId;
  docs: number;
  memos: number;
  ups: number;
  downs: number;
  closed?: string;
};

function buildSteps(events: CaseEvent[]): Step[] {
  const steps: Step[] = [];
  let cur: Step | null = null;
  for (const e of events) {
    if (e.type === "user_message") {
      if (!cur || cur.agentId !== e.agentId) {
        cur = { agentId: e.agentId, docs: 0, memos: 0, ups: 0, downs: 0 };
        steps.push(cur);
      }
    } else if (cur) {
      if (e.type === "document_issued") cur.docs += 1;
      else if (e.type === "internal_memo") {
        if (e.channel === "up") cur.ups += 1;
        else if (e.channel === "down") cur.downs += 1;
        else cur.memos += 1;
      } else if (e.type === "case_closed") cur.closed = e.outcome;
    }
  }
  return steps;
}

function stepLabel(s: Step): string {
  const a = AGENT_MAP[s.agentId];
  const marks = [
    s.docs ? `▤×${s.docs}` : "",
    s.memos ? `⇄${s.memos}` : "",
    s.ups ? `↑${s.ups}` : "",
    s.downs ? `↓${s.downs}` : "",
    s.closed ? `● ${s.closed}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${a.windowNo} ${a.dept}${marks ? ` ${marks}` : ""}`;
}

const SX = 10;
const SY = 4.4;

function JourneyMap({ events, steps }: { events: CaseEvent[]; steps: Step[] }) {
  const seq: { x: number; y: number }[] = [
    { x: ENTRANCE.x * SX, y: ENTRANCE.y * SY },
    ...steps.map((s) => ({
      x: HALL_LAYOUT[s.agentId].x * SX,
      y: HALL_LAYOUT[s.agentId].y * SY,
    })),
  ];
  const memoLines: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    ch: string;
  }[] = [];
  for (const e of events) {
    if (e.type !== "internal_memo") continue;
    memoLines.push({
      x1: HALL_LAYOUT[e.from].x * SX,
      y1: HALL_LAYOUT[e.from].y * SY,
      x2: HALL_LAYOUT[e.to].x * SX,
      y2: HALL_LAYOUT[e.to].y * SY,
      ch: e.channel ?? "peer",
    });
  }
  const visited = new Set(steps.map((s) => s.agentId));
  return (
    <svg
      viewBox="0 0 1000 440"
      style={{ width: "100%", background: "var(--paper-note)", border: "1px solid #e8e5dc" }}
      role="img"
      aria-label="Case journey across the hall floor plan"
    >
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L8 4 L0 8 z" fill="#787d86" />
        </marker>
      </defs>
      <line x1="30" y1="132" x2="970" y2="132" stroke="#787d86" strokeDasharray="5 6" opacity="0.4" />
      {memoLines.map((m, i) => (
        <line
          key={"m" + i}
          x1={m.x1}
          y1={m.y1}
          x2={m.x2}
          y2={m.y2}
          stroke={m.ch === "up" ? "#cf3f36" : m.ch === "down" ? "#4a6fa5" : "#61a04a"}
          strokeWidth="1.4"
          strokeDasharray="5 4"
          opacity="0.75"
        />
      ))}
      {seq.slice(0, -1).map((p, i) => (
        <line
          key={"s" + i}
          x1={p.x}
          y1={p.y}
          x2={seq[i + 1].x}
          y2={seq[i + 1].y}
          stroke="#787d86"
          strokeWidth="1.6"
          strokeDasharray="7 6"
          opacity="0.8"
          markerEnd="url(#arr)"
        />
      ))}
      {AGENTS.map((a) => {
        const p = HALL_LAYOUT[a.id];
        const hot = visited.has(a.id);
        return (
          <g key={a.id}>
            <circle
              cx={p.x * SX}
              cy={p.y * SY}
              r={hot ? 11 : 7}
              fill={hot ? "rgba(207,63,54,0.12)" : "#fff"}
              stroke={hot ? "#cf3f36" : "#b1b4b6"}
              strokeWidth={hot ? 2 : 1}
            />
            <text
              x={p.x * SX}
              y={p.y * SY + (p.y < 30 ? -16 : 26)}
              textAnchor="middle"
              fontSize="13"
              fill={hot ? "#0b0c0c" : "#787d86"}
              fontFamily="var(--hand)"
            >
              {a.windowNo ? `${a.windowNo} ` : ""}
              {a.dept}
            </text>
          </g>
        );
      })}
      <text x={ENTRANCE.x * SX} y={ENTRANCE.y * SY + 24} textAnchor="middle" fontSize="13" fill="#787d86" fontFamily="var(--hand)" letterSpacing="4">
        ENTRANCE
      </text>
      <circle cx={ENTRANCE.x * SX} cy={ENTRANCE.y * SY} r="5" fill="#787d86" />
    </svg>
  );
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [cs, setCs] = useState<CaseState | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [generating, setGenerating] = useState(false);
  const [writingNotes, setWritingNotes] = useState(false);
  const [error, setError] = useState("");
  const notesStarted = useRef(false);

  useEffect(() => {
    setLang(getLang());
    const c = loadCase();
    if (!c) {
      router.replace("/");
      return;
    }
    setCs(c);
    setAnalysis(loadAnalysis());
  }, [router]);

  useEffect(() => {
    if (!cs || cs.notesWritten || cs.events.length === 0 || notesStarted.current) return;
    const exp = loadExperience();
    if (exp.casesLogged.includes(cs.caseId)) {
      const merged = { ...cs, notesWritten: true };
      saveCase(merged);
      setCs(merged);
      return;
    }
    notesStarted.current = true;
    setWritingNotes(true);
    (async () => {
      let notes: ShiftNotesResponse["notes"] = [];
      try {
        const res = await fetch("/api/shift-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: cs.caseId,
            matter: cs.matter,
            events: cs.events,
            agentIds: participantsOf(cs.events),
            experience: digestsForAll(exp),
          }),
        });
        const data = (await res.json()) as ShiftNotesResponse;
        notes = data.notes ?? [];
      } catch {
        notes = [];
      }
      logCase(exp, cs.caseId, cs.events);
      const ts = Date.now();
      for (const n of notes) {
        addNote(exp, n.agentId, { ts, caseId: cs.caseId, matter: cs.matter, text: n.text });
      }
      saveExperience(exp);
      const merged = { ...cs, notesWritten: true };
      saveCase(merged);
      setCs(merged);
      setWritingNotes(false);
    })();
  }, [cs]);

  const stats = useMemo(() => (cs ? computeStats(cs.events) : null), [cs]);
  const steps = useMemo(() => (cs ? buildSteps(cs.events) : []), [cs]);

  function toggleLang() {
    const next: Lang = lang === "en" ? "zh" : "en";
    setLang(next);
    storeLang(next);
  }

  async function generate() {
    if (!cs || generating) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: cs.caseId,
          matter: cs.matter,
          events: cs.events,
          conditionId: cs.conditionId,
        }),
      });
      const data = (await res.json()) as ReportResponse;
      if (data.error) setError(data.error);
      if (data.analysis) {
        setAnalysis(data.analysis);
        saveAnalysis(data.analysis);
      }
    } catch {
      setError(t(lang, "netError"));
    } finally {
      setGenerating(false);
    }
  }

  function exportJson() {
    if (!cs) return;
    download(
      `${cs.caseId}.json`,
      JSON.stringify({ ...cs, stats, analysis }, null, 2),
      "application/json"
    );
  }

  function exportMarkdown() {
    if (!cs || !stats) return;
    const cond = cs.conditionId ? CONDITION_MAP[cs.conditionId] : undefined;
    const md = `# Case observation record ${cs.caseId}

## Matter
${cs.matter}

## Conditions
${cond ? `${cond.name}${cond.facts.length ? "\n" + cond.facts.map((f) => `- ${f}`).join("\n") : " (baseline)"}` : "baseline"}

## Journey
entrance → ${steps.map(stepLabel).join(" → ")}
(▤ document issued · ⇄ peer memo · ↑ escalation · ↓ assignment · ● case closed)

## Statistics
- Window exchanges: ${stats.userTurns}
- Windows visited: ${stats.windowsVisited}
- Referrals: ${stats.referrals}
- Peer memos: ${stats.internalMemos}
- Escalations (upward): ${stats.escalations}
- Assignments (downward): ${stats.assignments}
- Materials demanded: ${stats.materialsRequired}
- Documents issued: ${stats.documentsIssued}
- Outcome: ${stats.outcome}

## Case file

\`\`\`
${renderCaseFile(cs.caseId, cs.matter, cs.events)}
\`\`\`

## Observer analysis

${analysis || "(not generated)"}
`;
    download(`${cs.caseId}.md`, md, "text/markdown");
  }

  if (!cs || !stats) return null;

  return (
    <main>
      <header className="gov-header">
        <div className="gov-header-inner">
          <a className="gov-logotype" href="/">
            {t(lang, "brand")}
          </a>
          <span className="svc">{t(lang, "receipt")}</span>
          <span className="right">
            <button onClick={() => router.push("/staff")}>{t(lang, "staffRecords")}</button>
            <button onClick={() => router.push("/hall")}>{t(lang, "backHall")}</button>
            <button
              onClick={() => {
                if (window.confirm(t(lang, "newCaseConfirm"))) {
                  clearCase();
                  router.push("/");
                }
              }}
            >
              {t(lang, "newCase")}
            </button>
            <button onClick={toggleLang}>{t(lang, "langToggle")}</button>
          </span>
        </div>
      </header>
      <div className="blue-bar" />

      <div className="page" style={{ maxWidth: 860 }}>
        {writingNotes && (
          <div className="inset" style={{ marginTop: 0 }}>
            <span className="spin" />
            {t(lang, "writingNotes")}
          </div>
        )}
        <section className="receipt">
          <h2>{t(lang, "receipt")}</h2>
          <table>
            <tbody>
              <tr>
                <td>{t(lang, "caseNo")}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{cs.caseId}</td>
              </tr>
              <tr>
                <td>{t(lang, "matter")}</td>
                <td>{cs.matter}</td>
              </tr>
              <tr>
                <td>{t(lang, "outcome")}</td>
                <td>{stats.outcome}</td>
              </tr>
              <tr>
                <td>{t(lang, "started")}</td>
                <td>{new Date(cs.startedAt).toLocaleString("en-GB")}</td>
              </tr>
              {cs.conditionId && CONDITION_MAP[cs.conditionId] && (
                <tr>
                  <td>{t(lang, "conditionsTitle").replace("Researcher: ", "").replace("研究者：", "")}</td>
                  <td>{CONDITION_MAP[cs.conditionId].name}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="ink-stamp" style={{ position: "absolute", right: 28, bottom: 20 }}>
            PROCESSED
          </div>
        </section>

        {steps.length > 0 && (
          <>
            <h2 className="h-l">{t(lang, "journeyTitle")}</h2>
            <JourneyMap events={cs.events} steps={steps} />
            <div className="flow-strip">
              <span className="flow-node entrance">◦ {t(lang, "entrance").toLowerCase()}</span>
              {steps.map((s, i) => (
                <span key={i} style={{ display: "contents" }}>
                  <span className="flow-arrow">→</span>
                  <span className={"flow-node" + (s.closed ? " closed" : "")}>{stepLabel(s)}</span>
                </span>
              ))}
            </div>
            <p className="flow-legend">{t(lang, "journeyLegend")}</p>
          </>
        )}

        <h2 className="h-l">{t(lang, "stats")}</h2>
        <div className="stats">
          <div className="stat">
            <div className="num">{stats.windowsVisited}</div>
            <div className="label">{t(lang, "statWindows")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.referrals}</div>
            <div className="label">{t(lang, "statReferrals")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.internalMemos}</div>
            <div className="label">{t(lang, "statMemos")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.escalations}</div>
            <div className="label">{t(lang, "statEscalations")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.assignments}</div>
            <div className="label">{t(lang, "statAssignments")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.materialsRequired}</div>
            <div className="label">{t(lang, "statMaterials")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.documentsIssued}</div>
            <div className="label">{t(lang, "statDocs")}</div>
          </div>
          <div className="stat">
            <div className="num">{stats.userTurns}</div>
            <div className="label">{t(lang, "statTurns")}</div>
          </div>
        </div>

        <h2 className="h-l">{t(lang, "observerTitle")}</h2>
        {analysis ? (
          <div className="analysis">{analysis}</div>
        ) : (
          <div className="analysis placeholder">{t(lang, "observerHint")}</div>
        )}
        <div style={{ marginTop: 12 }}>
          <button className="btn-plain" onClick={generate} disabled={generating}>
            {generating && <span className="spin" />}
            {analysis ? t(lang, "regenerate") : t(lang, "generate")}
          </button>
        </div>
        {error && <div className="err">{error}</div>}

        <h2 className="h-l">{t(lang, "fullFile")}</h2>
        <div className="timeline">
          {cs.events.map((e, i) => (
            <div
              key={i}
              className={
                "timeline-item" +
                (e.type === "internal_memo" || e.type === "internal_reply" ? " internal" : "")
              }
            >
              {renderEvent(e)}
            </div>
          ))}
        </div>

        <div className="report-actions">
          <button className="btn-plain" onClick={() => window.print()}>
            {t(lang, "printPdf")}
          </button>
          <button className="btn-plain" onClick={exportJson}>
            {t(lang, "exportJson")}
          </button>
          <button className="btn-plain" onClick={exportMarkdown}>
            {t(lang, "exportMd")}
          </button>
        </div>
      </div>
    </main>
  );
}
