import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useCustomWorkoutStore } from '@/stores/useCustomWorkoutStore';
import { EXERCISE_CATALOG } from '@/constants/exerciseCatalog';
import { sendMessage, type ChatMessage } from '@/utils/ai';
import type { WorkoutType } from '@/types';

const SUGGESTIONS = [
  'O que comer antes do treino?',
  'Quanto de proteína preciso por dia?',
  'Dica pra melhorar o hip thrust',
  'Tô desmotivada, me ajuda',
  'Posso treinar menstruada?',
  'Quanto tempo pra ver resultado?',
];

interface ReplaceExerciseAction {
  type: 'replace_exercise';
  scope: 'all' | 'workout';
  workoutType?: WorkoutType;
  fromName: string;
  toName: string;
}

const WORKOUT_TYPES: WorkoutType[] = ['A', 'B', 'C', 'D', 'E'];

function extractAction(reply: string): { cleanReply: string; action: ReplaceExerciseAction | null } {
  const match = reply.match(/\[ACTION:([\s\S]*?)\]/);
  if (!match) return { cleanReply: reply, action: null };

  try {
    const parsed = JSON.parse(match[1]) as ReplaceExerciseAction;
    if (parsed.type !== 'replace_exercise' || !parsed.fromName || !parsed.toName) {
      return { cleanReply: reply.replace(match[0], '').trim(), action: null };
    }
    return {
      cleanReply: reply.replace(match[0], '').trim(),
      action: parsed.scope === 'workout' ? parsed : { ...parsed, scope: 'all' },
    };
  } catch {
    return { cleanReply: reply.replace(match[0], '').trim(), action: null };
  }
}

export function AIChat() {
  const apiKey = useAIStore((s) => s.apiKey);
  const messages = useAIStore((s) => s.messages);
  const setMessages = useAIStore((s) => s.setMessages);
  const clearMessages = useAIStore((s) => s.clearMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<ReplaceExerciseAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { activeSlots, getExercises, setExercises } = useCustomWorkoutStore();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || !apiKey || loading) return;

    setInput('');
    setError('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await sendMessage(apiKey, newMessages);
      const { cleanReply, action } = extractAction(reply);
      setPendingAction(action);
      setMessages([...newMessages, { role: 'assistant', content: cleanReply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const normalizeName = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

  const applyPendingAction = () => {
    if (!pendingAction) return;
    const catalogItem = findCatalogItem(pendingAction.toName);
    if (!catalogItem) {
      setError('Não encontrei esse exercício no catálogo com foto.');
      setPendingAction(null);
      return;
    }

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
          name: catalogItem.name,
          sets: exercise.sets,
          repsMin: exercise.repsMin,
          repsMax: exercise.repsMax,
          muscleGroup: catalogItem.muscleGroup,
          image: catalogItem.image,
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
      ? `Pronto, substituído ${targetText}. Agora pode voltar na tela de treinos que você vai ver ${pendingAction.fromName} como ${catalogItem.name}.`
      : `Não achei ${pendingAction.fromName} ${targetText}. Confere o nome e me pede de novo.`;

    setMessages([...messages, { role: 'assistant', content: reply }]);
    setPendingAction(null);
  };

  const rejectPendingAction = () => {
    setPendingAction(null);
    setMessages([...messages, { role: 'assistant', content: 'Tudo bem, não alterei nada.' }]);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)]">
      {/* Header */}
      <div className="px-5 pt-10 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-base">🤖</span>
            </div>
            <div>
              <h1 className="font-bold">FlowAI</h1>
              <p className="text-[10px] text-white/30">Assistente fitness pessoal</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages} className="text-xs text-white/30 px-2 py-1">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
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
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-dark-100 text-white/80 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </motion.div>
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
              <p className="text-xs text-white/60">
                {pendingAction.scope === 'workout' && pendingAction.workoutType
                  ? `Substituir no treino ${pendingAction.workoutType}?`
                  : 'Substituir em todos os treinos?'}
              </p>
              <p className="text-sm text-white/80">{pendingAction.fromName} → {pendingAction.toName}</p>
              <div className="flex gap-3">
                <button
                  onClick={rejectPendingAction}
                  className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-lg"
                >
                  ×
                </button>
                <button
                  onClick={applyPendingAction}
                  className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/30 text-green-300 text-lg"
                >
                  ✓
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte algo..."
            className="input-field flex-1 py-3 text-sm"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <span className="text-lg">↑</span>
          </button>
        </div>
      </div>
    </div>
  );
}
