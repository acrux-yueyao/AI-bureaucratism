"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats, renderEvent, renderCaseFile } from "@/lib/case-file";
import { clearCase, loadAnalysis, loadCase, saveAnalysis } from "@/lib/storage";
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
  const [cs, setCs] = useState<CaseState | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const c = loadCase();
    if (!c) {
      router.replace("/");
      return;
    }
    setCs(c);
    setAnalysis(loadAnalysis());
  }, [router]);

  const stats = useMemo(() => (cs ? computeStats(cs.events) : null), [cs]);

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
      setError("网络请求失败，请重试。");
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
    const md = `# 办件观察记录 ${cs.caseId}

## 事项
${cs.matter}

## 统计
- 窗口对话轮数：${stats.userTurns}
- 走过窗口数：${stats.windowsVisited}
- 被转办次数：${stats.referrals}
- 内部函件数：${stats.internalMemos}
- 被要求材料项数：${stats.materialsRequired}
- 取得文书数：${stats.documentsIssued}
- 办结状态：${stats.outcome}

## 办件档案

\`\`\`
${renderCaseFile(cs.caseId, cs.matter, cs.events)}
\`\`\`

## 观察员分析

${analysis || "（未生成）"}
`;
    download(`${cs.caseId}.md`, md, "text/markdown");
  }

  if (!cs || !stats) return null;

  return (
    <main>
      <div className="hall-header">
        <div className="hall-header-inner">
          <span className="brand">AI 政务服务大厅</span>
          <span className="meta">办件回执与观察报告</span>
          <button className="btn-header" onClick={() => router.push("/hall")}>
            返回大厅
          </button>
          <button
            className="btn-header"
            onClick={() => {
              if (window.confirm("开始新的办件将清除当前办件档案（可先导出）。继续吗？")) {
                clearCase();
                router.push("/");
              }
            }}
          >
            办理新事项
          </button>
        </div>
      </div>

      <div className="page" style={{ maxWidth: 860 }}>
        <section className="card receipt">
          <h2>办 件 回 执</h2>
          <table>
            <tbody>
              <tr>
                <td>办件编号</td>
                <td>{cs.caseId}</td>
              </tr>
              <tr>
                <td>申办事项</td>
                <td>{cs.matter}</td>
              </tr>
              <tr>
                <td>办结状态</td>
                <td>{stats.outcome}</td>
              </tr>
              <tr>
                <td>开始时间</td>
                <td>{new Date(cs.startedAt).toLocaleString("zh-CN")}</td>
              </tr>
            </tbody>
          </table>
          <div className="seal" style={{ right: 40, bottom: 24, width: 92, height: 92, fontSize: 11 }}>
            <span className="star">✦</span>
            <span>
              AI政务服务大厅
              <br />
              综合受理
            </span>
          </div>
        </section>

        <h2 className="section-title">办件统计</h2>
        <div className="stats">
          <div className="stat">
            <div className="num">{stats.windowsVisited}</div>
            <div className="label">走过的窗口</div>
          </div>
          <div className="stat">
            <div className="num">{stats.referrals}</div>
            <div className="label">被转办次数</div>
          </div>
          <div className="stat">
            <div className="num">{stats.internalMemos}</div>
            <div className="label">内部函件</div>
          </div>
          <div className="stat">
            <div className="num">{stats.materialsRequired}</div>
            <div className="label">被要求的材料</div>
          </div>
          <div className="stat">
            <div className="num">{stats.documentsIssued}</div>
            <div className="label">取得的文书</div>
          </div>
          <div className="stat">
            <div className="num">{stats.userTurns}</div>
            <div className="label">窗口对话轮数</div>
          </div>
        </div>

        <h2 className="section-title">观察员分析（给设计师）</h2>
        <div className="card">
          {analysis ? (
            <div className="analysis">{analysis}</div>
          ) : (
            <div className="analysis" style={{ color: "var(--ink-3)" }}>
              由一位处于组织之外的观察员（同一模型的独立调用）通读办件档案，
              分析其中是否出现推诿、转办循环、程序性语体等官僚行为的迹象，并列出反证。
            </div>
          )}
          <div style={{ padding: "0 26px 22px" }}>
            <button className="btn" onClick={generate} disabled={generating}>
              {generating && <span className="spin" />}
              {analysis ? "重新生成分析" : "生成观察员分析"}
            </button>
          </div>
        </div>
        {error && <div className="err">{error}</div>}

        <h2 className="section-title">完整办件档案</h2>
        <div className="card timeline">
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
          <button className="btn" onClick={exportJson}>
            导出 JSON
          </button>
          <button className="btn" onClick={exportMarkdown}>
            导出 Markdown
          </button>
        </div>
      </div>
    </main>
  );
}
