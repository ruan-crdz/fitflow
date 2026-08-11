import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const aiEnabled = useAIStore((s) => s.isEnabled);

  const hideNav = location.pathname.startsWith('/workout')
    || location.pathname === '/ai/intro'
    || location.pathname === '/setup-ai'
    || location.pathname === '/plans/reeval';

  if (hideNav) return <><ToastContainer />{children}</>;

  const navItems = [
    { path: '/dashboard', icon: 'home', label: 'Início' },
    { path: '/plans', icon: 'fitness_center', label: 'Treino' },
    { path: '/health', icon: 'restaurant', label: 'Saúde' },
    { path: '/social', icon: 'groups', label: 'Social' },
    ...(aiEnabled ? [{ path: '/ai', icon: 'bolt', label: 'IA' }] : []),
    { path: '/profile', icon: 'person', label: 'Perfil' },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <ToastContainer />
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="mx-3 mb-3 rounded-[22px] bg-[rgb(var(--color-bg-card-rgb))] border border-white/[0.08] shadow-[0_-4px_30px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          <div className="flex justify-around items-center h-[68px] max-w-lg mx-auto px-2 relative">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.85 }}
                  className="relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary-500/12 rounded-2xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={`text-[23px] ${isActive ? 'text-primary-400' : 'text-white/40'}`}
                  >
                    <MaterialIcon name={item.icon} />
                  </motion.span>
                  <motion.span
                    animate={{ opacity: isActive ? 1 : 0.4, y: isActive ? 0 : 1 }}
                    className={`text-[9px] font-bold mt-0.5 ${isActive ? 'text-primary-400' : 'text-white/40'}`}
                  >
                    {item.label}
                  </motion.span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
