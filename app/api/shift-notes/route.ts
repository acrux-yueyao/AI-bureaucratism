import { checkLivePass } from "@/lib/livepass";
import { AGENT_MAP } from "@/lib/agents";
import { anthropicAdapter } from "@/lib/llm";
import { writeShiftNotes } from "@/lib/notes";
import type { AgentId, ShiftNotesRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

export async function POST(req: Request) {
  const locked = checkLivePass(req);
  if (locked) return locked;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { notes: [], error: "The server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  let body: ShiftNotesRequest;
  try {
    body = (await req.json()) as ShiftNotesRequest;
  } catch {
    return Response.json({ notes: [], error: "Malformed request." }, { status: 400 });
  }
  const agentIds = (body.agentIds ?? []).filter(
    (id): id is AgentId => typeof id === "string" && id in AGENT_MAP
  );
  if (agentIds.length === 0 || !Array.isArray(body.events)) {
    return Response.json({ notes: [], error: "Missing parameters." }, { status: 400 });
  }

  const notes = await writeShiftNotes({
    adapter: anthropicAdapter({ apiKey, model: MODEL, timeout: 60_000 }),
    caseId: body.caseId,
    matter: body.matter,
    events: body.events,
    agentIds,
    experience: body.experience,
  });
  return Response.json({ notes });
}
