import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, AGENT_MAP, WINDOW_AGENTS } from "@/lib/agents";
import { toolsFor } from "@/lib/tools";
import { renderCaseFile } from "@/lib/case-file";
import { renderConditions } from "@/lib/conditions";
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
const MAX_ROUTING_DEPTH = 4;
const MAX_CALLS_PER_TURN = 18;

type Ctx = {
  client: Anthropic;
  caseId: string;
  matter: string;
  events: CaseEvent[];
  calls: number;
  conditionsBlock: string;
  experience: Partial<Record<AgentId, string>>;
  archiveDigest: string;
  emit: (frame: StreamFrame) => void;
};

// The archive digest goes to Records & Certification only — precedent must
// travel through the organization's own channels.
const ARCHIVE_KEEPER: AgentId = "dangan";

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

function isWindowId(v: unknown): v is AgentId {
  return isAgentId(v) && WINDOW_AGENTS.some((a) => a.id === v);
}

async function runAgent(
  ctx: Ctx,
  agentId: AgentId,
  situation: string,
  depth: number
): Promise<string> {
  signal(ctx, {
    type: "status",
    agentId,
    state: depth === 0 ? "receiving" : "replying",
  });

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: situation }];
  const texts: string[] = [];

  try {
    for (;;) {
      if (ctx.calls >= MAX_CALLS_PER_TURN) break;
      ctx.calls += 1;

      const stream = ctx.client.messages.stream({
        model: MODEL,
        max_tokens: 1500,
        system: buildSystemPrompt(
          agentId,
          ctx.conditionsBlock,
          (ctx.experience[agentId] ?? "") +
            (agentId === ARCHIVE_KEEPER ? ctx.archiveDigest : "")
        ),
        tools: toolsFor(agentId, depth > 0),
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

async function routeMemo(
  ctx: Ctx,
  from: AgentId,
  to: AgentId,
  text: string,
  channel: "peer" | "up" | "down",
  depth: number
): Promise<string> {
  if (depth >= MAX_ROUTING_DEPTH)
    return "System notice: the routing limit for this exchange has been reached. The message was not sent; handle the matter yourself.";
  if (ctx.calls >= MAX_CALLS_PER_TURN)
    return "System notice: the call budget for this exchange is exhausted. The message was not sent.";

  signal(ctx, { type: "status", agentId: from, state: "consulting", target: to });
  push(ctx, { type: "internal_memo", ts: Date.now(), from, to, text, channel });

  const intro =
    channel === "up"
      ? `${AGENT_MAP[from].personName} (${AGENT_MAP[from].dept}), who reports to you, has escalated the following to you:`
      : channel === "down"
        ? `${AGENT_MAP[from].personName} (${AGENT_MAP[from].dept}), whom you report to, has assigned you the following task:`
        : `${AGENT_MAP[from].personName} (${AGENT_MAP[from].dept}) has sent you a peer memo:`;

  const closing =
    channel === "down"
      ? "Carry out or respond to the assignment as you judge fit. Your text response is returned to them as your result."
      : "Respond as you judge fit. Your text response is returned to them as your reply.";

  const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

${intro}
"${text}"

${closing}`;

  const reply = await runAgent(ctx, to, situation, depth + 1);
  const replyText = reply || "(no written reply)";
  push(ctx, {
    type: "internal_reply",
    ts: Date.now(),
    from: to,
    to: from,
    text: replyText,
    channel,
  });
  signal(ctx, {
    type: "status",
    agentId: from,
    state: depth === 0 ? "receiving" : "replying",
  });
  return `Response from ${AGENT_MAP[to].personName} (${AGENT_MAP[to].dept}):\n${replyText}`;
}

async function handleTool(
  ctx: Ctx,
  agentId: AgentId,
  tu: Anthropic.ToolUseBlock,
  depth: number
): Promise<string> {
  const input = tu.input as Record<string, unknown>;
  const ts = Date.now();
  const me = AGENT_MAP[agentId];

  switch (tu.name) {
    case "issue_document": {
      push(ctx, {
        type: "document_issued",
        ts,
        agentId,
        docName: String(input.doc_name ?? "Untitled document"),
        content: String(input.content ?? ""),
      });
      return "Document issued under your name and entered into the case file.";
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
      if (!isWindowId(input.target)) return "System notice: no such window.";
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
      if (!isAgentId(input.target)) return "System notice: no such member of staff.";
      if (input.target === agentId)
        return "System notice: you cannot send a memo to yourself.";
      return routeMemo(ctx, agentId, input.target, String(input.message ?? ""), "peer", depth);
    }
    case "escalate": {
      if (!me.superior) return "System notice: you have no superior to escalate to.";
      return routeMemo(ctx, agentId, me.superior, String(input.message ?? ""), "up", depth);
    }
    case "assign_work": {
      if (!isAgentId(input.target)) return "System notice: no such member of staff.";
      if (!me.subordinates.includes(input.target))
        return "System notice: that person does not work under you.";
      return routeMemo(ctx, agentId, input.target, String(input.task ?? ""), "down", depth);
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
  if (!isWindowId(body.agentId) || !body.userMessage?.trim()) {
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
            message:
              "The server is missing ANTHROPIC_API_KEY. Set it in .env.local and restart.",
          },
        });
        finish();
        return;
      }

      const ctx: Ctx = {
        client: new Anthropic({ apiKey, timeout: 90_000, maxRetries: 2 }),
        caseId: body.caseId,
        matter: body.matter,
        events: Array.isArray(body.events) ? [...body.events] : [],
        calls: 0,
        conditionsBlock: renderConditions(body.conditionId),
        experience: body.experience ?? {},
        archiveDigest: typeof body.archiveDigest === "string" ? body.archiveDigest : "",
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
        const replyText = await runAgent(ctx, body.agentId, situation, 0);
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
        emit({
          kind: "signal",
          signal: { type: "error", message: `Model call failed: ${msg}` },
        });
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
