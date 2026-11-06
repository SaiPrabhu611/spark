/**
 * Mock CRM / research corpus for local smoke without API keys.
 * Treat as frozen fixture data for evals and RL baselines.
 */

export type LeadSignal = {
  kind: "funding" | "hiring" | "product" | "news" | "tech";
  summary: string;
  source: string;
  occurredAt: string;
};

export type Lead = {
  id: string;
  fullName: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  location: string;
  linkedinUrl: string;
  email: string;
  painHypotheses: string[];
  signals: LeadSignal[];
  ourProductFit: string;
};

export const LEADS: readonly Lead[] = [
  {
    id: "lead_mira_chen",
    fullName: "Mira Chen",
    title: "VP of Engineering",
    company: "Northwind Analytics",
    industry: "B2B analytics / data platform",
    companySize: "180 employees",
    location: "San Francisco, CA",
    linkedinUrl: "https://www.linkedin.com/in/mira-chen-nw",
    email: "mira.chen@northwindanalytics.example",
    painHypotheses: [
      "Series B scaling is stressing ad-hoc ETL ownership across product teams",
      "Hiring data platform engineers implies backlog on reliability and self-serve analytics",
    ],
    signals: [
      {
        kind: "funding",
        summary: "Closed a $42M Series B led by Horizon Capital",
        source: "mock:company_blog/2026-09-12",
        occurredAt: "2026-09-12",
      },
      {
        kind: "hiring",
        summary: "Open roles: Senior Data Platform Engineer, Analytics Engineer",
        source: "mock:careers",
        occurredAt: "2026-10-28",
      },
      {
        kind: "tech",
        summary: "Public engineering post on migrating warehouse workloads to a lakehouse",
        source: "mock:eng_blog/lakehouse-migration",
        occurredAt: "2026-10-05",
      },
    ],
    ourProductFit:
      "Outbound AI that researches account signals and drafts personalized sequences for AEs/SDRs so eng leaders spend less time on manual prospecting handoffs.",
  },
  {
    id: "lead_jordan_blake",
    fullName: "Jordan Blake",
    title: "Head of Growth",
    company: "Harbor Retail",
    industry: "Omnichannel retail / e-commerce",
    companySize: "650 employees",
    location: "Chicago, IL",
    linkedinUrl: "https://www.linkedin.com/in/jordan-blake-harbor",
    email: "jordan.blake@harborretail.example",
    painHypotheses: [
      "Same-day delivery pilot needs merchant and ops partner outreach at higher volume",
      "Growth team likely drowning in generic partner emails with low reply rates",
    ],
    signals: [
      {
        kind: "product",
        summary: "Launched a same-day delivery pilot in three metro markets",
        source: "mock:press/same-day-pilot",
        occurredAt: "2026-10-18",
      },
      {
        kind: "news",
        summary: "Cited 22% lift in conversion for stores in the pilot cohort",
        source: "mock:earnings_note",
        occurredAt: "2026-10-22",
      },
      {
        kind: "hiring",
        summary: "Hiring Partnerships Manager, Growth Ops Analyst",
        source: "mock:careers",
        occurredAt: "2026-11-01",
      },
    ],
    ourProductFit:
      "Personalized outbound for partner and merchant acquisition tied to live pilot markets and conversion proof points.",
  },
  {
    id: "lead_priya_nair",
    fullName: "Priya Nair",
    title: "Chief Operating Officer",
    company: "Helix BioTools",
    industry: "Life sciences tools / lab software",
    companySize: "320 employees",
    location: "Cambridge, MA",
    linkedinUrl: "https://www.linkedin.com/in/priya-nair-helix",
    email: "priya.nair@helixbiotools.example",
    painHypotheses: [
      "EU expansion needs distributor and lab-network outreach with regulated messaging",
      "Ops wants consistent factual grounding so claims do not invent compliance claims",
    ],
    signals: [
      {
        kind: "news",
        summary: "Announced EU commercial expansion with a Dublin hub opening in Q1 2027",
        source: "mock:press/eu-expansion",
        occurredAt: "2026-10-30",
      },
      {
        kind: "product",
        summary: "Released HelixLink 3.0 with multi-site inventory sync for labs",
        source: "mock:product_release",
        occurredAt: "2026-09-20",
      },
      {
        kind: "hiring",
        summary: "Open EU roles: Regional Ops Manager (Ireland), Distributor Success Lead",
        source: "mock:careers",
        occurredAt: "2026-11-02",
      },
    ],
    ourProductFit:
      "Research-backed outreach that stays factually grounded for regulated buyers while scaling distributor conversations.",
  },
] as const;

export function findLeads(query: string): Lead[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...LEADS];
  return LEADS.filter((lead) => {
    const hay = [
      lead.id,
      lead.fullName,
      lead.title,
      lead.company,
      lead.industry,
      lead.location,
      ...lead.painHypotheses,
      ...lead.signals.map((s) => s.summary),
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((token) => hay.includes(token));
  });
}

export function getLeadById(id: string): Lead | undefined {
  return LEADS.find((lead) => lead.id === id);
}
