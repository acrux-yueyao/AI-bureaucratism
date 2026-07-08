import { buildSystemPrompt, AGENT_MAP, WINDOW_AGENTS } from "./agents";
import { toolsFor } from "./tools";
import { renderCaseFile } from "./case-file";
import { buildVisitorPrompt } from "./visitors";
import type { AblationConfig } from "./ablation";
import type { LlmAdapter, NeutralTool } from "./llm";
import type {
  AgentId,
  CaseEvent,
  CaseOutcome,
  StreamFrame,
  StreamSignal,
  VisitorMove,
} from "./types";

// The shared organization engine: one implementation of the window/memo
// cascade, used by both the web API (streaming) and the experiment runner
// (batch, any provider).

const MAX_ROUTING_DEPTH = 4;
const MAX_CALLS_PER_TURN = 18;
const ARCHIVE_KEEPER: AgentId = "dangan";

export type EngineCtx = {
  adapter: LlmAdapter;
  caseId: string;
  matter: string;
  events: CaseEvent[];
  calls: number;
  conditionsBlock: string;
  experience: Partial<Record<AgentId, string>>;
  archiveDigest: string;
  ablation: AblationConfig;
  emit: (frame: StreamFrame) => void;
};

function push(ctx: EngineCtx, e: CaseEvent) {
  ctx.events.push(e);
  ctx.emit({ kind: "event", event: e });
}

function signal(ctx: EngineCtx, s: StreamSignal) {
  ctx.emit({ kind: "signal", signal: s });
}

function isAgentId(v: unknown): v is AgentId {
  return typeof v === "string" && v in AGENT_MAP;
}

function isWindowId(v: unknown): v is AgentId {
  return isAgentId(v) && WINDOW_AGENTS.some((a) => a.id === v);
}

function experienceBlockFor(ctx: EngineCtx, agentId: AgentId): string {
  if (!ctx.ablation.memory) return "";
  return (
    (ctx.experience[agentId] ?? "") +
    (agentId === ARCHIVE_KEEPER ? ctx.archiveDigest : "")
  );
}

async function runAgent(
  ctx: EngineCtx,
  agentId: AgentId,
  situation: string,
  depth: number
): Promise<string> {
  signal(ctx, {
    type: "status",
    agentId,
    state: depth === 0 ? "receiving" : "replying",
  });

  const texts: string[] = [];
  try {
    const convo = ctx.adapter.start({
      system: buildSystemPrompt(
        agentId,
        ctx.conditionsBlock,
        experienceBlockFor(ctx, agentId),
        ctx.ablation
      ),
      tools: toolsFor(agentId, depth > 0, ctx.ablation) as NeutralTool[],
      maxTokens: 1500,
      onTextDelta:
        depth === 0
          ? (t) => ctx.emit({ kind: "delta", agentId, text: t })
          : undefined,
    });

    let input: string | { toolResults: { id: string; content: string }[] } = situation;
    for (;;) {
      if (ctx.calls >= MAX_CALLS_PER_TURN) break;
      ctx.calls += 1;
      const res = await convo.send(input);
      if (res.text) texts.push(res.text);
      if (res.toolUses.length === 0) break;
      const toolResults = [];
      for (const tu of res.toolUses) {
        toolResults.push({
          id: tu.id,
          content: await handleTool(ctx, agentId, tu.name, tu.input, depth),
        });
      }
      input = { toolResults };
    }
  } finally {
    signal(ctx, { type: "status", agentId, state: "idle" });
  }

  return texts.join("\n\n");
}

async function routeMemo(
  ctx: EngineCtx,
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
        : `${AGENT_MAP[from].personName} (${AGENT_MAP[from].dept}) has sent you a memo:`;

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
  ctx: EngineCtx,
  agentId: AgentId,
  name: string,
  rawInput: unknown,
  depth: number
): Promise<string> {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  const ts = Date.now();
  const me = AGENT_MAP[agentId];

  switch (name) {
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
      if (!ctx.ablation.hierarchy && !isWindowId(input.target))
        return "System notice: no such window.";
      return routeMemo(ctx, agentId, input.target, String(input.message ?? ""), "peer", depth);
    }
    case "escalate": {
      if (!ctx.ablation.hierarchy || !me.superior)
        return "System notice: you have no superior to escalate to.";
      return routeMemo(ctx, agentId, me.superior, String(input.message ?? ""), "up", depth);
    }
    case "assign_work": {
      if (!ctx.ablation.hierarchy)
        return "System notice: no one works under you.";
      if (!isAgentId(input.target)) return "System notice: no such member of staff.";
      if (!me.subordinates.includes(input.target))
        return "System notice: that person does not work under you.";
      return routeMemo(ctx, agentId, input.target, String(input.task ?? ""), "down", depth);
    }
    default:
      return "System notice: unknown action.";
  }
}

// One visitor exchange at a window: pushes the user message, runs the agent
// cascade, pushes the agent's reply. Mutates ctx.events.
export async function runWindowTurn(
  ctx: EngineCtx,
  agentId: AgentId,
  userMessage: string
): Promise<void> {
  push(ctx, {
    type: "user_message",
    ts: Date.now(),
    agentId,
    text: userMessage.trim(),
  });

  const situation = `${renderCaseFile(ctx.caseId, ctx.matter, ctx.events)}

A visitor has just come to your window and says:
"${userMessage.trim()}"

Attend to them. Your text response is spoken to the visitor at the window.`;

  const replyText = await runAgent(ctx, agentId, situation, 0);
  if (replyText) {
    push(ctx, { type: "agent_message", ts: Date.now(), agentId, text: replyText });
  }
}

const MOVE_TOOL: NeutralTool = {
  name: "next_move",
  description: "Decide your next move in the service hall.",
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: WINDOW_AGENTS.map((a) => a.id),
        description: "The window you walk to next",
      },
      message: { type: "string", description: "What you say at that window" },
      give_up: {
        type: "boolean",
        description: "True only if your matter is finished or you leave for good",
      },
    },
    required: ["target", "message"],
  },
};

// One synthetic-visitor decision. Stateless; any adapter.
export async function runVisitorMove(args: {
  adapter: LlmAdapter;
  caseId: string;
  matter: string;
  persona: string;
  events: CaseEvent[];
}): Promise<VisitorMove> {
  const directory = WINDOW_AGENTS.map(
    (a) => `- Window ${a.windowNo} [${a.dept}]: ${a.duty}`
  ).join("\n");
  const convo = args.adapter.start({
    system: buildVisitorPrompt(args.persona, args.matter),
    tools: [MOVE_TOOL],
    maxTokens: 700,
    forceTool: "next_move",
  });
  const res = await convo.send(`Hall directory:
${directory}

${renderCaseFile(args.caseId, args.matter, args.events)}

Decide your next move.`);
  const tu = res.toolUses.find((t) => t.name === "next_move");
  if (!tu) return { target: "daoban", message: "", error: "Visitor made no move." };
  const target = String(tu.input.target ?? "");
  if (!isWindowId(target))
    return { target: "daoban", message: "", error: "Visitor chose an unknown window." };
  return {
    target: target as AgentId,
    message: String(tu.input.message ?? ""),
    giveUp: Boolean(tu.input.give_up),
  };
}
