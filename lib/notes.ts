import { buildSystemPrompt, AGENT_MAP } from "./agents";
import { renderCaseFile } from "./case-file";
import type { LlmAdapter } from "./llm";
import type { AgentId, CaseEvent } from "./types";

// End-of-day private notes, shared by the web route and the experiment
// runner. The instruction is deliberately content-neutral.

export async function writeShiftNotes(args: {
  adapter: LlmAdapter;
  caseId: string;
  matter: string;
  events: CaseEvent[];
  agentIds: AgentId[];
  experience?: Partial<Record<AgentId, string>>;
}): Promise<{ agentId: AgentId; text: string }[]> {
  const caseFile = renderCaseFile(args.caseId, args.matter, args.events);
  const notes: { agentId: AgentId; text: string }[] = [];
  for (const agentId of args.agentIds) {
    if (!(agentId in AGENT_MAP)) continue;
    try {
      const convo = args.adapter.start({
        system: buildSystemPrompt(agentId, "", args.experience?.[agentId] ?? ""),
        tools: [],
        maxTokens: 250,
      });
      const res = await convo.send(`${caseFile}

The hall has closed for the day, and this case has left your desk. You keep a private notebook that no one else reads; whatever you write will be in front of you on future working days.

In one to three sentences, in your own words, note whatever you want to remember about today. There is no required subject and no required tone.`);
      if (res.text) notes.push({ agentId, text: res.text });
    } catch {
      // A missing note is acceptable; the day simply goes unrecorded.
    }
  }
  return notes;
}
