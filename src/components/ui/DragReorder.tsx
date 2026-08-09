"use client";

import { Reorder, useDragControls } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

interface DragReorderProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string | number;
  className?: string;
}

export function DragReorder<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  className,
}: DragReorderProps<T>) {
  const reduced = useReducedMotion();

  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={className}
      layout={reduced ? undefined : "position"}
    >
      {items.map((item, index) => (
        <DragReorderItem
          key={keyExtractor(item)}
          item={item}
          reduced={reduced}
        >
          {renderItem(item, index)}
        </DragReorderItem>
      ))}
    </Reorder.Group>
  );
}

interface DragReorderItemProps<T> {
  item: T;
  reduced: boolean;
  children: ReactNode;
}

function DragReorderItem<T>({
  item,
  reduced,
  children,
}: DragReorderItemProps<T>) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      layout={reduced ? undefined : "position"}
      whileDrag={reduced ? undefined : { scale: 1.02, boxShadow: "0 8px 25px rgba(0,0,0,0.15)" }}
      className="relative"
    >
      <div className="flex items-center gap-2">
        <button
          onPointerDown={(e) => controls.start(e)}
          className="touch-none cursor-grab active:cursor-grabbing p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </Reorder.Item>
  );
}
