import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAIConfigStore } from '@/stores/useAIConfigStore';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

export function AIIntro() {
  const navigate = useNavigate();
  const markIntroSeen = useAIStore((s) => s.markIntroSeen);
  const assistantName = useAIConfigStore((s) => s.assistantName);
  const profile = useProfileStore((s) => s.profile);
  const [step, setStep] = useState(0);
  const isMale = profile?.sex === 'male';
  const isFemale = profile?.sex === 'female';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  const lines = [
    `Inicializando ${assistantName}...`,
    'Conectando a inteligencia artificial...',
    'Sistemas online.',
    `Olá, ${profile?.name || (isMale ? 'usuário' : isFemale ? 'usuária' : 'pessoa usuária')}. Prazer em conhecer você.`,
    'Sou sua assistente fitness pessoal.',
    'Estou aqui para tirar duvidas, dar dicas de treino, nutrição e motivação.',
    'Tudo baseado em ciência. Tudo adaptado a você.',
    isMale ? 'Vamos juntos?' : isFemale ? 'Vamos juntas?' : 'Vamos nessa?',
  ];

  useEffect(() => {
    if (step < lines.length - 1) {
      const timer = setTimeout(() => setStep((s) => s + 1), 1800);
      return () => clearTimeout(timer);
    }
  }, [step, lines.length]);

  const handleContinue = () => {
    markIntroSeen();
    navigate('/ai');
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-8 bg-dark-500">
      <button
        onClick={handleBack}
        className="fixed left-5 top-[calc(1.25rem+env(safe-area-inset-top))] z-10 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/55 text-xs font-semibold"
      >
        ← Voltar
      </button>
      <button
        onClick={handleContinue}
        className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-10 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-semibold"
      >
        Pular
      </button>

      <div className="w-full max-w-sm space-y-4">
        <AnimatePresence>
          {lines.slice(0, step + 1).map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`text-sm font-mono ${
                i < 3 ? 'text-primary-400/60' : 'text-white/80'
              } ${i === step ? 'text-white' : ''}`}
            >
              {i < 3 && <span className="text-primary-500 mr-2">{'>'}</span>}
              {line}
              {i === lines.length - 1 && (
                <span className={isMale ? 'ml-2' : 'ml-2 text-primary-400 text-base'}>
                  <MaterialIcon name={isMale ? 'fitness_center' : isFemale ? 'favorite' : 'bolt'} className="text-primary-300" />
                </span>
              )}
            </motion.p>
          ))}
        </AnimatePresence>

        {step === lines.length - 1 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={handleContinue}
            className="btn-primary mt-8"
          >
            Começar a conversar
          </motion.button>
        )}
      </div>
    </div>
  );
}
