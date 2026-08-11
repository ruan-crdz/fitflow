import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/stores/useToastStore';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

const ICONS = { success: 'check_circle', error: 'cancel', info: 'info' };
const COLORS = {
  success: 'bg-emerald-500/90 border-emerald-400/30',
  error: 'bg-red-500/90 border-red-400/30',
  info: 'bg-blue-500/90 border-blue-400/30',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed top-12 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl flex items-center gap-2.5 max-w-sm w-full ${COLORS[toast.type]}`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
              <MaterialIcon name={ICONS[toast.type]} className="text-sm" />
            </span>
            <p className="text-sm font-medium text-white flex-1">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
