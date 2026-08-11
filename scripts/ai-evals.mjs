import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function check(name, pass, details) {
  if (pass) {
    console.log(`PASS | ${name}`);
  } else {
    console.error(`FAIL | ${name} | ${details}`);
  }
  return pass;
}

const files = {
  ai: read('src/utils/ai.ts'),
  aiChat: read('src/pages/AIChat.tsx'),
  workout: read('src/pages/Workout.tsx'),
  workoutPlans: read('src/pages/WorkoutPlans.tsx'),
  reeval: read('src/pages/AIReeval.tsx'),
  setup: read('src/pages/AISetup.tsx'),
  health: read('src/pages/Health.tsx'),
  evidenceConst: read('src/constants/evidence.ts'),
  evidenceUtil: read('src/utils/evidence.ts'),
  evidenceStore: read('src/stores/useEvidenceStore.ts'),
};

const checks = [];

checks.push(check(
  'Evidence store versioned exists',
  /fitflow-evidence/.test(files.evidenceStore) && /evidenceVersion/.test(files.evidenceStore) && /version:\s*EVIDENCE_BASE_VERSION/.test(files.evidenceStore),
  'Expected persisted evidence store with versioning',
));

checks.push(check(
  'Evidence context integrated in chat action flow',
  /EVIDENCE_CONTEXT/.test(files.ai) && /extractSourceIds/.test(files.ai) && /Fontes usadas:/.test(files.ai),
  'Missing evidence injection/validation in sendMessageWithActions',
));

checks.push(check(
  'Structured outputs enabled',
  /response_format:\s*\{\s*type:\s*'json_schema'/.test(files.ai),
  'json_schema strict output not found in askAI',
));

checks.push(check(
  'Legacy action markers removed from AIChat code',
  !/\[ACTION:/.test(files.aiChat),
  'Found legacy [ACTION:] marker usage in AIChat',
));

checks.push(check(
  'Legacy marker protocols removed from runtime flows',
  !/\[SWAP:|\[REEVAL_RESULT:/.test(`${files.workout}\n${files.reeval}`),
  'Found legacy marker protocol in Workout or AIReeval',
));

checks.push(check(
  'Workout inline uses function calling for swap',
  /replace_workout_exercise/.test(files.workout) && /tool_choice:\s*'auto'/.test(files.workout),
  'Workout inline still not using tool calling swap',
));

checks.push(check(
  'AIReeval uses function calling plan apply',
  /apply_reevaluation_plan/.test(files.reeval) && /tool_choice:\s*'auto'/.test(files.reeval),
  'AIReeval function calling not detected',
));

checks.push(check(
  'Nutrition deterministic path exists',
  /findFoodInTable/.test(files.health) && /macrosForFood/.test(files.health) && /unknown_food_mapping/.test(files.health),
  'Health deterministic nutrition calculation path missing',
));

checks.push(check(
  'Camera no longer returns direct macros',
  /(Não calcule macros|Não calcule calorias\/macros aqui)/.test(files.health) && /camera_detected_items/.test(files.health),
  'Camera flow still appears to compute macros directly in model response',
));

checks.push(check(
  'Sex stereotype phrases removed in setup/builder',
  !/personal trainer de homens|personal trainer de mulheres|Priorize glúteos e posterior nos treinos de perna/.test(`${files.setup}\n${files.health}\n${files.reeval}\n${files.workoutPlans}`),
  'Detected old stereotype prompt phrase',
));

const passed = checks.filter(Boolean).length;
const total = checks.length;
console.log(`\nSummary: ${passed}/${total} checks passed.`);

if (passed !== total) {
  process.exit(1);
}
