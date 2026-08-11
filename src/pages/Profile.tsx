import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, WEEKDAY_OPTIONS, GOAL_OPTIONS, EXPERIENCE_OPTIONS } from '@/stores/useProfileStore';
import { useAIStore } from '@/stores/useAIStore';
import { useAIConfigStore, AI_PERSONALITIES, type AIPersonality } from '@/stores/useAIConfigStore';
import { useThemeStore, THEMES } from '@/stores/useThemeStore';
import { useAccessibilityStore, type FontScale } from '@/stores/useAccessibilityStore';
import { useCycleStore, CYCLE_PHASES } from '@/stores/useCycleStore';
import { useHealthIntegrationStore, type HealthPlatform } from '@/stores/useHealthIntegrationStore';
import { ExportData } from '@/components/ui/ExportData';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { calculateTDEE, calculateMacros, calculateBMI, bmiCategory } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';
import { syncNativeHealth } from '@/utils/healthIntegration';
import { getToday } from '@/utils/date';
import { clearGymPilotLocalData } from '@/utils/resetAppData';
import { parseCsvList, toPositiveIntOrFallback } from '@/utils/profileMapping';
import type { WeekDay, Goal, BiologicalSex, ExperienceLevel, TrainingLocation } from '@/types';

const TRAINING_LOCATION_LABELS: Record<TrainingLocation, string> = {
  academia: 'Academia',
  casa: 'Casa',
  hibrido: 'Híbrido',
};

