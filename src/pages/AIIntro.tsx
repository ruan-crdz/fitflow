import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { useProfileStore } from '@/stores/useProfileStore';

export function AIIntro() {
  const navigate = useNavigate();
  const markIntroSeen = useAIStore((s) => s.markIntroSeen);
  const profile = useProfileStore((s) => s.profile);
  const [step, setStep] = useState(0);

  const lines = [
    'Inicializando GymPilot AI...',
    'Conectando à inteligência artificial...',
    'Sistemas online.',
    `Olá, ${profile?.name || 'usuária'}. Prazer em conhecê-la.`,
    'Sou sua assistente fitness pessoal.',
    'Estou aqui para tirar dúvidas, dar dicas de treino, nutrição e motivação.',
    'Tudo baseado em ciência. Tudo adaptado a você.',
    'Vamos juntas? 💜',
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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-8 bg-dark-500">
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
            Começar a conversar 🤖
          </motion.button>
        )}
      </div>
    </div>
  );
}
