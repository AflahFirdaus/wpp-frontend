import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Search, Check, CheckCheck, X, User, Info, Copy, Smartphone, RefreshCw, LogOut, ArrowDown, FileText, Image as ImageIcon, Film, CornerUpLeft, CornerUpRight } from 'lucide-react';
import { MessageInput } from './MessageInput';
import { getChatName, getAvatarColor, getChatId } from '../utils/chatUtils';
import { ChatService } from '../services/chatService';
import { ForwardModal } from './ForwardModal';
import { usePresence } from '../hooks/usePresence';


export const ChatWindow = ({ messages, chatInfo, chats, onSendMessage, onSendFile, onForwardMessage, loading, activeSession, onRefreshMessages, onCloseChat }) => {
  const scrollRef = useRef(null);
  const { presence } = usePresence(activeSession, getChatId(chatInfo), chatInfo?.isGroup);
  const [showProfile, setShowProfile] = useState(false);
  const [contactDetail, setContactDetail] = useState(null);
  const [resolvedPhone, setResolvedPhone] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchMsgQuery, setSearchMsgQuery] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const menuRef = useRef(null);

  const handleForwardClick = (msg) => {
    setForwardingMsg(msg);
  };

  const handleExecuteForward = (targetChatId) => {
    if (!forwardingMsg || !targetChatId) return;

    onForwardMessage?.(forwardingMsg.id?._serialized || forwardingMsg.id, targetChatId)
      .then(() => alert('Pesan berhasil diteruskan!'))
      .catch((err) => {
        console.error(err);
        alert('Gagal meneruskan pesan.');
      })
      .finally(() => setForwardingMsg(null));
  };

  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('message-highlight');
      setTimeout(() => element.classList.remove('message-highlight'), 2000);
    } else {
      console.warn("Message not found in DOM:", msgId);
      // Optional: alert user if the message is too old
    }
  };

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // TAMPILAN KOSONG (Belum ada chat yang dipilih)
  if (!chatInfo) {
    return (
      <div className="flex-1 bg-[#222e35] flex flex-col items-center justify-center border-l border-[#222d34] relative h-full w-full">
        <div className="text-center max-w-[80%] md:max-w-md z-10 flex flex-col items-center">
          {/* Ilustrasi WA Web */}
          <div className="w-64 h-64 mb-8 opacity-20">
            <svg viewBox="0 0 440 440" fill="currentColor" className="text-[#e9edef]">
              <path d="M220,0C98.5,0,0,98.5,0,220s98.5,220,220,220s220-98.5,220-220S341.5,0,220,0z M220,400c-99.4,0-180-80.6-180-180 S120.6,40,220,40s180,80.6,180,180S319.4,400,220,400z" />
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-[#e9edef] mb-4">WhatsApp Web</h1>
          <p className="text-[#8696a0] text-[14px] leading-relaxed">
            Kirim dan terima pesan tanpa perlu menghubungkan telepon Anda ke internet.<br />
            Gunakan WhatsApp tanpa batasan perangkat tertaut dan 1 telepon secara bersamaan.
          </p>
        </div>

        {/* Enkripsi End-to-end */}
        <div className="absolute bottom-10 text-[#8696a0] text-[12px] flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12,2C6.5,2,2,6.5,2,12c0,5.5,4.5,10,10,10s10-4.5,10-10C22,6.5,17.5,2,12,2z M12,18c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6 S15.3,18,12,18z" />
          </svg>
          Terenkripsi secara end-to-end
        </div>
      </div>
    );
  }

  // Helper untuk membaca nama pengirim di dalam Grup
  const getSenderName = (msg) => {
    if (msg.sender) {
      const name = msg.sender.name || msg.sender.pushname || msg.sender.shortName;
      if (name && typeof name === 'string') return name;
    }
    // Jika nama tidak disave, tampilkan nomor teleponnya (author biasanya format string '628xxx@c.us')
    if (msg.author && typeof msg.author === 'string') return '+' + msg.author.split('@')[0];
    if (msg.from && typeof msg.from === 'string') return '+' + msg.from.split('@')[0];
    return 'Unknown';
  };

  // Helper untuk memberikan warna teks yang stabil berdasarkan ID pengirim
  const getSenderColor = (authorId) => {
    if (!authorId) return '#e9edef';
    const colors = [
      '#ff7a7a', '#f47fa4', '#a195df', '#53bdeb', '#66c9ba',
      '#81d262', '#e1d25c', '#fca35d', '#ff946b', '#c49eb0'
    ];
    const charSum = authorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  // Helper cerdas agar jam tidak error (Fail-safe)
  const getMessageTime = (msg) => {
    // WPPConnect kadang mengirim `timestamp`, kadang `t`
    const timeValue = msg.timestamp || msg.t;
    if (!timeValue) return ''; // Jika tidak ada, kembalikan kosong agar tidak nge-crash

    return new Date(timeValue * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Helper memformat pembatas tanggal
  const formatDateDivider = (timestamp) => {
    const msgDate = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'HARI INI';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'KEMARIN';
    } else {
      return msgDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).toUpperCase();
    }
  };

  const isMessageMedia = (msg) => {
    const isRawBase64 = msg.body && typeof msg.body === 'string' && msg.body.length > 200 && !msg.body.includes(' ');
    const isDataUri = msg.body && typeof msg.body === 'string' && msg.body.startsWith('data:');
    return msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'file' || isDataUri || isRawBase64;
  };

  // Helper membaca teks pesan dan mencegah output hash base64 yang sangat panjang
  const getMessageContent = (msg) => {
    if (isMessageMedia(msg)) {
      if (msg.caption) return msg.caption;
      // Jangan pernah me-render raw base64 sebagai text chat!
      return '';
    }

    if (msg.body && typeof msg.body === 'string') return msg.body;
    return msg.text || msg.content || 'Pesan tidak dapat ditampilkan';
  };

  // Helper memformat mimetype yang panjang jadi pendek (ex: application/vnd.openxmlformats... -> DOCX)
  const formatMimeType = (mimeStr) => {
    if (!mimeStr) return 'FILE';
    const raw = mimeStr.split(';')[0].split('/')[1] || mimeStr;
    const lower = raw.toLowerCase();
    if (lower.includes('pdf')) return 'PDF';
    if (lower.includes('spreadsheet') || lower.includes('excel') || lower.includes('sheet')) return 'XLSX';
    if (lower.includes('word') || lower.includes('document')) return 'DOCX';
    if (lower.includes('presentation') || lower.includes('powerpoint')) return 'PPTX';
    if (lower.includes('zip')) return 'ZIP';
    if (lower.includes('rar')) return 'RAR';
    return raw.toUpperCase().substring(0, 8);
  };

  const QuotedMessage = ({ quotedMsg, isMe }) => {
    if (!quotedMsg) return null;

    const rawSender = quotedMsg.sender?.name || quotedMsg.sender?.pushname || quotedMsg.author;
    const senderStr = typeof rawSender === 'object' ? (rawSender?._serialized || rawSender?.user || 'Seseorang') : rawSender;
    const sender = quotedMsg.fromMe ? 'Anda' : (senderStr || 'Seseorang');
    
    // Pastikan konten adalah string murni
    const rawContent = quotedMsg.body || quotedMsg.text || quotedMsg.content;
    const contentStr = typeof rawContent === 'object' ? 'Pesan tidak dapat ditampilkan' : rawContent;
    const content = contentStr || (quotedMsg.caption && '📷 ' + quotedMsg.caption) || 'Media';
    const isQuotedMedia = quotedMsg.type === 'image' || quotedMsg.type === 'video' || (quotedMsg.mimetype && quotedMsg.mimetype.includes('/'));

    const handleJumpTo = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const msgId = quotedMsg.id?._serialized || quotedMsg.id;
      scrollToMessage(msgId);
    };

    return (
      <div
        onClick={handleJumpTo}
        className={`mb-2 rounded-lg border-l-4 p-2 cursor-pointer transition-colors max-w-full overflow-hidden flex items-center gap-2 ${isMe ? 'bg-[#004a3c] border-[#00a884] hover:bg-[#005c4b]' : 'bg-[#182229] border-[#00a884] hover:bg-[#2a3942]'
          }`}
      >
        <div className="flex-1 min-w-0 flex flex-col">
          <p className="text-[#00a884] text-[12.5px] font-bold truncate mb-0.5">
            {sender}
          </p>
          <div className="flex items-center gap-1.5 overflow-hidden w-full">
            {isQuotedMedia && (
              <div className="w-8 h-8 rounded shrink-0 bg-black/20 flex items-center justify-center">
                {quotedMsg.type === 'image' ? <ImageIcon size={14} className="text-[#aebac1]" /> : <Film size={14} className="text-[#aebac1]" />}
              </div>
            )}
            <p className="text-[#d1d7db] text-[13px] truncate whitespace-nowrap overflow-hidden flex-1 min-w-0">
              {content}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const MediaRenderer = ({ msg, activeSession }) => {
    const [fullMediaUrl, setFullMediaUrl] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const isRawBase64 = msg.body && typeof msg.body === 'string' && msg.body.length > 200 && !msg.body.includes(' ');
    const isDataUri = msg.body && typeof msg.body === 'string' && msg.body.startsWith('data:');
    const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'file' || isDataUri || isRawBase64;

    if (!isMedia) return null;

    // Gunakan fullMediaUrl jika sudah di-download, kalau belum, gunakan thumbnail dari body
    let mediaUrl = fullMediaUrl;
    if (!mediaUrl) {
      if (isDataUri) {
        mediaUrl = msg.body;
      } else if (msg.content?.startsWith('data:')) {
        mediaUrl = msg.content;
      } else if (isRawBase64) {
        const mime = msg.mimetype || (msg.type === 'image' ? 'image/jpeg' : msg.type === 'video' ? 'video/mp4' : 'application/octet-stream');
        mediaUrl = `data:${mime};base64,${msg.body}`;
      }
    }

    const fileName = msg.filename || msg.title || (msg.type === 'image' ? 'photo.jpg' : msg.type === 'video' ? 'video.mp4' : 'document.file');
    const fileExt = formatMimeType(mediaUrl && mediaUrl.includes(';') ? mediaUrl.split(';')[0].split(':')[1] : msg.mimetype);
    const isMe = msg.fromMe;
    const msgId = msg.id?._serialized || msg.id;

    const handleDownloadHD = async (e, triggerBrowserDownload = false) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDownloading) return;

      setIsDownloading(true);
      try {
        const { MessageService } = await import('../services/messageService');
        const data = await MessageService.downloadMedia(activeSession, msgId);

        const b64 = typeof data === 'string' ? data : (data.base64 || data.data);
        if (!b64) throw new Error("Base64 string not found in response");

        const mime = msg.mimetype || 'application/octet-stream';
        const finalUrl = b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`;

        setFullMediaUrl(finalUrl);

        if (triggerBrowserDownload) {
          const a = document.createElement('a');
          a.href = finalUrl;
          a.download = fileName;
          a.click();
        }
      } catch (err) {
        console.error("Gagal mendownload media HD:", err);
        alert("Gagal mengambil media beresolusi tinggi.");
      } finally {
        setIsDownloading(false);
      }
    };

    // Jika image
    if (msg.type === 'image' || (mediaUrl && mediaUrl.startsWith('data:image/'))) {
      return (
        <div className="relative group rounded-[6px] overflow-hidden bg-[#202c33]/30 min-h-[50px] min-w-[100px] flex justify-center items-center">
          {mediaUrl ? (
            <div className="relative cursor-pointer max-w-full inline-block group" onClick={(e) => handleDownloadHD(e, false)} title="Klik untuk Muat Ulang HD">
              <img src={mediaUrl} alt="Media" className={`w-[330px] max-w-full h-auto object-cover max-h-[350px] block transition-transform group-hover:brightness-95 ${!fullMediaUrl && 'blur-[1px]'}`} />

              {/* Tombol Download Overlay (Hanya jika belum Load HD) */}
              {!fullMediaUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                  {isDownloading ? (
                    <div className="p-3 bg-black/60 rounded-full text-white animate-spin">
                      <RefreshCw size={24} />
                    </div>
                  ) : (
                    <div className="p-3 bg-black/60 rounded-full text-white backdrop-blur-md hover:bg-black/80 transition-colors shadow-lg">
                      <ArrowDown size={24} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <ImageIcon size={32} className="text-[#8696a0]" />
          )}
        </div>
      );
    }

    // Jika video
    if (msg.type === 'video' || (mediaUrl && mediaUrl.startsWith('data:video/'))) {
      return (
        <div className="relative rounded-[6px] overflow-hidden bg-[#202c33]/30 min-h-[50px] min-w-[100px] flex justify-center items-center">
          {mediaUrl ? (
            <video src={mediaUrl} controls className="w-[330px] max-w-full h-auto object-cover max-h-[350px] outline-none block" />
          ) : (
            <Film size={32} className="text-[#8696a0]" />
          )}
        </div>
      );
    }

    // Jika document / file
    return (
      <div onClick={(e) => handleDownloadHD(e, true)} className="block group cursor-pointer" title="Unduh Dokumen Asli">
        <div className={`mb-1 mt-0.5 flex flex-col justify-center rounded-[8px] min-w-[260px] max-w-[320px] transition-colors p-3 ${isMe ? 'bg-[#016854] group-hover:bg-[#005c4b]' : 'bg-[#2a3942] group-hover:bg-[#202c33]'}`}>
          <div className="flex items-center gap-4">
            <div className="bg-[#ff6b6b] w-10 h-10 rounded flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-3 h-3 bg-white/20 rounded-bl-sm"></div>
              {isDownloading ? (
                <RefreshCw size={20} className="text-white animate-spin" strokeWidth={2} />
              ) : (
                <FileText size={22} className="text-white" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[#e9edef] text-[14.5px] font-medium truncate block leading-tight">
                {fileName}
              </span>
              <div className="flex items-center gap-1.5 mt-1.5 opacity-80 border-t border-white/10 pt-1.5">
                <span className="text-[#e9edef] text-[11px] font-semibold tracking-wider">
                  {fileExt}
                </span>
                <span className="text-[#e9edef] text-[11px]">•</span>
                <span className="text-[#e9edef] text-[10.5px] font-medium uppercase tracking-wide">
                  {isDownloading ? 'MENGUNDUH...' : 'UNDUH DOKUMEN'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const displayName = getChatName(chatInfo);
  const avatarColor = getAvatarColor(getChatId(chatInfo));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden w-full border-l border-[#222d34]">

      {/* BACKGROUND DOODLE */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none z-0"
        style={{
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundRepeat: 'repeat',
          backgroundSize: '400px'
        }}
      />

      {/* HEADER CHAT */}
      <header className="h-15 bg-[#202c33] flex items-center shadow-sm w-full z-20 shrink-0">
        <div className="max-w-275 mx-auto w-full px-4 md:px-8 flex items-center justify-between">
          {/* LEFT SECTION (Clickable to open profile) */}
          <div
            data-profile-trigger
            className="flex items-center gap-5 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={async () => {
              if (chatInfo.isGroup) return;
              setShowProfile(true);
              setLoadingProfile(true);
              setResolvedPhone(null);
              try {
                const chatId = getChatId(chatInfo);

                // 1. Ambil detail kontak standar
                const data = await ChatService.getContactDetail(activeSession, chatId);
                setContactDetail(data);

                // 2. Deteksi apakah chat menggunakan format LID
                //    Jika ya, panggil endpoint khusus untuk resolve ke nomor asli
                if (chatId.includes('@lid')) {
                  const lidResult = await ChatService.getPhoneFromLid(activeSession, chatId);
                  if (lidResult) {
                    // Response bisa berupa object dengan field user/phone/wid, atau string langsung
                    const phone = lidResult.user || lidResult.phone || lidResult.wid?.user ||
                      (typeof lidResult === 'string' ? lidResult : null);
                    setResolvedPhone(phone);
                  }
                } else {
                  // Format lama @c.us — nomor ada langsung di ID
                  setResolvedPhone(chatId.split('@')[0]);
                }
              } catch (err) {
                console.error("Error fetching contact detail", err);
              } finally {
                setLoadingProfile(false);
              }
            }}
          >
            {/* AVATAR */}
            <div
              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-medium"
              style={{ backgroundColor: chatInfo.avatar ? 'transparent' : avatarColor }}
            >
              {chatInfo.avatar ? (
                <img src={chatInfo.avatar} alt="chat" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#e9edef] uppercase text-[15px]">
                  {displayName.charAt(0)}
                </span>
              )}
            </div>
            {/* TEXT */}
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <h2 className="text-[#e9edef] text-[16px] font-normal truncate">
                {displayName}
              </h2>
              <p className="text-[13px] text-[#8696a0] truncate mt-0.5 lowercase">
                {presence || (chatInfo.isGroup ? 'click here for group info' : '')}
              </p>
            </div>
          </div>

          {/* RIGHT SECTION: Action Buttons */}
          <div className="flex items-center gap-2 text-[#aebac1] shrink-0">
            {/* NEW: Camera/Video Icon to match screenshot */}
            <div className="flex items-center gap-1 hover:bg-white/5 rounded-lg px-2 py-1 transition-colors cursor-pointer">
              <Film size={20} strokeWidth={1.5} />
              <ArrowDown size={12} strokeWidth={3} className="opacity-60" />
            </div>

            <button
              onClick={() => { setShowSearchBar(!showSearchBar); setSearchMsgQuery(''); }}
              className={`p-2 hover:bg-white/5 rounded-full transition-colors ${showSearchBar ? 'text-[#00a884]' : ''}`}
            >
              <Search size={21} strokeWidth={1.5} />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2 hover:bg-white/5 rounded-full transition-colors ${showMenu ? 'text-[#00a884]' : ''}`}
              >
                <MoreVertical size={21} strokeWidth={1.5} />
              </button>
              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-10 bg-[#233138] rounded-xl shadow-2xl py-2 w-50 border border-white/5 z-50 animate-in slide-in-from-top-1 duration-150">
                  {!chatInfo.isGroup && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // Trigger profile open (same as header click)
                        document.querySelector('[data-profile-trigger]')?.click();
                      }}
                      className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                    >
                      <Info size={16} className="text-[#8696a0]" /> Info Kontak
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); onRefreshMessages?.(); }}
                    className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                  >
                    <RefreshCw size={16} className="text-[#8696a0]" /> Refresh Pesan
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onCloseChat?.(); }}
                    className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                  >
                    <LogOut size={16} className="text-[#8696a0]" /> Tutup Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SEARCH BAR (appears below header when toggled) */}
      {showSearchBar && (
        <div className="bg-[#111b21] px-4 py-3 flex items-center gap-3 border-b border-[#222d34] z-20 shrink-0 animate-in slide-in-from-top-2 duration-200">
          <Search size={18} className="text-[#8696a0] shrink-0" />
          <input
            type="text"
            value={searchMsgQuery}
            onChange={(e) => setSearchMsgQuery(e.target.value)}
            placeholder="Cari pesan..."
            autoFocus
            className="bg-transparent outline-none text-[14px] text-[#e9edef] placeholder:text-[#8696a0] flex-1"
          />
          {searchMsgQuery && (
            <span className="text-[#8696a0] text-[12px] shrink-0">
              {messages.filter(m => (m.body || m.text || m.content || '').toLowerCase().includes(searchMsgQuery.toLowerCase())).length} hasil
            </span>
          )}
          <button onClick={() => { setShowSearchBar(false); setSearchMsgQuery(''); }} className="text-[#8696a0] hover:text-[#e9edef] p-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* MAIN VIEW AREA (H-Full container for chat + profile) */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {/* AREA PESAN (CHAT BUBBLES) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 z-10 custom-scrollbar scroll-smooth flex flex-col relative"
        >

          {/* MAIN MESSAGE WRAPPER (Responsive Container) - Provides structural padding automatically */}
          <div className="flex-1 px-4 sm:px-6 md:px-14 lg:px-28 py-8 flex flex-col gap-1 relative z-10 min-w-0">
            {messages && messages.map((msg, idx) => {
              const isMe = msg.fromMe;
              const prevMsg = messages[idx - 1];
              const isFirstInGroup = !prevMsg ||
                prevMsg.fromMe !== isMe ||
                (chatInfo.isGroup && prevMsg.author !== msg.author);

              // Logika pembatas tanggal
              const msgTimestamp = msg.timestamp || msg.t;
              const prevMsgTimestamp = prevMsg ? (prevMsg.timestamp || prevMsg.t) : null;

              const msgDate = new Date(msgTimestamp * 1000).toDateString();
              const prevMsgDate = prevMsgTimestamp ? new Date(prevMsgTimestamp * 1000).toDateString() : null;
              const showDivider = msgDate !== prevMsgDate;

              // Search highlight logic
              const msgContent = (msg.body || msg.text || msg.content || '').toLowerCase();
              const isSearchActive = showSearchBar && searchMsgQuery.trim();
              const isMatch = isSearchActive ? msgContent.includes(searchMsgQuery.toLowerCase()) : true;

              // Cek jika pesan cuman isinya media doang (tak ada teks)
              const messageTextContent = getMessageContent(msg);
              const hasText = messageTextContent && messageTextContent.trim().length > 0;
              const isMedia = isMessageMedia(msg);
              const renderedMedia = isMedia ? <MediaRenderer msg={msg} activeSession={activeSession} /> : null;

              return (
                <React.Fragment key={msg.id?._serialized || idx}>
                  {/* DATE DIVIDER */}
                  {showDivider && (
                    <div className="flex justify-center mt-10 mb-6 relative z-10 pointer-events-none">
                      <div className="bg-[#182229] text-[#8696a0] text-[12.5px] px-4 py-1.5 rounded-lg shadow-md border border-[#222d34]/50 font-medium tracking-wide">
                        {formatDateDivider(msgTimestamp)}
                      </div>
                    </div>
                  )}

                  <div
                    id={`msg-${msg.id?._serialized || msg.id}`}
                    className={`message-row w-full flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0'} transition-opacity duration-200 ${isSearchActive && !isMatch ? 'opacity-20' : 'opacity-100'}`}
                  >
                    <div
                      className={`message-bubble relative group/bubble rounded-xl flex-shrink-1 w-fit max-w-[85%] md:max-w-[75%] lg:max-w-[65%] min-w-0 ${isMe
                        ? `bg-[#005c4b] text-[#e9edef] ${isFirstInGroup ? 'rounded-tr-none bubble-tail-out' : ''}`
                        : `bg-[#202c33] text-[#e9edef] ${isFirstInGroup ? 'rounded-tl-none bubble-tail-in' : ''}`
                        }`}
                    >
                      {/* HOVER ACTIONS (Reply/Forward) */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-gradient-to-l from-black/40 to-transparent pr-1 pl-4 py-0.5 rounded-tr-xl flex items-center gap-1 z-20">
                        <button onClick={() => setReplyingTo(msg)} className="text-[#aebac1] hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors" title="Balas"><CornerUpLeft size={16} strokeWidth={2.5} /></button>
                        <button onClick={() => handleForwardClick(msg)} className="text-[#aebac1] hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors" title="Teruskan"><CornerUpRight size={16} strokeWidth={2.5} /></button>
                      </div>

                      {/* SENDER NAME (ONLY GROUPS) */}
                      {!isMe && chatInfo.isGroup && (
                        <div
                          style={{ color: getSenderColor(msg.author || msg.from) }}
                          className="text-[12.5px] font-bold pb-1 cursor-pointer hover:underline pr-10 truncate"
                        >
                          {getSenderName(msg)}
                        </div>
                      )}

                      <div className={`relative ${renderedMedia ? 'p-1 pb-2' : 'px-3.5 py-2'}`}>
                        {/* QUOTED MESSAGE */}
                        {msg.quotedMsg && <QuotedMessage quotedMsg={msg.quotedMsg} isMe={isMe} />}

                        {/* 1. MEDIA RENDER (Jika ada) */}
                        {renderedMedia}

                        {/* 2. TEXT RENDER (Jika ada) */}
                        {hasText && (
                          <div className={`text-[14.5px] leading-[1.4] whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0 ${renderedMedia ? 'px-2 pt-2' : ''}`}>
                            {isSearchActive && isMatch ? (() => {
                              const text = getMessageContent(msg);
                              const query = searchMsgQuery;
                              const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                              return parts.map((part, i) =>
                                part.toLowerCase() === query.toLowerCase()
                                  ? <span key={i} className="bg-[#00a884]/40 text-white rounded-[2px] px-0.5">{part}</span>
                                  : part
                              );
                            })() : getMessageContent(msg)}

                            {/* SPACER FOR TIMESTAMP */}
                            <span className="inline-block w-16" />
                          </div>
                        )}

                        {!hasText && renderedMedia && <div className="h-5" />}

                        {/* METADATA (Time + Status) */}
                        <div className="absolute right-1.5 bottom-1 flex items-center justify-end gap-1 select-none h-4 z-10">
                          <span className={`text-[11px] font-normal uppercase ${!hasText && renderedMedia ? 'text-[#ffffff] drop-shadow-md font-medium px-1' : 'text-[#8696a0] opacity-80'}`}>
                            {getMessageTime(msg)}
                          </span>
                          {isMe && (
                            <span className="flex items-center opacity-90">
                              {msg.ack >= 3
                                ? <CheckCheck size={14} className="text-[#53bdeb]" />
                                : msg.ack >= 2
                                  ? <CheckCheck size={14} className={`${!hasText && renderedMedia ? 'text-[#ffffff] drop-shadow-md' : 'text-[#8696a0]'}`} />
                                  : <Check size={14} className={`${!hasText && renderedMedia ? 'text-[#ffffff] drop-shadow-md' : 'text-[#8696a0]'}`} />
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* PROFILE OVERLAY (FULL PANEL) */}
        <div className={`transition-all duration-300 ease-in-out absolute inset-0 bg-[#0b141a] z-50 flex flex-col ${showProfile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {showProfile && (
            <>
              {/* Profile Header */}
              <div className="h-15 bg-[#202c33] px-6 flex items-center gap-8 shrink-0 shadow-md">
                <button
                  onClick={() => setShowProfile(false)}
                  className="text-[#aebac1] hover:text-[#e9edef] transition-colors p-2 hover:bg-white/5 rounded-full"
                >
                  <X size={24} />
                </button>
                <h3 className="text-[#e9edef] text-[16px] font-medium tracking-wide">Info Kontak Pelanggan</h3>
              </div>

              {/* Profile Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0c1317] flex flex-col items-center py-10">
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="animate-spin w-10 h-10 border-4 border-[#00a884] border-t-transparent rounded-full" />
                    <span className="text-[#8696a0] text-base">Mengambil data profil...</span>
                  </div>
                ) : (
                  <div className="w-full max-w-150 animate-in fade-in slide-in-from-bottom-4 duration-500 px-6">
                    {/* Hero Avatar Section */}
                    <div className="bg-[#0b141a] rounded-2xl py-10 flex flex-col items-center shadow-lg border border-white/5">
                      <div className="w-60 h-60 rounded-full overflow-hidden mb-6 shadow-2xl border-4 border-[#202c33]">
                        {chatInfo.avatar ? (
                          <img src={chatInfo.avatar} alt="Large Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[80px] text-white/20" style={{ background: avatarColor }}>
                            {displayName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <h2 className="text-[#e9edef] text-[30px] font-normal text-center">
                        {contactDetail?.pushname || contactDetail?.name || displayName}
                      </h2>
                      <p className="text-[#00a884] text-[18px] font-medium mt-1">
                        {resolvedPhone ? `+${resolvedPhone}` : 'Memuat nomor...'}
                      </p>
                    </div>

                    {/* Info Card: Phone & About */}
                    <div className="bg-[#0b141a] mt-6 rounded-2xl p-8 shadow-md border border-white/5 space-y-8">
                      {/* Phone Section */}
                      <div>
                        <p className="text-[#8696a0] text-[14px] uppercase tracking-widest mb-4">Nomor Telepon (ID Pelanggan)</p>
                        <div className="flex items-center justify-between bg-[#202c33] p-4 rounded-xl border border-white/5">
                          <div className="flex items-center gap-4 text-[#e9edef]">
                            <Smartphone size={22} className="text-[#00a884]" />
                            <span className="text-[20px] font-mono tracking-wider">
                              {resolvedPhone || 'Tidak tersedia'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              if (resolvedPhone) {
                                navigator.clipboard.writeText(resolvedPhone);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }
                            }}
                            className={`p-3 rounded-xl transition-all ${copied ? 'bg-[#00a884] text-white' : 'bg-[#0c1317] text-[#8696a0] hover:text-[#00a884]'}`}
                            title="Salin nomor"
                          >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                          </button>
                        </div>
                      </div>

                      {/* About Section */}
                      <div>
                        <p className="text-[#8696a0] text-[14px] uppercase tracking-widest mb-4">Info / Bio Pelanggan</p>
                        <div className="flex items-start gap-4">
                          <Info size={22} className="text-[#00a884] shrink-0 mt-1" />
                          <p className="text-[#e9edef] text-[17px] leading-relaxed italic opacity-90">
                            "{contactDetail?.about || 'Status tidak tersedia'}"
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 mb-20 text-center">
                      <p className="text-[#8696a0] text-[13px] opacity-50 italic">
                        Data diambil secara real-time dari WhatsApp untuk akurasi pencatatan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* INPUT AREA */}
      <footer className="z-20 w-full shrink-0 bg-[#202c33]">
        <div className="max-w-275 mx-auto w-full">
          <MessageInput
            onSend={async (text) => {
              try {
                await onSendMessage(text, replyingTo?.id?._serialized || replyingTo?.id);
                setReplyingTo(null);
              } catch (err) {
                console.error('Error sending reply:', err);
                const errorDetail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
                alert('Gagal mengirim balasan:\n' + errorDetail);
              }
            }}
            onSendFile={async (file, caption) => {
              try {
                await onSendFile(file, caption, replyingTo?.id?._serialized || replyingTo?.id);
                setReplyingTo(null);
              } catch (err) {
                console.error('Error sending file:', err);
                const errorDetail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
                alert('Gagal mengirim file:\n' + errorDetail);
              }
            }}
            disabled={loading}
            replyingTo={replyingTo}
            cancelReply={() => setReplyingTo(null)}
          />
        </div>
      </footer>
      {/* MODAL QR CODE (Asumsi ada di App atau di sini) */}

      {/* FORWARD MODAL */}
      {forwardingMsg && (
        <ForwardModal
          chats={chats || []}
          onSelect={handleExecuteForward}
          onClose={() => setForwardingMsg(null)}
        />
      )}
    </div>
  );
};