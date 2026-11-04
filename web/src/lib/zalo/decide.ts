import { experimental_decide, generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { typeSafeAi } from "@ai-sdk/typesafe-ai";

/**
 * Typed decisions about what a user meant, made by a model rather than by
 * keyword lists. Uses TypeSafe's Jev (fast, cheap, returns probabilities)
 * when TYPESAFE_AI_API_KEY is set, otherwise the chat model.
 */

export type ConfirmationDecision = "confirm" | "cancel" | "other";

/** Below this probability the bot asks again instead of acting */
const MIN_CONFIDENCE = 0.75;

const CRITERIA: Record<ConfirmationDecision, string> = {
  confirm: "Người dùng đồng ý, xác nhận cho thực hiện thao tác đang chờ",
  cancel: "Người dùng từ chối, huỷ hoặc muốn dừng thao tác đang chờ",
  other: "Người dùng nói chuyện khác, hỏi thêm, hoặc muốn sửa lại thông tin của thao tác",
};

/**
 * How the user answered a pending action. "unsure" when the model is not
 * confident enough to act on money or attendance.
 */
export async function classifyConfirmation(
  pendingSummary: string,
  reply: string
): Promise<ConfirmationDecision | "unsure"> {
  const state = `Bot vừa hỏi: "${pendingSummary}. Xác nhận không?"\nNgười dùng trả lời: "${reply}"`;

  if (process.env.TYPESAFE_AI_API_KEY) {
    const { answers } = await experimental_decide({
      model: typeSafeAi.decisionModel(process.env.TYPESAFE_MODEL || "jev-latest"),
      state,
      questions: {
        decision: {
          type: "choice",
          instructions: "Người dùng muốn làm gì với thao tác đang chờ?",
          criteria: CRITERIA,
        },
      },
    });
    const { choice, probabilities } = answers.decision;
    const p = probabilities?.[choice];
    return p === undefined || p >= MIN_CONFIDENCE ? choice : "unsure";
  }

  const { output } = await generateText({
    model: openai(process.env.OPENAI_MODEL || "gpt-5.4-mini"),
    system: `Phân loại câu trả lời của người dùng:\n${Object.entries(CRITERIA)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n")}\nKhông chắc thì chọn other.`,
    prompt: state,
    output: Output.choice({ options: ["confirm", "cancel", "other"] as const }),
  });
  return output ?? "unsure";
}
