import { useState, useEffect } from 'react';
import { MOTIVATIONAL_QUOTES } from '@/constants/motivational';

export function useMotivationalQuote(intervalMs = 12000) {
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length),
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return MOTIVATIONAL_QUOTES[index];
}
