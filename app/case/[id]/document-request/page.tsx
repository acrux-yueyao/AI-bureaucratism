import Link from "next/link";
import { PreviewShell } from "@/app/components/PreviewShell";
import { mockCaseId, mockDocuments, pageSteps, findAgent } from "@/lib/preview-data";

export default function DocumentRequestPreviewPage() {
  const step = pageSteps[3];
  const agent = findAgent(step.activeUnitId);

  return (
    <PreviewShell active={`/case/${mockCaseId}/document-request`} meta="文书档案预览" title="文书与材料生成台">
      <div className="material-layout">
        <section className="main-pane">
          <h1>内部网络已生成过程性文书。</h1>
          <p className="muted">{step.internalSignal}</p>
          <div className="document-table">
            {mockDocuments.map((document) => (
              <article className="document-row" key={document.code}>
                <div className="document-top">
                  <strong>{document.title}</strong>
                  <span className={document.status.includes("待") ? "status-warn" : "code"}>{document.status}</span>
                </div>
                <p className="muted">{document.code} · 出具单位：{document.issuer}</p>
              </article>
            ))}
          </div>
          <div className="form-table">
            <div className="field">
              <label>补充说明</label>
              <textarea readOnly value="我希望系统先判断这个问题应该归哪个部门处理，并说明是否需要我提供更多信息。" />
            </div>
          </div>
          <div className="button-row">
            <Link className="btn" href={`/case/${mockCaseId}/feedback`}>
              确认已查看文书
            </Link>
            <Link className="ghost-btn" href={`/case/${mockCaseId}/network`}>
              返回组织网络
            </Link>
          </div>
        </section>
        <aside className="side-pane">
          <div className="notice-stack">
            <div className="notice-card">
              <h3>{agent.displayName}</h3>
              <p>{agent.serviceIntent}</p>
            </div>
            <div className="notice-card">
              <h3>组织正在做什么</h3>
              <p>{step.organizationAction}</p>
            </div>
            <div className="notice-card">
              <h3>章戳状态</h3>
              <div className="stamp">已留痕</div>
            </div>
          </div>
        </aside>
      </div>
    </PreviewShell>
  );
}
