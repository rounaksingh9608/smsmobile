'use client';

import { useState, useEffect } from 'react';

type ToastEvent = {
  detail: {
    message: string;
    type?: 'success' | 'error' | 'info';
  };
};

export function ToastProvider() {
  const [toast, setToast] = useState<{ message: string, type: string } | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      setToast({ message: e.detail.message, type: e.detail.type || 'success' });
      setTimeout(() => setToast(null), 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100] px-4 w-full max-w-sm pointer-events-none transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-5">
      <div className={`shadow-lg rounded-xl p-4 flex items-center gap-3 w-full border ${
        toast.type === 'error' ? 'bg-error-container text-on-error-container border-error/20' : 
        toast.type === 'info' ? 'bg-primary-container text-on-primary-container border-primary/20' :
        'bg-surface-container-highest text-on-surface border-border-low'
      }`}>
        <span className="material-symbols-outlined shrink-0 text-xl">
          {toast.type === 'error' ? 'error' : toast.type === 'info' ? 'info' : 'check_circle'}
        </span>
        <p className="font-body-md font-medium flex-1">{toast.message}</p>
      </div>
    </div>
  );
}

export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-toast', { detail: { message, type } });
    window.dispatchEvent(event);
  }
};
