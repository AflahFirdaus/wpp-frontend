import React from 'react';
import { X } from 'lucide-react';

export const QrModal = ({ qrData, onClose }) => {
  if (!qrData) return null;

  return (
    <div className="fixed inset-0 bg-[#0b141a]/95 flex items-center justify-center z-50 p-4 sm:p-6 md:p-10">

      {/* CONTAINER */}
      <div className="
        bg-[#202c33]
        rounded-xl
        shadow-2xl
        w-full
        max-w-[1040px]
        min-h-[520px]
        p-10 md:p-14 lg:p-[72px]
        flex flex-col md:flex-row
        items-center justify-center
        gap-10 md:gap-20 lg:gap-32
        relative
      ">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#8696a0] hover:text-[#e9edef] transition"
        >
          <X size={26} strokeWidth={1.5} />
        </button>

        {/* ===================== */}
        {/* TEXT SECTION */}
        {/* ===================== */}
        <div className="flex-1 max-w-[480px]">

          <h1 className="
            text-[26px] md:text-[28px] lg:text-[32px]
            font-light
            mb-8 md:mb-10
            text-[#e9edef]
            tracking-wide
          ">
            Gunakan WhatsApp di komputer Anda
          </h1>

          <ol className="
            space-y-5 md:space-y-6
            text-[16px] md:text-[18px]
            text-[#d1d7db]
            leading-relaxed
          ">
            <li className="flex gap-4">
              <span className="text-[#e9edef] font-medium">1.</span>
              <span>Buka WhatsApp di telepon Anda</span>
            </li>

            <li className="flex gap-4 items-center">
              <span className="text-[#e9edef] font-medium self-start">2.</span>
              <span className="inline-flex flex-wrap items-center gap-1.5">
                Ketuk <strong>Menu</strong> atau <strong>Pengaturan</strong> lalu pilih <strong>Perangkat tertaut</strong>
              </span>
            </li>

            <li className="flex gap-4">
              <span className="text-[#e9edef] font-medium">3.</span>
              <span>Ketuk <strong>Tautkan perangkat</strong></span>
            </li>

            <li className="flex gap-4">
              <span className="text-[#e9edef] font-medium">4.</span>
              <span>Arahkan kamera ke QR untuk memindai</span>
            </li>
          </ol>

          <div className="mt-12 md:mt-16">
            <button className="text-[#00a884] hover:underline text-[15px]">
              Tautkan dengan nomor telepon
            </button>
          </div>

        </div>

        {/* ===================== */}
        {/* QR SECTION */}
        {/* ===================== */}
        <div className="flex-none flex justify-center">

          <div className="bg-white p-3 rounded-lg shadow-sm relative">
            <img
              src={qrData}
              alt="QR Code"
              className="w-[264px] h-[264px] object-contain"
            />

            {/* LOGO WA */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1 rounded-full">
                <svg viewBox="0 0 32 32" width="32" height="32" className="text-[#25D366]">
                  <path fill="currentColor" d="M16 0c-8.837 0-16 7.163-16 16 0 2.825.737 5.488 2.05 7.825l-2.05 7.5 7.688-2.012c2.288 1.188 4.888 1.85 7.65 1.85 8.838 0 16-7.162 16-16s-7.162-16-16-16zm8.138 23.013c-.35.988-2.025 1.9-2.825 1.988-.738.087-1.638.25-5.325-1.275-4.45-1.85-7.375-6.388-7.6-6.688-.225-.3-1.825-2.425-1.825-4.638s1.163-3.3 1.588-3.738c.413-.438.9-.55 1.2-.55s.6-.012.863-.012c.262 0 .625-.1.975.763.362.887 1.225 3.012 1.338 3.237.112.225.187.487.037.787-.137.3-.225.488-.45.738-.225.262-.463.562-.663.787-.225.25-.463.513-.2.963.263.45 1.163 1.925 2.5 3.113 1.725 1.538 3.175 2.013 3.638 2.225.463.212.738.175 1.013-.138.275-.313 1.188-1.375 1.513-1.85.312-.475.625-.4.1038-.2.412.213 2.613 1.238 3.063 1.463.45.225.75.337.863.525.112.187.112 1.062-.238 2.05z" />
                </svg>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};