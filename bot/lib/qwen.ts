/**
 * OpenAI-compatible Qwen client for OpenRouter / Together / local endpoints.
 *
 * Agent SDK turns still route through Cursor's model catalog. When Qwen is not
 * available there, set OPENROUTER_API_KEY (or QWEN_BASE_URL + QWEN_API_KEY) and
 * call `completeQwen` from host code / RL jobs. Without keys, returns a mock
 * completion so local smoke stays key-free.
 */

export const QWEN_MODEL_ID = "qwen/qwen3.8-max-prime";

export type QwenMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type QwenCompletion = {
  model: string;
  content: string;
  provider: "openrouter" | "together" | "openai_compatible" | "mock";
  mock: boolean;
};

type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  provider: QwenCompletion["provider"];
  model: string;
};

function resolveProvider(): ProviderConfig | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      provider: "openrouter",
      model: process.env.QWEN_MODEL_ID?.trim() || QWEN_MODEL_ID,
    };
  }

  const togetherKey = process.env.TOGETHER_API_KEY?.trim();
  if (togetherKey) {
    return {
      baseUrl: "https://api.together.xyz/v1",
      apiKey: togetherKey,
      provider: "together",
      // Together catalog uses org/name ids for Qwen Max-class models.
      model: process.env.QWEN_MODEL_ID?.trim() || "Qwen/Qwen3.7-Max",
    };
  }

  const baseUrl = process.env.QWEN_BASE_URL?.trim();
  const apiKey = process.env.QWEN_API_KEY?.trim() || "local";
  if (baseUrl) {
    return {
      baseUrl: baseUrl.replace(/\/$/u, ""),
      apiKey,
      provider: "openai_compatible",
      model: process.env.QWEN_MODEL_ID?.trim() || QWEN_MODEL_ID,
    };
  }

  return null;
}

function mockCompletion(messages: QwenMessage[]): QwenCompletion {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const snippet = (lastUser?.content ?? "").slice(0, 160).replace(/\s+/g, " ");
  return {
    model: QWEN_MODEL_ID,
    provider: "mock",
    mock: true,
    content: [
      "[mock-qwen] No OPENROUTER_API_KEY / TOGETHER_API_KEY / QWEN_BASE_URL set.",
      "Echoing a deterministic stub for local smoke:",
      snippet || "(empty user message)",
    ].join(" "),
  };
}

export async function completeQwen(args: {
  messages: QwenMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<QwenCompletion> {
  const provider = resolveProvider();
  if (!provider) {
    return mockCompletion(args.messages);
  }

  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...(provider.provider === "openrouter"
        ? {
            "HTTP-Referer": "https://cursor.com",
            "X-Title": "sales-outbound",
          }
        : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.4,
      max_tokens: args.maxTokens ?? 800,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Qwen provider ${provider.provider} HTTP ${response.status}: ${body.slice(0, 400)}`,
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`Qwen provider ${provider.provider} returned empty content`);
  }

  return {
    model: provider.model,
    provider: provider.provider,
    mock: false,
    content,
  };
}

export function qwenProviderStatus(): {
  configured: boolean;
  preferredModelId: string;
  activeProvider: QwenCompletion["provider"] | "none";
} {
  const provider = resolveProvider();
  return {
    configured: Boolean(provider),
    preferredModelId: QWEN_MODEL_ID,
    activeProvider: provider?.provider ?? "none",
  };
}
