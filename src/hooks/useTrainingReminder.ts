import { useEffect } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { getTodayWeekDay, getToday } from '@/utils/date';

export function useTrainingReminder() {
  const profile = useProfileStore((s) => s.profile);
  const sessions = useHistoryStore((s) => s.sessions);

  useEffect(() => {
    if (!profile || !('Notification' in window)) return;

    const today = getTodayWeekDay();
    const isTrainingDay = profile.trainingDays.includes(today);
    if (!isTrainingDay) return;

    const todayStr = getToday();
    const alreadyTrained = sessions.some((s) => s.date === todayStr && s.completedAt);
    if (alreadyTrained) return;

    const alreadyNotified = sessionStorage.getItem(`fitflow-reminder-${todayStr}`);
    if (alreadyNotified) return;

    if (Notification.permission === 'granted') {
      sendReminder();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') sendReminder();
      });
    }

    sessionStorage.setItem(`fitflow-reminder-${todayStr}`, '1');
  }, [profile, sessions]);
}

function sendReminder() {
  // Schedule notification for later (simulate with a 2-hour delay if app stays open)
  // For now, show immediate reminder that today is training day
  try {
    new Notification('GymPilot ', {
      body: 'Hoje é dia de treino! Bora se dedicar? ',
      icon: '/fitflow/icons/icon-192.png',
      badge: '/fitflow/icons/icon-192.png',
      tag: 'training-reminder',
    });
  } catch {}
}
