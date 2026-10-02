# Unified practice and conversation skills

The previous home page repeated explanatory sections and tool descriptions while the trainer only tested pattern families. This change makes the home page a practice plan and adds contextual response practice. It is an educational beta, not a clinically validated treatment.

## Implemented

- The feature registry owns labels, groups, routes, navigation, and home tool cards. Core tools are always visible; deeper labs and resources are disclosure groups. Existing routes and lab state are preserved.
- Shared `?tab=` links resolve correctly; valid hashes take precedence and malformed hashes cannot crash routing.
- The redundant category select is removed. Category chips are the sole filter and are locked during an active session so the filter cannot disagree with the current questions.
- Core category examples now ask one contextual clarification at a time. The ambiguous referent example no longer simultaneously tests a universal quantifier. "Corrective question" becomes "possible clarification question".
- Production legacy core categories and statements are generated from `packs/meta-model-core.json` during the build. Legacy blueprint and prism data remain intact. This synchronizes deployed core content without overwriting independent specialized curricula.
- Parallel Classic and Prism implementations are grouped in an archive with links to their canonical feature. Seven additional specialized legacy exercises remain accessible. Files are retained until their distinct capabilities can be migrated and verified.
- Six original fictional situations contain twelve response decisions and thirty-six authored options: attunement, consent/goal, clarification, meaning/impact, widening choice, small action/check, and repair/timing.
- Each option explains why it fits or misses the current goal. Illustrative replies are explicitly fictional; the next decision presents its own continuation, not a model prediction. Options shuffle. Retrying preserves the first answer as practice evidence.
- Optional free response is compared by the learner, not automatically graded. It is never written to the learning store; leaving or completing a session clears it.
- Skill evidence, context counts, suggested reviews, and self-reported real-life attempts share one provider. Repeating a scenario earns points at most once per local calendar day. Same-day repetition does not advance the spacing interval. Review intervals of 1/3/7 days are a product heuristic, not a validated intervention.

## Evidence boundaries

NLP-origin language patterns, motivational interviewing communication skills, and learning-science scheduling are different components. Evidence for one component must not be presented as clinical validation of their combination.

- Sturt et al. (2012), systematic review: limited quantity and quality of evidence for NLP health outcomes, not strong proof of no effect. https://bjgp.org/content/62/604/e757
- Carpenter, Pan & Butler (2022), review of spacing and retrieval practice. Supports educational retention principles; transfer to interpersonal performance must be measured. https://www.nature.com/articles/s44159-022-00089-1
- SAMHSA (2020), motivational interviewing advisory: open questions, affirmations, reflective listening, summaries, and client goals. This application practices related communication moves and does not certify MI competence. https://library.samhsa.gov/sites/default/files/PEP20-02-02-014.pdf
- Dogan et al. (2025), 100-participant randomized trial of postpartum comfort after cesarean delivery. A specific intervention and population; not evidence that this app or Meta Model questioning treats mental disorders. https://link.springer.com/article/10.1186/s12884-025-08043-8

Content-source review is not clinical validation. A language pattern does not establish that the speaker is mistaken. Alternatives should preserve autonomy and real constraints. Broadening a map must not prescribe reconciliation, dismiss harm, or erase boundaries.

## Remaining work

1. Inventory each legacy tool's unique task, content IDs, storage, feedback, and routing before porting it into a native feature. Do not delete an exercise merely because it has a similar name.
2. Replace duplicated specialized terminology through a versioned glossary with contextual variants and provenance. Breen rows, Dilts logical levels, Meta States, CBT, and the basic Meta Model need distinct identifiers.
3. Extend practice to novel scenarios, learner-written questions assessed with a human rubric, and longer conversations. Current multiple-choice evidence is limited and cannot establish fluent spontaneous performance.
4. Evaluate near-term and delayed transfer using unfamiliar examples, blind human ratings of empathy/precision/autonomy/timing, and voluntary self-report. Clinical outcome claims require separate controlled evaluation and professional governance.
5. The learning store is local to one browser and origin. No cross-device sync or migration of private client records is implemented. Existing laboratory storage schemas are unchanged.

No private source documents or real clinical examples are included in this repository. New scenarios are independently authored teaching examples.
