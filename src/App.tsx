import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { Workout } from '@/pages/Workout';
import { WorkoutComplete } from '@/pages/WorkoutComplete';
import { History } from '@/pages/History';
import { Profile } from '@/pages/Profile';
import { WorkoutPlans } from '@/pages/WorkoutPlans';
import { AIIntro } from '@/pages/AIIntro';
import { AIChat } from '@/pages/AIChat';
import { Badges } from '@/pages/Badges';
import { BadgeToast } from '@/components/ui/BadgeToast';

export function App() {
  const isOnboarded = useProfileStore((s) => s.isOnboarded);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <ThemeProvider>
        <AnimatePresence>
          <SplashScreen />
        </AnimatePresence>
      </ThemeProvider>
    );
  }

  if (!isOnboarded) {
    return (
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="*" element={<Onboarding />} />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <AppShell>
          <BadgeToast />
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/workout/complete" element={<WorkoutComplete />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/plans" element={<WorkoutPlans />} />
            <Route path="/badges" element={<Badges />} />
            <Route path="/ai/intro" element={<AIIntro />} />
            <Route path="/ai" element={<AIChat />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  );
}
