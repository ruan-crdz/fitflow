import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from '@/components/ui/MaterialIcon';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';

interface VoiceCallTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface VoiceCallModalProps {
  open: boolean;
  assistantName: string;
  onClose: () => void;
  onUserTurn: (text: string) => Promise<string | null>;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

function summarizeForVoice(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= 240) return trimmed;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  const compact = sentences.slice(0, 2).join(' ').trim();
  return compact.length > 10 ? compact : `${trimmed.slice(0, 220)}...`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function VoiceCallModal({
  open,
  assistantName,
  onClose,
  onUserTurn,
  primaryActionLabel,
  onPrimaryAction,
}: VoiceCallModalProps) {
  const [turns, setTurns] = useState<VoiceCallTurn[]>([]);
  const [preview, setPreview] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const openRef = useRef(false);
  const turnTokenRef = useRef(0);

  const {
    isListening,
    isSpeaking,
    sttSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoiceAssistant({
    onTranscript: (text, isFinal) => {
      setError('');
      if (!isFinal) {
        setPreview(text);
        return;
      }
      const finalText = text.trim();
      setPreview('');
      if (!finalText || processing) return;
      void handleTurn(finalText);
    },
    onError: (message) => setError(message),
  });

  const lastAssistantText = useMemo(() => {
    const lastAssistant = [...turns].reverse().find((turn) => turn.role === 'assistant');
    return lastAssistant?.text || '';
  }, [turns]);

  const handleTurn = useCallback(async (text: string) => {
    const token = turnTokenRef.current + 1;
    turnTokenRef.current = token;
    setProcessing(true);
    setTurns((prev) => [...prev, { role: 'user', text }]);
    stopListening();

    try {
      const answer = await withTimeout(
        onUserTurn(text),
        45000,
        'Demorou demais para responder. Tenta de novo em uma frase mais curta.',
      );
      if (!openRef.current || token !== turnTokenRef.current) return;
      if (answer?.trim()) {
        setTurns((prev) => [...prev, { role: 'assistant', text: answer.trim() }]);
        speak(summarizeForVoice(answer));
      }
    } catch (e) {
      if (!openRef.current || token !== turnTokenRef.current) return;
      setError(e instanceof Error ? e.message : 'Falha ao processar sua fala.');
    } finally {
      if (openRef.current && token === turnTokenRef.current) {
        setProcessing(false);
      }
    }
  }, [onUserTurn, speak, stopListening]);

  useEffect(() => {
    openRef.current = open;
    if (!open) {
      turnTokenRef.current += 1;
      setPreview('');
      setProcessing(false);
      setError('');
      stopListening();
      stopSpeaking();
      return;
    }

    setTurns([{ role: 'assistant', text: `Fala comigo. Sou a ${assistantName}. O que você precisa agora?` }]);
    setMicEnabled(true);
  }, [assistantName, open, stopListening, stopSpeaking]);

  useEffect(() => {
    if (!open) return;
    if (!micEnabled || processing || isSpeaking || isListening) return;
    if (!sttSupported) return;
    startListening();
  }, [isListening, isSpeaking, micEnabled, open, processing, startListening, sttSupported]);

  useEffect(() => {
    if (!open || !lastAssistantText) return;
    // Speak only for turns captured after opening the call screen.
  }, [lastAssistantText, open]);

  const closeCall = () => {
    openRef.current = false;
    turnTokenRef.current += 1;
    stopListening();
    stopSpeaking();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.28),_rgba(5,8,20,0.98)_60%)] backdrop-blur-xl">
      <div className="h-full flex flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-[0.2em]">Modo Ligação</p>
            <h2 className="text-white text-xl font-semibold mt-1">{assistantName}</h2>
          </div>
          <button
            onClick={closeCall}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white/80"
            aria-label="Encerrar"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            animate={{ scale: isListening || isSpeaking ? [1, 1.08, 1] : 1 }}
            transition={{ duration: 1.4, repeat: isListening || isSpeaking ? Infinity : 0 }}
            className={`w-32 h-32 rounded-full border flex items-center justify-center ${isListening ? 'border-green-400/60 bg-green-500/15' : isSpeaking ? 'border-primary-400/60 bg-primary-500/20' : 'border-white/20 bg-white/5'}`}
          >
            <MaterialIcon name={isListening ? 'mic' : isSpeaking ? 'graphic_eq' : 'support_agent'} className="text-4xl text-white/85" />
          </motion.div>

          <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
            {processing ? 'Pensando na resposta...' : isListening ? 'Tô te ouvindo. Fala à vontade.' : isSpeaking ? 'Respondendo em voz...' : 'Pronto pra conversar.'}
          </p>

          {preview && (
            <p className="mt-3 text-xs text-primary-200/90 text-center max-w-sm">{preview}</p>
          )}
          {error && (
            <p className="mt-3 text-xs text-red-300 text-center max-w-sm">{error}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3 space-y-2">
            <AnimatePresence initial={false}>
              {turns.slice(-4).map((turn, idx) => (
                <motion.p
                  key={`${turn.role}_${idx}_${turn.text.slice(0, 12)}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-xs ${turn.role === 'assistant' ? 'text-white/80' : 'text-primary-200'}`}
                >
                  <span className="text-white/35 mr-1">{turn.role === 'assistant' ? assistantName : 'Você'}:</span>
                  {turn.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-4 pb-2">
            <button
              onClick={() => {
                if (micEnabled) {
                  setMicEnabled(false);
                  stopListening();
                } else {
                  setMicEnabled(true);
                }
              }}
              className={`w-14 h-14 rounded-full border flex items-center justify-center ${micEnabled ? 'border-green-400/40 bg-green-500/20 text-green-200' : 'border-white/20 bg-white/10 text-white/70'}`}
              aria-label={micEnabled ? 'Mutar microfone' : 'Ativar microfone'}
            >
              <MaterialIcon name={micEnabled ? 'mic' : 'mic_off'} className="text-2xl" />
            </button>
            <button
              onClick={closeCall}
              className="w-16 h-16 rounded-full bg-red-500/80 text-white flex items-center justify-center"
              aria-label="Encerrar ligação"
            >
              <MaterialIcon name="call_end" className="text-3xl" />
            </button>
          </div>
          {primaryActionLabel && onPrimaryAction && (
            <button
              onClick={onPrimaryAction}
              className="w-full h-12 rounded-xl bg-primary-500 text-white text-sm font-semibold"
            >
              {primaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
