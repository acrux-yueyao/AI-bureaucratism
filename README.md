# AI Bureaucracy

**Does bureaucracy need bureaucrats?** GOV.AI — Unified Government Services is a speculative government service hall staffed entirely by live AI agents, built to test whether red tape emerges from organizational structure alone.

**[Live site](https://ai-bureaucratism.vercel.app)** · **[Interactive case study](https://ai-bureaucratism.vercel.app/study)** · [Written case study](CASE_STUDY.md) · [Preregistration](CODEBOOK.md)

## Research question

> Do bureaucratic behaviors — escalation, paper demands, responsibility diffusion, precedent citation — emerge from organizational structure alone, absent any instruction to behave bureaucratically?

Thirteen officers (eight windows, two deputy directors, a director, two trainees) are real model calls given **only** organizational conditions — identity, duty, boundaries, reporting lines, paper-trail rules, plus one non-work personal detail. **Nothing in any prompt tells them how to behave.** Difficult visitors are a separate, scripted *stimulus* layer, never confused with the uninstructed *subjects*.

## The artifact

- **The hall** — a three.js exploded hierarchy in a dark void: thirteen glass offices float at altitudes set by standing (seniority-staggered, then *earned* at runtime from accumulated service). The citizen stays on the ground; a beam of light is the only interface. Words rise as warm particles, replies descend cool, documents fall into a paper stack at your feet. Peer consults and escalations are carried in person by the sender's figure; replies and assignments travel as pulses.
- **Researcher view** — click any office for a live dossier: tallies, current action, and the officer's own end-of-day notebook.
- **Replays** — three recorded cases from the preregistered runs drive the full UI with zero API calls. This is the public mode of the deployment.
- **Stress scenarios (observer mode)** — a synthetic, deliberately difficult visitor runs the hall on its own while the researcher watches.
- **The study page** — [/study](https://ai-bureaucratism.vercel.app/study) tells the whole project as a scroll-driven descent from GOV.UK daylight into the void: background, method, live ablation bench, findings, five rejected halls, instrumentation, and an invitation to participate. English content with a full Chinese translation behind the header toggle.

## The experiment

Preregistered (the git timestamp of [CODEBOOK.md](CODEBOOK.md) is the registration record): five ablation conditions (full / flat / no-trail / no-memory / bare) × 15 trials = 75 cases, coded mechanically from the event stream plus five text codes rated by an independent LLM coder from a different model family, two passes, agreement reported.

Headline results: demands for extra materials jump from 0.80/case (flat) to 4.07/case when accountability or memory is stripped from a hierarchy (non-overlapping bootstrap CIs); officialese register is ceiling-level in *every* condition including bare — so the language is pretraining mimicry while the decisions are structural; precedent citation appears only with memory on; and hierarchy also *closes* more cases. Details and limitations in [CASE_STUDY.md](CASE_STUDY.md).

## Run locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Requires an [Anthropic API key](https://console.anthropic.com/). Default model `claude-sonnet-5` (override with `AIB_MODEL`). A full case costs roughly a few cents to a few tens of cents.

**Deploying publicly:** set `AIB_LIVE_PASS` alongside the API key — with it set, all API routes require a matching `x-aib-pass` header, so visitors get the replays while live agents stay key-gated. Without an API key on the server, the site still works fully (replays, hall, study page); live mode simply reports itself asleep.

Batch experiments: `npx tsx scripts/run-experiment.ts --conditions full,bare --n 15 --yes` (budget-guarded, default $30); analyze with `scripts/analyze.ts`.

## Notes

This is not a real government system and collects no real personal data. It does not presuppose that AI must become bureaucratic; it only builds the conditions — hierarchy, permission boundaries, paper trails, accountability, memory — and watches what grows.

The feeling it aims for:

> The system did not fail because any one agent was bad. Every agent worked reasonably within its local duty, and that reasonable working itself produced unresolved complexity.

---

中文说明：本项目是一个思辨设计研究原型——由真实 AI Agent 组成的政务大厅，检验官僚行为是否仅凭组织结构涌现。线上站点公开提供回放与案例研究页（`/study`，右上角可切中文）；live 模式由口令保护。研究背景、红线方法与实验设计详见 CLAUDE.md 与 CASE_STUDY.md。
