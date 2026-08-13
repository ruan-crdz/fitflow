import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { sendMessageWithActions, type ChatMessage, type ChatAction, type ApplyWorkoutPlanAction } from '@/utils/ai';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { VoiceCallModal } from '@/components/ui/VoiceCallModal';
import type { WorkoutType } from '@/types';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { RichText } from '@/components/ui/RichText';
import { applyDraftTransactionally, createDraftFromAction, saveDraftForConfirmation } from '@/lib/workoutEngine';
import { useWorkoutDraftStore } from '@/stores/useWorkoutDraftStore';

const SUGGESTIONS = [
  'Quero um treino ABC de peito, costas e pernas',
  'O que comer antes do treino?',
  'Quanto de proteína preciso por dia?',
  'Dica pra melhorar o hip thrust',
  'Tô desmotivada, me ajuda',
  'Posso treinar menstruada?',
  'Quanto tempo pra ver resultado?',
];

const WORKOUT_TYPES: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];

export function AIChat() {
  const messages = useAIStore((s) => s.messages);
  const setMessages = useAIStore((s) => s.setMessages);
  const clearMessages = useAIStore((s) => s.clearMessages);
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);
  const [feedbackByIndex, setFeedbackByIndex] = useState<Record<number, 'up' | 'down'>>({});
  const [voicePreview, setVoicePreview] = useState('');
  const [callOpen, setCallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeSlots, getExercises, setExercises } = useCustomWorkoutStore();
  const currentDraft = useWorkoutDraftStore((s) => s.draft);
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const setDraftStatus = useWorkoutDraftStore((s) => s.setStatus);
  const setDraftError = useWorkoutDraftStore((s) => s.setError);
  const clearDraft = useWorkoutDraftStore((s) => s.clear);

  const {
    isListening,
    isSpeaking,
    sttSupported,
    ttsSupported,
    toggleListening,
    speak,
  } = useVoiceAssistant({
    onTranscript: (text, isFinal) => {
      if (!isFinal) {
        setVoicePreview(text);
        setInput(text);
        return;
      }
      setVoicePreview('');
      setInput(text);
      void handleSend(text);
    },
    onError: (message) => setError(message),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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

  const applyPendingAction = () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'apply_workout_plan') {
      const action = pendingAction;
      setPendingAction(null);
      setLoading(true);
      void (async () => {
        try {
          const ok = await applyWorkoutPlanAction(action);
          if (ok) {
            setMessages([...useAIStore.getState().messages, { role: 'assistant', content: 'Fechou. Substituí seu treino completo com sucesso.' }]);
          } else {
            setMessages([...useAIStore.getState().messages, { role: 'assistant', content: 'Não consegui salvar o treino agora. Seu treino antigo foi preservado.' }]);
          }
        } finally {
          setLoading(false);
        }
      })();
      return;
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
          id: `flowai_${Date.now()}_${changed}`,
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
      ? `Pronto, substituído ${targetText}.`
      : `Não achei ${pendingAction.fromName} ${targetText}. Confere o nome e me pede de novo.`;

    setMessages([...useAIStore.getState().messages, { role: 'assistant', content: reply }]);
    setPendingAction(null);
  };

  const rejectPendingAction = () => {
    if (pendingAction?.type === 'apply_workout_plan') {
      clearDraft();
    }
    setPendingAction(null);
    setMessages([...useAIStore.getState().messages, { role: 'assistant', content: 'Tudo bem, não alterei nada.' }]);
  };

  const tryResolvePendingFromUserText = (text: string): boolean => {
    if (!pendingAction) return false;
    if (isAffirmative(text)) {
      applyPendingAction();
      return true;
    }
    if (isNegative(text)) {
      rejectPendingAction();
      return true;
    }
    return false;
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    if (tryResolvePendingFromUserText(msg)) {
      setInput('');
      return;
    }

    setInput('');
    setError('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { reply, action } = await sendMessageWithActions(null, newMessages);
      syncPendingWorkoutDraft(action);
      setPendingAction(action);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageFeedback = async (index: number, value: 'up' | 'down') => {
    setFeedbackByIndex((prev) => ({ ...prev, [index]: value }));
    if (value === 'up' || loading) return;

    setLoading(true);
    setError('');
    try {
      const retryMessages: ChatMessage[] = [
        ...messages.slice(0, index + 1),
        {
          role: 'user',
          content: 'Feedback negativo: o usuario nao gostou da ultima resposta. Refaça a resposta anterior com mais precisao, mais alinhada ao perfil, sem inventar dados, usando base cientifica e respeitando a personalidade configurada.',
        },
      ];
      const { reply, action } = await sendMessageWithActions(null, retryMessages);
      syncPendingWorkoutDraft(action);
      setPendingAction(action);
      setMessages([...messages, { role: 'assistant', content: reply }]);
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
      return 'Feito. Quer que eu faça mais algum ajuste?';
    }

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setLoading(true);
    setError('');

    try {
      const { reply, action } = await sendMessageWithActions(null, newMessages);
      syncPendingWorkoutDraft(action);
      setPendingAction(action);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      return reply;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(message);
      return `Falhou aqui. ${message}. Me fala de novo em uma frase curta.`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      <div className="px-5 pt-10 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <MaterialIcon name="smart_toy" className="text-base text-primary-300" />
            </div>
            <div>
              <h1 className="font-bold">{assistantName}</h1>
              <p className="text-[10px] text-white/30">Assistente fitness pessoal</p>
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
            {messages.length > 0 && (
              <button onClick={clearMessages} className="text-xs text-white/30 px-2 py-1">
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 pt-8">
            <p className="text-center text-white/30 text-sm">
              Pergunte qualquer coisa sobre treino, nutrição ou motivação
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-2 rounded-xl bg-dark-100 border border-white/5 text-xs text-white/60 hover:border-primary-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`space-y-1 flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-sm'
                    : 'bg-dark-100 text-white/80 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? <RichText text={msg.content} /> : msg.content}
              </div>
            </motion.div>
            {msg.role === 'assistant' && msg.content.trim() && (
              <div className="flex gap-1 ml-1">
                {ttsSupported && (
                  <button
                    onClick={() => speak(msg.content)}
                    className="w-8 h-8 rounded-full border bg-white/5 border-white/10 text-white/40"
                    aria-label="Ouvir resposta"
                    title="Ouvir resposta"
                  ><MaterialIcon name="volume_up" className="text-base" /></button>
                )}
                <button
                  onClick={() => handleMessageFeedback(i, 'up')}
                  className={`w-8 h-8 rounded-full border text-xs ${feedbackByIndex[i] === 'up' ? 'bg-green-500/20 border-green-500/40' : 'bg-white/5 border-white/10 text-white/40'}`}
                  aria-label="Resposta boa"
                ><MaterialIcon name="thumb_up" className="text-base" /></button>
                <button
                  onClick={() => handleMessageFeedback(i, 'down')}
                  className={`w-8 h-8 rounded-full border text-xs ${feedbackByIndex[i] === 'down' ? 'bg-red-500/20 border-red-500/40' : 'bg-white/5 border-white/10 text-white/40'}`}
                  aria-label="Refazer resposta"
                ><MaterialIcon name="thumb_down" className="text-base" /></button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-dark-100 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-center text-red-400 text-xs">{error}</p>
        )}

        {pendingAction && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-dark-100 border border-primary-500/20 rounded-2xl rounded-bl-sm p-3 space-y-3 max-w-[85%]">
              {pendingAction.type === 'replace_exercise' ? (
                <>
                  <p className="text-xs text-white/60">
                    {pendingAction.scope === 'workout' && pendingAction.workoutType
                      ? `Substituir no treino ${pendingAction.workoutType}?`
                      : 'Substituir em todos os treinos?'}
                  </p>
                  <p className="text-sm text-white/80">{pendingAction.fromName} → {pendingAction.toName}</p>
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
      </div>

      <div className="p-4 border-t border-white/5">
        {voicePreview && isListening && (
          <p className="text-[11px] text-primary-300 mb-2">Ouvindo: {voicePreview}</p>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (tryResolvePendingFromUserText(input)) {
                setInput('');
                return;
              }
              void handleSend();
            }}
            placeholder="Pergunte algo..."
            className="input-field flex-1 py-3 text-sm"
            disabled={loading}
          />
          {sttSupported && (
            <button
              onClick={toggleListening}
              disabled={loading}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center disabled:opacity-30 ${isListening ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-dark-100 border-white/10 text-white/60'}`}
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
              if (tryResolvePendingFromUserText(input)) {
                setInput('');
                return;
              }
              void handleSend();
            }}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <MaterialIcon name={isSpeaking ? 'graphic_eq' : 'send'} className="text-lg" />
          </button>
        </div>
      </div>

      <VoiceCallModal
        open={callOpen}
        assistantName={assistantName}
        onClose={() => setCallOpen(false)}
        onUserTurn={handleVoiceCallTurn}
      />
    </div>
  );
}
