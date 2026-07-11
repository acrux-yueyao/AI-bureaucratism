import { checkLivePass } from "@/lib/livepass";
import { AGENT_MAP, WINDOW_AGENTS } from "@/lib/agents";
import { renderConditions } from "@/lib/conditions";
import { anthropicAdapter } from "@/lib/llm";
import { runWindowTurn, type EngineCtx } from "@/lib/engine";
import { FULL_ABLATION } from "@/lib/ablation";
import type { AgentId, StreamFrame, WindowRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

function isWindowId(v: unknown): v is AgentId {
  return typeof v === "string" && v in AGENT_MAP && WINDOW_AGENTS.some((a) => a.id === v);
}

export async function POST(req: Request) {
  const locked = checkLivePass(req);
  if (locked) return locked;
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
              "live_disabled",
          },
        });
        finish();
        return;
      }

      const ctx: EngineCtx = {
        adapter: anthropicAdapter({ apiKey, model: MODEL }),
        caseId: body.caseId,
        matter: body.matter,
        events: Array.isArray(body.events) ? [...body.events] : [],
        calls: 0,
        conditionsBlock: renderConditions(body.conditionId),
        experience: body.experience ?? {},
        archiveDigest: typeof body.archiveDigest === "string" ? body.archiveDigest : "",
        ablation: FULL_ABLATION,
        emit,
      };

      try {
        await runWindowTurn(ctx, body.agentId, body.userMessage);
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
