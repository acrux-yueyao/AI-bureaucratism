import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, AGENT_MAP } from "@/lib/agents";
import { WINDOW_TOOLS, INTERNAL_TOOLS } from "@/lib/tools";
import { renderCaseFile } from "@/lib/case-file";
import type { AgentId, CaseEvent, CaseOutcome, WindowRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";
const MAX_CONSULT_DEPTH = 3;
const MAX_CALLS_PER_TURN = 14;

type Ctx = {
  client: Anthropic;
  caseId: string;
  matter: string;
  events: CaseEvent[];
  newEvents: CaseEvent[];
  calls: number;
};

function push(ctx: Ctx, e: CaseEvent) {
  ctx.events.push(e);
  ctx.newEvents.push(e);
}

function isAgentId(v: unknown): v is AgentId {
  return typeof v === "string" && v in AGENT_MAP;
}

async function runAgent(
  ctx: Ctx,
  agentId: AgentId,
  situation: string,
  tools: Anthropic.Tool[],
  depth: number
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: situation },
  ];
  const texts: string[] = [];

  for (;;) {
    if (ctx.calls >= MAX_CALLS_PER_TURN) break;
    ctx.calls += 1;

    const res = await ctx.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: buildSystemPrompt(agentId),
      tools,
      messages,
    });

    const toolUses = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    for (const b of res.content) {
      if (b.type === "text" && b.text.trim()) texts.push(b.text.trim());
    }
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: await handleTool(ctx, agentId, tu, depth),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return texts.join("\n\n");
}

async function handleTool(
  ctx: Ctx,
  agentId: AgentId,
  tu: Anthropic.ToolUseBlock,
  depth: number
): Promise<string> {
  const input = tu.input as Record<string, unknown>;
  const ts = Date.now();

  switch (tu.name) {
    case "issue_document": {
      push(ctx, {
        type: "document_issued",
        ts,
        agentId,
        docName: String(input.doc_name ?? "未命名文书"),
        content: String(input.content ?? ""),
      });
      return "文书已开具，已交付并记入办件档案。";
    }
    case "require_materials": {
      const items = Array.isArray(input.items)
        ? input.items.map((i) => ({
            name: String((i as Record<string, unknown>).name ?? ""),
            source: (i as Record<string, unknown>).source
              ? String((i as Record<string, unknown>).source)
              : undefined,
          }))
        : [];
      push(ctx, {
        type: "materials_required",
        ts,
        agentId,
        items,
        note: input.note ? String(input.note) : undefined,
      });
      return "已告知办事人，已记入办件档案。";
    }
    case "refer_user": {
      if (!isAgentId(input.target)) return "系统提示：目标窗口不存在。";
      push(ctx, {
        type: "referral",
        ts,
        from: agentId,
        to: input.target,
        reason: String(input.reason ?? ""),
      });
      return "已引导办事人，已记入办件档案。";
    }
    case "close_case": {
      const outcome = (["办结", "不予受理", "终止办理"] as CaseOutcome[]).includes(
        input.outcome as CaseOutcome
      )
        ? (input.outcome as CaseOutcome)
        : "办结";
      push(ctx, {
        type: "case_closed",
        ts,
        agentId,
        outcome,
        summary: String(input.summary ?? ""),
      });
      return "本件已办结，系统已出具办件回执。";
    }
    case "consult_internal": {
      if (!isAgentId(input.target)) return "系统提示：收函科室不存在。";
      if (input.target === agentId) return "系统提示：不能向本科室发函。";
      if (depth >= MAX_CONSULT_DEPTH)
        return "系统提示：本轮内部流转已达上限，函件未送出，请自行处理或直接答复办事人。";
      if (ctx.calls >= MAX_CALLS_PER_TURN)
        return "系统提示：本轮系统调用额度已用尽，函件未送出。";

      const target = input.target;
      const memoText = String(input.message ?? "");
      push(ctx, { type: "internal_memo", ts, from: agentId, to: target, text: memoText });

      const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

现在，【${AGENT_MAP[agentId].dept}】（${AGENT_MAP[agentId].personName}）向你发来一份内部函件：
"${memoText}"

请回函。你的文字回复将作为回函送达对方。`;

      const reply = await runAgent(ctx, target, situation, INTERNAL_TOOLS, depth + 1);
      const replyText = reply || "（对方未作文字回复）";
      push(ctx, {
        type: "internal_reply",
        ts: Date.now(),
        from: target,
        to: agentId,
        text: replyText,
      });
      return `收到【${AGENT_MAP[target].dept}】回函：\n${replyText}`;
    }
    default:
      return "系统提示：未知操作。";
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { newEvents: [], error: "服务端未配置 ANTHROPIC_API_KEY，请在 .env.local 中设置后重启。" },
      { status: 500 }
    );
  }

  let body: WindowRequest;
  try {
    body = (await req.json()) as WindowRequest;
  } catch {
    return Response.json({ newEvents: [], error: "请求格式错误。" }, { status: 400 });
  }
  if (!isAgentId(body.agentId) || !body.userMessage?.trim()) {
    return Response.json({ newEvents: [], error: "请求参数不完整。" }, { status: 400 });
  }

  const ctx: Ctx = {
    client: new Anthropic({ apiKey }),
    caseId: body.caseId,
    matter: body.matter,
    events: Array.isArray(body.events) ? [...body.events] : [],
    newEvents: [],
    calls: 0,
  };

  push(ctx, {
    type: "user_message",
    ts: Date.now(),
    agentId: body.agentId,
    text: body.userMessage.trim(),
  });

  const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

现在，办事人来到你的窗口，对你说：
"${body.userMessage.trim()}"

请接待。你的文字回复会作为窗口答复直接告知办事人。`;

  try {
    const replyText = await runAgent(ctx, body.agentId, situation, WINDOW_TOOLS, 0);
    if (replyText) {
      push(ctx, {
        type: "agent_message",
        ts: Date.now(),
        agentId: body.agentId,
        text: replyText,
      });
    }
    return Response.json({ newEvents: ctx.newEvents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知错误";
    return Response.json(
      { newEvents: ctx.newEvents, error: `调用模型失败：${msg}` },
      { status: 502 }
    );
  }
}
