"use client";

import { useState, useCallback, useEffect, useRef, type FC } from "react";
import { createElement } from "react";
import { Confetti } from "@/components/ui/animations/Confetti";

interface ConfettiOptions {
  origin?: { x: number; y: number };
}

interface ConfettiInstance {
  id: number;
  options: ConfettiOptions;
}

export function useConfetti(): {
  triggerConfetti: (options?: ConfettiOptions) => void;
  ConfettiPortal: FC;
} {
  const [instances, setInstances] = useState<ConfettiInstance[]>([]);
  const nextId = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerConfetti = useCallback((options: ConfettiOptions = {}) => {
    const id = nextId.current++;
    setInstances((prev) => [...prev, { id, options }]);
  }, []);

  const removeInstance = useCallback((id: number) => {
    if (mountedRef.current) {
      setInstances((prev) => prev.filter((inst) => inst.id !== id));
    }
  }, []);

  const ConfettiPortal: FC = useCallback(() => {
    return createElement(
      "div",
      { "data-confetti-portal": true },
      ...instances.map((inst) =>
        createElement(Confetti, {
          key: inst.id,
          origin: inst.options.origin,
          onDone: () => removeInstance(inst.id),
        }),
      ),
    );
  }, [instances, removeInstance]);

  return { triggerConfetti, ConfettiPortal };
}
