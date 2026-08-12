import { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useProfileStore } from '@/stores/useProfileStore';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { clearGymPilotLocalData } from '@/utils/resetAppData';
import { syncActiveWorkoutFromBackend } from '@/lib/workoutEngine';

const Onboarding = lazy(() => import('@/pages/Onboarding').then((module) => ({ default: module.Onboarding })));
const BackupRestore = lazy(() => import('@/pages/BackupRestore').then((module) => ({ default: module.BackupRestore })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Workout = lazy(() => import('@/pages/Workout').then((module) => ({ default: module.Workout })));
const WorkoutComplete = lazy(() => import('@/pages/WorkoutComplete').then((module) => ({ default: module.WorkoutComplete })));
const Profile = lazy(() => import('@/pages/Profile').then((module) => ({ default: module.Profile })));
const WorkoutPlans = lazy(() => import('@/pages/WorkoutPlans').then((module) => ({ default: module.WorkoutPlans })));
const AIIntro = lazy(() => import('@/pages/AIIntro').then((module) => ({ default: module.AIIntro })));
const AIChat = lazy(() => import('@/pages/AIChat').then((module) => ({ default: module.AIChat })));
const AISetup = lazy(() => import('@/pages/AISetup').then((module) => ({ default: module.AISetup })));
const AIReeval = lazy(() => import('@/pages/AIReeval').then((module) => ({ default: module.AIReeval })));
const Health = lazy(() => import('@/pages/Health').then((module) => ({ default: module.Health })));
const Social = lazy(() => import('@/pages/Social').then((module) => ({ default: module.Social })));

function RouteFallback() {
  return (
    <div className="gym-page">
      <div className="card space-y-3">
        <div className="h-5 w-40 rounded-full bg-white/10 animate-pulse" />
        <div className="h-20 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

function AppStatusBadge() {
  return (
    <div className="fixed top-3 right-3 z-[120] pointer-events-none">
      <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-amber-200 backdrop-blur">
        BETA
      </span>
    </div>
  );
}

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

  useEffect(() => {
    if (!isOnboarded) return;
    const browserWindow = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const prefetch = () => {
      void import('@/pages/Workout');
      void import('@/pages/Health');
      void import('@/pages/Social');
      void import('@/pages/Profile');
      void import('@/pages/AIChat');
    };

    if (browserWindow.requestIdleCallback) {
      const handle = browserWindow.requestIdleCallback(prefetch);
      return () => {
        if (browserWindow.cancelIdleCallback) {
          browserWindow.cancelIdleCallback(handle);
        }
      };
    }

    const timeout = globalThis.setTimeout(prefetch, 1500);
    return () => globalThis.clearTimeout(timeout);
  }, [isOnboarded]);

  useEffect(() => {
    if (!isOnboarded) return;
    void syncActiveWorkoutFromBackend().catch(() => undefined);
  }, [isOnboarded]);

  if (showSplash) {
    return (
      <ThemeProvider>
        <AnimatePresence>
          <SplashScreen />
        </AnimatePresence>
        <AppStatusBadge />
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
              element={(
                <Suspense fallback={<RouteFallback />}>
                  {startOnboarding ? <Onboarding onBack={() => setStartOnboarding(false)} /> : <BackupRestore onNewUser={startFreshOnboarding} />}
                </Suspense>
              )}
            />
          </Routes>
        </HashRouter>
        <AppStatusBadge />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </HashRouter>
      <AppStatusBadge />
    </ThemeProvider>
  );
}
