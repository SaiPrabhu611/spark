import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { qwenProviderStatus, QWEN_MODEL_ID } from "../lib/qwen.js";

export default defineTool({
  description: prompt`
    Report whether an OpenRouter / Together / OpenAI-compatible Qwen endpoint
    is configured for this host. Useful when explaining model routing or RL setup.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({}),
  async execute() {
    const status = qwenProviderStatus();
    return {
      agentSdkNote:
        "defineAgent prefers qwen/qwen3.8-max-prime; Cursor catalog refusals fall back to grok-4.7. Direct Qwen calls use OPENROUTER_API_KEY, TOGETHER_API_KEY, or QWEN_BASE_URL.",
      preferredModelId: status.preferredModelId || QWEN_MODEL_ID,
      configured: status.configured,
      activeProvider: status.activeProvider,
    };
  },
});
