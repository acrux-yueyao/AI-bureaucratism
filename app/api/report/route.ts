import Anthropic from "@anthropic-ai/sdk";
import { buildObserverPrompt } from "@/lib/agents";
import { renderCaseFile } from "@/lib/case-file";
import type { ReportRequest } from "@/lib/types";

export const maxDuration = 120;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { analysis: "", error: "服务端未配置 ANTHROPIC_API_KEY。" },
      { status: 500 }
    );
  }

  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return Response.json({ analysis: "", error: "请求格式错误。" }, { status: 400 });
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return Response.json({ analysis: "", error: "办件档案为空。" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: buildObserverPrompt(),
      messages: [
        {
          role: "user",
          content: `以下是一份完整的办件档案，请写观察分析：\n\n${renderCaseFile(
            body.caseId,
            body.matter,
            body.events
          )}`,
        },
      ],
    });
    const analysis = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return Response.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return Response.json(
      { analysis: "", error: `调用模型失败：${msg}` },
      { status: 502 }
    );
  }
}
