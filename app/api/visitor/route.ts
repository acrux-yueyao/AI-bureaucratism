import { checkLivePass } from "@/lib/livepass";
import { anthropicAdapter } from "@/lib/llm";
import { runVisitorMove } from "@/lib/engine";
import { SCENARIOS } from "@/lib/visitors";
import type { VisitorRequest } from "@/lib/types";

export const maxDuration = 120;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

export async function POST(req: Request) {
  const locked = checkLivePass(req);
  if (locked) return locked;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "live_disabled" },
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

  try {
    const move = await runVisitorMove({
      adapter: anthropicAdapter({ apiKey, model: MODEL }),
      caseId: body.caseId,
      matter,
      persona,
      events: body.events ?? [],
    });
    if (move.error) return Response.json(move, { status: 502 });
    return Response.json(move);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: `Model call failed: ${msg}` }, { status: 502 });
  }
}
