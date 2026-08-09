import { AnimatePresence, motion } from 'framer-motion';
import { useMotivationalQuote } from '@/hooks/useMotivationalQuote';

export function MotivationalQuote() {
  const quote = useMotivationalQuote();

  return (
    <div className="h-12 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={quote}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="text-sm text-white/50 italic text-center px-4"
        >
          "{quote}"
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
