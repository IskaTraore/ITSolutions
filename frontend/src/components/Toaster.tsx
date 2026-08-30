"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToasterContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToasterContext = createContext<ToasterContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToasterContext);
}

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToasterContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[360px] max-w-[calc(100vw-32px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass-strong p-4 rounded-xl text-sm border-l-[3px] fade-in-up ${
              t.type === "success"
                ? "border-l-[var(--status-active)]"
                : t.type === "error"
                  ? "border-l-[var(--status-expired)]"
                  : "border-l-[var(--status-info)]"
            }`}
            role="status"
          >
            <span
              className={
                t.type === "success"
                  ? "text-[var(--status-active)]"
                  : t.type === "error"
                    ? "text-[var(--status-expired)]"
                    : "text-[var(--status-info)]"
              }
            >
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}
