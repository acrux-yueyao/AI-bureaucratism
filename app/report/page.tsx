"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats, renderEvent, renderCaseFile } from "@/lib/case-file";
import { clearCase, loadAnalysis, loadCase, saveAnalysis } from "@/lib/storage";
import { getLang, storeLang, t, type Lang } from "@/lib/i18n";
import type { CaseState, ReportResponse } from "@/lib/types";

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
  const [error, setError] = useState("");

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

  const stats = useMemo(() => (cs ? computeStats(cs.events) : null), [cs]);

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
        body: JSON.stringify({ caseId: cs.caseId, matter: cs.matter, events: cs.events }),
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
    const md = `# Case observation record ${cs.caseId}

## Matter
${cs.matter}

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
            </tbody>
          </table>
          <div className="ink-stamp" style={{ position: "absolute", right: 28, bottom: 20 }}>
            PROCESSED
          </div>
        </section>

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
