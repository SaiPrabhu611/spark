# spark — sales-outbound agent

GitHub home for Sai Kalva's sales outbound Agent SDK agent.
Preferred model: `qwen/qwen3.8-max-prime`.

---

# sales-outbound

Agent SDK sales outbound agent: research mock CRM leads, then draft personalized
email or LinkedIn outreach with a single clear CTA.

## Model

| Role | Model id |
| --- | --- |
| **Preferred (Qwen large)** | `qwen/qwen3.8-max-prime` |
| Cursor harness fallback | `grok-4.7` (`reasoning_effort=high`, `fast=true`) |
| Together alternate (BYOK client) | `Qwen/Qwen3.7-Max` |

`bot/agent.ts` sets the preferred id to **`qwen/qwen3.8-max-prime`** (OpenRouter’s
large Qwen Max-class instruct/chat id). The Agent SDK routes turns through
Cursor’s model catalog; if that id is refused for the account, fallbacks step
down to Cursor-hosted Grok so playground / evals still run.

Direct OpenAI-compatible Qwen calls (offline smoke, RL later) use
`bot/lib/qwen.ts`:

```bash
# OpenRouter (recommended for qwen/qwen3.8-max-prime)
export OPENROUTER_API_KEY=...

# or Together
export TOGETHER_API_KEY=...
# optional override: export QWEN_MODEL_ID=Qwen/Qwen3.7-Max

# or any OpenAI-compatible endpoint (vLLM, local gateway, fine-tune host)
export QWEN_BASE_URL=http://127.0.0.1:8000/v1
export QWEN_API_KEY=local
export QWEN_MODEL_ID=qwen/qwen3.8-max-prime
```

With no keys, `completeQwen` returns a deterministic **mock** completion so
tooling stays key-free.

## What it does

- `list_leads` — inventory of fixture leads
- `research_lead` — company/person evidence from mock CRM
- `save_outreach_draft` — persist a grounded draft (email or LinkedIn)
- `qwen_status` — report whether a Qwen provider is configured

## Run locally

Requires Node 22.13+ (never Bun) and a Cursor credential for model turns
(`agent-sdk login`, or `CURSOR_API_KEY` / `CURSOR_API_KEY_FILE` /
`CURSOR_SERVICE_ACCOUNT_KEY`).

```bash
cd sales-outbound
npm install
npx @grok/agent-sdk@0.6.0 login   # once, if needed
npx @grok/agent-sdk@0.6.0 validate --dir .
npx @grok/agent-sdk@0.6.0 info --dir . --json
npx @grok/agent-sdk@0.6.0 tool call research_lead --dir . --input '{"leadId":"lead_mira_chen"}'
npx @grok/agent-sdk@0.6.0 dev --dir . --port 3417
# playground: http://127.0.0.1:3417/playground
```

Example playground prompt:

> Research Mira Chen at Northwind Analytics and draft a short personalized email. Save the draft.

One-shot turn:

```bash
npx @grok/agent-sdk@0.6.0 run --dir . --message 'Research lead_mira_chen and draft a personalized email. Save it.'
```

## Evals + offline rewards

```bash
npx @grok/agent-sdk@0.6.0 eval --dir . --list
npx @grok/agent-sdk@0.6.0 eval --dir . --tag smoke
npx @grok/agent-sdk@0.6.0 eval --dir . --tag quality
npx @grok/agent-sdk@0.6.0 eval --dir .
npm run score:fixtures   # offline reward scores (no API key)
```

| Case | Tag | Checks |
| --- | --- | --- |
| `smoke` | smoke | research + save_outreach_draft for Mira |
| `outreach-quality/mira-series-b-email` | quality | Series B / hiring personalization + single CTA |
| `outreach-quality/jordan-linkedin-pilot` | quality | LinkedIn + same-day pilot grounding |
| `outreach-quality/priya-no-fabrication` | quality | EU expansion facts; no invented certs |

Evals need a Cursor credential (same as `run`). Tool-only smoke and
`npm run score:fixtures` do not.

**Hillclimb round 1 (kept):** `save_outreach_draft` rejects stacked CTAs.
Pinned Mira weak multi-ask draft no longer saves; golden still scores
composite `1.0`. Details: [`docs/rl-hillclimb-next.md`](./docs/rl-hillclimb-next.md).

Tool-only smoke:

```bash
npx @grok/agent-sdk@0.6.0 tool call list_leads --dir . --input '{}'
npx @grok/agent-sdk@0.6.0 tool call save_outreach_draft --dir . --input '{"leadId":"lead_mira_chen","channel":"email","subject":"Congrats on the Series B","body":"Mira — saw Northwind close the Series B and open data platform roles. We help GTM teams turn those hiring signals into grounded outbound without inventing claims. Worth a 15-minute look this week?","cta":"Open to a 15-minute chat this week?","citedSignals":["Closed a $42M Series B led by Horizon Capital","Open roles: Senior Data Platform Engineer, Analytics Engineer"]}'
```

## RL / hillclimb next

See [`docs/rl-hillclimb-next.md`](./docs/rl-hillclimb-next.md) for fixtures,
reward signals (personalization, tone, CTA, factual grounding), and the first
hillclimb ticket. Do not block on full RL in this repo cut.

## Deploy

```bash
npx @grok/agent-sdk@0.6.0 validate --dir .
npx @grok/agent-sdk@0.6.0 deploy --dir . --dry-run
# then, in your own terminal after review:
# npx @grok/agent-sdk@0.6.0 deploy --dir .
```
