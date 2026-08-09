import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'confirm' | 'info';
}

export function Modal({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel, type = 'info' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-sm space-y-4 p-6 text-center"
          >
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-white/50">{message}</p>
            <div className="flex gap-3 pt-2">
              {type === 'confirm' ? (
                <>
                  <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-medium text-sm">
                    {cancelLabel}
                  </button>
                  <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium text-sm">
                    {confirmLabel}
                  </button>
                </>
              ) : (
                <button onClick={onCancel || onConfirm} className="flex-1 btn-primary py-3 text-sm">
                  OK
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
