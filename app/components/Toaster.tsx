"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" };

let nextId = 1;
let listeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, kind: "success" | "error" = "success") {
  const toast: Toast = { id: nextId++, message, kind };
  for (const listen of listeners) listen(toast);
}

/**
 * Mounted once at the app root (see app/layout.tsx). Call showToast(...)
 * from anywhere to push a toast — no provider/context wiring needed, same
 * pattern as NavProgress's startNavProgress().
 */
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function onToast(toast: Toast) {
      setToasts((t) => [...t, toast]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== toast.id));
      }, 3500);
    }
    listeners.push(onToast);
    return () => {
      listeners = listeners.filter((l) => l !== onToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
