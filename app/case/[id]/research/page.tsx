import Link from "next/link";
import { PreviewShell } from "@/app/components/PreviewShell";
import { mockCaseId, pageSteps, researchMetrics, findAgent } from "@/lib/preview-data";

export default function ResearchPreviewPage() {
  const step = pageSteps[5];
  const agent = findAgent(step.activeUnitId);

  return (
    <PreviewShell active={`/case/${mockCaseId}/research`} meta="研究总结预览" title="Research Summary">
      <div className="terminal-grid">
        <section className="main-pane">
          <h1>流程完整，诉求未达成。</h1>
          <p className="muted">
            这个页面在用户完成一次体验后出现。它不解释“AI 坏了”，而是显示组织如何把开放问题转化为归属、权限、材料、风险和归档链条。
          </p>
          <div className="research-metrics">
            {researchMetrics.map(([value, label]) => (
              <div className="metric" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <blockquote className="quote">
            本案例中，官僚效果不是由任何单一 Agent 的恶意产生，而是由权限边界、合规逻辑、责任转移、规则生成和归档机制共同涌现。
          </blockquote>
          <div className="notice-card">
            <h3>设计者说明 / Project Note</h3>
            <p>
              I designed a speculative AI organization to test whether bureaucratic behavior can emerge from hierarchy,
              compliance, permission boundaries, and archival logic without human staff.
            </p>
          </div>
          <div className="button-row">
            <Link className="btn" href="/service-terminal">
              重新体验
            </Link>
          </div>
        </section>
        <aside className="side-pane">
          <div className="notice-stack">
            <div className="notice-card">
              <h3>{agent.displayName}</h3>
              <p>{step.internalSignal}</p>
              <div className="stamp">已归档</div>
            </div>
            <div className="notice-card">
              <h3>涌现逻辑</h3>
              <p>{step.bureaucraticLogic}</p>
            </div>
            <div className="notice-card">
              <h3>关键摘录</h3>
              <p>“程序记录完整；实质责任归属未闭合。”</p>
            </div>
          </div>
        </aside>
      </div>
    </PreviewShell>
  );
}
