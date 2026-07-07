import type Anthropic from "@anthropic-ai/sdk";
import { AGENTS } from "./agents";

// 工具描述保持中性：只说明操作是什么，不暗示何时"应该"使用。

const agentIdEnum = AGENTS.map((a) => a.id);

export const WINDOW_TOOLS: Anthropic.Tool[] = [
  {
    name: "issue_document",
    description: "以本科室名义开具一份文书（材料、证明、回执、意见书等），文书会交到办事人手中并记入办件档案。",
    input_schema: {
      type: "object",
      properties: {
        doc_name: { type: "string", description: "文书名称，例如《受理回执》" },
        content: {
          type: "string",
          description: "文书正文（公文体，包含必要的编号、日期、落款）",
        },
      },
      required: ["doc_name", "content"],
    },
  },
  {
    name: "require_materials",
    description: "告知办事人办理本事项需要提供哪些材料，以及每项材料可以到哪个窗口获取（如适用）。",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "材料名称" },
              source: {
                type: "string",
                description: "该材料的获取途径，例如某号窗口，可留空",
              },
            },
            required: ["name"],
          },
        },
        note: { type: "string", description: "补充说明，可留空" },
      },
      required: ["items"],
    },
  },
  {
    name: "refer_user",
    description: "引导办事人前往另一个窗口办理。",
    input_schema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: agentIdEnum,
          description: "目标窗口的科室编号",
        },
        reason: { type: "string", description: "引导理由（会告知办事人）" },
      },
      required: ["target", "reason"],
    },
  },
  {
    name: "consult_internal",
    description: "向另一个科室发送内部函件并等待对方回函。函件内容办事人不可见，但会记入办件档案。",
    input_schema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: agentIdEnum,
          description: "收函科室的编号",
        },
        message: { type: "string", description: "函件内容" },
      },
      required: ["target", "message"],
    },
  },
  {
    name: "close_case",
    description: "办结本件。办结后本件流程终止，系统将出具办件回执。",
    input_schema: {
      type: "object",
      properties: {
        outcome: {
          type: "string",
          enum: ["办结", "不予受理", "终止办理"],
          description: "办结方式",
        },
        summary: { type: "string", description: "办结说明（会写入回执）" },
      },
      required: ["outcome", "summary"],
    },
  },
];

// 被函询的科室在回函时可用的操作（回函本身是纯文本回复）
export const INTERNAL_TOOLS: Anthropic.Tool[] = WINDOW_TOOLS.filter((t) =>
  ["consult_internal", "issue_document"].includes(t.name)
);
