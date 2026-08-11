import { useState } from 'react';
import { MaterialIcon } from '@/components/ui/MaterialIcon';

interface ExerciseImageProps {
  src?: string;
  alt: string;
  muscleGroup: string;
}

export function ExerciseImage({ src, alt, muscleGroup }: ExerciseImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="w-full h-44 rounded-xl bg-gradient-to-br from-primary-500/10 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <MaterialIcon name="star" className="text-primary-300" />
          <p className="text-xs text-white/30 mt-2">{muscleGroup}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-44 rounded-xl object-cover bg-dark-200"
    />
  );
}
