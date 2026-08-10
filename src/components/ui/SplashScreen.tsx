import { motion } from 'framer-motion';

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-dark-400 flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-3xl bg-dark-100 border border-primary-500/20 flex items-center justify-center shadow-2xl shadow-primary-500/25"
      >
        <div
          className="w-16 h-16 bg-gradient-to-br from-primary-200 via-primary-500 to-primary-700"
          style={{
            WebkitMaskImage: 'url(/fitflow/icons/logo-mask.png)',
            maskImage: 'url(/fitflow/icons/logo-mask.png)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl font-bold mt-6 bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent"
      >
        GymPilot
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-white/30 text-sm mt-2"
      >
        Seu treino, sua evolução
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10"
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              className="w-2 h-2 rounded-full bg-primary-500"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
