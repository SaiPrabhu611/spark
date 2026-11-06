import { defineAgent } from "@grok/agent-sdk";

/**
 * Preferred model: large Qwen instruct via OpenRouter id `qwen/qwen3.8-max-prime`.
 * Agent SDK routes turns through Cursor's catalog; if that id is refused,
 * fallbacks step down to Cursor-hosted Grok so local/dev stays runnable.
 * Direct OpenAI-compatible Qwen calls (RL / offline) use bot/lib/qwen.ts.
 */
export default defineAgent({
  name: "Sales Outbound",
  description:
    "Researches mock CRM leads and drafts personalized email or LinkedIn outreach.",
  model: "qwen/qwen3.8-max-prime",
  fallbacks: [
    {
      id: "grok-4.7",
      params: [
        { id: "reasoning_effort", value: "high" },
        { id: "fast", value: "true" },
      ],
    },
  ],
  hosting: {
    egressDomains: ["openrouter.ai", "api.together.xyz"],
    secretNames: ["OPENROUTER_API_KEY", "TOGETHER_API_KEY", "QWEN_API_KEY"],
  },
});
