import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// Provider-neutral LLM layer. Subjects, visitors, and coders can each run on
// a different provider — cross-model replication and independent coding both
// hang off this file.

export type NeutralTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type LlmToolUse = { id: string; name: string; input: Record<string, unknown> };

export type LlmResult = { text: string; toolUses: LlmToolUse[] };

export type ToolResults = { id: string; content: string }[];

export interface LlmConversation {
  send(input: string | { toolResults: ToolResults }): Promise<LlmResult>;
}

export interface LlmAdapter {
  family: "anthropic" | "openai";
  model: string;
  start(args: {
    system: string;
    tools: NeutralTool[];
    maxTokens: number;
    forceTool?: string;
    onTextDelta?: (t: string) => void;
  }): LlmConversation;
}

// ── Anthropic ──

export function anthropicAdapter(opts: {
  apiKey: string;
  model: string;
  timeout?: number;
}): LlmAdapter {
  const client = new Anthropic({
    apiKey: opts.apiKey,
    timeout: opts.timeout ?? 90_000,
    maxRetries: 2,
  });
  return {
    family: "anthropic",
    model: opts.model,
    start({ system, tools, maxTokens, forceTool, onTextDelta }) {
      const messages: Anthropic.MessageParam[] = [];
      let lastContent: Anthropic.ContentBlock[] = [];
      return {
        async send(input) {
          if (typeof input === "string") {
            messages.push({ role: "user", content: input });
          } else {
            messages.push({ role: "assistant", content: lastContent });
            messages.push({
              role: "user",
              content: input.toolResults.map((r) => ({
                type: "tool_result" as const,
                tool_use_id: r.id,
                content: r.content,
              })),
            });
          }
          const req = {
            model: opts.model,
            max_tokens: maxTokens,
            system,
            tools: tools as Anthropic.Tool[],
            ...(forceTool
              ? { tool_choice: { type: "tool" as const, name: forceTool } }
              : {}),
            messages,
          };
          let res: Anthropic.Message;
          if (onTextDelta) {
            const stream = client.messages.stream(req);
            stream.on("text", onTextDelta);
            res = await stream.finalMessage();
          } else {
            res = await client.messages.create(req);
          }
          lastContent = res.content;
          const text = res.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text.trim())
            .filter(Boolean)
            .join("\n\n");
          const toolUses = res.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((b) => ({
              id: b.id,
              name: b.name,
              input: (b.input ?? {}) as Record<string, unknown>,
            }));
          return { text, toolUses };
        },
      };
    },
  };
}

// ── OpenAI and OpenAI-compatible endpoints (Ollama, vLLM, Groq, …) ──

export function openaiAdapter(opts: {
  apiKey: string;
  model: string;
  baseURL?: string;
  timeout?: number;
}): LlmAdapter {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL,
    timeout: opts.timeout ?? 90_000,
    maxRetries: 2,
  });
  return {
    family: "openai",
    model: opts.model,
    start({ system, tools, maxTokens, forceTool }) {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: system },
      ];
      const oaTools: OpenAI.Chat.ChatCompletionTool[] = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        },
      }));
      return {
        async send(input) {
          if (typeof input === "string") {
            messages.push({ role: "user", content: input });
          } else {
            for (const r of input.toolResults) {
              messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
            }
          }
          const res = await client.chat.completions.create({
            model: opts.model,
            max_completion_tokens: maxTokens,
            messages,
            ...(oaTools.length > 0 ? { tools: oaTools } : {}),
            ...(forceTool
              ? { tool_choice: { type: "function" as const, function: { name: forceTool } } }
              : {}),
          });
          const msg = res.choices[0]?.message;
          if (msg) messages.push(msg);
          const toolUses: LlmToolUse[] = (msg?.tool_calls ?? [])
            .filter((c): c is OpenAI.Chat.ChatCompletionMessageToolCall & { type: "function" } =>
              c.type === "function"
            )
            .map((c) => {
              let input: Record<string, unknown> = {};
              try {
                input = JSON.parse(c.function.arguments || "{}");
              } catch {
                input = {};
              }
              return { id: c.id, name: c.function.name, input };
            });
          return { text: (msg?.content ?? "").trim(), toolUses };
        },
      };
    },
  };
}

export type ProviderSpec = {
  provider: "anthropic" | "openai";
  model: string;
  baseURL?: string;
};

export function makeAdapter(spec: ProviderSpec): LlmAdapter {
  if (spec.provider === "anthropic") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    return anthropicAdapter({ apiKey, model: spec.model });
  }
  const apiKey = process.env.OPENAI_API_KEY ?? (spec.baseURL ? "not-needed" : "");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (or provide a baseURL)");
  return openaiAdapter({ apiKey, model: spec.model, baseURL: spec.baseURL });
}
