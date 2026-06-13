import { useEffect, useRef } from 'react';
import { useGearStore } from '@/store/useGearStore';

export function useAnimation() {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isPlaying = useGearStore((s) => s.isPlaying);
  const tick = useGearStore((s) => s.tick);
  const validation = useGearStore((s) => s.validation);

  useEffect(() => {
    if (!isPlaying || !validation.isValid) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      tick(delta);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, validation.isValid, tick]);
}
