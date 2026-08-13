import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { sendMessageWithActions, type ChatMessage, type ChatAction, type ApplyWorkoutPlanAction } from '@/utils/ai';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { VoiceCallModal } from '@/components/ui/VoiceCallModal';
import { resolveAIPlan } from '@/constants/aiPlan';
import type { WorkoutType } from '@/types';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';
import { applyDraftTransactionally, createDraftFromAction, saveDraftForConfirmation } from '@/lib/workoutEngine';
import { useWorkoutDraftStore } from '@/stores/useWorkoutDraftStore';

const QUICK_OPTIONS = [
  'Quero um treino ABC com A peito, B costas e C pernas.',
  'Quero algo mais leve e rápido, em 3 dias.',
  'Quero focar em hipertrofia sem agachar pesado.',
  'Quero manter 4 dias e melhorar recuperação.',
];

const WORKOUT_TYPES: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];

export function AIReeval() {
  const navigate = useNavigate();
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const profile = useProfileStore((s) => s.profile);
  const aiPlan = resolveAIPlan(profile);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [saved, setSaved] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [voicePreview, setVoicePreview] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const currentDraft = useWorkoutDraftStore((s) => s.draft);
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const setDraftStatus = useWorkoutDraftStore((s) => s.setStatus);
  const setDraftError = useWorkoutDraftStore((s) => s.setError);
  const clearDraft = useWorkoutDraftStore((s) => s.clear);

  const { activeSlots, getExercises, setExercises } = useCustomWorkoutStore();

  const {
    isListening,
    sttSupported,
    ttsSupported,
    speak,
    toggleListening,
  } = useVoiceAssistant({
    onTranscript: (text, isFinal) => {
      setVoiceError('');
      if (!isFinal) {
        setVoicePreview(text);
        setInputText(text);
        return;
      }
      setVoicePreview('');
      setInputText(text);
      void handleSend(text);
    },
    onError: (message) => setVoiceError(message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAction]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Fala, ${assistantName} aqui. Me diz seu objetivo e divisão que eu monto seu treino completo agora e já te pergunto só uma vez se quer substituir.`,
        },
      ]);
    }
  }, [assistantName, messages.length]);

  const normalizeName = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const isAffirmative = (text: string) => {
    const t = normalizeName(text).trim();
    return ['sim', 'yes', 'ok', 'pode', 'confirmo', 'confirmar', 'aplica', 'aplicar', 'fechado', 'bora', 'manda'].some((word) => t === word || t.startsWith(`${word} `));
  };

  const isNegative = (text: string) => {
    const t = normalizeName(text).trim();
    return ['nao', 'não', 'no', 'cancela', 'cancelar', 'deixa', 'pare', 'parar'].some((word) => t === word || t.startsWith(`${word} `));
  };

  const findCatalogItem = (name: string) => {
    const normalized = normalizeName(name);
    return EXERCISE_CATALOG.find((item) => normalizeName(item.name) === normalized)
      || EXERCISE_CATALOG.find((item) => normalizeName(item.name).includes(normalized) || normalized.includes(normalizeName(item.name)));
  };

  const matchesExercise = (exerciseName: string, query: string) => {
    const a = normalizeName(exerciseName);
    const b = normalizeName(query);
    return a === b || a.includes(b) || b.includes(a);
  };

  const syncPendingWorkoutDraft = (action: ChatAction | null) => {
    if (!action || action.type !== 'apply_workout_plan') return;
    const draft = createDraftFromAction(action);
    setDraft({ ...draft, status: 'AWAITING_CONFIRMATION', updatedAt: Date.now() });
    setDraftStatus('AWAITING_CONFIRMATION');
    setDraftError(null);

    void (async () => {
      const saved = await saveDraftForConfirmation(draft);
      if (!saved.success) {
        setDraftError(saved.message);
        return;
      }
      if (saved.draftId && saved.draftId !== draft.id) {
        setDraft({ ...draft, id: saved.draftId, status: 'AWAITING_CONFIRMATION', updatedAt: Date.now() });
      }
    })();
  };

  const applyWorkoutPlanAction = async (action: ApplyWorkoutPlanAction) => {
    const baseDraft = currentDraft && currentDraft.split === action.split
      ? {
          ...currentDraft,
          workouts: action.workouts,
          recommendation: action.recommendation,
          status: 'SAVING' as const,
          updatedAt: Date.now(),
        }
      : {
          ...createDraftFromAction(action),
          status: 'SAVING' as const,
        };

    setDraft(baseDraft);
    setDraftStatus('SAVING');
    const result = await applyDraftTransactionally(baseDraft);
    if (result.success) {
      setDraft({
        ...baseDraft,
        id: result.draftId || baseDraft.id,
        status: 'SAVED',
        updatedAt: Date.now(),
      });
      setDraftStatus('SAVED');
      setDraftError(null);
      return true;
    }
    setDraftStatus('ERROR');
    setDraftError(result.message);
    setError(result.message);
    return false;
  };

  const applyPendingAction = (): boolean => {
    if (!pendingAction) return false;

    if (pendingAction.type === 'apply_workout_plan') {
      const action = pendingAction;
      setPendingAction(null);
      setLoading(true);
      void (async () => {
        try {
          const ok = await applyWorkoutPlanAction(action);
          if (ok) {
            setSaved(true);
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Treino novo salvo com sucesso. Quer abrir seus treinos agora?' }]);
          } else {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Não consegui salvar agora. Seu treino anterior foi preservado.' }]);
          }
        } finally {
          setLoading(false);
        }
      })();
      return true;
    }

    const catalogItem = findCatalogItem(pendingAction.toName);
    const targetTypes = pendingAction.scope === 'workout' && pendingAction.workoutType
      ? [pendingAction.workoutType]
      : activeSlots;

    let changed = 0;
    for (const type of targetTypes) {
      if (!WORKOUT_TYPES.includes(type)) continue;
      const exercises = getExercises(type);
      const updated = exercises.map((exercise) => {
        if (!matchesExercise(exercise.name, pendingAction.fromName)) return exercise;
        changed += 1;
        return {
          id: `reeval_swap_${Date.now()}_${changed}`,
          name: catalogItem?.name || pendingAction.toName,
          sets: exercise.sets,
          repsMin: exercise.repsMin,
          repsMax: exercise.repsMax,
          muscleGroup: catalogItem?.muscleGroup || exercise.muscleGroup,
          image: catalogItem?.image,
        };
      });

      setExercises(type, updated.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets,
        repsMin: exercise.repsMin,
        repsMax: exercise.repsMax,
        muscleGroup: exercise.muscleGroup,
        image: exercise.image,
      })));
    }

    const targetText = pendingAction.scope === 'workout' && pendingAction.workoutType ? `no treino ${pendingAction.workoutType}` : 'nos seus treinos';
    const reply = changed > 0
      ? `Fechado. Substituí ${targetText}.`
      : `Não achei ${pendingAction.fromName} ${targetText}. Tenta com outro nome.`;

    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    setPendingAction(null);
    return true;
  };

  const rejectPendingAction = () => {
    if (pendingAction?.type === 'apply_workout_plan') {
      clearDraft();
    }
    setPendingAction(null);
    setMessages((prev) => [...prev, { role: 'assistant', content: 'Perfeito, não alterei nada.' }]);
  };

  const tryResolvePendingFromUserText = (text: string): boolean => {
    if (!pendingAction) return false;
    if (isAffirmative(text)) return applyPendingAction();
    if (isNegative(text)) {
      rejectPendingAction();
      return true;
    }
    return false;
  };

  const buildReevalUserMessage = (text: string): string => `CONTEXTO: reavaliação inteligente de treino.\nPedido: ${text}`;

  const handleSend = async (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg || loading) return;

    if (tryResolvePendingFromUserText(msg)) {
      setInputText('');
      return;
    }

    setInputText('');
    setError('');

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: buildReevalUserMessage(msg) },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { reply, action } = await sendMessageWithActions(null, newMessages, 'plan_reeval');
      syncPendingWorkoutDraft(action);
      setPendingAction(action);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCallTurn = async (text: string): Promise<string | null> => {
    if (loading) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    if (tryResolvePendingFromUserText(trimmed)) {
      return saved ? 'Feito. Treino salvo. Quer abrir seus treinos?' : 'Feito. Quer que eu faça mais algum ajuste?';
    }

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: buildReevalUserMessage(trimmed) },
    ];

    setMessages(newMessages);
    setLoading(true);
    setError('');

    try {
      const { reply, action } = await sendMessageWithActions(null, newMessages, 'plan_reeval');
      syncPendingWorkoutDraft(action);
      setPendingAction(action);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      return reply;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(message);
      return `Falhou aqui. ${message}. Manda de novo em frase curta.`;
    } finally {
      setLoading(false);
    }
  };

  if (aiPlan !== 'ultimate') {
    return (
      <div className="fixed inset-0 z-50 bg-[rgb(var(--color-bg-rgb))] flex items-center justify-center px-6">
        <div className="card max-w-md w-full space-y-4 border border-primary-500/25">
          <div className="flex items-center gap-2">
            <MaterialIcon name="workspace_premium" className="text-primary-300 text-2xl" />
            <h1 className="text-lg font-bold">Reavaliação IA é Ultimate</h1>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            No plano Free, você recebe chat e dicas rápidas. A reavaliação completa com ajuste inteligente de treino fica no Ultimate.
          </p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/plans')} className="btn-secondary flex-1 py-3 text-sm">
              Voltar para treinos
            </button>
            <button onClick={() => navigate('/profile')} className="btn-primary flex-1 py-3 text-sm">
              Ver upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgb(var(--color-bg-rgb))] flex flex-col">
      <div className="px-5 pt-12 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <MaterialIcon name="psychology" className="text-lg text-primary-300" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Reavaliação IA</h1>
              <p className="text-[10px] text-white/30">Mesmo motor do chat geral</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ttsSupported && sttSupported && (
              <button
                onClick={() => setCallOpen(true)}
                className="text-xs px-2 py-1 rounded-lg border border-primary-500/40 text-primary-300 bg-primary-500/10"
                title="Abrir modo ligação"
              >
                Modo ligação
              </button>
            )}
            <button onClick={() => navigate('/plans')} className="text-white/40 text-sm px-3 py-1"><MaterialIcon name="close" /></button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-[rgb(var(--color-bg-card-rgb))] border border-white/5 text-white/80 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? <RichText text={msg.content} /> : msg.content}
                {msg.role === 'assistant' && ttsSupported && msg.content.trim() && (
                  <div className="mt-2">
                    <button
                      onClick={() => speak(msg.content)}
                      className="w-7 h-7 rounded-full border bg-white/5 border-white/10 text-white/40"
                      aria-label="Ouvir resposta"
                      title="Ouvir resposta"
                    ><MaterialIcon name="volume_up" className="text-sm" /></button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[rgb(var(--color-bg-card-rgb))] border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {messages.length <= 1 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 pt-2"
          >
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSend(opt)}
                className="px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-xs text-primary-300 font-medium"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}

        {error && <p className="text-center text-red-400 text-xs">{error}</p>}

        {pendingAction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-[rgb(var(--color-bg-card-rgb))] border border-primary-500/20 rounded-2xl rounded-bl-sm p-3 space-y-3 max-w-[85%]">
              {pendingAction.type === 'replace_exercise' ? (
                <>
                  <p className="text-xs text-white/60">
                    {pendingAction.scope === 'workout' && pendingAction.workoutType
                      ? `Substituir no treino ${pendingAction.workoutType}?`
                      : 'Substituir em todos os treinos?'}
                  </p>
                  <p className="text-sm text-white/80">{pendingAction.fromName}{' -> '}{pendingAction.toName}</p>
                </>
              ) : (
                <>
                  <p className="text-xs text-white/60">Substituir seu treino completo por esse plano {pendingAction.split}?</p>
                  <p className="text-sm text-white/80">{pendingAction.workouts.map((workout) => `Treino ${workout.type}${workout.focus ? ` (${workout.focus})` : ''}`).join(' • ')}</p>
                </>
              )}
              <div className="flex gap-3">
                <button
                  onClick={rejectPendingAction}
                  className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-lg"
                ><MaterialIcon name="close" /></button>
                <button
                  onClick={applyPendingAction}
                  className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 text-green-300 text-lg"
                ><MaterialIcon name="check" /></button>
              </div>
            </div>
          </motion.div>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <MaterialIcon name="check_circle" className="text-4xl text-green-400 mx-auto mb-2" />
            <p className="text-sm text-white/60">Treino salvo com sucesso.</p>
            <button
              onClick={() => navigate('/plans')}
              className="mt-3 px-6 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm"
            >
              Ver meus treinos
            </button>
          </motion.div>
        )}
      </div>

      <div className="p-4 border-t border-white/5">
        {voicePreview && isListening && (
          <p className="text-[11px] text-primary-300 mb-2">Ouvindo: {voicePreview}</p>
        )}
        {voiceError && (
          <p className="text-[11px] text-red-400 mb-2">{voiceError}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (tryResolvePendingFromUserText(inputText)) {
                setInputText('');
                return;
              }
              void handleSend();
            }}
            placeholder="Conte como você está..."
            className="input-field flex-1 py-3 text-sm"
            disabled={loading}
          />
          {sttSupported && (
            <button
              onClick={toggleListening}
              disabled={loading}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center disabled:opacity-30 ${isListening ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-[rgb(var(--color-bg-card-rgb))] border-white/10 text-white/60'}`}
              title={isListening ? 'Parar gravação' : 'Falar com a IA'}
            >
              <MaterialIcon name={isListening ? 'mic_off' : 'mic'} className="text-lg" />
            </button>
          )}
          {ttsSupported && sttSupported && (
            <button
              onClick={() => setCallOpen(true)}
              className="w-12 h-12 rounded-xl border bg-primary-500/15 border-primary-500/35 text-primary-200 flex items-center justify-center"
              title="Entrar em modo ligação"
            >
              <MaterialIcon name="phone_in_talk" className="text-lg" />
            </button>
          )}
          <button
            onClick={() => {
              if (tryResolvePendingFromUserText(inputText)) {
                setInputText('');
                return;
              }
              void handleSend();
            }}
            disabled={!inputText.trim() || loading}
            className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center disabled:opacity-30"
          >
            <span className="text-lg">↑</span>
          </button>
        </div>
      </div>

      <VoiceCallModal
        open={callOpen}
        assistantName="Reavaliação IA"
        onClose={() => setCallOpen(false)}
        onUserTurn={handleVoiceCallTurn}
        primaryActionLabel={saved ? 'Treino salvo! Ver meus treinos' : undefined}
        onPrimaryAction={saved ? () => navigate('/plans') : undefined}
      />
    </div>
  );
}
