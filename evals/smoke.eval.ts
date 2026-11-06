import { defineEval } from "@grok/agent-sdk/evals";
import { loadJson } from "@grok/agent-sdk/evals/loaders";

const mira = await loadJson<{ smokeMessage: string }>(
  "fixtures/outreach/mira-series-b.json",
);

export default defineEval({
  tags: ["smoke"],
  description:
    "Researches Mira Chen and saves a personalized email draft via tools.",
  async test(t) {
    await t.send(mira.smokeMessage);
    t.succeeded();
    t.calledTool("research_lead");
    t.calledTool("save_outreach_draft");
    t.notCalledTool("qwen_status");
  },
});
