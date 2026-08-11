import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { Onboarding } from '@/pages/Onboarding';
import { BackupRestore } from '@/pages/BackupRestore';
import { Dashboard } from '@/pages/Dashboard';
import { Workout } from '@/pages/Workout';
import { WorkoutComplete } from '@/pages/WorkoutComplete';
import { Profile } from '@/pages/Profile';
import { WorkoutPlans } from '@/pages/WorkoutPlans';
import { AIIntro } from '@/pages/AIIntro';
import { AIChat } from '@/pages/AIChat';
import { AISetup } from '@/pages/AISetup';
import { AIReeval } from '@/pages/AIReeval';
import { Health } from '@/pages/Health';
import { Social } from '@/pages/Social';
import { clearGymPilotLocalData } from '@/utils/resetAppData';

export function App() {
  const isOnboarded = useProfileStore((s) => s.isOnboarded);
  const [showSplash, setShowSplash] = useState(true);
  const [startOnboarding, setStartOnboarding] = useState(false);

  const startFreshOnboarding = () => {
    clearGymPilotLocalData();
    setStartOnboarding(true);
  };

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
            <Route
              path="*"
              element={startOnboarding ? <Onboarding onBack={() => setStartOnboarding(false)} /> : <BackupRestore onNewUser={startFreshOnboarding} />}
            />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/workout/complete" element={<WorkoutComplete />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/plans" element={<WorkoutPlans />} />
            <Route path="/plans/reeval" element={<AIReeval />} />
            <Route path="/health" element={<Health />} />
            <Route path="/social" element={<Social />} />
            <Route path="/setup-ai" element={<AISetup />} />
            <Route path="/ai/intro" element={<AIIntro />} />
            <Route path="/ai" element={<AIChat />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
    </ThemeProvider>
  );
}
