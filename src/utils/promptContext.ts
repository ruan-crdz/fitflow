import type { Profile } from '@/types';

export function buildProfilePromptLines(profile: Profile): string[] {
  const sexLabel = profile.sex === 'male'
    ? 'masculino'
    : profile.sex === 'female'
      ? 'feminino'
      : 'não informado';
  const locationLabel = profile.trainingLocation === 'casa'
    ? 'casa'
    : profile.trainingLocation === 'hibrido'
      ? 'híbrido (casa + academia)'
      : 'academia';

  return [
    `Nome: ${profile.name}`,
    `Sexo biológico: ${sexLabel}`,
    `Idade: ${profile.age} anos`,
    `Peso: ${profile.weight}kg`,
    `Altura: ${profile.height}cm`,
    `Dias de treino: ${profile.trainingDays.length}x por semana`,
    `Tempo por sessão: ${profile.sessionDurationMin || 60} min`,
    `Local de treino: ${locationLabel}`,
    `Training age: ${profile.trainingAgeMonths ?? 0} meses`,
    `Equipamentos disponíveis: ${(profile.equipmentAccess || []).join(', ') || 'não informado'}`,
    `Exercícios preferidos: ${(profile.preferredExercises || []).join(', ') || 'não informado'}`,
    `Exercícios que evita: ${(profile.dislikedExercises || []).join(', ') || 'não informado'}`,
    `Limitações/dor: ${(profile.limitations || []).join(', ') || 'não informado'}`,
  ];
}
