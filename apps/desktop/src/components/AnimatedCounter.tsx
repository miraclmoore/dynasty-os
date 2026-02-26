import React, { useEffect, useState } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

/**
 * Counts up from 0 to `value` with a spring animation on mount or value change.
 */
export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 120, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on('change', (v) => setDisplay(Math.round(v)));
  }, [springValue]);

  return <span className={className}>{display}</span>;
}
