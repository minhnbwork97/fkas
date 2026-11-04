import { generateText, stepCountIs, type ModelMessage, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";

/**
 * Tool-calling loop on the Vercel AI SDK. The model may only act through
 * the tools it is given (see tools.ts). Switch model with OPENAI_MODEL.
 */
const MAX_STEPS = 6;

export type AgentResult = {
  text: string;
  /** Compact trace for ZaloTurn.steps */
  steps: { tools: { name: string; input: unknown; output: unknown }[]; finish: string }[];
  inputTokens?: number;
  outputTokens?: number;
};

export async function runAgent({
  system,
  history,
  user,
  tools,
}: {
  system: string;
  history: ModelMessage[];
  user: string;
  tools: ToolSet;
}): Promise<AgentResult> {
  const result = await generateText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5.4-mini"),
    system,
    messages: [...history, { role: "user", content: user }],
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    // One call at a time: later tools must see earlier results, never guess ids
    providerOptions: { openai: { parallelToolCalls: false } },
  });

  const steps = result.steps.map((s) => ({
    finish: s.finishReason,
    tools: s.toolCalls.map((call) => ({
      name: call.toolName,
      input: call.input,
      output: s.toolResults.find((r) => r.toolCallId === call.toolCallId)?.output,
    })),
  }));
  return {
    text: result.text.trim(),
    steps,
    inputTokens: result.totalUsage.inputTokens,
    outputTokens: result.totalUsage.outputTokens,
  };
}
