export const AI_SETUP_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['evaluation', 'chosenSplit', 'explanation', 'rotation', 'workouts', 'evidenceIds'],
  properties: {
    evaluation: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['option', 'tier', 'reason'],
        properties: {
          option: { type: 'string' },
          tier: { type: 'string', enum: ['recommended', 'suitable', 'acceptable', 'not_recommended'] },
          reason: { type: 'string' },
        },
      },
    },
    chosenSplit: { type: 'string' },
    explanation: { type: 'string' },
    rotation: { type: 'string' },
    workouts: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'focus', 'cardio', 'exercises'],
        properties: {
          type: { type: 'string' },
          focus: { type: 'string' },
          cardio: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['type', 'durationMin', 'intensity'],
            properties: {
              type: { type: 'string' },
              durationMin: { type: 'number' },
              intensity: { type: 'string' },
            },
          },
          exercises: {
            type: 'array',
            minItems: 5,
            maxItems: 10,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'sets', 'repsMin', 'repsMax', 'muscleGroup'],
              properties: {
                name: { type: 'string' },
                sets: { type: 'number' },
                repsMin: { type: 'number' },
                repsMax: { type: 'number' },
                muscleGroup: { type: 'string' },
              },
            },
          },
        },
      },
    },
    evidenceIds: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

export const UNKNOWN_MAPPING_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['mappings'],
  properties: {
    mappings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['originalName', 'mappedFood', 'grams', 'confidence', 'note'],
        properties: {
          originalName: { type: 'string' },
          mappedFood: { type: 'string' },
          grams: { type: 'number' },
          confidence: { type: 'number' },
          note: { type: ['string', 'null'] },
        },
      },
    },
  },
};

export const CAMERA_ITEMS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'amount', 'unit', 'confidence'],
        properties: {
          name: { type: 'string' },
          amount: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'], enum: ['g', 'un', 'colher_sopa', 'colher_cha', 'ml', 'copo', 'xicara', null] },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

export const WORKOUT_BUILDER_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'name', 'muscleGroup', 'reason', 'swaps'],
  properties: {
    action: { type: 'string', enum: ['no_change', 'add', 'swap'] },
    name: { type: ['string', 'null'] },
    muscleGroup: { type: ['string', 'null'] },
    reason: { type: ['string', 'null'] },
    swaps: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['currentName', 'name', 'muscleGroup', 'reason'],
        properties: {
          currentName: { type: 'string' },
          name: { type: 'string' },
          muscleGroup: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
  },
};

export const WORKOUT_SWAP_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'reason'],
  properties: {
    name: { type: 'string' },
    reason: { type: 'string' },
  },
};