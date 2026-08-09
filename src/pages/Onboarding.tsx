import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useProfileStore, WEEKDAY_OPTIONS, GOAL_OPTIONS } from '@/stores/useProfileStore';
import type { WeekDay, Goal } from '@/types';

type Step = 'name' | 'body' | 'goal' | 'days';

export function Onboarding() {
  const navigate = useNavigate();
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState<Goal>('lose');
  const [days, setDays] = useState<WeekDay[]>([]);

  const toggleDay = (day: WeekDay) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : prev.length < 3 ? [...prev, day] : prev,
    );
  };

  const handleFinish = () => {
    setProfile({
      name,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      goal,
      trainingDays: days,
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25 }}
      >
        {step === 'name' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Olá! 👋</h1>
              <p className="text-white/50">Como posso te chamar?</p>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="input-field text-2xl py-4"
              autoFocus
            />
            <button
              className="btn-primary"
              disabled={!name.trim()}
              onClick={() => setStep('body')}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 'body' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Seus dados 📐</h1>
              <p className="text-white/50">Para calcular suas necessidades</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-white/40 mb-1 block">Idade</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm text-white/40 mb-1 block">Peso (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="60"
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
                  placeholder="165"
                  className="input-field"
                />
              </div>
            </div>
            <button
              className="btn-primary"
              disabled={!age || !weight || !height}
              onClick={() => setStep('goal')}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 'goal' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Seu objetivo 🎯</h1>
              <p className="text-white/50">O que você quer alcançar?</p>
            </div>
            <div className="space-y-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                    goal === opt.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-dark-200'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="font-medium text-lg">{opt.label}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setStep('days')}>
              Continuar
            </button>
          </div>
        )}

        {step === 'days' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dias de treino 📅</h1>
              <p className="text-white/50">Escolha exatamente 3 dias da semana</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {WEEKDAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleDay(opt.value)}
                  className={`py-4 px-2 rounded-xl text-center font-semibold transition-all ${
                    days.includes(opt.value)
                      ? 'bg-primary-500 text-white scale-105'
                      : 'bg-dark-200 text-white/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-white/30">
              {days.length}/3 selecionados
            </p>
            <button
              className="btn-primary"
              disabled={days.length !== 3}
              onClick={handleFinish}
            >
              Começar! 🚀
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
