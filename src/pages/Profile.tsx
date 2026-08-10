import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore, WEEKDAY_OPTIONS, GOAL_OPTIONS, EXPERIENCE_OPTIONS } from '@/stores/useProfileStore';
import { useAIStore } from '@/stores/useAIStore';
import { useThemeStore, THEMES } from '@/stores/useThemeStore';
import { useCycleStore, CYCLE_PHASES } from '@/stores/useCycleStore';
import { useHealthIntegrationStore, type HealthPlatform } from '@/stores/useHealthIntegrationStore';
import { ExportData } from '@/components/ui/ExportData';
import { calculateTDEE, calculateMacros, calculateBMI, bmiCategory } from '@/utils/calories';
import { calculateWaterIntake } from '@/utils/water';
import { syncNativeHealth } from '@/utils/healthIntegration';
import type { WeekDay, Goal, BiologicalSex, ExperienceLevel } from '@/types';

export function Profile() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfileStore();
  const { isEnabled, setApiKey, removeApiKey, hasSeenIntro } = useAIStore();
  const { themeId, setTheme } = useThemeStore();
  const { phase, setPhase } = useCycleStore();
  const healthPlatform = useHealthIntegrationStore((s) => s.platform);
  const healthConnected = useHealthIntegrationStore((s) => s.isConnected);
  const healthDaily = useHealthIntegrationStore((s) => s.daily);
  const today = new Date().toISOString().slice(0, 10);
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
  const [healthError, setHealthError] = useState('');
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [manualSteps, setManualSteps] = useState(String(healthSummary.steps || ''));
  const [manualCalories, setManualCalories] = useState(String(healthSummary.activeCalories || ''));

  const [name, setName] = useState(profile?.name || '');
  const [sex, setSex] = useState<BiologicalSex>(profile?.sex || 'female');
  const [age, setAge] = useState(String(profile?.age || ''));
  const [weight, setWeight] = useState(String(profile?.weight || ''));
  const [height, setHeight] = useState(String(profile?.height || ''));
  const [goal, setGoal] = useState<Goal>(profile?.goal || 'lose');
  const [experience, setExperience] = useState<ExperienceLevel>(profile?.experienceLevel || 'beginner');
  const [days, setDays] = useState<WeekDay[]>(profile?.trainingDays || []);

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
    <div className="px-5 pt-14 pb-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold">Perfil</h1>
        <button
          onClick={() => (editing ? handleSave() : setEditing(true))}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            editing ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 text-white/60 border border-white/10'
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
            <div className="flex gap-2">
              <button onClick={() => setSex('female')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${sex === 'female' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-white/50'}`}>
                ♀️ Feminino
              </button>
              <button onClick={() => setSex('male')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${sex === 'male' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-white/50'}`}>
                ♂️ Masculino
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-white/40 mb-1 block">Idade</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-white/40 mb-1 block">Peso (kg)</label>
              <input
                type="number"
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
                  <span>{opt.emoji}</span>
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
                  <span>{opt.emoji}</span>
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
              {GOAL_OPTIONS.find((o) => o.value === profile.goal)?.emoji}{' '}
              {GOAL_OPTIONS.find((o) => o.value === profile.goal)?.label}
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

          {/* Cycle Phase */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">🌸 Fase do ciclo</h2>
            <div className="grid grid-cols-2 gap-2">
              {CYCLE_PHASES.map((cp) => (
                <button
                  key={cp.value}
                  onClick={() => setPhase(cp.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-xs ${
                    phase === cp.value ? 'border-primary-500 bg-primary-500/10' : 'border-white/5'
                  }`}
                >
                  <span>{cp.emoji}</span>
                  <span className="font-medium text-white/70">{cp.label}</span>
                </button>
              ))}
            </div>
            {phase !== 'none' && (
              <p className="text-xs text-white/40 italic">
                💡 {CYCLE_PHASES.find((c) => c.value === phase)?.tip}
              </p>
            )}
          </div>

          {/* Theme Section */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-white/80">🎨 Tema</h2>
            <div className="grid grid-cols-5 gap-2">
              {THEMES.filter((t) => !t.special).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                    themeId === t.id ? 'border-white/40 scale-105' : 'border-white/5'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.colors.primary }} />
                  <span className="text-[9px] text-white/40">{t.emoji}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-white/5">
              <p className="text-xs text-white/30">Temas especiais ✨</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.filter((t) => t.special).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      themeId === t.id ? 'border-white/40 bg-white/5' : 'border-white/5'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span className="text-xs font-medium text-white/70">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
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
                {healthError} Por enquanto, use entrada manual. Para sincronização automática, o FitFlow precisa estar empacotado como app iOS/Android.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={manualSteps}
                onChange={(e) => setManualSteps(e.target.value)}
                placeholder="Passos"
                className="input-field text-sm"
              />
              <input
                type="number"
                inputMode="numeric"
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
              <span className="text-xl">🤖</span>
              <h2 className="font-semibold text-white/80">FlowAI</h2>
            </div>
            {isEnabled ? (
              <div className="space-y-3">
                <p className="text-sm text-success">Ativa ✓</p>
                <button
                  onClick={() => navigate(hasSeenIntro ? '/ai' : '/ai/intro')}
                  className="btn-primary py-3 text-sm"
                >
                  Abrir assistente 🤖
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
                  Ativar FlowAI ⚡
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
                    onClick={() => { localStorage.clear(); window.location.href = '/fitflow/'; }}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/30">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
