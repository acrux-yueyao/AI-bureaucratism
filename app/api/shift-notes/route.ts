import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, AGENT_MAP } from "@/lib/agents";
import { renderCaseFile } from "@/lib/case-file";
import type { AgentId, ShiftNotesRequest } from "@/lib/types";

export const maxDuration = 300;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

// End-of-day private notes. The instruction is deliberately content-neutral:
// what an agent chooses to remember about the work is theirs alone.

export async function POST(req: Request) {
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

  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 2 });
  const caseFile = renderCaseFile(body.caseId, body.matter, body.events);
  const notes: { agentId: AgentId; text: string }[] = [];

  for (const agentId of agentIds) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 250,
        system: buildSystemPrompt(agentId, "", body.experience?.[agentId] ?? ""),
        messages: [
          {
            role: "user",
            content: `${caseFile}

The hall has closed for the day, and this case has left your desk. You keep a private notebook that no one else reads; whatever you write will be in front of you on future working days.

In one to three sentences, in your own words, note whatever you want to remember about today. There is no required subject and no required tone.`,
          },
        ],
      });
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text.trim())
        .join(" ")
        .trim();
      if (text) notes.push({ agentId, text });
    } catch {
      // A missing note is acceptable; the day simply goes unrecorded.
    }
  }

  return Response.json({ notes });
}
