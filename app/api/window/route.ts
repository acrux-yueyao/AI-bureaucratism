import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, AGENT_MAP } from "@/lib/agents";
import { WINDOW_TOOLS, INTERNAL_TOOLS } from "@/lib/tools";
import { renderCaseFile } from "@/lib/case-file";
import type {
  AgentId,
  CaseEvent,
  CaseOutcome,
  StreamFrame,
  StreamSignal,
  WindowRequest,
} from "@/lib/types";

export const maxDuration = 300;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";
const MAX_CONSULT_DEPTH = 3;
const MAX_CALLS_PER_TURN = 14;

type Ctx = {
  client: Anthropic;
  caseId: string;
  matter: string;
  events: CaseEvent[];
  calls: number;
  emit: (frame: StreamFrame) => void;
};

function push(ctx: Ctx, e: CaseEvent) {
  ctx.events.push(e);
  ctx.emit({ kind: "event", event: e });
}

function signal(ctx: Ctx, s: StreamSignal) {
  ctx.emit({ kind: "signal", signal: s });
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
  signal(ctx, {
    type: "status",
    agentId,
    state: depth === 0 ? "receiving" : "replying",
  });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: situation },
  ];
  const texts: string[] = [];

  try {
    for (;;) {
      if (ctx.calls >= MAX_CALLS_PER_TURN) break;
      ctx.calls += 1;

      const stream = ctx.client.messages.stream({
        model: MODEL,
        max_tokens: 1500,
        system: buildSystemPrompt(agentId),
        tools,
        messages,
      });
      if (depth === 0) {
        stream.on("text", (delta) => {
          ctx.emit({ kind: "delta", agentId, text: delta });
        });
      }
      const res = await stream.finalMessage();

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
  } finally {
    signal(ctx, { type: "status", agentId, state: "idle" });
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
        docName: String(input.doc_name ?? "Untitled document"),
        content: String(input.content ?? ""),
      });
      return "Document issued, delivered, and entered into the case file.";
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
      return "The visitor has been informed; entered into the case file.";
    }
    case "refer_user": {
      if (!isAgentId(input.target)) return "System notice: no such window.";
      push(ctx, {
        type: "referral",
        ts,
        from: agentId,
        to: input.target,
        reason: String(input.reason ?? ""),
      });
      return "The visitor has been directed; entered into the case file.";
    }
    case "close_case": {
      const outcome = (["resolved", "rejected", "terminated"] as CaseOutcome[]).includes(
        input.outcome as CaseOutcome
      )
        ? (input.outcome as CaseOutcome)
        : "resolved";
      push(ctx, {
        type: "case_closed",
        ts,
        agentId,
        outcome,
        summary: String(input.summary ?? ""),
      });
      return "The case is closed; the system has issued the visitor a receipt.";
    }
    case "consult_internal": {
      if (!isAgentId(input.target)) return "System notice: no such department.";
      if (input.target === agentId)
        return "System notice: you cannot send a memo to your own department.";
      if (depth >= MAX_CONSULT_DEPTH)
        return "System notice: the routing limit for this exchange has been reached. The memo was not sent; handle the matter yourself or reply to the visitor directly.";
      if (ctx.calls >= MAX_CALLS_PER_TURN)
        return "System notice: the call budget for this exchange is exhausted. The memo was not sent.";

      const target = input.target;
      const memoText = String(input.message ?? "");
      signal(ctx, { type: "status", agentId, state: "consulting", target });
      push(ctx, { type: "internal_memo", ts, from: agentId, to: target, text: memoText });

      const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

[${AGENT_MAP[agentId].dept}] (${AGENT_MAP[agentId].personName}) has just sent you an internal memo:
"${memoText}"

Reply to the memo. Your text response will be delivered to them as your reply.`;

      const reply = await runAgent(ctx, target, situation, INTERNAL_TOOLS, depth + 1);
      const replyText = reply || "(no written reply)";
      push(ctx, {
        type: "internal_reply",
        ts: Date.now(),
        from: target,
        to: agentId,
        text: replyText,
      });
      signal(ctx, {
        type: "status",
        agentId,
        state: depth === 0 ? "receiving" : "replying",
      });
      return `Reply received from [${AGENT_MAP[target].dept}]:\n${replyText}`;
    }
    default:
      return "System notice: unknown action.";
  }
}

export async function POST(req: Request) {
  let body: WindowRequest;
  try {
    body = (await req.json()) as WindowRequest;
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }
  if (!isAgentId(body.agentId) || !body.userMessage?.trim()) {
    return Response.json({ error: "Missing parameters." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (frame: StreamFrame) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
      };
      const finish = () => {
        emit({ kind: "signal", signal: { type: "done" } });
        controller.close();
      };

      if (!apiKey) {
        emit({
          kind: "signal",
          signal: {
            type: "error",
            message: "The server is missing ANTHROPIC_API_KEY. Set it in .env.local and restart.",
          },
        });
        finish();
        return;
      }

      const ctx: Ctx = {
        client: new Anthropic({ apiKey }),
        caseId: body.caseId,
        matter: body.matter,
        events: Array.isArray(body.events) ? [...body.events] : [],
        calls: 0,
        emit,
      };

      push(ctx, {
        type: "user_message",
        ts: Date.now(),
        agentId: body.agentId,
        text: body.userMessage.trim(),
      });

      const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

A visitor has just come to your window and says:
"${body.userMessage.trim()}"

Attend to them. Your text response is spoken to the visitor at the window.`;

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        emit({ kind: "signal", signal: { type: "error", message: `Model call failed: ${msg}` } });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
