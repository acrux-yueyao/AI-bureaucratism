import Link from "next/link";
import { PreviewShell } from "@/app/components/PreviewShell";
import { agentRoster, defaultOpenRequest, mockCaseId, pageSteps } from "@/lib/preview-data";

export default async function ApplyPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await params;
  const { q } = await searchParams;
  const openRequest = q?.trim() || defaultOpenRequest;
  const encodedRequest = encodeURIComponent(openRequest);
  const step = pageSteps[1];
  const guidance = agentRoster.find((item) => item.id === "guidance");
  const intake = agentRoster.find((item) => item.id === "intake");

  return (
    <PreviewShell active="/apply/custom" meta="归口预检 / Intake Routing" title="开放问题归口预检">
      <div className="terminal-grid">
        <section className="main-pane">
          <h1>系统已接收问题，正在建立临时 Case。</h1>
          <p className="muted">从这里开始，用户退到观察位置；后续主要由 Agent 之间互相下达指令。</p>
          <div className="form-table">
            <div className="field">
              <label>问题原文</label>
              <textarea readOnly value={openRequest} />
            </div>
            <div className="field">
              <label>临时编号</label>
              <input readOnly value={mockCaseId} />
            </div>
            <div className="field">
              <label>首轮状态</label>
              <input readOnly value="归属未定，进入 AI 组织神经网络分析。" />
            </div>
          </div>
          <div className="handoff-preview">
            <article>
              <span>01</span>
              <strong>{guidance?.displayName}</strong>
              <p>将自然语言问题转换为“开放问题归属分析”路径。</p>
            </article>
            <article>
              <span>02</span>
              <strong>{intake?.displayName}</strong>
              <p>生成 Case ID，记录原文，不判断是否通过。</p>
            </article>
            <article>
              <span>03</span>
              <strong>权限边界 Agent</strong>
              <p>判断哪个办公单元有权首先处理。</p>
            </article>
          </div>
          <div className="button-row">
            <Link className="btn" href={`/case/${mockCaseId}/network?q=${encodedRequest}`}>
              进入组织神经网络
            </Link>
            <Link className="ghost-btn" href="/service-terminal">
              返回修改问题
            </Link>
          </div>
        </section>
        <aside className="side-pane">
          <div className="notice-stack">
            <div className="notice-card">
              <h3>当前内部信号</h3>
              <p>{step.internalSignal}</p>
            </div>
            <div className="notice-card">
              <h3>组织动作</h3>
              <p>{step.organizationAction}</p>
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
