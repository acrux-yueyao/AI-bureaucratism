# AI Bureaucracy

A speculative design research prototype: **GOV.AI — Unified Government Services**, a public service hall staffed entirely by live AI agents (Claude API). A visitor walks in with a matter and runs between windows in first person; departments exchange internal memos behind the counter. Everything is recorded, and an outside observer writes an analysis for the designer.

## Research question

> Is bureaucracy a product of human culture, or does it emerge from organizational structure itself?

Each window officer is a real model call given only an organizational identity (duty, boundary, issuable documents), organizational conditions (paper trail, accountability, a hall directory), and a few non-work personal details. **Nothing in any prompt tells them how to behave.** Whether buck-passing, officialese, or self-multiplying document requirements appear is entirely emergent — and if they never appear, that is a finding too.

## The experience

1. **Portal** — state your matter in free text; a case is opened
2. **Service hall** — a field-note floor map: walk between eight windows, collect stamped documents, get referred, and open the internal-traffic drawer to watch departments memo each other in real time (responses stream token by token)
3. **Receipt & report** — case statistics, an observer's analysis (evidence *and* counter-evidence, quoted from the file), and JSON/Markdown export

### Stress scenarios (observer mode)

A synthetic visitor — also a model call, deliberately difficult (demanding unprovable certificates, insisting on circular requirements, bringing matters no rule covers) — runs the hall on its own while the researcher watches. The synthetic visitor is experimental *stimulus*; the organization remains the uninstructed *subject*.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Requires an [Anthropic API key](https://console.anthropic.com/). Default model `claude-sonnet-5` (override with `AIB_MODEL`). A full case costs roughly a few cents to a few tens of cents depending on how much the hall decides to deliberate.

## Notes

This is not a real government system and collects no real personal data. It does not presuppose that AI must become bureaucratic; it only builds the conditions — hierarchy, permission boundaries, paper trails, accountability, interdepartmental coordination — and lets you watch what grows.

The feeling it aims for:

> The system did not fail because any one agent was bad. Every agent worked reasonably within its local duty, and that reasonable working itself produced unresolved complexity.

---

中文说明：本项目是一个思辨设计研究原型，用真实 AI Agent 组成的政务大厅观察官僚行为是否从组织结构中涌现。界面以英文为主（开发期保留中文开关）。研究背景与实验设计详见 CLAUDE.md。
