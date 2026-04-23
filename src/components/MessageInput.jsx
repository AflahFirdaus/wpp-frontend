import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Plus, X, FileText, Image as ImageIcon, Film, File as FileIcon, Mic } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export const MessageInput = ({ onSend, onSendFile, disabled, replyingTo, cancelReply }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const emojiRef = useRef(null);
  const attachRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'; // Reset height briefly
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle Enter & Shift+Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() || selectedFile) {
        if (selectedFile) handleSendFile();
        else handleSubmit(e);
      }
    }
  };

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
      if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PERBAIKAN LOGIKA: Sertakan ID pesan yang dibalas saat mengirim
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      // Kirim pesan + ID pesan yang dibalas (jika ada)
      onSend(message, replyingTo?.id?._serialized || replyingTo?.id);
      setMessage('');
      if (cancelReply) cancelReply(); // Tutup preview balasan otomatis setelah kirim
    }
  };

  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setShowAttach(false);

    const sizeStr = formatSize(file.size);
    if (file.type.startsWith('image/')) {
      setFilePreview({ type: 'image', url: URL.createObjectURL(file), name: file.name, size: sizeStr });
    } else if (file.type.startsWith('video/')) {
      setFilePreview({ type: 'video', url: URL.createObjectURL(file), name: file.name, size: sizeStr });
    } else {
      setFilePreview({ type: 'document', name: file.name, size: sizeStr });
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || sending) return;
    setSending(true);
    try {
      // PERBAIKAN: Sertakan ID pesan yang dibalas saat kirim file
      await onSendFile(selectedFile, message, replyingTo?.id?._serialized || replyingTo?.id);
      setSelectedFile(null);
      setFilePreview(null);
      setMessage('');
      if (cancelReply) cancelReply();
    } catch (err) {
      console.error("Error sending file:", err);
    } finally {
      setSending(false);
    }
  };

  const cancelFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext)) return <FileText size={32} className="text-[#ff6b6b]" />;
    return <FileIcon size={32} className="text-[#8696a0]" />;
  };

  return (
    <div className="flex flex-col w-full bg-transparent relative pt-2">
      
      {/* FLOATING PREVIEW AREA */}
      <div className="px-3 md:px-5 flex flex-col gap-2">
        {/* REPLY PREVIEW - Tampilan pesan yang sedang dibalas */}
        {replyingTo && (
          <div className="bg-wa-input-bg border-l-4 border-wa-green px-4 py-2.5 rounded-xl flex items-start justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 min-w-0">
              <p className="text-wa-green text-[13.5px] font-semibold mb-0.5 truncate">
                {replyingTo.fromMe ? 'Anda' : (replyingTo.pushname || replyingTo.from || 'Seseorang')}
              </p>
              <p className="text-wa-secondary text-[13px] truncate flex items-center gap-1.5">
                {replyingTo.body || replyingTo.text || 'Media'}
              </p>
            </div>
            <button onClick={cancelReply} className="text-wa-secondary hover:text-wa-text p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>
        )}

        {/* FILE PREVIEW */}
        {filePreview && (
          <div className="bg-wa-input-bg rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm border border-wa-border animate-in slide-in-from-bottom-2 duration-200 transition-colors">
            <div className="w-[50px] h-[50px] rounded-lg overflow-hidden bg-wa-panel flex items-center justify-center shrink-0 shadow-inner">
              {filePreview.type === 'image' ? (
                <img src={filePreview.url} alt="preview" className="w-full h-full object-cover" />
              ) : filePreview.type === 'video' ? (
                <Film size={24} className="text-[#53bdeb]" />
              ) : (
                getFileIcon(filePreview.name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-wa-text text-[14.5px] truncate font-medium">{filePreview.name}</p>
              <p className="text-wa-secondary text-[12.5px] mt-0.5 font-medium">{filePreview.size}</p>
            </div>
            <button onClick={cancelFile} className="text-wa-secondary hover:text-[#ff6b6b] p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              <X size={22} />
            </button>
          </div>
        )}
      </div>

      {/* CONTAINER INPUT UTAMA */}
      <div className="bg-wa-panel border-t border-wa-border shrink-0 z-30 transition-colors duration-300">
        <form
          onSubmit={selectedFile ? (e) => { e.preventDefault(); handleSendFile(); } : handleSubmit}
          className="flex items-end gap-3 w-full max-w-[1400px] mx-auto"
          style={{ paddingLeft: '16px', paddingRight: '24px', paddingTop: '10px', paddingBottom: '12px' }}
        >
          <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileSelect} className="hidden" />

          <div 
            className="flex-1 bg-wa-input-bg rounded-[24px] flex items-center min-h-[44px] shadow-sm transition-all focus-within:bg-wa-input-focus border border-transparent focus-within:border-wa-green/20"
            style={{ paddingLeft: '8px', paddingRight: '12px' }}
          >
            <div className="flex items-center text-wa-secondary shrink-0">
              <div ref={emojiRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
                  className={`w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors ${showEmoji ? 'text-wa-green' : ''}`}
                >
                  <Smile size={24} strokeWidth={1.5} />
                </button>
                {showEmoji && (
                  <div className="absolute bottom-14 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-wa-border">
                    <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} width={320} height={400} searchPlaceholder="Cari emoji..." previewConfig={{ showPreview: false }} skinTonesDisabled />
                  </div>
                )}
              </div>

              <div ref={attachRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
                  className={`w-10 h-10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all duration-300 ${showAttach ? 'text-wa-text bg-black/5 dark:bg-white/10 rotate-45' : ''}`}
                >
                  <Plus size={26} strokeWidth={1.5} />
                </button>
                
                {showAttach && (
                  <div 
                    className="absolute bottom-14 left-0 z-50 bg-wa-panel rounded-2xl shadow-2xl border border-wa-border animate-in slide-in-from-bottom-2 duration-200"
                    style={{ width: '220px', padding: '8px' }}
                  >
                    {[
                      { icon: <ImageIcon size={20} />, label: 'Foto', color: 'from-blue-500 to-blue-600', type: 'image/*' },
                      { icon: <Film size={20} />, label: 'Video', color: 'from-pink-500 to-pink-600', type: 'video/*' },
                      { icon: <FileText size={20} />, label: 'Dokumen', color: 'from-indigo-500 to-indigo-600', type: '*/*' }
                    ].map((item, i) => (
                      <button 
                        key={i}
                        type="button" 
                        onClick={() => { fileInputRef.current.accept = item.type; fileInputRef.current.click(); setShowAttach(false); }} 
                        className="flex items-center gap-4 w-full p-3 hover:bg-wa-hover rounded-xl transition-colors group text-left"
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                          <span className="text-white">{item.icon}</span>
                        </div>
                        <span className="text-wa-text text-[15px] font-medium">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 h-full py-2 flex items-center">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={selectedFile ? "Tambahkan caption..." : "Ketik pesan..."}
                className="w-full bg-transparent border-none outline-none text-wa-text placeholder:text-wa-secondary text-[15px] leading-normal custom-scrollbar resize-none"
                style={{ paddingLeft: '8px', paddingRight: '8px', minHeight: '24px', maxHeight: '120px' }}
                rows={1}
              />
            </div>
          </div>

          <div className="shrink-0 mb-[1px]">
            {(message.trim() || selectedFile) ? (
              <button
                type="submit"
                disabled={disabled || sending}
                className={`w-[46px] h-[46px] rounded-full bg-wa-green text-white flex items-center justify-center shadow-lg transition-all ${sending ? 'opacity-50' : 'hover:scale-105 active:scale-95 hover:brightness-110'}`}
              >
                <Send size={20} strokeWidth={2.5} style={{ marginLeft: '3px' }} />
              </button>
            ) : (
              <button
                type="button"
                className="w-[46px] h-[46px] rounded-full bg-wa-green text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Mic size={22} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};