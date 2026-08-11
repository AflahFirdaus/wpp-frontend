import React from 'react';
import { X, ShieldCheck, RefreshCw } from 'lucide-react';

export const QrModal = ({ qrData, onClose }) => {
  if (!qrData) return null;

  return (
    <div className="fixed inset-0 bg-[#0b141a]/95 backdrop-blur-xl flex items-center justify-center z-[600] p-6">
      
      {/* MAIN MODAL CONTAINER - Reduced max-width */}
      <div className="
        bg-[#202c33]
        rounded-2xl
        shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]
        w-full
        max-w-[880px]
        flex flex-col md:flex-row
        overflow-hidden
        relative
        animate-in zoom-in-95 duration-500
      ">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-wa-secondary hover:text-white transition-all p-2 hover:bg-white/5 rounded-full z-10"
        >
          <X size={22} />
        </button>

        {/* LEFT SECTION: INSTRUCTIONS - Forced Padding */}
        <div 
          className="flex-1 flex flex-col justify-center" 
          style={{ padding: '60px 80px' }}
        >
          <h1 className="text-[24px] md:text-[28px] font-light text-white mb-10 tracking-wide leading-tight">
            Gunakan WhatsApp di komputer Anda
          </h1>

          <div className="space-y-6">
            {[
              { step: '1', text: 'Buka WhatsApp di telepon Anda' },
              { step: '2', text: 'Ketuk Menu atau Pengaturan lalu pilih Perangkat tertaut' },
              { step: '3', text: 'Ketuk Tautkan perangkat' },
              { step: '4', text: 'Tunggu sekitar 5-10 detik agar QR Code terbaru ter-render' },
              { step: '5', text: 'Arahkan kamera ke layar ini untuk memindai' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <span className="text-wa-green font-bold text-[16px] min-w-[20px]">
                  {item.step}.
                </span>
                <p className="text-[15px] md:text-[16px] text-wa-secondary leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-2.5 text-wa-green/70">
            <ShieldCheck size={16} />
            <span className="text-[12px] font-bold uppercase tracking-[0.15em]">
              Sistem Terenkripsi & Aman
            </span>
          </div>
        </div>

        {/* RIGHT SECTION: QR VISUALS */}
        <div className="w-full md:w-[360px] bg-[#111b21]/40 flex flex-col items-center justify-center p-10 relative border-l border-white/[0.03]">
          
          <div className="relative">
            {/* QR Container: High Contrast white background and white border for maximum scannability */}
            <div className="bg-white p-8 rounded-[4px] shadow-[0_0_100px_rgba(0,0,0,0.5)] relative border-[8px] border-white">
              {qrData ? (
                <div className="bg-white">
                   <img
                    src={qrData}
                    alt="QR Code"
                    className="w-[280px] h-[280px] object-contain animate-in fade-in duration-700"
                  />
                </div>
              ) : (
                <div className="w-[280px] h-[280px] flex flex-col items-center justify-center bg-[#f0f2f5] gap-4">
                  <RefreshCw className="text-wa-green animate-spin" size={40} strokeWidth={1.5} />
                  <span className="text-[12px] text-wa-secondary font-bold uppercase tracking-[0.2em]">Menyiapkan QR</span>
                </div>
              )}

              {/* FLOATING LOGO
              {qrData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white p-1 shadow-md border border-black/5">
                    <svg viewBox="0 0 32 32" width="26" height="26" className="text-[#25D366]">
                      <path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825.737 5.488 2.05 7.825l-2.05 7.5 7.688-2.012c2.288 1.188 4.888 1.85 7.65 1.85 8.838 0 16-7.162 16-16s-7.162-16-16-16zm8.138 23.013c-.35.988-2.025 1.9-2.825 1.988-.738.087-1.638.25-5.325-1.275-4.45-1.85-7.375-6.388-7.6-6.688-.225-.3-1.825-2.425-1.825-4.638s1.163-3.3 1.588-3.738c.413-.438.9-.55 1.2-.55s.6-.012.863-.012c.262 0 .625-.1.975.763.362.887 1.225 3.012 1.338 3.237.112.225.187.487.037.787-.137.3-.225.488-.45.738-.225.262-.463.562-.663.787-.225.25-.463.513-.2.963.263.45 1.163 1.925 2.5 3.113 1.725 1.538 3.175 2.013 3.638 2.225.463.212.738.175 1.013-.138.275-.313 1.188-1.375 1.513-1.85.312-.475.625-.4.1038-.2.412.213 2.613 1.238 3.063 1.463.45.225.75.337.863.525.112.187.112 1.062-.238 2.05z" />
                    </svg>
                  </div>
                </div>
              )} */}
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-wa-secondary text-[12px] leading-relaxed italic opacity-70 max-w-[240px]">
              Jangan tutup halaman ini sampai proses penautan selesai.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};