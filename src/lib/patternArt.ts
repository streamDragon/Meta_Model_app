// Book-style illustrations for every Meta Model pattern (assets/images/prismlab).
// Keyed by subcategory id (content packs) and reused by the prism lab.
import simpleDeletion from '../../assets/images/prismlab/book-simple-deletion.webp';
import comparisonDeletion from '../../assets/images/prismlab/book-comparison-deletion.webp';
import lackReferential from '../../assets/images/prismlab/book-lack-referential.webp';
import nominalization from '../../assets/images/prismlab/book-nominalization.webp';
import causeEffect from '../../assets/images/prismlab/book-cause-effect.webp';
import mindReading from '../../assets/images/prismlab/book-mind-reading.webp';
import lostPerformative from '../../assets/images/prismlab/book-lost-performative.webp';
import presupposition from '../../assets/images/prismlab/book-presupposition.webp';
import complexEquivalence from '../../assets/images/prismlab/book-complex-equivalence.webp';
import universalQuantifier from '../../assets/images/prismlab/book-universal-quantifier.webp';
import modalOperator from '../../assets/images/prismlab/book-modal-operator.webp';

export const PATTERN_ART: Record<string, string> = {
  simple_deletion: simpleDeletion,
  comparative_deletion: comparisonDeletion,
  lack_referential_index: lackReferential,
  nominalization,
  cause_effect: causeEffect,
  mind_reading: mindReading,
  lost_performative: lostPerformative,
  presupposition,
  complex_equivalence: complexEquivalence,
  universal_quantifier: universalQuantifier,
  modal_operator: modalOperator,
};

// Prism ids that differ from subcategory ids
export const PRISM_ART: Record<string, string> = {
  cause_effect: causeEffect,
  comparisons: comparisonDeletion,
  nominalization,
  modal_operators: modalOperator,
  universal_quantifiers: universalQuantifier,
  mind_reading: mindReading,
};
