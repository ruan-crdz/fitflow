import { describe, it, expect } from 'vitest';
import {
  AI_SETUP_SCHEMA,
  CAMERA_ITEMS_SCHEMA,
  UNKNOWN_MAPPING_SCHEMA,
  WORKOUT_BUILDER_SCHEMA,
  WORKOUT_SWAP_SCHEMA,
} from '../src/constants/aiSchemas';

type JsonSchema = Record<string, any>;

function isObjectSchema(schema: JsonSchema): boolean {
  const t = schema?.type;
  if (Array.isArray(t)) return t.includes('object');
  return t === 'object';
}

function assertStrictRequiredCoverage(schema: JsonSchema, path: string[] = []): void {
  if (!schema || typeof schema !== 'object') return;

  if (isObjectSchema(schema) && schema.properties && typeof schema.properties === 'object') {
    const keys = Object.keys(schema.properties);
    expect(Array.isArray(schema.required), `${path.join('.') || 'root'}: required deve ser array`).toBe(true);
    expect(new Set(schema.required)).toEqual(new Set(keys));
    expect(schema.additionalProperties, `${path.join('.') || 'root'}: additionalProperties deve ser false`).toBe(false);
  }

  if (schema.properties && typeof schema.properties === 'object') {
    for (const [key, child] of Object.entries(schema.properties)) {
      assertStrictRequiredCoverage(child as JsonSchema, [...path, 'properties', key]);
    }
  }

  if (schema.items) {
    assertStrictRequiredCoverage(schema.items as JsonSchema, [...path, 'items']);
  }
}

describe('AI schemas strict compliance', () => {
  it('AI_SETUP_SCHEMA deve ser strict-compliant', () => {
    assertStrictRequiredCoverage(AI_SETUP_SCHEMA as JsonSchema);
  });

  it('UNKNOWN_MAPPING_SCHEMA deve ser strict-compliant', () => {
    assertStrictRequiredCoverage(UNKNOWN_MAPPING_SCHEMA as JsonSchema);
  });

  it('CAMERA_ITEMS_SCHEMA deve ser strict-compliant', () => {
    assertStrictRequiredCoverage(CAMERA_ITEMS_SCHEMA as JsonSchema);
  });

  it('WORKOUT_BUILDER_SCHEMA deve ser strict-compliant', () => {
    assertStrictRequiredCoverage(WORKOUT_BUILDER_SCHEMA as JsonSchema);
  });

  it('WORKOUT_SWAP_SCHEMA deve ser strict-compliant', () => {
    assertStrictRequiredCoverage(WORKOUT_SWAP_SCHEMA as JsonSchema);
  });
});