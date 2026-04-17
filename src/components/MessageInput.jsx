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

  // Close popups on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
      if (attachRef.current && !attachRef.current.contains(e.target)) setShowAttach(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
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

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreview({ type: 'image', url, name: file.name, size: formatSize(file.size) });
    } else if (file.type.startsWith('video/')) {
      setFilePreview({ type: 'video', url: URL.createObjectURL(file), name: file.name, size: formatSize(file.size) });
    } else {
      setFilePreview({ type: 'document', name: file.name, size: formatSize(file.size) });
    }
  };

  const handleSendFile = async () => {
    if (!selectedFile || sending) return;
    setSending(true);
    try {
      await onSendFile(selectedFile, message);
      setSelectedFile(null);
      setFilePreview(null);
      setMessage('');
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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return <ImageIcon size={32} className="text-[#00a884]" />;
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return <Film size={32} className="text-[#53bdeb]" />;
    if (['pdf'].includes(ext)) return <FileText size={32} className="text-[#ff6b6b]" />;
    return <FileIcon size={32} className="text-[#8696a0]" />;
  };

  const fileAccept = "*/*";

  return (
    // DI SINI PERUBAHANNYA: bg-[#202c33] diubah jadi bg-transparent
    <div className="flex flex-col w-full bg-transparent relative pt-2">
      
      {/* FLOATING PREVIEW AREA (REPLY & FILES) */}
      <div className="px-3 md:px-5 flex flex-col gap-2">
        {/* REPLY PREVIEW */}
        {replyingTo && (
          <div className="bg-[#2a3942] border-l-4 border-[#00a884] px-4 py-2.5 rounded-xl flex items-start justify-between gap-4 shadow-sm animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 min-w-0">
              <p className="text-[#00a884] text-[13.5px] font-semibold mb-0.5 truncate">
                {replyingTo.fromMe ? 'Anda' : (replyingTo.author || replyingTo.from || 'Seseorang')}
              </p>
              <p className="text-[#8696a0] text-[13px] truncate flex items-center gap-1.5">
                {(replyingTo.type === 'image' || (replyingTo.mimetype && replyingTo.mimetype.includes('image'))) && <ImageIcon size={14} />}
                {(replyingTo.type === 'video' || (replyingTo.mimetype && replyingTo.mimetype.includes('video'))) && <Film size={14} />}
                {replyingTo.type === 'document' && <FileText size={14} />}
                {replyingTo.body || replyingTo.text || replyingTo.content || (replyingTo.caption && replyingTo.caption) || 'Media'}
              </p>
            </div>
            <button onClick={cancelReply} className="text-[#8696a0] hover:text-[#e9edef] p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0 mt-0.5">
              <X size={18} />
            </button>
          </div>
        )}

        {/* FILE PREVIEW */}
        {filePreview && (
          <div className="bg-[#2a3942] rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm border border-white/5 animate-in slide-in-from-bottom-2 duration-200">
            <div className="w-[50px] h-[50px] rounded-lg overflow-hidden bg-[#1f2c33] flex items-center justify-center shrink-0 shadow-inner">
              {filePreview.type === 'image' ? (
                <img src={filePreview.url} alt="preview" className="w-full h-full object-cover" />
              ) : filePreview.type === 'video' ? (
                <Film size={24} className="text-[#53bdeb]" />
              ) : (
                getFileIcon(filePreview.name)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#e9edef] text-[14.5px] truncate font-medium">{filePreview.name}</p>
              <p className="text-[#8696a0] text-[12.5px] mt-0.5 font-medium">{filePreview.size}</p>
            </div>
            <button onClick={cancelFile} className="text-[#8696a0] hover:text-[#ff6b6b] p-2 hover:bg-white/5 rounded-full transition-colors">
              <X size={22} />
            </button>
          </div>
        )}
      </div>

      {/* MAIN INPUT AREA */}
      <form
        onSubmit={selectedFile ? (e) => { e.preventDefault(); handleSendFile(); } : handleSubmit}
        className="px-4 py-3 bg-transparent flex items-center gap-3 shrink-0 w-full z-20"
      >
        <input ref={fileInputRef} type="file" accept={fileAccept} onChange={handleFileSelect} className="hidden" />

        {/* THE PILL: Combined Input & Tools */}
        <div className="flex-1 bg-[#2a3942] rounded-[24px] flex items-center h-[44px] px-2 shadow-sm transition-all focus-within:bg-[#2c3c45]">
          
          {/* Left Tools (Emoji & Attach) inside the pill */}
          <div className="flex items-center text-[#8696a0] shrink-0 h-full">
            {/* EMOJI BUTTON */}
            <div ref={emojiRef} className="relative flex items-center justify-center h-full">
              <button
                type="button"
                onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
                className={`w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors ${showEmoji ? 'text-[#00a884]' : ''}`}
              >
                <Smile size={24} strokeWidth={1.5} />
              </button>
              {showEmoji && (
                <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                  <EmojiPicker theme={Theme.DARK} onEmojiClick={onEmojiClick} width={320} height={400} searchPlaceholder="Cari emoji..." previewConfig={{ showPreview: false }} skinTonesDisabled lazyLoadEmojis />
                </div>
              )}
            </div>

            {/* ATTACH BUTTON */}
            <div ref={attachRef} className="relative flex items-center justify-center h-full">
              <button
                type="button"
                onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
                className={`w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full transition-all duration-300 ${showAttach ? 'text-[#e9edef] bg-white/10 rotate-45' : ''}`}
              >
                <Plus size={26} strokeWidth={1.5} />
              </button>
              {showAttach && (
                <div className="absolute bottom-14 left-0 z-50 bg-[#233138] rounded-2xl shadow-2xl py-3 w-[220px] border border-white/10 animate-in slide-in-from-bottom-2 duration-200">
                  <button type="button" onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); }} className="flex items-center gap-4 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00a884] to-[#007bfc] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"><ImageIcon size={20} className="text-white" /></div>
                    <span className="text-[#e9edef] text-[15px] font-medium">Foto</span>
                  </button>
                  <button type="button" onClick={() => { fileInputRef.current.accept = 'video/*'; fileInputRef.current.click(); }} className="flex items-center gap-4 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff5252] to-[#ff7eb3] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"><Film size={20} className="text-white" /></div>
                    <span className="text-[#e9edef] text-[15px] font-medium">Video</span>
                  </button>
                  <button type="button" onClick={() => { fileInputRef.current.accept = '*/*'; fileInputRef.current.click(); }} className="flex items-center gap-4 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c5ce7] to-[#a29bfe] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"><FileText size={20} className="text-white" /></div>
                    <span className="text-[#e9edef] text-[15px] font-medium">Dokumen</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* TEXT INPUT */}
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={disabled}
            placeholder={selectedFile ? "Tambahkan caption..." : "Ketik pesan..."}
            autoComplete="off"
            className="flex-1 bg-transparent h-full text-[#e9edef] px-2 outline-none placeholder:text-[#8696a0] text-[15px] leading-normal"
          />
        </div>

        {/* BIG ACTION BUTTON (Send/Mic) */}
        <div className="shrink-0">
          {(message.trim() || selectedFile) ? (
            <button
              type="submit"
              disabled={disabled || sending}
              className={`w-[44px] h-[44px] rounded-full bg-[#00a884] text-[#111b21] hover:bg-[#00c298] flex items-center justify-center shadow-md transition-all ${sending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
            >
              <Send size={20} strokeWidth={2.5} className="ml-1" />
            </button>
          ) : (
            <button
              type="button"
              className="w-[44px] h-[44px] rounded-full bg-[#00a884] text-[#111b21] hover:bg-[#00c298] flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Mic size={22} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};