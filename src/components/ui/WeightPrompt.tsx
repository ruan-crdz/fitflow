import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeightStore } from '@/stores/useWeightStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface WeightPromptProps {
  onClose: () => void;
}

export function WeightPrompt({ onClose }: WeightPromptProps) {
  const profile = useProfileStore((s) => s.profile)!;
  const addEntry = useWeightStore((s) => s.addEntry);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [weight, setWeight] = useState(profile.weight.toString());

  const handleSubmit = () => {
    const val = parseFloat(weight);
    if (isNaN(val) || val < 30 || val > 300) return;
    addEntry(val);
    updateProfile({ weight: val });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="card w-full max-w-sm space-y-5 p-6"
        >
          <div className="text-center">
            <MaterialIcon name="star" className="text-primary-300" />
            <h2 className="text-lg font-bold mt-2">Como está o peso hoje?</h2>
            <p className="text-sm text-white/40">Registre uma vez por dia para acompanhar</p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-32 text-center text-3xl font-bold bg-white/5 border border-white/10 rounded-xl py-3 focus:outline-none focus:border-primary-500"
            />
            <span className="text-white/40 text-lg">kg</span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-medium">
              Depois
            </button>
            <button onClick={handleSubmit} className="flex-1 btn-primary">
              Salvar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
