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

  const hideNav = location.pathname.startsWith('/workout') || location.pathname === '/ai/intro';
  if (hideNav) return <>{children}</>;

  const navItems = [
    { path: '/dashboard', icon: '🏠', label: 'Home' },
    { path: '/plans', icon: '📋', label: 'Treinos' },
    ...(aiEnabled ? [{ path: '/ai', icon: '🤖', label: 'FlowAI' }] : []),
    { path: '/history', icon: '📊', label: 'Histórico' },
    { path: '/profile', icon: '👤', label: 'Perfil' },
  ];
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 px-4 py-2 relative"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary-400' : 'text-white/40'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-500 rounded-full"
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
