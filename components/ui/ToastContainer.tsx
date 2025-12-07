
import React from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { Icon } from '../Icons';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = usePlayer();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border border-white/10
            animate-[fadeIn_0.3s_ease-out]
            ${toast.type === 'error' ? 'bg-red-500/90 text-white' : toast.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-slate-800/90 text-white'}
          `}
          onClick={() => removeToast(toast.id)}
        >
          {toast.type === 'success' && <Icon.Check className="w-5 h-5" />}
          {toast.type === 'error' && <Icon.X className="w-5 h-5" />}
          {toast.type === 'info' && <Icon.Terminal className="w-5 h-5" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
