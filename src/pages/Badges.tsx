import { motion } from 'framer-motion';
import { useBadgeStore } from '@/stores/useBadgeStore';

export function Badges() {
  const badges = useBadgeStore((s) => s.getAllBadges());
  const unlockedCount = useBadgeStore((s) => s.getUnlockedCount());

  return (
    <div className="px-5 pt-12 pb-6">
      <h1 className="text-2xl font-bold mb-1">Conquistas 🏅</h1>
      <p className="text-white/40 text-sm mb-6">
        {unlockedCount} de {badges.length} desbloqueadas
      </p>

      <div className="w-full bg-dark-200 rounded-full h-2 mb-8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(unlockedCount / badges.length) * 100}%` }}
          className="bg-primary-500 h-2 rounded-full"
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge, i) => {
          const unlocked = !!badge.unlockedAt;
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl p-3 text-center border transition-all ${
                unlocked
                  ? 'bg-primary-500/10 border-primary-500/20'
                  : 'bg-dark-200/50 border-white/5 opacity-40 grayscale'
              }`}
            >
              <span className="text-3xl block mb-1.5">{badge.icon}</span>
              <p className="text-[11px] font-semibold leading-tight">{badge.name}</p>
              <p className="text-[9px] text-white/40 mt-1 leading-tight">{badge.description}</p>
              {unlocked && badge.unlockedAt && (
                <p className="text-[8px] text-primary-400 mt-1.5">
                  {new Date(badge.unlockedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
