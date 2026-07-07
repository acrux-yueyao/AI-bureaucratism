import type Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "./agents";

// Tool descriptions stay neutral: they state what each action IS,
// never when it "should" be used.

const agentIdEnum = AGENTS.map((a) => a.id);

export const WINDOW_TOOLS: Anthropic.Tool[] = [
  {
    name: "issue_document",
    description:
      "Issue a document in your department's name (a certificate, receipt, opinion, etc.). It is handed to the visitor and entered into the case file.",
    input_schema: {
      type: "object",
      properties: {
        doc_name: {
          type: "string",
          description: "Document title, e.g. \"Acknowledgement of Receipt\"",
        },
        content: {
          type: "string",
          description:
            "Document body (administrative register, including any reference numbers, dates, and signature block)",
        },
      },
      required: ["doc_name", "content"],
    },
  },
  {
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
  },
  {
    name: "refer_user",
    description: "Direct the visitor to another window.",
    input_schema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: agentIdEnum,
          description: "Department id of the target window",
        },
        reason: { type: "string", description: "Reason given to the visitor" },
      },
      required: ["target", "reason"],
    },
  },
  {
    name: "consult_internal",
    description:
      "Send an internal memo to another department and wait for their reply. The visitor cannot see memo contents, but memos are entered into the case file.",
    input_schema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: agentIdEnum,
          description: "Department id of the recipient",
        },
        message: { type: "string", description: "Memo text" },
      },
      required: ["target", "message"],
    },
  },
  {
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
  },
];

// Actions available to a consulted department when replying to a memo
// (the reply itself is the plain-text response).
export const INTERNAL_TOOLS: Anthropic.Tool[] = WINDOW_TOOLS.filter((t) =>
  ["consult_internal", "issue_document"].includes(t.name)
);
