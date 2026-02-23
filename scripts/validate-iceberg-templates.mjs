import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'data', 'iceberg-templates-scenarios.he.json');

const SLOT_COUNTS = Object.freeze({
  CEQ: 3,
  CAUSE: 2,
  ASSUMPTIONS1: 3
});

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateScenario(scenario, index) {
  const sid = String(scenario?.scenario_id || `#${index + 1}`);
  ensure(isObject(scenario), `Scenario ${sid}: must be an object`);
  ensure(typeof scenario.client_text === 'string' && scenario.client_text.length > 0, `Scenario ${sid}: client_text missing`);
  ensure(Array.isArray(scenario.draggables) && scenario.draggables.length > 0, `Scenario ${sid}: draggables missing`);
  ensure(isObject(scenario.template_payloads), `Scenario ${sid}: template_payloads missing`);

  const seenIds = new Set();
  for (const d of scenario.draggables) {
    const did = String(d?.id || '');
    ensure(did, `Scenario ${sid}: draggable id missing`);
    ensure(!seenIds.has(did), `Scenario ${sid}: duplicate draggable id ${did}`);
    seenIds.add(did);
    ensure(typeof d.text === 'string' && d.text.length > 0, `Scenario ${sid}/${did}: text missing`);
    ensure(Number.isInteger(d.start) && Number.isInteger(d.end), `Scenario ${sid}/${did}: start/end must be integers`);
    ensure(d.start >= 0 && d.end > d.start, `Scenario ${sid}/${did}: invalid range [${d.start}, ${d.end}]`);
    const actual = scenario.client_text.slice(d.start, d.end);
    ensure(actual === d.text, `Scenario ${sid}/${did}: range text mismatch (expected "${d.text}", got "${actual}")`);
    ensure(Array.isArray(d.allowed_templates) && d.allowed_templates.length > 0, `Scenario ${sid}/${did}: allowed_templates missing`);

    const byToken = scenario.template_payloads[did];
    ensure(isObject(byToken), `Scenario ${sid}/${did}: template payload bucket missing`);

    for (const tpl of d.allowed_templates) {
      const t = String(tpl);
      const payload = byToken[t];
      ensure(isObject(payload), `Scenario ${sid}/${did}: payload missing for template ${t}`);
      ensure(typeof payload.question === 'string' && payload.question.length > 0, `Scenario ${sid}/${did}/${t}: question missing`);
      ensure(typeof payload.reflection_template === 'string' && payload.reflection_template.length > 0, `Scenario ${sid}/${did}/${t}: reflection_template missing`);
      ensure(Array.isArray(payload.sets) && payload.sets.length >= 2, `Scenario ${sid}/${did}/${t}: sets must include at least 2 variants`);

      const expectedSlots = SLOT_COUNTS[t];
      ensure(Number.isInteger(expectedSlots), `Scenario ${sid}/${did}: unknown template ${t}`);
      payload.sets.forEach((set, setIndex) => {
        ensure(Array.isArray(set), `Scenario ${sid}/${did}/${t}: set #${setIndex} must be array`);
        ensure(set.length === expectedSlots, `Scenario ${sid}/${did}/${t}: set #${setIndex} length=${set.length} expected=${expectedSlots}`);
        set.forEach((value, valueIndex) => {
          ensure(typeof value === 'string' && value.trim().length > 0, `Scenario ${sid}/${did}/${t}: empty slot value at set #${setIndex}, slot #${valueIndex}`);
        });
      });
    }
  }
}

async function main() {
  const raw = await fs.readFile(FILE, 'utf8');
  const data = JSON.parse(raw);
  ensure(Array.isArray(data?.scenarios), 'scenarios[] missing');
  ensure(data.scenarios.length >= 1, 'scenarios[] is empty');
  data.scenarios.forEach(validateScenario);
  console.log(`PASS: Iceberg Templates data valid (${data.scenarios.length} scenarios).`);
}

main().catch((error) => {
  console.error('FAIL validate-iceberg-templates:', error.message);
  process.exit(1);
});