export function Profile() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfileStore();
  const { isEnabled, setApiKey, removeApiKey, hasSeenIntro } = useAIStore();
  const { assistantName, personality, setAssistantName, setPersonality, resetAIConfig } = useAIConfigStore();
  const { themeId, setTheme } = useThemeStore();
  const {
    fontScale,
    highContrast,
    reduceMotion,
    screenReaderMode,
    setFontScale,
    toggleHighContrast,
    toggleReduceMotion,
    toggleScreenReaderMode,
    resetAccessibility,
  } = useAccessibilityStore();
  const { phase, setPhase } = useCycleStore();
  const healthPlatform = useHealthIntegrationStore((s) => s.platform);
  const healthConnected = useHealthIntegrationStore((s) => s.isConnected);
  const healthDaily = useHealthIntegrationStore((s) => s.daily);
  const today = getToday();
  const healthSummary = healthDaily[today] || {
    date: today,
    steps: 0,
    activeCalories: 0,
    source: 'none' as const,
    syncedAt: 0,
  };
  const connectHealth = useHealthIntegrationStore((s) => s.connect);
  const disconnectHealth = useHealthIntegrationStore((s) => s.disconnect);
  const setDailySummary = useHealthIntegrationStore((s) => s.setDailySummary);
  const setTodayManual = useHealthIntegrationStore((s) => s.setTodayManual);
  const [editing, setEditing] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [assistantNameInput, setAssistantNameInput] = useState(assistantName);
  const [healthError, setHealthError] = useState('');
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [manualSteps, setManualSteps] = useState(String(healthSummary.steps || ''));
  const [manualCalories, setManualCalories] = useState(String(healthSummary.activeCalories || ''));

  const [name, setName] = useState(profile?.name || '');
  const [sex, setSex] = useState<BiologicalSex>(profile?.sex || 'undisclosed');
  const [age, setAge] = useState(String(profile?.age || ''));
  const [weight, setWeight] = useState(String(profile?.weight || ''));
  const [height, setHeight] = useState(String(profile?.height || ''));
  const [goal, setGoal] = useState<Goal>(profile?.goal || 'lose');
  const [experience, setExperience] = useState<ExperienceLevel>(profile?.experienceLevel || 'beginner');
  const [days, setDays] = useState<WeekDay[]>(profile?.trainingDays || []);
  const [sessionDurationMin, setSessionDurationMin] = useState(String(profile?.sessionDurationMin || 60));
  const [trainingLocation, setTrainingLocation] = useState<TrainingLocation>(profile?.trainingLocation || 'academia');
  const [trainingAgeMonths, setTrainingAgeMonths] = useState(String(profile?.trainingAgeMonths ?? ''));
  const [equipmentAccess, setEquipmentAccess] = useState((profile?.equipmentAccess || []).join(', '));
  const [preferredExercises, setPreferredExercises] = useState((profile?.preferredExercises || []).join(', '));
  const [dislikedExercises, setDislikedExercises] = useState((profile?.dislikedExercises || []).join(', '));
  const [limitations, setLimitations] = useState((profile?.limitations || []).join(', '));

  if (!profile) return null;

  const calories = calculateTDEE(profile);
  const macros = calculateMacros(calories, profile.goal);
  const bmi = calculateBMI(profile.weight, profile.height);
  const water = calculateWaterIntake(profile.weight);

  const toggleDay = (day: WeekDay) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSave = () => {
    updateProfile({
      name,
      sex,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      goal,
      experienceLevel: experience,
      trainingDays: days,
      sessionDurationMin: toPositiveIntOrFallback(sessionDurationMin, 60),
      trainingLocation,
      trainingAgeMonths: trainingAgeMonths ? Number(trainingAgeMonths) : undefined,
      equipmentAccess: parseCsvList(equipmentAccess),
      preferredExercises: parseCsvList(preferredExercises),
      dislikedExercises: parseCsvList(dislikedExercises),
      limitations: parseCsvList(limitations),
    });
    setEditing(false);
  };

  const handleHealthConnect = async (platform: HealthPlatform) => {
    setHealthError('');
    setHealthSyncing(true);
    try {
      const summary = await syncNativeHealth(platform);
      setDailySummary(summary);
      setManualSteps(String(summary.steps));
      setManualCalories(String(summary.activeCalories));
    } catch (err) {
      connectHealth('manual');
      setHealthError(err instanceof Error ? err.message : 'Integração indisponível.');
    } finally {
      setHealthSyncing(false);
    }
  };

  return (
    <div className="gym-page">
      <div className="flex items-center justify-between">
        <div>
          <p className="gym-kicker">Conta e preferências</p>
          <h1 className="gym-title mt-1">Perfil</h1>
        </div>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            editing ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20' : 'bg-white/5 text-white/60 border border-white/10'
          }`}
        >
          {editing ? 'Salvar' : 'Editar'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white/40 mb-1 block">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="text-sm text-white/40 mb-2 block">Sexo biológico</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button onClick={() => setSex('female')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${sex === 'female' ? 'bg-primary-500 text-black' : 'bg-dark-200 text-white/50'}`}>
                <MaterialIcon name="female" className="text-primary-300" /> Feminino
              </button>
              <button onClick={() => setSex('male')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${sex === 'male' ? 'bg-primary-500 text-black' : 'bg-dark-200 text-white/50'}`}>
                <MaterialIcon name="male" className="text-primary-300" /> Masculino
              </button>
              <button onClick={() => setSex('undisclosed')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${sex === 'undisclosed' ? 'bg-primary-500 text-black' : 'bg-dark-200 text-white/50'}`}>
                <MaterialIcon name="shield" className="text-primary-300" /> Não informar
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Idade</label>
              <input
                type="number"
                inputMode="numeric"
                min="10"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Peso (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                min="30"
                max="300"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input-field"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Altura (cm)</label>
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="250"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/40 mb-2 block">Objetivo</label>
            <div className="space-y-2">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 transition-all text-sm ${
                    goal === opt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-dark-200'
                  }`}
                >
                  <MaterialIcon name={opt.icon} className="text-lg text-primary-300" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/40 mb-2 block">Nível de experiência</label>
            <div className="space-y-2">
              {EXPERIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExperience(opt.value)}
                  className={`w-full p-3 rounded-xl border text-left flex items-center gap-2 transition-all text-sm ${
                    experience === opt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-dark-200'
                  }`}
                >
                  <MaterialIcon name={opt.icon} className="text-lg text-primary-300" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-white/40 mb-2 block">Dias de treino</label>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleDay(opt.value)}
                  className={`py-3 rounded-lg text-center text-xs font-semibold transition-all ${
                    days.includes(opt.value)
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-200 text-white/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">Contexto de treino</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/40 mb-1 block">Tempo por sessão (min)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="20"
                  max="180"
                  value={sessionDurationMin}
                  onChange={(e) => setSessionDurationMin(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm text-white/40 mb-1 block">Local</label>
                <CustomSelect
                  value={trainingLocation}
                  onChange={(value) => setTrainingLocation(value as TrainingLocation)}
                  options={[
                    { value: 'academia', label: 'Academia' },
                    { value: 'casa', label: 'Casa' },
                    { value: 'hibrido', label: 'Híbrido' },
                  ]}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white/40 mb-1 block">Training age (meses consistentes)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="600"
                  value={trainingAgeMonths}
                  onChange={(e) => setTrainingAgeMonths(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="input-field"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white/40 mb-1 block">Equipamentos (vírgula)</label>
                <input value={equipmentAccess} onChange={(e) => setEquipmentAccess(e.target.value)} className="input-field" placeholder="halteres, barra, banco" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white/40 mb-1 block">Exercícios preferidos (vírgula)</label>
                <input value={preferredExercises} onChange={(e) => setPreferredExercises(e.target.value)} className="input-field" placeholder="supino, remada" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white/40 mb-1 block">Exercícios que não gosta (vírgula)</label>
                <input value={dislikedExercises} onChange={(e) => setDislikedExercises(e.target.value)} className="input-field" placeholder="afundo, burpee" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-white/40 mb-1 block">Limitações / dores (vírgula)</label>
                <textarea value={limitations} onChange={(e) => setLimitations(e.target.value)} className="input-field min-h-20 resize-none" placeholder="ombro, joelho, lombar" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Idade" value={`${profile.age} anos`} />
              <Stat label="Peso" value={`${profile.weight} kg`} />
              <Stat label="Altura" value={`${profile.height} cm`} />
              <Stat label="IMC" value={`${bmi} — ${bmiCategory(bmi)}`} />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">Objetivo</h2>
            <p className="text-lg">
              <span className="inline-flex items-center gap-2"><MaterialIcon name={GOAL_OPTIONS.find((o) => o.value === profile.goal)?.icon || 'track_changes'} className="text-primary-300" /> {GOAL_OPTIONS.find((o) => o.value === profile.goal)?.label}</span>
            </p>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">Metas nutricionais</h2>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Calorias" value={`${calories} kcal`} />
              <Stat label="Água" value={`${water}L`} />
              <Stat label="Proteína" value={`${macros.protein}g`} />
              <Stat label="Carboidratos" value={`${macros.carbs}g`} />
              <Stat label="Gorduras" value={`${macros.fat}g`} />
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">Dias de treino</h2>
            <div className="flex gap-2 flex-wrap">
              {profile.trainingDays.map((day) => (
                <span
                  key={day}
                  className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm font-medium"
                >
                  {WEEKDAY_OPTIONS.find((o) => o.value === day)?.label}
                </span>
              ))}
            </div>
          </div>

          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">Contexto de treino</h2>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Tempo por sessão" value={`${profile.sessionDurationMin || 60} min`} />
              <Stat label="Local" value={TRAINING_LOCATION_LABELS[profile.trainingLocation || 'academia']} />
              <Stat label="Training age" value={`${profile.trainingAgeMonths || 0} meses`} />
            </div>
            <p className="text-xs text-white/45">Equipamentos: {(profile.equipmentAccess || []).join(', ') || 'Não informado'}</p>
            <p className="text-xs text-white/45">Preferidos: {(profile.preferredExercises || []).join(', ') || 'Não informado'}</p>
            <p className="text-xs text-white/45">Evita: {(profile.dislikedExercises || []).join(', ') || 'Não informado'}</p>
            <p className="text-xs text-white/45">Limitações: {(profile.limitations || []).join(', ') || 'Não informado'}</p>
          </div>

          {/* Cycle Phase */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80 flex items-center gap-2"><MaterialIcon name="autorenew" className="text-primary-300" /> Fase do ciclo</h2>
            <div className="grid grid-cols-2 gap-2">
              {CYCLE_PHASES.map((cp) => (
                <button
                  key={cp.value}
                  onClick={() => setPhase(cp.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-xs ${
                    phase === cp.value ? 'border-primary-500 bg-primary-500/10' : 'border-white/5'
                  }`}
                >
                  <MaterialIcon name={cp.icon} className="text-lg text-primary-300" />
                  <span className="font-medium text-white/70">{cp.label}</span>
                </button>
              ))}
            </div>
            {phase !== 'none' && (
              <p className="text-xs text-white/40 italic flex items-start gap-1">
                <MaterialIcon name="lightbulb" className="text-primary-300 mt-0.5" />
                <span>{CYCLE_PHASES.find((c) => c.value === phase)?.tip}</span>
              </p>
            )}
          </div>

          {/* Theme Section */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80 flex items-center gap-2"><MaterialIcon name="palette" className="text-primary-300" /> Tema</h2>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.filter((t) => !t.special).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-pressed={themeId === t.id}
                  className={`relative flex items-center justify-center p-2 rounded-xl border transition-all ${
                    themeId === t.id ? 'border-primary-500 bg-primary-500/10 scale-105 shadow-[0_0_0_1px_rgba(var(--color-primary-rgb),0.35)]' : 'border-white/5'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.colors.primary }} />
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-white/5">
              <p className="text-xs text-white/30">Temas especiais</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.filter((t) => t.special).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    aria-pressed={themeId === t.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      themeId === t.id ? 'border-primary-500 bg-primary-500/10 shadow-[0_0_0_1px_rgba(var(--color-primary-rgb),0.35)]' : 'border-white/5'
                    }`}
                  >
                    <MaterialIcon name={themeId === t.id ? 'check_circle' : t.icon} className="text-lg text-primary-300" />
                    <span className="text-xs font-medium text-white/70">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accessibility Section */}
          <div className="card space-y-4">
            <div>
              <h2 className="font-semibold text-white/80">Acessibilidade</h2>
              <p className="text-xs text-white/35 mt-1">Ajustes para leitura, contraste, movimento e uso com leitor de tela.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-white/40 font-semibold">Tamanho da fonte</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['normal', 'Normal'],
                  ['large', 'Grande'],
                  ['extra-large', 'Maior'],
                ] as [FontScale, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFontScale(value)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                      fontScale === value
                        ? 'bg-primary-500 text-white border-primary-400'
                        : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                    aria-pressed={fontScale === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <AccessibilityToggle
                title="Alto contraste"
                description="Deixa fundos mais escuros, bordas mais fortes e textos apagados mais legiveis."
                enabled={highContrast}
                onToggle={toggleHighContrast}
              />
              <AccessibilityToggle
                title="Reduzir animações"
                description="Diminui transições e movimentos para evitar desconforto."
                enabled={reduceMotion}
                onToggle={toggleReduceMotion}
              />
              <AccessibilityToggle
                title="Modo leitor de tela"
                description="Aumenta áreas de toque, foco visual e espaçamento para navegação assistiva."
                enabled={screenReaderMode}
                onToggle={toggleScreenReaderMode}
              />
            </div>

            <button
              onClick={resetAccessibility}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold"
            >
              Restaurar acessibilidade padrão
            </button>
          </div>

          {/* Health Integration */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white/80">Integração de saúde</h2>
                <p className="text-xs text-white/35 mt-1">Passos e calorias ativas entram no cálculo do dia.</p>
              </div>
              {healthConnected && (
                <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-300 text-[10px] font-semibold">
                  {healthPlatform === 'manual' ? 'Manual' : 'Conectado'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat label="Passos hoje" value={`${healthSummary.steps}`} />
              <Stat label="Calorias ativas" value={`${healthSummary.activeCalories} kcal`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleHealthConnect('apple-health')}
                disabled={healthSyncing}
                className="py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium disabled:opacity-40"
              >
                iPhone Saúde
              </button>
              <button
                onClick={() => handleHealthConnect('health-connect')}
                disabled={healthSyncing}
                className="py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-medium disabled:opacity-40"
              >
                Android Health
              </button>
            </div>

            {healthError && (
              <p className="text-xs text-yellow-300/80 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                {healthError} Por enquanto, use entrada manual. Para sincronização automática, o GymPilot precisa estar empacotado como app iOS/Android.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={manualSteps}
                onChange={(e) => setManualSteps(e.target.value)}
                placeholder="Passos"
                className="input-field text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={manualCalories}
                onChange={(e) => setManualCalories(e.target.value)}
                placeholder="kcal ativas"
                className="input-field text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTodayManual(Number(manualSteps), Number(manualCalories))}
                className="flex-1 py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold"
              >
                Salvar saúde do dia
              </button>
              {healthConnected && (
                <button
                  onClick={disconnectHealth}
                  className="px-4 py-3 rounded-xl bg-white/5 text-white/40 text-sm"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>

          {/* AI Section */}
          <div className="card space-y-3 border border-primary-500/20">
            <div className="flex items-center gap-2">
              <MaterialIcon name="smart_toy" className="text-xl text-primary-300" />
              <h2 className="font-semibold text-white/80">{assistantName}</h2>
            </div>
            <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
              <label className="block">
                <span className="text-xs text-white/40 font-semibold">Nome da IA</span>
                <input
                  value={assistantNameInput}
                  onChange={(e) => setAssistantNameInput(e.target.value)}
                  onBlur={() => setAssistantName(assistantNameInput)}
                  className="input-field text-sm mt-1"
                  placeholder="Ex: Terraformer"
                />
              </label>
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-semibold">Personalidade</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(AI_PERSONALITIES) as AIPersonality[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => setPersonality(key)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        personality === key ? 'bg-primary-500/10 border-primary-500/30' : 'bg-dark-200 border-white/10'
                      }`}
                    >
                      <span className="block text-xs font-bold text-white/80">{AI_PERSONALITIES[key].label}</span>
                      <span className="block text-[10px] text-white/35 mt-1 leading-relaxed">{AI_PERSONALITIES[key].description}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-white/35 leading-relaxed">
                Os prompts exigem base científica para treino e dieta. O preset Coach BR técnico não imita pessoa real; usa comunicação forte, técnica e motivadora.
              </p>
              <button
                onClick={() => {
                  resetAIConfig();
                  setAssistantNameInput('GymPilot AI');
                }}
                className="w-full py-2 rounded-xl bg-white/5 text-white/40 text-xs font-semibold"
              >
                Restaurar IA padrão
              </button>
            </div>
            {isEnabled ? (
              <div className="space-y-3">
 <p className="text-sm text-success">Ativa </p>
                <button
                  onClick={() => navigate(hasSeenIntro ? '/ai' : '/ai/intro')}
                  className="btn-primary py-3 text-sm"
                >
                  <MaterialIcon name="smart_toy" /> Abrir assistente
                </button>
                <button
                  onClick={removeApiKey}
                  className="w-full text-xs text-white/30 py-2"
                >
                  Remover token
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/40">
                  Cole seu token OpenAI para ativar a assistente de IA
                </p>
                <input
                  type="password"
                  value={aiKeyInput}
                  onChange={(e) => setAiKeyInput(e.target.value)}
                  placeholder="sk-proj-..."
                  className="input-field text-sm"
                />
                <button
                  onClick={() => {
                    if (aiKeyInput.startsWith('sk-')) {
                      setApiKey(aiKeyInput);
                      setAiKeyInput('');
                      navigate('/ai/intro');
                    }
                  }}
                  disabled={!aiKeyInput.startsWith('sk-')}
                  className="btn-primary py-3 text-sm"
                >
                  <MaterialIcon name="bolt" /> Ativar GymPilot AI
                </button>
              </div>
            )}
          </div>

          {/* Export Data */}
          <ExportData />

          {/* Reset Account */}
          <button
            onClick={() => setShowReset(true)}
            className="w-full py-3 text-red-400/60 text-sm mt-4"
          >
            Excluir conta e recomeçar
          </button>
          {showReset && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
              <div className="bg-dark-200 rounded-2xl p-6 space-y-4 max-w-sm w-full">
                <h3 className="text-lg font-bold text-red-400">Excluir todos os dados?</h3>
                <p className="text-sm text-white/50">Isso vai apagar perfil, treinos, histórico e configurações. Não tem volta.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowReset(false)} className="flex-1 py-3 rounded-xl bg-dark-300 text-white/50 text-sm font-medium">
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      clearGymPilotLocalData();
                      window.location.href = '/fitflow/';
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 text-sm font-bold"
                  >
                    Excluir tudo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccessibilityToggle({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full rounded-xl border p-3 text-left flex items-center justify-between gap-3 transition-all ${
        enabled ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/5 border-white/10'
      }`}
      aria-pressed={enabled}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white/80">{title}</span>
        <span className="block text-xs text-white/40 mt-0.5 leading-relaxed">{description}</span>
      </span>
      <span
        className={`relative w-12 h-7 rounded-full shrink-0 border transition-colors ${
          enabled ? 'bg-primary-500 border-primary-400' : 'bg-dark-300 border-white/10'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/30">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
