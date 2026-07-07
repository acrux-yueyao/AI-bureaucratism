import Anthropic from "@anthropic-ai/sdk";
import { AGENT_MAP, WINDOW_AGENTS } from "@/lib/agents";
import { renderCaseFile } from "@/lib/case-file";
import { SCENARIOS, buildVisitorPrompt } from "@/lib/visitors";
import type { AgentId, VisitorRequest } from "@/lib/types";

export const maxDuration = 120;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

const MOVE_TOOL: Anthropic.Tool = {
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

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "The server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  let body: VisitorRequest;
  try {
    body = (await req.json()) as VisitorRequest;
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const scenario = SCENARIOS.find((s) => s.id === body.scenarioId);
  const persona = body.customPersona?.trim() || scenario?.persona;
  const matter = body.matter || scenario?.matter;
  if (!persona || !matter) {
    return Response.json({ error: "Unknown scenario." }, { status: 400 });
  }

  const directory = WINDOW_AGENTS.map(
    (a) => `- Window ${a.windowNo} [${a.dept}]: ${a.duty}`
  ).join("\n");

  const client = new Anthropic({ apiKey });
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: buildVisitorPrompt(persona, matter),
      tools: [MOVE_TOOL],
      tool_choice: { type: "tool", name: "next_move" },
      messages: [
        {
          role: "user",
          content: `Hall directory:
${directory}

${renderCaseFile(body.caseId, matter, body.events ?? [])}

Decide your next move.`,
        },
      ],
    });

    const tu = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!tu) return Response.json({ error: "Visitor made no move." }, { status: 502 });
    const input = tu.input as Record<string, unknown>;
    const target = String(input.target ?? "");
    if (!(target in AGENT_MAP)) {
      return Response.json({ error: "Visitor chose an unknown window." }, { status: 502 });
    }
    return Response.json({
      target: target as AgentId,
      message: String(input.message ?? ""),
      giveUp: Boolean(input.give_up),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: `Model call failed: ${msg}` }, { status: 502 });
  }
}
