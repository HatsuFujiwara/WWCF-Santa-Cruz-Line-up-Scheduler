import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
  maxWidth?: string;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onClose,
  maxWidth = 'max-w-md',
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200 max-h-[90vh] my-auto flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            {isDanger && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />}
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children ? (
          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {children}
          </div>
        ) : (
          <>
            <div className="px-6 py-5 text-sm text-slate-600 dark:text-slate-300 overflow-y-auto flex-1 min-h-0">
              {message}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  if (typeof onConfirm === 'function') {
                    try {
                      onConfirm();
                    } catch (err) {
                      console.error('Error executing onConfirm callback:', err);
                    }
                  }
                  if (typeof onClose === 'function') {
                    onClose();
                  }
                }}
                className={`px-4 py-2 text-sm font-medium text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                  isDanger
                    ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
