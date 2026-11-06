import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { getLeadById } from "../lib/leads.js";
import { hasStackedCtas, scoreOutreachDraft } from "../lib/rewards.js";

const Channel = z.enum(["email", "linkedin"]);

export default defineTool({
  description: prompt`
    Persist a personalized outreach draft after research_lead.
    The draft must cite at least one researched signal, stay factual,
    put exactly one CTA in the cta field (body must not ask), and avoid
    inventing funding/hiring/product claims.
  `,
  effect: "idempotent",
  execution: "server",
  inputSchema: z.object({
    leadId: z.string(),
    channel: Channel,
    subject: z.string().min(4).max(140).optional(),
    body: z.string().min(40).max(4000),
    cta: z.string().min(8).max(240),
    citedSignals: z.array(z.string()).min(1).max(5),
    tone: z.enum(["peer", "concise", "warm"]).default("peer"),
  }),
  async execute(input, ctx) {
    const lead = getLeadById(input.leadId);
    if (!lead) {
      return {
        saved: false as const,
        error: `Unknown leadId: ${input.leadId}`,
      };
    }

    if (input.channel === "email" && !input.subject?.trim()) {
      return {
        saved: false as const,
        error: "Email drafts require a subject line",
      };
    }

    if (hasStackedCtas(input.body, input.cta)) {
      return {
        saved: false as const,
        error:
          "Stacked CTAs rejected: keep asks out of body; put exactly one ask in cta.",
        hint: "Remove '?' and meeting/deck asks from body, then retry save_outreach_draft.",
      };
    }

    const knownSignalText = lead.signals.map((s) => s.summary.toLowerCase()).join("\n");
    const grounded = input.citedSignals.every((signal) => {
      const needle = signal.toLowerCase();
      return (
        knownSignalText.includes(needle) ||
        lead.signals.some(
          (s) =>
            s.summary.toLowerCase().includes(needle) ||
            needle.includes(s.summary.toLowerCase().slice(0, 24)),
        )
      );
    });

    const rewards = scoreOutreachDraft({
      leadId: input.leadId,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      cta: input.cta,
      citedSignals: input.citedSignals,
    });

    const draft = {
      leadId: lead.id,
      fullName: lead.fullName,
      company: lead.company,
      channel: input.channel,
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
      cta: input.cta.trim(),
      citedSignals: input.citedSignals,
      tone: input.tone,
      grounded,
      rewards: {
        personalization: rewards.personalization,
        tone: rewards.tone,
        cta: rewards.cta,
        grounding: rewards.grounding,
        composite: Number(rewards.composite.toFixed(3)),
      },
      savedAt: new Date().toISOString(),
    };

    const key = `outreach:${ctx.session.id}:${lead.id}:${input.channel}`;
    await ctx.host.kv.put(key, draft);

    const evalMode = ctx.session.purpose === "eval";

    return {
      saved: true as const,
      evalMode,
      grounded,
      draftKey: key,
      draft,
      warning: grounded
        ? null
        : "One or more citedSignals did not clearly match researched lead signals. Revise before sending.",
    };
  },
});
