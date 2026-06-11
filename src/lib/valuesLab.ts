// Values/Constraints Lab — pure logic, ported from the vanilla WIP
// (js/values-lab.js). Two-floor model: Floor 1 = hidden constraint map
// (cards), Floor 2 = degree/threshold. Rule-based, no AI.

export type Negotiability = 'fixed' | 'flexible' | 'unknown';

export interface VclCard {
  id: string;
  label: string;
  type: string;
  importance: number;
  minimum: string;
  ideal: string;
  negotiability: Negotiability;
  logicalLevel: string;
  notes: string;
  linkedTo: string[];
}

export interface VclTradeoff {
  id: string;
  between: string[];
  winner: string;
  note: string;
}

export interface VclFinding {
  id: string;
  evidence: string[];
}

export interface VclSession {
  sessionId: string;
  title: string;
  initialStatement: string;
  mainDesire: string;
  constraints: VclCard[];
  values: string[];
  tradeoffs: VclTradeoff[];
  diagnosis: VclFinding[];
  questionsGenerated: string[];
  insights: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VclOption {
  id: string;
  label: string;
  icon?: string;
  hint?: string;
}

export interface VclQuestionTemplate {
  id: string;
  template: string;
}

export interface VclDiagnosisRule {
  id: string;
  label: string;
  description: string;
  advice: string;
}

export interface VclMove {
  id: string;
  label: string;
  description: string;
  for_diagnosis: string[];
}

export interface VclData {
  card_types: VclOption[];
  logical_levels: VclOption[];
  value_domains: string[];
  negotiability_options: VclOption[];
  floor1_questions: string[];
  floor2_questions: string[];
  meta_model_questions: VclQuestionTemplate[];
  diagnosis_rules: VclDiagnosisRule[];
  moves: VclMove[];
  starter_examples: VclSession[];
}

function freshId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// Extract the main desire: the part before the first "but / and also" connector.
export function extractVclDesire(statement: string): string {
  const text = String(statement || '').trim();
  if (!text) return '';
  const connectors = [' אבל ', ' אך ', ' וגם ', ' ובנוסף ', ', ', ' למרות '];
  let cut = text.length;
  connectors.forEach((connector) => {
    const idx = text.indexOf(connector);
    if (idx > 0 && idx < cut) cut = idx;
  });
  let desire = text.slice(0, cut).trim();
  desire = desire
    .replace(/^אני (רוצה|צריך|חייב|מנסה)\s*/, '')
    .replace(/[.!?]+$/, '')
    .trim();
  return desire || text;
}

export function createVclSession(statement: string): VclSession {
  const now = new Date().toISOString();
  return {
    sessionId: freshId('vcl'),
    title: extractVclDesire(statement),
    initialStatement: statement,
    mainDesire: extractVclDesire(statement),
    constraints: [],
    values: [],
    tradeoffs: [],
    diagnosis: [],
    questionsGenerated: [],
    insights: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createVclCard(fields: Partial<VclCard> = {}): VclCard {
  return {
    id: fields.id || freshId('card'),
    label: fields.label || '',
    type: fields.type || 'value',
    importance: Number(fields.importance) || 5,
    minimum: fields.minimum || '',
    ideal: fields.ideal || '',
    negotiability: fields.negotiability || 'unknown',
    logicalLevel: fields.logicalLevel || 'belief-value',
    notes: fields.notes || '',
    linkedTo: Array.isArray(fields.linkedTo) ? fields.linkedTo : [],
  };
}

// Rule-based diagnosis engine. Returns findings with card-label evidence.
export function diagnoseValuesSession(session: VclSession): VclFinding[] {
  const cards = session?.constraints || [];
  const tradeoffs = session?.tradeoffs || [];
  const findings: VclFinding[] = [];
  const labelOf = (id: string) => cards.find((c) => c.id === id)?.label || id;

  // a. Too many simultaneous hard constraints
  const hardCards = cards.filter((c) => c.negotiability === 'fixed' && c.importance >= 8);
  if (hardCards.length >= 4) {
    findings.push({ id: 'too_many_hard', evidence: hardCards.map((c) => c.label) });
  }

  // b. Unclear hierarchy: many top-importance cards and no resolved tradeoffs
  const topCards = cards.filter((c) => c.importance >= 8);
  const unresolved = tradeoffs.filter((t) => !t.winner);
  if (topCards.length >= 4 && (tradeoffs.length === 0 || unresolved.length > 0)) {
    findings.push({ id: 'unclear_hierarchy', evidence: topCards.map((c) => c.label) });
  }

  // c. Hidden identity issue: fixed demand living at identity/purpose level
  const identityCards = cards.filter(
    (c) => ['identity', 'purpose'].includes(c.logicalLevel) && c.negotiability === 'fixed',
  );
  if (identityCards.length > 0) {
    findings.push({ id: 'hidden_identity', evidence: identityCards.map((c) => c.label) });
  }

  // d. Missing resource/strategy while fears/costs/external constraints exist
  const hasSolvers = cards.some((c) => ['resource', 'strategy'].includes(c.type));
  const hasPressure = cards.some((c) => ['fear', 'cost', 'external'].includes(c.type));
  if (hasPressure && !hasSolvers) {
    findings.push({
      id: 'missing_resource',
      evidence: cards
        .filter((c) => ['fear', 'cost', 'external'].includes(c.type))
        .map((c) => c.label),
    });
  }

  // e. Unresolved value conflict: open tradeoffs, or two+ very-high fixed demands
  const heavyFixed = cards.filter((c) => c.negotiability === 'fixed' && c.importance >= 9);
  if (unresolved.length > 0 || heavyFixed.length >= 2) {
    const evidence =
      unresolved.length > 0
        ? unresolved.map((t) => (t.between || []).map(labelOf).join(' ⟷ '))
        : heavyFixed.map((c) => c.label);
    findings.push({ id: 'value_conflict', evidence });
  }

  // f. All-or-nothing thinking: minimum equals ideal on an important card
  const binaryCards = cards.filter(
    (c) => c.importance >= 7 && c.minimum && c.ideal && c.minimum.trim() === c.ideal.trim(),
  );
  if (binaryCards.length > 0) {
    findings.push({ id: 'all_or_nothing', evidence: binaryCards.map((c) => c.label) });
  }

  // g. Over-compromising / under-asking: important but flexible with no minimum line
  const driftCards = cards.filter(
    (c) => c.importance >= 7 && c.negotiability === 'flexible' && !String(c.minimum || '').trim(),
  );
  if (driftCards.length > 0) {
    findings.push({ id: 'over_compromise', evidence: driftCards.map((c) => c.label) });
  }

  return findings;
}

// Fill Meta Model question templates from the session.
export function generateVclQuestions(
  session: VclSession,
  templates: VclQuestionTemplate[],
): string[] {
  const cards = session?.constraints || [];
  const desire = session?.mainDesire || session?.initialStatement || '';
  const questions: string[] = [];
  const byId = Object.fromEntries((templates || []).map((t) => [t.id, t.template]));
  const fill = (template: string | undefined, map: Record<string, string>) => {
    if (template) {
      questions.push(template.replace(/\{(\w+)\}/g, (_, key: string) => map[key] ?? ''));
    }
  };

  fill(byId.what_specifically, { desire });
  fill(byId.what_stops, { desire });

  const important = [...cards].sort((a, b) => b.importance - a.importance);
  important.slice(0, 3).forEach((card) => {
    fill(byId.what_enough, { card: card.label });
    if (card.negotiability === 'fixed') fill(byId.who_says_100, { card: card.label });
    if (card.negotiability !== 'fixed') fill(byId.partly_met, { card: card.label });
  });

  (session?.tradeoffs || []).forEach((tradeoff) => {
    const [a, b] = (tradeoff.between || []).map(
      (id) => cards.find((c) => c.id === id)?.label || id,
    );
    if (!a || !b) return;
    fill(byId.which_value_wins, { cardA: a, cardB: b });
    fill(byId.what_resource, { cardA: a, cardB: b });
  });

  return [...new Set(questions)];
}

// Map diagnosis findings to suggested moves.
export function generateVclMoves(findings: VclFinding[], moves: VclMove[]): VclMove[] {
  const ids = new Set((findings || []).map((f) => f.id));
  return (moves || []).filter((move) => (move.for_diagnosis || []).some((d) => ids.has(d)));
}

export function createTradeoff(a: string, b: string): VclTradeoff {
  return { id: freshId('trade'), between: [a, b], winner: '', note: '' };
}
