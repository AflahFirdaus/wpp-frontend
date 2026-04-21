import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, ShieldCheck, Zap } from 'lucide-react';

export const AddSessionModal = ({ isOpen, onClose, onSubmit }) => {
  const [sessionName, setSessionName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (sessionName.trim()) {
      onSubmit(sessionName.trim().replace(/\s+/g, '-').toLowerCase());
      setSessionName('');
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-500 px-6"
      onClick={onClose}
    >
      <div 
        className="bg-[#202c33] w-full max-w-[480px] rounded-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7)] border border-white/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '32px 40px' }} // Padding samping tetap aman, atas bawah dikurangi sedikit
      >
        {/* Header Section */}
        <div className="relative mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-wa-green/10 p-2 rounded-none text-wa-green border border-wa-green/20">
              <Smartphone size={24} strokeWidth={1.5} />
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="text-wa-secondary hover:text-white p-1 hover:bg-white/5 rounded-none transition-all group"
            >
              <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          <h2 className="text-[22px] font-bold text-white tracking-tight leading-tight uppercase">
            Tambah Sesi Baru
          </h2>
          <p className="text-wa-secondary text-[13.5px] mt-2 opacity-60 leading-relaxed">
            Hubungkan akun WhatsApp Anda dengan mudah.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <label className="text-[10px] text-wa-green font-bold uppercase tracking-[0.2em] ml-0.5">
              Identitas Sesi
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Misal: cs-admin-1"
                className="w-full bg-[#111b21] border border-white/10 text-white rounded-none px-4 py-3.5 outline-none focus:border-wa-green/50 transition-all text-[14.5px] placeholder:text-wa-secondary/20 font-medium"
              />
              {sessionName.trim() && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-wa-green animate-in fade-in zoom-in">
                  <ShieldCheck size={16} />
                </div>
              )}
            </div>
          </div>

          {/* Info Box - Diberi gap agar tidak nempel ke input */}
          <div className="bg-black/30 p-5 rounded-none border border-white/[0.03]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-wa-green" />
              <span className="text-white/80 text-[11px] font-bold uppercase tracking-wider">Saran Format</span>
            </div>
            <p className="text-[12px] text-wa-secondary leading-relaxed italic opacity-80">
              Gunakan huruf kecil dan tanda hubung (-). <br/>
              Contoh: <span className="text-wa-green font-semibold not-italic">layanan-pelanggan</span>
            </p>
          </div>

          {/* Footer Buttons - Diberi margin top agar tidak nempel ke info box */}
          <div className="flex items-center justify-end gap-5 mt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="text-wa-secondary font-bold hover:text-white transition-colors text-[12px] uppercase tracking-[0.1em]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!sessionName.trim()}
              className={`px-7 py-3 rounded-none font-black transition-all uppercase tracking-widest text-[12px] ${
                sessionName.trim() 
                ? 'bg-wa-green text-white shadow-lg hover:brightness-110 active:scale-[0.97]' 
                : 'bg-[#3b4a54] text-wa-secondary cursor-not-allowed opacity-30'
              }`}
            >
              Buat Sesi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};