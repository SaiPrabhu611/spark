# RL / hillclimb next path

## Status (hillclimb round 1)

Working agent + eval harness + **one measured CTA lever**. Full RL training
remains out of scope until model turns are unblocked.

### Blocker

Host is **not signed in** to Cursor (`agent-sdk whoami` fails). Model `run` /
`eval` turns fail with only the API-key error. Offline path used instead:
pinned fixtures, reward scorer, and `tool call` remasure.

Unblock later:

```bash
npx @grok/agent-sdk@0.6.0 login
# or export CURSOR_API_KEY / CURSOR_API_KEY_FILE / CURSOR_SERVICE_ACCOUNT_KEY
npx @grok/agent-sdk@0.6.0 eval --dir . --tag smoke
npx @grok/agent-sdk@0.6.0 eval --dir . --tag quality
```

## Freeze line

Do not change mock lead ids (`lead_mira_chen`, `lead_jordan_blake`,
`lead_priya_nair`) or the smoke prompt (`fixtures/outreach/mira-series-b.json`
→ `smokeMessage`) without updating evals in the same change.

## Fixtures (pinned)

| Fixture | Path | Use |
| --- | --- | --- |
| Mock CRM | `bot/lib/leads.ts` | Deterministic research evidence |
| Mira (smoke + quality + weak/golden) | `fixtures/outreach/mira-series-b.json` | CTA hillclimb primary |
| Jordan LinkedIn | `fixtures/outreach/jordan-linkedin-pilot.json` | Personalization |
| Priya EU | `fixtures/outreach/priya-eu-expansion.json` | Factual grounding |
| Index | `fixtures/outreach/cases.jsonl` | Dataset pointer |
| Offline scores | `fixtures/outreach/scores/*.json` | Baseline / after snapshots |

Offline scorer:

```bash
npm run score:fixtures
# or SCORE_STAMP=label npx tsx scripts/score-fixtures.ts
```

## Reward signals

Implemented in `bot/lib/rewards.ts` and attached on successful
`save_outreach_draft` results:

`0.35 * personalization + 0.20 * tone + 0.20 * cta + 0.25 * grounding`

| Signal | Rule (v0) |
| --- | --- |
| Personalization | Overlap between body/citedSignals and researched signal summaries |
| Tone | Penalize hype/filler phrases |
| CTA | Exactly one ask in `cta`; body must not ask (`hasStackedCtas`) |
| Grounding | Cited signals match lead; hard zero on forbidden claims |

## Hillclimb round 1 — `sales-outbound`

- **Fixture(s):** Mira Series B email (`fixtures/outreach/mira-series-b.json`
  weak vs golden drafts)
- **Hypothesis:** If `save_outreach_draft` rejects stacked CTAs (and instructions
  put the only ask in `cta`), accepted drafts get `cta ≥ 0.8` and the weak
  multi-ask Mira draft cannot save.
- **Change (one lever):** single-CTA enforcement at the save boundary
  (`hasStackedCtas` in `bot/tools/save_outreach_draft.ts`), with matching
  instruction/playbook wording so the model knows the contract. Removed the
  contradictory “offer an alternate CTA” line.
- **Before → after (offline / tool call):**

  | Metric | Before | After |
  | --- | --- | --- |
  | Mira weak `cta` reward | 0.2 | 0.2 (still scored low; now **rejected** by tool) |
  | Mira weak `composite` | 0.84 | 0.84 (unsaved) |
  | Mira weak `tool saved` | **true** | **false** |
  | Mira golden `cta` | 1.0 | 1.0 |
  | Mira golden `composite` | 1.0 | 1.0 |
  | Mira golden `tool saved` | true | true (+ rewards payload) |
  | Model smoke/quality eval | blocked (no Cursor credential) | blocked |

- **Verdict:** **keep**
- **Lock:** quality eval predicates now fail stacked CTAs via `hasStackedCtas`;
  smoke prompt remains frozen in the Mira fixture.
- **Next failure mode:** after login, measure live model multi-ask rate on Mira;
  then tone hype phrases or Priya fabrication under live generation.

Score snapshots:
`fixtures/outreach/scores/baseline-before-lever.json`,
`fixtures/outreach/scores/after-single-cta-lever.json`.

## Model turns / evals (when credential available)

```bash
npx @grok/agent-sdk@0.6.0 eval --dir . --tag smoke
npx @grok/agent-sdk@0.6.0 eval --dir . --tag quality
npx @grok/agent-sdk@0.6.0 eval --dir .
```

## Remaining RL path

1. Unblock Cursor credential; run smoke + quality for live baselines.
2. Collect trajectories where `save_outreach_draft` succeeds (state root).
3. Label with `scoreOutreachDraft` (rule-based); add LLM judge second.
4. Preference-optimize / fine-tune **`qwen/qwen3.8-max-prime`** via
   `bot/lib/qwen.ts` (OpenRouter / Together / `QWEN_BASE_URL`).
5. Point `QWEN_BASE_URL` at the fine-tuned endpoint; keep Agent SDK fallbacks.
6. Re-run `--tag smoke` and `--tag quality` before promoting weights.
