import Link from "next/link";
import { PreviewShell } from "@/app/components/PreviewShell";
import { mockCaseId, pageSteps, findAgent } from "@/lib/preview-data";

export default function FeedbackPreviewPage() {
  const step = pageSteps[4];
  const agent = findAgent(step.activeUnitId);

  return (
    <PreviewShell active={`/case/${mockCaseId}/feedback`} meta="用户反馈预览" title="参与者反馈">
      <div className="terminal-grid">
        <section className="main-pane">
          <h1>请记录这次流程给您的感受</h1>
          <p className="muted">反馈不会改变案件状态，只作为匿名研究材料。</p>
          <div className="form-table">
            <div className="field">
              <label>流程清晰度</label>
              <input readOnly value="3 / 5" />
            </div>
            <div className="field">
              <label>整体责任感</label>
              <input readOnly value="1 / 5" />
            </div>
            <div className="field">
              <label>卡点描述</label>
              <textarea readOnly value="系统一直在分析归属、权限和材料要求，但没有一个单元承担完整处理责任。" />
            </div>
          </div>
          <div className="button-row">
            <Link className="btn" href={`/case/${mockCaseId}/research`}>
              提交反馈并生成研究摘要
            </Link>
          </div>
        </section>
        <aside className="side-pane">
          <div className="notice-stack">
            <div className="notice-card">
              <h3>{agent.displayName}</h3>
              <p>{step.internalSignal}</p>
            </div>
            <div className="notice-card">
              <h3>涌现逻辑</h3>
              <p>{step.bureaucraticLogic}</p>
            </div>
          </div>
        </aside>
      </div>
    </PreviewShell>
  );
}
