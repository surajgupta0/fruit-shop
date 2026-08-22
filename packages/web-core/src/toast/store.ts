type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

function push(kind: ToastKind, message: string) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    message,
  };
  toasts = [...toasts, item];
  emit();
  if (typeof window !== "undefined") {
    window.setTimeout(() => toast.dismiss(item.id), 4000);
  }
  return item.id;
}

export const toast = {
  success(message: string) {
    return push("success", message);
  },
  error(message: string) {
    return push("error", message);
  },
  info(message: string) {
    return push("info", message);
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  clear() {
    toasts = [];
    emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(toasts);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot() {
    return toasts;
  },
};
