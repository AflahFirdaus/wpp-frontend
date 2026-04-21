import React from 'react';
import { X, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';

export const MediaPreview = ({ isOpen, onClose, mediaUrl, type, fileName, onDownload }) => {
  if (!isOpen) return null;

  const isImage = type === 'image' || (mediaUrl && mediaUrl.startsWith('data:image/'));
  const isVideo = type === 'video' || (mediaUrl && mediaUrl.startsWith('data:video/'));

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      {/* HEADER */}
      <header className="h-16 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent z-10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-[#aebac1] hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[#e9edef] text-[15px] font-medium truncate">
              {fileName}
            </span>
            <span className="text-[#aebac1] text-[12px]">
              {isImage ? 'Foto' : isVideo ? 'Video' : 'Media'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              onDownload(e);
            }}
            className="p-2.5 bg-wa-green/20 hover:bg-wa-green/30 text-wa-green rounded-full transition-all flex items-center gap-2"
            title="Download Original"
          >
            <Download size={20} />
            <span className="text-[14px] font-semibold pr-1">Download</span>
          </button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden p-4 md:p-8">
        <div className="max-w-full max-h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
          {isImage ? (
            <img 
              src={mediaUrl} 
              alt={fileName} 
              className="max-w-full max-h-[calc(100vh-140px)] object-contain shadow-2xl rounded-sm"
            />
          ) : isVideo ? (
            <video 
              src={mediaUrl} 
              controls 
              autoPlay
              className="max-w-full max-h-[calc(100vh-140px)] shadow-2xl rounded-sm outline-none"
            />
          ) : (
            <div className="text-[#aebac1] flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <X size={40} />
              </div>
              <p>Format media tidak didukung untuk pratinjau</p>
              <button 
                onClick={onDownload}
                className="px-6 py-2 bg-wa-green text-white rounded-lg font-bold"
              >
                Unduh File
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FOOTER / INFO (Optional) */}
      <footer className="h-20 flex items-center justify-center px-6 bg-gradient-to-t from-black/60 to-transparent z-10 shrink-0">
        <p className="text-[#aebac1] text-[13px] opacity-60">
          Terenkripsi secara end-to-end
        </p>
      </footer>
    </div>
  );
};
