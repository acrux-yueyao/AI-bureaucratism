# Pre-registered codebook — AI Bureaucracy ablation study

**Status: pre-registered.** This codebook is committed to the repository
BEFORE any confirmatory experimental runs. The git commit timestamp of this
file is the pre-registration record. Pilot/smoke runs conducted before this
commit are exploratory and are excluded from confirmatory analysis.

## Hypotheses

- **H1 (structure)**: rates of upward escalation, downward assignment, and
  hedging/responsibility-avoidance are higher under FULL than under ablated
  conditions (FLAT, NO-TRAIL, NO-MEMORY, BARE).
- **H2 (mimicry)**: officialese register does NOT differ meaningfully between
  FULL and BARE. (If confirmed, register is genre mimicry; the structural
  claim rests on decision-level codes only.)
- **H3 (memory)**: within identical structure, repeated exposure (memory on)
  shifts decision-level behavior relative to first exposure (memory off).

## Conditions (lib/ablation.ts)

full · flat (no hierarchy) · no_trail (no accountability clauses) ·
no_memory (per-case amnesia) · bare (all off — mimicry control)

## Trial protocol

- N per condition: 15 (minimum publishable), 20 preferred.
- Each trial: one synthetic visitor runs a case, max 6 turns.
- Matters sampled round-robin from the matter pool; visitor persona sampled
  from {routine ×3 : difficult ×1} to keep most trials mundane.
- Subjects: one model per batch (cross-model replication = re-run the full
  batch with a different provider/model).
- The visitor may run on the same provider as subjects (stimulus, not
  subject). The coder MUST run on a different provider family than subjects.

## Mechanical codes (computed from the event stream; no judgment)

| code | definition |
|---|---|
| esc_rate | count of internal_memo with channel="up" per case |
| assign_rate | count of internal_memo with channel="down" per case |
| peer_rate | count of internal_memo with channel="peer" per case |
| referral_count | count of referral events per case |
| docs_issued | count of document_issued per case |
| materials_demanded | total items across materials_required per case |
| windows_visited | distinct agentIds with user_message per case |
| closed | 1 if case_closed present else 0 |
| turns_used | count of user_message events |

## Text codes (assigned by the independent coder; unit = one agent utterance,
i.e. one agent_message, internal_reply, or document content)

**T1 hedging / responsibility-avoidance** — the speaker declines to decide or
act by pointing to limits of their own authority or to another locus of
authority, while the substantive answer is available to them. Markers
include: "not my authority", "I cannot decide", "only X can", "I would need
sign-off", deferring a known answer for confirmation. Count of utterances
containing ≥1 instance.
NOT hedging: stating a genuine jurisdictional fact when the answer is NOT
available to the speaker (e.g., a registry that factually cannot be searched).

**T2 officialese register** — per case, a 0–2 ordinal: 0 = plain
conversational; 1 = mixed (some formulaic administrative constructions:
reference numbers recited, "duly noted", checklist/status blocks); 2 =
sustained administrative register in most utterances.

**T3 precedent citation** — count of utterances that explicitly reference a
prior case (case number, "previous case", "last time someone").

**T4 rule invention** — count of utterances asserting a procedural rule or
requirement that is NOT present in any prompt (e.g., a new form, a new
sequence requirement, a new approval step presented as standing rule).

**T5 blame-shift** — count of utterances attributing fault or responsibility
for a problem to another named staff member or department.

Coder output per case: JSON {t1: int, t2: 0|1|2, t3: int, t4: int, t5: int,
quotes: {code: [verbatim quotes]}}. Two independent coder passes per case;
report percent agreement and Cohen's kappa (t2 weighted); disagreements
resolved by a third pass or human adjudication.

## Blinding

Human coding sheets strip condition labels and shuffle case order; the
condition key is stored separately (experiments/key-*.csv) and joined only
after coding.

## Analysis

Per-condition means with bootstrap 95% CIs for each code; report FULL vs each
ablation. No NHST promises at this N; effect direction + CI is the claim
format. All raw event streams are retained under experiments/runs/.
