import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
              : toast.type === 'danger'
              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
              : 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
            {toast.type === 'danger' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
