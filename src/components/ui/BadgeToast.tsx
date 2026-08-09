import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBadgeStore, type Badge } from '@/stores/useBadgeStore';

export function BadgeToast() {
  const lastUnlocked = useBadgeStore((s) => s.lastUnlocked);
  const clearLastUnlocked = useBadgeStore((s) => s.clearLastUnlocked);
  const badges = useBadgeStore((s) => s.getAllBadges());
  const [visible, setVisible] = useState<Badge | null>(null);

  useEffect(() => {
    if (lastUnlocked) {
      const badge = badges.find((b) => b.id === lastUnlocked);
      if (badge) {
        setVisible(badge);
        const timer = setTimeout(() => {
          setVisible(null);
          clearLastUnlocked();
        }, 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [lastUnlocked]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          className="fixed top-8 left-4 right-4 z-[100] flex items-center gap-3 bg-dark-100/95 backdrop-blur-md border border-primary-500/30 rounded-2xl p-4 shadow-xl shadow-primary-500/10"
        >
          <span className="text-4xl">{visible.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary-400 font-medium">Nova conquista!</p>
            <p className="font-bold text-sm">{visible.name}</p>
            <p className="text-[11px] text-white/50">{visible.description}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
