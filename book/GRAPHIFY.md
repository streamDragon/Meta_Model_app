# Graphify knowledge graph, canonical snapshot 0.2

Graphify is the **knowledge map** of the book and Meta Model app, not a claim that every item is implemented. The interactive visualization from the conversation is separate; this file makes the conceptual relations accessible to all local agents.

## Nodes
| ID | Node | Source status | Destination |
| --- | --- | --- | --- |
| MAP | Map vs territory | established NLP historical framework | Part I |
| CLASSIC | Classical Meta Model | Bandler and Grinder | Part II |
| COMPASS | NLP Compass | Michael Breen framework, attribution to verify in original manual | Part III |
| TABLE5 | Spatial five-row table | Breen + Haggai's manuscript reading | Part III |
| FRAMING | Framing Tool | Breen source materials | Part III |
| PRISMS | Meta Model Prisms | author's original development | Part IV |
| ANSWERS | Answers Model 2026 | newer working draft, requires review | Part IV |
| STATES | State regulation / beyond language | multiple sources and lessons, must verify lessons | Part IV |
| SLEIGHT | Sleight of Mouth | Dilts, course sources and comparison essays | Part IV |
| AI | ChatGPT-assisted training | proposed workflow; requires safe boundaries | all parts |
| APP | Existing Meta Model app | inspect `src/registry.ts` before claiming a feature | existing site |
| BOOK | Book manuscript | Google Docs editorial master, see local private link index | local + Drive |
| EVIDENCE | Empirical evidence and limits | evaluate per claim, distinguish NLP from other therapies | every chapter |

## Edges
MAP -> CLASSIC -> TABLE5 -> COMPASS -> PRISMS -> ANSWERS -> APP
TABLE5 -> FRAMING -> ANSWERS
PRISMS -> STATES
CLASSIC -> SLEIGHT
EVIDENCE -> every treatment claim
BOOK <-> APP via exercise IDs, never by unverified assumptions.

## Five row working reading (to verify against original Breen material)
1. Source of belief, authority, hidden premise.
2. Rules, causation and necessity/possibility.
3. Meaning, identity and equivalence.
4. Referential specifics: who, where, when, comparison.
5. Sensory and behavioral particulars.

## Exercise schema
`exerciseId`, `bookPart`, `bookChapter`, `fictionalPrompt`, `objective`, `compassDirection`, `tableRow`, `prism`, `question`, `simulatedResponse`, `revisionOfHypothesis`, `consentAndRapportCheck`, `appStatus`, `source`, `evidenceGrade`.

## Update rule
When a concept changes, update its node, manuscript chapter mapping, app exercise mapping and attribution. No second Graphify repository or competing source index.
