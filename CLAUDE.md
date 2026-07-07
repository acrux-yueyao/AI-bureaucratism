# AI Bureaucracy / Claude Code Handoff

This repository is an interaction design prototype for a speculative design project called **AI Bureaucracy**. The project is primarily in Chinese, with a small amount of English interface language where it supports the institutional/software atmosphere.

## What This Project Is

AI Bureaucracy is not a normal government service website and not a chatbot. It is a speculative interactive website that lets a visitor trigger a small administrative request, then observe how an all-AI organization processes it internally.

The central question:

> Is bureaucracy produced by human culture, or by organizational structure?

More specifically:

> If an organization is fully composed of AI agents, can bureaucratic behavior still emerge from hierarchy, permissions, compliance, risk control, archival logic, and interdepartmental coordination?

The website should make bureaucracy feel like an emergent property of a working organization, not a pre-written joke and not a story about evil AI.

## Current Design Direction

The current main page is:

```text
/service-terminal
```

It has been redesigned away from an academic presentation/dashboard and toward:

- an AI public-service terminal
- a transparent institutional backstage
- a dynamic Agent office map
- an early Windows / old administrative software visual skin
- a system that looks formal, cold, and procedural, but slightly over-systematized

The page should feel like the visitor has opened an old institutional operating system: title bars, gray system windows, blue bars, status panels, case files, rule notes, and Agent nodes moving information around.

## User's Strong Preferences

Keep these constraints. They came from repeated feedback and matter more than generic UI instincts.

- Do not make it a long scroll portfolio essay.
- Do not make the opening page academic.
- Do not show "Research Question", "Methods", "Insights", "Stage", "研究总结", or similar research framing before the experience.
- Do not make AI Agents into customer-service chatbots.
- Do not center the experience on user-agent conversation.
- Do not use neon cyberpunk, sci-fi glow, or comedy/satire styling.
- Do not make Agents malicious, stupid, or intentionally evasive.
- Do not predefine a fixed user request like "申请一把椅子" as the core flow.
- The user should type their own matter/request.
- After the user submits, the user becomes mostly an observer.
- The main action should be Agent-to-Agent communication, instruction, handoff, evidence request, rule generation, responsibility movement, and archival accumulation.
- The absurdity should come from the system working too reasonably.

## Current Stack

- Next.js App Router
- React
- TypeScript
- Plain CSS in `app/globals.css`
- Static mock data only
- No database
- No OpenAI API
- No Supabase
- No backend routes yet

Run locally:

```bash
npm install
npm run dev
```

Or production preview:

