import core from '../../packs/meta-model-core.json';
import blueprint from '../../packs/blueprint.json';
import logicalLevels from '../../packs/logical-levels.json';
import prisms from '../../packs/prisms.json';
import type { MetaModelContent } from '../types';

// Versioned content packs (Phase 4). Each pack carries schemaVersion, locale,
// source and sourceValidation; here they merge into the app-wide content shape.
export const PACKS_META = [
  { id: core.id, name: core.name, sourceValidation: core.sourceValidation },
  { id: blueprint.id, name: blueprint.name, sourceValidation: blueprint.sourceValidation },
  { id: logicalLevels.id, name: logicalLevels.name, sourceValidation: logicalLevels.sourceValidation },
  { id: prisms.id, name: prisms.name, sourceValidation: prisms.sourceValidation },
] as const;

export const content = {
  categories: core.categories,
  practice_statements: core.practice_statements,
  blueprint_builder: blueprint.blueprint_builder,
  choice_packs: {
    prism_breen: logicalLevels.pack,
    blueprint: blueprint.choice_pack,
  },
  prisms: prisms.prisms,
} as unknown as MetaModelContent;
