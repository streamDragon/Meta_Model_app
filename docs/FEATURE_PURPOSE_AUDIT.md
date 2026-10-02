# Feature purpose audit — October 2026

The main path is **practice plan → contextual dialogue → clarification → one real-world step → review**. A feature stays when it serves a distinct task. Parallel interfaces belong in an archive, not in the main navigation. Personal writing is a draft until refresh unless a feature explicitly saves or exports it. Local storage is browser-specific; there is no account-wide cross-device synchronization.

| Feature | Job | Change and reason |
|---|---|---|
| Home | Choose the next useful exercise | Practice recommendation and due reviews appear before the optional course gate; cards use one registry and plain task descriptions. |
| Conversation gym | Choose a response in context | Six fictional dialogues, explanatory feedback, seven skills, spaced reviews and a real-life attempt prompt. A written draft is not graded or persisted. |
| Categories | Find a useful clarification question | Search covers terms, descriptions, examples and questions. Three families/eleven patterns share the authoritative core pack with deployed legacy data. |
| Pattern trainer | Separate visible language from supplied interpretation | Family filtering is explicit. The second stage displays its supplied interpretation before asking a question; it cannot infer somebody's hidden intent. |
| Blueprint | Turn intention into a doable step | Editable personal wording; result, first step and time required. Further decomposition and barriers optional. The actual chosen time appears in the result. Reporting an attempt gives no extra completion reward. |
| Prisms | Choose a starting clarification question | Requires an actual sentence and at least one relevant layer. All five layers are optional individually. A user can choose the starting layer. The rule-based suggestion is provisional. Saving is explicit; current-map export and history export are distinct. |
| Values and constraints | Clarify a tradeoff and select a next step | Rule outputs are questions, not diagnoses. No findings is not proof of balance. One move and a dated next step can be selected. Reviewed sessions retain completion status on reopening. Redundant detail is collapsed. |
| Thought map | Describe a thought and identify possible missing information | Drafts survive tab changes; repeated save is blocked. Explicit handoff transfers the actual thought into an experiment. Pattern matches are keyword suggestions. |
| Thought record | Compare an event, thought, prediction and evidence | Starts blank with an optional example. Hebrew labels, explicit local text export and prediction-to-experiment handoff. It is a draft until exported; no silent persistence. |
| Belief lens | Explore one topic within a belief | Unmatched text no longer defaults to cause. The person can choose a topic; that choice now changes the clarification question. |
| Reality experiment | Compare a prediction with an observation | Requires prediction, action, time/context and observable criterion. Results and learning update the same record. Resuming does not award planning points again. Belief strength need not decrease. |
| Small action | Report one small attempt | Empty action blocked; the completion button is idempotent and explicitly labels self-report. |
| CBT learning cards | Read one conceptual explanation | Completed lessons cannot award the same completion again. |
| CBT drills | Practice distinctions with feedback | Response order shuffled; only the first response in each item is counted. |
| Daily meaning gym | Try exercises rather than only read | Selectable cards, fewer duplicate navigation controls, at least two attempted exercises before completion, valid deduplicated completion IDs. |
| Sources/About | Understand provenance and limits | Explain authored educational exercises, sources and browser storage in user language. XP and hypothetical scenarios do not establish clinical efficacy. |
| Why it matters/help | Explain when to use the current tool | One concrete role per feature; generic therapeutic promises removed. Help collapses; the trigger no longer floats over navigation. |

## Preserved supplementary tools

These tools have their own older implementations. Their distinctive exercise behavior is preserved, with a shared, mobile-aware guide describing purpose, method, output and a return to the canonical route. This is not a claim that every legacy interaction has been rebuilt or visually verified on every phone.

| Tool | Distinct task | Decision |
|---|---|---|
| Iceberg Templates | Compare a supplied surface/depth interpretation | Keep; clarify that an interpretation is a hypothesis. |
| Scenario Trainer | Respond to a contextual scene | Keep as an advanced exercise; link to conversation gym. |
| Breen Table Lab | Locate and distinguish tabulated patterns | Keep; distinguish it from logical levels in Prisms. |
| Sentence Morpher | Compare what a change of wording changes | Keep; wording does not change historical facts. |
| Living Triples | Compare related pattern alternatives | Keep; rely on supplied context. |
| Verb Unzip | Specify an otherwise vague action | Keep; connect to step planning. |
| Context Radar | Recover missing context | Keep; connect to contextual dialogue. |
| Classic 2 / Classic Classic | Parallel classification interfaces | Archive, with links to the main trainer; original URLs preserved. |
| Original Prism Lab / Research | Parallel prism implementations | Archive, with links to the main prism lab; original URLs preserved. |

## Validation and remaining work

Automated React/jsdom checks cover completion guards, history update without duplicate records/rewards, mobile thought-map flow, draft retention and handoff, navigation, learning state and core content. TypeScript and production builds must pass before publishing. CSS supports narrow layouts and 16px form inputs. A real device visual inspection remains necessary for every supplementary tool; no clinical validation is claimed.

Legacy engines can use independent progress keys. Shared core content, navigation and purpose are now consistent, but all legacy progress is not migrated into a single schema. A follow-up migration needs explicit key mapping, backup and compatibility checks. The maintained gym's score and review schedule stay separate from old overall XP; neither measures clinical competence.
