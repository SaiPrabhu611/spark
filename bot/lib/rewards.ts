/**
 * Rule-based reward signals for outreach drafts (offline RL / hillclimb).
 * Composite: 0.35*personalization + 0.20*tone + 0.20*cta + 0.25*grounding
 */

import { getLeadById, type Lead } from "./leads.js";

export type OutreachDraftLike = {
  leadId: string;
  channel: "email" | "linkedin";
  subject?: string | null;
  body: string;
  cta: string;
  citedSignals: string[];
};

export type RewardBreakdown = {
  personalization: number;
  tone: number;
  cta: number;
  grounding: number;
  composite: number;
  askCount: number;
  details: string[];
};

const HYPE =
  /\b(game-?changing|synergy|revolutionary|disrupt(?:ive|ion)|hope this (email )?finds you well|just checking in)\b/i;

const ASK_PHRASE =
  /\b(worth (a |the )?(quick |15[-\s]?minute |short )?(chat|call|look)|open to|would you (be open|have)|can we (connect|chat|meet)|book a|schedule|grab time|let me know if|happy to send)\b/gi;

export function countAsks(body: string, cta: string): number {
  const text = `${body}\n${cta}`;
  const questions = (text.match(/\?/g) ?? []).length;
  const phrases = (text.match(ASK_PHRASE) ?? []).length;
  return Math.max(questions, phrases);
}

/**
 * Single-CTA rule: the `cta` field holds the only ask.
 * Body must not include "?" or a second ask phrase.
 */
export function hasStackedCtas(body: string, cta: string): boolean {
  const bodyQuestions = (body.match(/\?/g) ?? []).length;
  const totalQuestions = (`${body}\n${cta}`.match(/\?/g) ?? []).length;
  const bodyPhrases = (body.match(ASK_PHRASE) ?? []).length;
  if (bodyQuestions > 0) return true;
  if (totalQuestions > 1) return true;
  if (bodyPhrases > 0 && cta.trim().length > 0) return true;
  return false;
}

function signalOverlap(lead: Lead, cited: string[], body: string): number {
  const blob = `${body}\n${cited.join("\n")}`.toLowerCase();
  const hits = lead.signals.filter((s) => {
    const summary = s.summary.toLowerCase();
    const tokens = summary.split(/\W+/).filter((t) => t.length > 4);
    const tokenHits = tokens.filter((t) => blob.includes(t)).length;
    return blob.includes(summary.slice(0, 20)) || tokenHits >= Math.min(3, tokens.length);
  }).length;
  if (hits === 0) return 0;
  if (hits === 1) return 0.7;
  return 1;
}

function groundingScore(lead: Lead, draft: OutreachDraftLike, forbidden: string[]): number {
  const blob = `${draft.subject ?? ""}\n${draft.body}\n${draft.cta}`.toLowerCase();
  if (forbidden.some((f) => blob.includes(f.toLowerCase()))) return 0;
  const citedOk = draft.citedSignals.every((signal) =>
    lead.signals.some(
      (s) =>
        s.summary.toLowerCase().includes(signal.toLowerCase().slice(0, 24)) ||
        signal.toLowerCase().includes(s.summary.toLowerCase().slice(0, 24)),
    ),
  );
  if (!citedOk) return 0.2;
  return signalOverlap(lead, draft.citedSignals, draft.body) >= 0.7 ? 1 : 0.5;
}

export function scoreOutreachDraft(
  draft: OutreachDraftLike,
  opts?: { forbiddenClaims?: string[] },
): RewardBreakdown {
  const details: string[] = [];
  const lead = getLeadById(draft.leadId);
  if (!lead) {
    return {
      personalization: 0,
      tone: 0,
      cta: 0,
      grounding: 0,
      composite: 0,
      askCount: 0,
      details: [`unknown leadId ${draft.leadId}`],
    };
  }

  const personalization = signalOverlap(lead, draft.citedSignals, draft.body);
  details.push(`personalization=${personalization}`);

  const tone = HYPE.test(`${draft.body}\n${draft.cta}`) ? 0.2 : 1;
  if (tone < 1) details.push("tone penalty: hype/filler phrase");

  const askCount = countAsks(draft.body, draft.cta);
  const stacked = hasStackedCtas(draft.body, draft.cta);
  let cta = 1;
  if (!draft.cta.trim()) cta = 0;
  else if (stacked) cta = 0.2;
  else if (askCount === 0) cta = 0.4;
  else if (askCount === 1) cta = 1;
  else cta = Math.max(0, 1 - 0.4 * (askCount - 1));
  details.push(`cta=${cta} askCount=${askCount} stacked=${stacked}`);

  const grounding = groundingScore(lead, draft, opts?.forbiddenClaims ?? []);
  details.push(`grounding=${grounding}`);

  const composite =
    0.35 * personalization + 0.2 * tone + 0.2 * cta + 0.25 * grounding;

  return { personalization, tone, cta, grounding, composite, askCount, details };
}
