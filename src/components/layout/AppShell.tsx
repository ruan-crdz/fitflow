import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAIStore } from '@/stores/useAIStore';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const aiEnabled = useAIStore((s) => s.isEnabled);

  const hideNav = location.pathname.startsWith('/workout') || location.pathname === '/ai/intro' || location.pathname === '/setup-ai';
  if (hideNav) return <>{children}</>;

  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Início' },
    { path: '/plans', icon: '💪', label: 'Treino' },
    { path: '/health', icon: '🍎', label: 'Saúde' },
    ...(aiEnabled ? [{ path: '/ai', icon: '⚡', label: 'IA' }] : []),
    { path: '/profile', icon: '👤', label: 'Perfil' },
  ];
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-[rgb(var(--color-bg-rgb))] border-t border-white/[0.06] safe-area-bottom backdrop-blur-xl">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${isActive ? 'scale-105' : 'opacity-60'}`}
              >
                <span className={`text-xl ${isActive ? '' : 'grayscale'}`}>{item.icon}</span>
                <span className={`text-[10px] font-semibold ${isActive ? 'text-primary-400' : 'text-white/50'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-primary-500 rounded-b-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
