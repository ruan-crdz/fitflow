import { useRef } from 'react';
import { WORKOUT_MAP } from '@/constants/workouts';
import { formatDuration } from '@/utils/date';
import type { WorkoutType } from '@/types';

interface ShareCardProps {
  workoutType: WorkoutType;
  durationMs: number;
  rating?: number;
}

export function ShareCard({ workoutType, durationMs, rating }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const workout = WORKOUT_MAP[workoutType];

  const handleShare = async () => {
    if (!cardRef.current) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      const blob = await new Promise<Blob>((resolve) =>
        canvas.toBlob((b) => resolve(b!), 'image/png')
      );

      if (navigator.share && navigator.canShare({ files: [new File([blob], 'gympilot.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'gympilot-treino.png', { type: 'image/png' })],
          title: 'GymPilot',
 text: `${workout.label} concluído! `,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gympilot-treino.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silently fail - user can screenshot instead
    }
  };

  return (
    <div className="space-y-3 w-full max-w-sm">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl p-6 text-center"
        style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-darker-rgb)), rgb(var(--color-bg-rgb)))' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 20%, rgb(var(--color-primary-rgb)), transparent 50%)' }} />
        <div className="relative space-y-3">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Treino Concluído</p>
          <h2 className="text-2xl font-bold">{workout.label}</h2>
          <p className="text-white/60 text-sm">{workout.focus}</p>
          <div className="flex justify-center gap-6 py-3">
            <div>
              <p className="text-xl font-bold">{formatDuration(durationMs)}</p>
              <p className="text-[10px] text-white/40">Duração</p>
            </div>
            {rating && (
              <div>
                <p className="text-xl">{'⭐'.repeat(rating)}</p>
                <p className="text-[10px] text-white/40">Avaliação</p>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-white/10">
 <p className="text-[10px] text-white/30">GymPilot </p>
          </div>
        </div>
      </div>
      <button
        onClick={handleShare}
        className="w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm font-medium"
      >
 Compartilhar nos Stories
      </button>
    </div>
  );
}
