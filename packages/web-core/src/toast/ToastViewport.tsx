"use client";

import { useEffect, useState } from "react";

import { toast, type ToastItem } from "./store";

const kindStyles: Record<ToastItem["kind"], string> = {
  success: "bg-emerald-700 text-white",
  error: "bg-rose-700 text-white",
  info: "bg-slate-800 text-white",
};

export function ToastViewport() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm shadow-lg ${kindStyles[item.kind]}`}
          role="status"
        >
          <div className="flex items-start gap-3">
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              className="opacity-80 hover:opacity-100"
              onClick={() => toast.dismiss(item.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export { toast };
