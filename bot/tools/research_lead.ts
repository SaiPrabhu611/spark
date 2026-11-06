import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import * as z from "zod/v4";
import { findLeads, getLeadById } from "../lib/leads.js";

export default defineTool({
  description: prompt`
    Research a sales lead from the mock CRM corpus.
    Pass leadId when known (preferred), or a free-text query for name/company.
    Use before drafting outreach so personalization stays factually grounded.
  `,
  effect: "read",
  execution: "server",
  inputSchema: z.object({
    leadId: z.string().optional(),
    query: z.string().optional(),
  }),
  async execute({ leadId, query }) {
    if (leadId) {
      const lead = getLeadById(leadId);
      if (!lead) {
        return {
          found: false as const,
          error: `Unknown leadId: ${leadId}`,
          hint: "Call list_leads, then research_lead with a valid id.",
        };
      }
      return { found: true as const, matchCount: 1, lead };
    }

    const q = query?.trim();
    if (!q) {
      return {
        found: false as const,
        error: "Provide leadId or query",
        hint: "Example query: \"Mira Chen Northwind\"",
      };
    }

    const matches = findLeads(q);
    if (matches.length === 0) {
      return {
        found: false as const,
        error: `No leads matched query: ${q}`,
        hint: "Call list_leads to see available fixtures.",
      };
    }

    if (matches.length > 1) {
      return {
        found: false as const,
        matchCount: matches.length,
        error: "Ambiguous query; multiple leads matched",
        candidates: matches.map((lead) => ({
          id: lead.id,
          fullName: lead.fullName,
          company: lead.company,
          title: lead.title,
        })),
        hint: "Re-call research_lead with an exact leadId.",
      };
    }

    return { found: true as const, matchCount: 1, lead: matches[0] };
  },
});
