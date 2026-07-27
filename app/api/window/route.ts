import { checkLivePass } from "@/lib/livepass";
import { AGENT_MAP, WINDOW_AGENTS } from "@/lib/agents";
import { renderConditions } from "@/lib/conditions";
import { anthropicAdapter } from "@/lib/llm";
import { runWindowTurn, type EngineCtx } from "@/lib/engine";
import { parseAblation } from "@/lib/ablation";
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

  // SSE comment heartbeat: keeps proxies and flaky routes from silently
  // killing the connection during long engine stretches (memo chains).
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (frame: StreamFrame) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        } catch {
          closed = true;
        }
      };
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: hb\n\n`));
        } catch {
          closed = true;
        }
      }, 15000);
      const finish = () => {
        emit({ kind: "signal", signal: { type: "done" } });
        if (heartbeat) clearInterval(heartbeat);
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed by cancel
        }
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
        ablation: parseAblation(body.ablationId),
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
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
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