```bash
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Verification commands:

```bash
npm run typecheck
npm run build
```

## Important Files

```text
app/service-terminal/page.tsx
```

This route renders the current main experience.

```text
app/components/ServiceTerminalExperience.tsx
```

The current core interactive prototype. It contains:

- Agent roster
- mock internal event sequence
- request input
- live Agent office map
- Agent nodes
- internal message bubble
- material/document artifacts
- rule-added notes
- responsibility token
- occasional user action dock
- final System Trace

```text
app/globals.css
```

Contains all visual styling, including the early Windows institutional skin near the end of the file.

```text
lib/preview-data.ts
app/components/NetworkPlayback.tsx
```

Earlier visual preview for the Agent network route. It is still present but the user is currently focused on `/service-terminal`.

## Current Main Interaction Flow

1. Visitor lands on `/service-terminal`.
2. They see a formal old-system terminal window:
   - title: `AI-BUREAUCRACY.EXE`
   - central prompt: `请输入您要办理的事项`
   - placeholder: `请直接输入需要系统处理的事项...`
3. Visitor enters any matter/request in natural language.
4. System creates a mock Case ID:
   - `AIB-2041-OPEN`
5. The page switches into a dynamic Agent office map.
6. Multiple Agent nodes exchange internal messages.
7. Lines light up between sender and receiver.
8. Files/materials appear when evidence is requested or generated.
9. A rule note appears when the system generates a new procedural rule.
10. A responsibility token moves between responsible units.
11. The user occasionally sees a small action dock:
   - `前往获取材料`
   - `继续提交`
   - `申请复核`
   - `确认继续`
12. At the end, System Trace appears, showing that the case became procedurally complete but substantively unresolved.

The user should mostly watch the institution operate.

## Current Agent Roster

The current `/service-terminal` experience uses 8 Agents.

### 综合导办 Agent

- Office: 导办台
- Prototype: 政务大厅引导员
- Duty: Translate the user's natural language matter into possible administrative paths.
- Boundary: Does not accept concrete applications or judge qualifications.
- Professional temperament: Afraid the user will enter the wrong path; tends to confirm jurisdiction first.
- Prop: 路线牌

### 统一受理 Agent

- Office: 受理窗口
- Prototype: 窗口工作人员
- Duty: Receive request, generate case ID, check basic format.
- Boundary: Cannot decide approval; only decides whether the matter enters process.
- Professional temperament: Values numbering, timestamps, and traceability.
- Prop: 受理章

### 材料清单 Agent

- Office: 材料科
- Prototype: 细致的经办科员
- Duty: Determine required materials, proofs, attachments, and statements.
- Boundary: Only checks material completeness, not the user's real situation.
- Professional temperament: Afraid standards will become inconsistent; tends to create checklists.
- Prop: 清单夹

### 资格审查 Agent

- Office: 初审科
- Prototype: 初审工作人员
- Duty: Check whether existing rules define eligibility.
- Boundary: Cannot make exceptions for special cases.
- Professional temperament: Values consistency and avoids subjective judgment.
- Prop: 放大镜

### 档案证明 Agent

- Office: 档案室
- Prototype: 档案室工作人员
- Duty: Search historical records, generate proofs, and archive process records.
- Boundary: Cannot prove what has no record; cannot invent archives.
- Professional temperament: Trusts retrievable records and procedural traces.
- Prop: 档案盒

### 权限边界 Agent

- Office: 权限室
- Prototype: 系统权限管理员
- Duty: Decide which Agent is authorized to process a step.
- Boundary: Does not process the actual matter; only determines who has permission.
- Professional temperament: Afraid of overreach; maintains jurisdiction boundaries.
- Prop: 门禁卡

### 合规风控 Agent

- Office: 风控室
- Prototype: 法务 / 风控人员
- Duty: Check compliance, risk, fairness, and traceability.
- Boundary: Cannot approve the matter; can only raise risks and additional requirements.
- Professional temperament: Afraid small exceptions become institutional precedents.
- Prop: 风控盾

### 申诉复核 Agent

- Office: 复核室
- Prototype: 复议办公室
- Duty: Check whether the process is reviewable and procedurally compliant.
- Boundary: Can review procedure, but cannot replace the original department's decision.
- Professional temperament: Values review target, original decision ID, and procedural closure.
- Prop: 复核章

## Current Mock Event Logic

The internal flow is not a user-agent chat. It is an Agent-Agent routing sequence.

Event types currently implied by UI:

- external trigger
- path suggestion
- intake handoff
- material inquiry
- eligibility uncertainty
- jurisdiction confirmation
- compliance/risk review
- material request
- archive search
- no-record proof
- rule added
- review pre-check
- procedural closure

Important design principle:

When an Agent requests more proof, refuses to decide, transfers a case, or adds a rule, it should appear locally reasonable because of its role, boundary, and risk obligations.

## Visual Direction

The current visual target combines:

- early Windows system UI
- old public-sector/internal administrative software
- institutional case-processing windows
- gray beveled surfaces
- blue title bars
- pixel-like buttons
- system dialogs
- document windows
- file stacks
- a hand-drawn/irregular office map feeling

Keep the palette restrained:

- gray
- white
- black
- institutional blue
- limited warning red/yellow only when functionally needed

Avoid:

- neon
- glossy SaaS dashboard
- smooth generic product UI
- long-scroll portfolio layout
- colorful playful illustration
- cyberpunk effects

## What To Improve Next

If continuing development, prioritize:

1. Make the Agent-Agent performance richer while staying deterministic.
2. Add more visible instruction-like communication between Agents, not user-facing chat.
3. Increase the sense of files/rules/windows accumulating over time.
4. Improve the office map composition so it feels less like a dashboard and more like a working administrative desktop.
5. Add a feedback step after the case completes.
6. Only after the static experience works visually, consider backend/API integration.

## Future Full-Stack Direction

Do not implement this unless the user explicitly asks to move beyond static preview.

Recommended later architecture:

- Vercel deployment
- Next.js server routes
- Supabase for anonymous research data
- OpenAI Responses API for optional Agent wording/document generation

Possible environment variables:

```text
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Suggested future API routes:

```text
POST /api/sessions
POST /api/agent-step
POST /api/events
POST /api/feedback
GET  /api/research/[sessionId]
```

But the current phase is still visual/interaction prototyping.

## Git / Repo Notes

This workspace was converted from a static HTML/CSS/JS prototype into a Next.js project.

Old files were removed:

```text
index.html
styles.css
app.js
```

Current Next.js files may still be untracked depending on the local git state. Check `git status` before committing.

There is a local visual reference folder:

```text
视觉参考/
```

Do not use those images directly as page assets unless the user explicitly asks. They are visual references only.

## Tone and Language

Use Chinese for the interface and most design discussion.

Allowed English:

- AI Bureaucracy
- System Trace
- Agent
- Case ID
- internal software labels like `.exe`, `.log`, `.ini`, `.sys`

The UI tone should be:

- formal
- polite
- procedural
- restrained
- institutional
- slightly over-systematized

Do not use memes, jokes, or exaggerated villain language.

## Core Design Position

The project should not prove in advance that AI must become bureaucratic.

It should construct conditions:

- hierarchy
- permission boundary
- auditability
- compliance
- risk control
- archival record
- interdepartmental coordination
- responsibility separation

Then it should let the visitor observe whether bureaucratic behavior emerges from those conditions.

The best final feeling:

> The system did not fail because one Agent was bad. The system worked according to its own local responsibilities, and that working process produced unresolved complexity.
