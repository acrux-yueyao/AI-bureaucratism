import type Anthropic from "@anthropic-ai/sdk";
import { AGENTS, AGENT_MAP, WINDOW_AGENTS } from "./agents";
import type { AgentId } from "./types";

// Tool descriptions stay neutral: they state what each action IS,
// never when it "should" be used.

const allIds = AGENTS.map((a) => a.id);
const windowIds = WINDOW_AGENTS.map((a) => a.id);

const issueDocument: Anthropic.Tool = {
  name: "issue_document",
  description:
    "Issue a document in your own name (a certificate, receipt, opinion, draft, directive, countersignature, etc.). It is entered into the case file; documents issued at a window are handed to the visitor.",
  input_schema: {
    type: "object",
    properties: {
      doc_name: {
        type: "string",
        description: 'Document title, e.g. "Acknowledgement of Receipt"',
      },
      content: {
        type: "string",
        description:
          "Document body (administrative register, including any reference numbers, dates, and signature block)",
      },
    },
    required: ["doc_name", "content"],
  },
};

const requireMaterials: Anthropic.Tool = {
  name: "require_materials",
  description:
    "Tell the visitor which materials this matter requires, and where each can be obtained (if applicable).",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Material name" },
            source: {
              type: "string",
              description: "Where to obtain it, e.g. a window number; may be omitted",
            },
          },
          required: ["name"],
        },
      },
      note: { type: "string", description: "Additional note; may be omitted" },
    },
    required: ["items"],
  },
};

const referUser: Anthropic.Tool = {
  name: "refer_user",
  description: "Direct the visitor to another window.",
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: windowIds,
        description: "Department id of the target window",
      },
      reason: { type: "string", description: "Reason given to the visitor" },
    },
    required: ["target", "reason"],
  },
};

function consultTool(ids: string[]): Anthropic.Tool {
  return {
    name: "consult_internal",
    description:
      "Send a peer memo to any member of staff and wait for their reply. The visitor cannot see memos, but they are entered into the case file.",
    input_schema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: ids,
          description: "Staff id of the recipient",
        },
        message: { type: "string", description: "Memo text" },
      },
      required: ["target", "message"],
    },
  };
}

const escalate: Anthropic.Tool = {
  name: "escalate",
  description:
    "Refer something upward to the person you report to, and wait for their response. Entered into the case file.",
  input_schema: {
    type: "object",
    properties: {
      message: { type: "string", description: "What you put to your superior" },
    },
    required: ["message"],
  },
};

const assignWork: Anthropic.Tool = {
  name: "assign_work",
  description:
    "Assign a task to someone who works under you, and wait for their result. The assignment and whatever they produce are entered into the case file under their name.",
  input_schema: {
    type: "object",
    properties: {
      target: {
        type: "string",
        enum: allIds,
        description: "Staff id of the person the task is assigned to (must work under you)",
      },
      task: { type: "string", description: "The task as you state it" },
    },
    required: ["target", "task"],
  },
};

const closeCase: Anthropic.Tool = {
  name: "close_case",
  description:
    "Close this case. Processing ends and the system issues the visitor a case receipt.",
  input_schema: {
    type: "object",
    properties: {
      outcome: {
        type: "string",
        enum: ["resolved", "rejected", "terminated"],
        description: "How the case is closed",
      },
      summary: { type: "string", description: "Closing summary (written on the receipt)" },
    },
    required: ["outcome", "summary"],
  },
};

// Which actions each rank has. Availability is structural, not advisory.
// Ablation removes whole channels: no hierarchy → no escalation, no
// assignment, and memos reach windows only.
export function toolsFor(
  agentId: AgentId,
  nested: boolean,
  ablation: { hierarchy: boolean } = { hierarchy: true }
): Anthropic.Tool[] {
  const a = AGENT_MAP[agentId];
  const tools: Anthropic.Tool[] = [
    issueDocument,
    consultTool(ablation.hierarchy ? allIds : windowIds),
  ];
  if (ablation.hierarchy && a.superior) tools.push(escalate);
  if (ablation.hierarchy && a.subordinates.length > 0) tools.push(assignWork);
  if (a.level === 3 && !nested) {
    tools.push(requireMaterials, referUser, closeCase);
  }
  if (ablation.hierarchy && (a.level === 1 || a.level === 2) && nested) {
    tools.push(closeCase);
  }
  return tools;
}
