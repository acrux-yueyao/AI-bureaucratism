import { PreviewShell } from "@/app/components/PreviewShell";
import { NetworkPlayback } from "@/app/components/NetworkPlayback";
import { defaultOpenRequest, mockCaseId, pageSteps } from "@/lib/preview-data";

export default async function CaseNetworkPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  await params;
  const { q } = await searchParams;
  const openRequest = q?.trim() || defaultOpenRequest;
  const step = pageSteps[2];

  return (
    <PreviewShell active={`/case/${mockCaseId}/network`} meta={`组织后台观察 / ${mockCaseId}`} title="AI 组织神经网络">
      <div className="network-intro">
        <div>
          <h1>Agent 正在判断这个问题到底归谁管。</h1>
          <p className="muted">
            用户只触发事件；后续演出发生在 Agent 之间的内部指令、转交、风险意见和记录生成中。
          </p>
        </div>
        <div className="request-capsule">
          <span>外部问题原文</span>
          <strong>{openRequest}</strong>
        </div>
      </div>
      <NetworkPlayback openRequest={openRequest} />
      <div className="network-note">
        <strong>观察提示</strong>
        <span>{step.bureaucraticLogic}</span>
      </div>
    </PreviewShell>
  );
}
