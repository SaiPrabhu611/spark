import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { LEADS } from "../lib/leads.js";

export default defineTool({
  description: prompt`
    List mock CRM leads available for research and outreach drafting.
    Call this when the user has not named a specific person or company.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(20).optional(),
  }),
  async execute({ limit }) {
    const sliced = LEADS.slice(0, limit ?? LEADS.length);
    return {
      count: sliced.length,
      leads: sliced.map((lead) => ({
        id: lead.id,
        fullName: lead.fullName,
        title: lead.title,
        company: lead.company,
        industry: lead.industry,
        location: lead.location,
      })),
    };
  },
});
