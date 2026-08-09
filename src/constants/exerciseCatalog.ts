export interface CatalogExercise {
  name: string;
  muscleGroup: string;
  image: string;
}

const BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

function img(folder: string) {
  return `${BASE_URL}/${folder}/0.jpg`;
}

export const MUSCLE_GROUPS = [
  'Abdômen',
  'Costas',
  'Bíceps',
  'Tríceps',
  'Peitoral',
  'Ombros',
  'Quadríceps',
  'Posterior de Coxa',
  'Glúteos',
  'Panturrilhas',
] as const;

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Abdômen
  { name: 'Abdominal na Máquina', muscleGroup: 'Abdômen', image: img('Ab_Crunch_Machine') },
  { name: 'Abdominal Infra', muscleGroup: 'Abdômen', image: img('Reverse_Crunch') },
  { name: 'Abdominal com Corda', muscleGroup: 'Abdômen', image: img('Cable_Crunch') },
  { name: 'Prancha', muscleGroup: 'Abdômen', image: img('Plank') },
  { name: 'Elevação de Pernas Suspensa', muscleGroup: 'Abdômen', image: img('Hanging_Leg_Raise') },
  { name: 'Abdominal Bicicleta', muscleGroup: 'Abdômen', image: img('Air_Bike') },
  { name: 'Abdominal Tradicional', muscleGroup: 'Abdômen', image: img('Crunches') },
  { name: 'Prancha Lateral', muscleGroup: 'Abdômen', image: img('Side_Bridge') },

  // Costas
  { name: 'Graviton (Puxada Assistida)', muscleGroup: 'Costas', image: img('Full_Range-Of-Motion_Lat_Pulldown') },
  { name: 'Remada Curvada com Barra', muscleGroup: 'Costas', image: img('Bent_Over_Barbell_Row') },
  { name: 'Remada Unilateral com Halter', muscleGroup: 'Costas', image: img('One-Arm_Dumbbell_Row') },
  { name: 'Puxada Frontal Aberta', muscleGroup: 'Costas', image: img('Wide-Grip_Lat_Pulldown') },
  { name: 'Puxada Frontal Fechada', muscleGroup: 'Costas', image: img('Close-Grip_Front_Lat_Pulldown') },
  { name: 'Remada Sentada no Cabo', muscleGroup: 'Costas', image: img('Seated_Cable_Rows') },
  { name: 'Pulldown Braço Reto', muscleGroup: 'Costas', image: img('Straight-Arm_Pulldown') },
  { name: 'Barra Fixa', muscleGroup: 'Costas', image: img('Pullups') },
  { name: 'Remada Invertida', muscleGroup: 'Costas', image: img('Inverted_Row') },

  // Bíceps
  { name: 'Rosca Direta com Barra', muscleGroup: 'Bíceps', image: img('Barbell_Curl') },
  { name: 'Rosca Alternada com Halter', muscleGroup: 'Bíceps', image: img('Dumbbell_Alternate_Bicep_Curl') },
  { name: 'Rosca Martelo', muscleGroup: 'Bíceps', image: img('Hammer_Curls') },
  { name: 'Rosca Concentrada', muscleGroup: 'Bíceps', image: img('Concentration_Curls') },
  { name: 'Rosca no Cabo com Corda', muscleGroup: 'Bíceps', image: img('Cable_Hammer_Curls_-_Rope_Attachment') },
  { name: 'Rosca Inclinada', muscleGroup: 'Bíceps', image: img('Incline_Dumbbell_Curl') },
  { name: 'Rosca Scott', muscleGroup: 'Bíceps', image: img('Preacher_Curl') },

  // Tríceps
  { name: 'Tríceps Pulley', muscleGroup: 'Tríceps', image: img('Triceps_Pushdown') },
  { name: 'Tríceps Corda', muscleGroup: 'Tríceps', image: img('Triceps_Pushdown_-_Rope_Attachment') },
  { name: 'Tríceps Francês', muscleGroup: 'Tríceps', image: img('Dumbbell_One-Arm_Triceps_Extension') },
  { name: 'Tríceps Testa', muscleGroup: 'Tríceps', image: img('EZ-Bar_Skullcrusher') },
  { name: 'Tríceps no Banco', muscleGroup: 'Tríceps', image: img('Bench_Dips') },
  { name: 'Tríceps Overhead Corda', muscleGroup: 'Tríceps', image: img('Cable_Rope_Overhead_Triceps_Extension') },
  { name: 'Supino Pegada Fechada', muscleGroup: 'Tríceps', image: img('Close-Grip_Barbell_Bench_Press') },

  // Peitoral
  { name: 'Supino Reto com Barra', muscleGroup: 'Peitoral', image: img('Barbell_Bench_Press_-_Medium_Grip') },
  { name: 'Supino Inclinado Halter', muscleGroup: 'Peitoral', image: img('Incline_Dumbbell_Press') },
  { name: 'Supino Reto com Halter', muscleGroup: 'Peitoral', image: img('Dumbbell_Bench_Press') },
  { name: 'Crucifixo com Halter', muscleGroup: 'Peitoral', image: img('Dumbbell_Flyes') },
  { name: 'Crossover no Cabo', muscleGroup: 'Peitoral', image: img('Cable_Crossover') },
  { name: 'Crucifixo Inclinado', muscleGroup: 'Peitoral', image: img('Incline_Dumbbell_Flyes') },
  { name: 'Flexão de Braço', muscleGroup: 'Peitoral', image: img('Pushups') },

  // Ombros
  { name: 'Desenvolvimento com Halter', muscleGroup: 'Ombros', image: img('Dumbbell_Shoulder_Press') },
  { name: 'Elevação Lateral', muscleGroup: 'Ombros', image: img('Side_Lateral_Raise') },
  { name: 'Elevação Frontal', muscleGroup: 'Ombros', image: img('Front_Dumbbell_Raise') },
  { name: 'Desenvolvimento Arnold', muscleGroup: 'Ombros', image: img('Arnold_Dumbbell_Press') },
  { name: 'Face Pull', muscleGroup: 'Ombros', image: img('Face_Pull') },
  { name: 'Crucifixo Inverso Cabo', muscleGroup: 'Ombros', image: img('Cable_Rear_Delt_Fly') },
  { name: 'Elevação Lateral Sentada', muscleGroup: 'Ombros', image: img('Seated_Side_Lateral_Raise') },

  // Quadríceps
  { name: 'Agachamento Livre', muscleGroup: 'Quadríceps', image: img('Barbell_Squat') },
  { name: 'Leg Press', muscleGroup: 'Quadríceps', image: img('Leg_Press') },
  { name: 'Cadeira Extensora', muscleGroup: 'Quadríceps', image: img('Leg_Extensions') },
  { name: 'Hack Squat', muscleGroup: 'Quadríceps', image: img('Hack_Squat') },
  { name: 'Afundo com Halter', muscleGroup: 'Quadríceps', image: img('Dumbbell_Lunges') },
  { name: 'Agachamento Búlgaro', muscleGroup: 'Quadríceps', image: img('Dumbbell_Rear_Lunge') },
  { name: 'Agachamento Goblet', muscleGroup: 'Quadríceps', image: img('Goblet_Squat') },

  // Posterior de Coxa
  { name: 'Mesa Flexora', muscleGroup: 'Posterior de Coxa', image: img('Lying_Leg_Curls') },
  { name: 'Cadeira Flexora', muscleGroup: 'Posterior de Coxa', image: img('Seated_Leg_Curl') },
  { name: 'Stiff com Barra', muscleGroup: 'Posterior de Coxa', image: img('Stiff-Legged_Barbell_Deadlift') },
  { name: 'Stiff com Halter', muscleGroup: 'Posterior de Coxa', image: img('Stiff-Legged_Dumbbell_Deadlift') },
  { name: 'Levantamento Romeno', muscleGroup: 'Posterior de Coxa', image: img('Romanian_Deadlift') },
  { name: 'Good Morning', muscleGroup: 'Posterior de Coxa', image: img('Good_Morning') },

  // Glúteos
  { name: 'Hip Thrust com Barra', muscleGroup: 'Glúteos', image: img('Barbell_Hip_Thrust') },
  { name: 'Glute Bridge com Barra', muscleGroup: 'Glúteos', image: img('Barbell_Glute_Bridge') },
  { name: 'Kickback de Glúteo', muscleGroup: 'Glúteos', image: img('Glute_Kickback') },
  { name: 'Kickback no Cabo', muscleGroup: 'Glúteos', image: img('One-Legged_Cable_Kickback') },
  { name: 'Ponte Unilateral', muscleGroup: 'Glúteos', image: img('Single_Leg_Glute_Bridge') },
  { name: 'Abdutora', muscleGroup: 'Glúteos', image: img('Thigh_Abductor') },

  // Panturrilhas
  { name: 'Panturrilha em Pé', muscleGroup: 'Panturrilhas', image: img('Standing_Calf_Raises') },
  { name: 'Panturrilha Sentada', muscleGroup: 'Panturrilhas', image: img('Seated_Calf_Raise') },
  { name: 'Panturrilha no Leg Press', muscleGroup: 'Panturrilhas', image: img('Calf_Press_On_The_Leg_Press_Machine') },
  { name: 'Panturrilha com Halter', muscleGroup: 'Panturrilhas', image: img('Standing_Dumbbell_Calf_Raise') },
];
