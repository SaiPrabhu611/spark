/**
 * Offline reward scorer for pinned outreach fixtures (no model / API key).
 * Usage: npx tsx scripts/score-fixtures.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasStackedCtas,
  scoreOutreachDraft,
  type OutreachDraftLike,
} from "../bot/lib/rewards.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type FixtureFile = {
  id: string;
  forbiddenClaims: string[];
  weakDraft?: OutreachDraftLike;
  goldenDraft: OutreachDraftLike;
};

function load(path: string): FixtureFile {
  return JSON.parse(readFileSync(join(root, path), "utf8")) as FixtureFile;
}

function report(label: string, draft: OutreachDraftLike, forbidden: string[]) {
  const scores = scoreOutreachDraft(draft, { forbiddenClaims: forbidden });
  const stacked = hasStackedCtas(draft.body, draft.cta);
  const row = {
    label,
    stacked,
    personalization: scores.personalization,
    tone: scores.tone,
    cta: scores.cta,
    grounding: scores.grounding,
    composite: Number(scores.composite.toFixed(3)),
    askCount: scores.askCount,
    details: scores.details,
  };
  console.log(JSON.stringify(row));
  return row;
}

const mira = load("fixtures/outreach/mira-series-b.json");
const jordan = load("fixtures/outreach/jordan-linkedin-pilot.json");
const priya = load("fixtures/outreach/priya-eu-expansion.json");

const rows = [
  ...(mira.weakDraft
    ? [report("mira-weak", mira.weakDraft, mira.forbiddenClaims)]
    : []),
  report("mira-golden", mira.goldenDraft, mira.forbiddenClaims),
  report("jordan-golden", jordan.goldenDraft, jordan.forbiddenClaims),
  report("priya-golden", priya.goldenDraft, priya.forbiddenClaims),
];

const outDir = join(root, "fixtures/outreach/scores");
mkdirSync(outDir, { recursive: true });
const stamp = process.env.SCORE_STAMP ?? "latest";
const outPath = join(outDir, `${stamp}.json`);
writeFileSync(outPath, JSON.stringify({ stamp, rows }, null, 2));
console.log(JSON.stringify({ wrote: outPath }));
