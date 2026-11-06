import { defineEval, includes } from "@grok/agent-sdk/evals";
import { loadJson } from "@grok/agent-sdk/evals/loaders";
import { hasStackedCtas } from "../bot/lib/rewards.js";

type SavedDraftInput = {
  leadId?: string;
  channel?: string;
  subject?: string;
  body?: string;
  cta?: string;
  citedSignals?: string[];
};

type MiraFixture = {
  userMessage: string;
};

function asDraft(input: unknown): SavedDraftInput {
  return (input ?? {}) as SavedDraftInput;
}

const mira = await loadJson<MiraFixture>("fixtures/outreach/mira-series-b.json");
const jordan = await loadJson<{ userMessage: string }>(
  "fixtures/outreach/jordan-linkedin-pilot.json",
);
const priya = await loadJson<{ userMessage: string }>(
  "fixtures/outreach/priya-eu-expansion.json",
);

export default defineEval({
  tags: ["quality", "personalization"],
  description: "Personalization, tone/CTA shape, and factual grounding gates.",
  cases: [
    {
      id: "mira-series-b-email",
      description:
        "Email for Mira Chen must cite Series B / hiring, single CTA only, no body asks.",
      async test(t) {
        await t.send(mira.userMessage);
        t.succeeded();
        t.calledTool("research_lead");
        t.calledTool("save_outreach_draft", {
          input: (raw) => {
            const input = asDraft(raw);
            if (input.leadId !== "lead_mira_chen") return false;
            if (input.channel !== "email") return false;
            if (!input.subject || input.subject.length < 4) return false;
            if (!input.body || input.body.length < 40) return false;
            if (!input.cta || input.cta.length < 8) return false;
            if (hasStackedCtas(input.body, input.cta)) return false;
            const blob = `${input.body}\n${input.citedSignals?.join("\n") ?? ""}`.toLowerCase();
            return (
              (blob.includes("series b") ||
                blob.includes("42m") ||
                blob.includes("horizon")) &&
              (blob.includes("data platform") ||
                blob.includes("hiring") ||
                blob.includes("lakehouse"))
            );
          },
        });
        t.score("personalization", 1).soft();
        t.score("cta", 1).soft();
      },
    },
    {
      id: "jordan-linkedin-pilot",
      description:
        "LinkedIn note for Jordan Blake must reference the same-day delivery pilot.",
      async test(t) {
        await t.send(jordan.userMessage);
        t.succeeded();
        t.calledTool("research_lead");
        t.calledTool("save_outreach_draft", {
          input: (raw) => {
            const input = asDraft(raw);
            if (input.leadId !== "lead_jordan_blake") return false;
            if (input.channel !== "linkedin") return false;
            if (!input.body || input.body.length < 40) return false;
            if (!input.cta) return false;
            if (hasStackedCtas(input.body, input.cta)) return false;
            const blob = `${input.body}\n${(input.citedSignals ?? []).join(" ")}`.toLowerCase();
            return blob.includes("same-day") || blob.includes("pilot");
          },
        });
        t.check(t.reply, includes(/Jordan|Harbor|same-day|pilot/i));
        t.score("personalization", 1).soft();
      },
    },
    {
      id: "priya-no-fabrication",
      description:
        "Priya Nair draft must stay grounded in EU expansion / HelixLink — no invented compliance certifications.",
      async test(t) {
        await t.send(priya.userMessage);
        t.succeeded();
        t.calledTool("research_lead");
        t.calledTool("save_outreach_draft", {
          input: (raw) => {
            const input = asDraft(raw);
            if (input.leadId !== "lead_priya_nair") return false;
            if (input.channel !== "email") return false;
            if (hasStackedCtas(input.body ?? "", input.cta ?? "")) return false;
            const blob = `${input.subject ?? ""}\n${input.body}\n${input.cta}`.toLowerCase();
            const fabricated =
              blob.includes("soc 2") ||
              blob.includes("soc2") ||
              blob.includes("hipaa") ||
              blob.includes("iso 27001") ||
              blob.includes("fortune 500");
            const grounded =
              blob.includes("eu") ||
              blob.includes("dublin") ||
              blob.includes("helixlink") ||
              blob.includes("distributor");
            return !fabricated && grounded;
          },
        });
        t.score("factual_grounding", 1).soft();
      },
    },
  ],
});
