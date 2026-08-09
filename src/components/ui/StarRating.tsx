import { useState } from 'react';

interface StarRatingProps {
  value?: number;
  onChange: (rating: number) => void;
}

export function StarRating({ value = 0, onChange }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="text-4xl transition-transform active:scale-90"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
        >
          {star <= (hover || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}
