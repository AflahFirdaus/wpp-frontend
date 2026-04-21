import React from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0b141a]/90 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-300">
      <div
        className="bg-[#233138] rounded-[24px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] w-full max-w-[420px] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            {/* ICON HEADER */}
            <div className={`mb-6 p-5 rounded-full ${type === 'danger'
              ? 'bg-red-500/10 text-red-500 ring-4 ring-red-500/5'
              : 'bg-wa-green/10 text-wa-green ring-4 ring-wa-green/5'
              }`}>
              {type === 'danger' ? <AlertTriangle size={32} /> : <Info size={32} />}
            </div>

            {/* CONTENT */}
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
              {title}
            </h3>
            <p className="text-[#8696a0] text-[15px] leading-relaxed mb-10 px-4">
              {message}
            </p>

            {/* ACTIONS */}
            <div className="flex flex-col w-full gap-3">
              <button
                onClick={onConfirm}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-[16px] transition-all active:scale-[0.98] shadow-lg ${type === 'danger'
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                  : 'bg-wa-green hover:bg-[#00a884] shadow-wa-green/20'
                  }`}
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-3.5 rounded-xl text-[#aebac1] font-semibold text-[15px] hover:bg-white/5 transition-colors active:scale-[0.98]"
              >
                {cancelText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
