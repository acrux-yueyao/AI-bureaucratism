import Anthropic from "@anthropic-ai/sdk";
import { buildObserverPrompt } from "@/lib/agents";
import { renderCaseFile } from "@/lib/case-file";
import { CONDITION_MAP } from "@/lib/conditions";
import type { ReportRequest } from "@/lib/types";

export const maxDuration = 120;

const MODEL = process.env.AIB_MODEL || "claude-sonnet-5";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { analysis: "", error: "The server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return Response.json({ analysis: "", error: "Malformed request." }, { status: 400 });
  }
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return Response.json({ analysis: "", error: "The case file is empty." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey, timeout: 300_000, maxRetries: 2 });
  const cond = body.conditionId ? CONDITION_MAP[body.conditionId] : undefined;
  const condNote =
    cond && cond.facts.length > 0
      ? `\n\nEnvironmental conditions injected for this session ("${cond.name}"):\n${cond.facts
          .map((f) => `- ${f}`)
          .join("\n")}`
      : "";
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: buildObserverPrompt(),
      messages: [
        {
          role: "user",
          content: `Here is a complete case file. Write the observation analysis:${condNote}\n\n${renderCaseFile(
            body.caseId,
            body.matter,
            body.events
          )}`,
        },
      ],
    });
    const analysis = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return Response.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json(
      { analysis: "", error: `Model call failed: ${msg}` },
      { status: 502 }
    );
  }
}
