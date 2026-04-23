import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Search, Check, CheckCheck, X, User, Info, Copy, Smartphone, RefreshCw, LogOut, ArrowDown, FileText, Image as ImageIcon, Film, CornerUpLeft, CornerUpRight, Download, Maximize2 } from 'lucide-react';
import { MessageInput } from './MessageInput';
import { getChatName, getAvatarColor, getChatId } from '../utils/chatUtils';
import { ChatService } from '../services/chatService';
import { MessageService } from '../services/messageService';
import { ForwardModal } from './ForwardModal';
import { MediaPreview } from './MediaPreview';
import { MediaCache } from '../utils/mediaCache';
import { usePresence } from '../hooks/usePresence';

// Helper memformat mimetype yang panjang jadi pendek
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

// HELPER: Unify ID extraction for consistent DOM selection
const getMsgId = (msg) => {
    if (!msg) return null;
    if (typeof msg === 'string') return msg;
    const id = msg.id?._serialized || msg.id || msg._serialized;
    return typeof id === 'object' ? (id?._serialized || id?.id) : id;
};

const formatWhatsAppText = (text, searchQuery) => {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  const highlight = (str) => {
    if (!searchQuery) return str;
    const parts = str.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <span key={`h-${i}`} className="bg-[#00a884]/40 text-white rounded-[2px] px-0.5">{part}</span>
        : part
    );
  };

  const rules = [
    { regex: /```([\s\S]*?)```/g, render: (content, i) => <span key={`m-${i}`} className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[13px]">{content}</span> },
    { regex: /\*([^\n*]+)\*/g, render: (content, i) => <strong key={`b-${i}`} className="font-bold">{content}</strong> },
    { regex: /_([^\n_]+)_/g, render: (content, i) => <em key={`i-${i}`} className="italic">{content}</em> },
    { regex: /~([^\n~]+)~/g, render: (content, i) => <s key={`s-${i}`} className="line-through">{content}</s> },
  ];

  const parse = (str, ruleIndex = 0) => {
    if (ruleIndex >= rules.length) return highlight(str);
    const rule = rules[ruleIndex];
    const parts = str.split(rule.regex);
    if (parts.length === 1) return parse(str, ruleIndex + 1);

    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return rule.render(parse(part, ruleIndex + 1), i);
      }
      return parse(part, ruleIndex + 1);
    });
  };

  return parse(text);
};

const QuotedMessage = ({ quotedMsg, isMe, scrollToMessage, messages = [] }) => {
  if (!quotedMsg) return null;

  // 1. Try to find the full message in the current list to get better metadata (sender, body, media)
  const targetId = getMsgId(quotedMsg);
  const targetIdShort = typeof targetId === 'string' ? targetId.split('_').pop() : null;

  const originalMsg = messages.find(m => {
    const mid = getMsgId(m);
    if (mid === targetId) return true;
    if (targetIdShort && typeof mid === 'string' && mid.endsWith(targetIdShort)) return true;
    return false;
  });

  // Use original message data if found, otherwise fallback to quotedMsg data
  const displayMsg = originalMsg || quotedMsg;

  const rawSender = displayMsg.sender?.name || displayMsg.sender?.pushname || displayMsg.author;
  const senderStr = typeof rawSender === 'object' ? (rawSender?._serialized || rawSender?.user || 'Seseorang') : rawSender;
  const sender = displayMsg.fromMe ? 'Anda' : (senderStr || 'Seseorang');

  const rawContent = displayMsg.body || displayMsg.text || displayMsg.content;
  const contentStr = typeof rawContent === 'object' ? 'Pesan tidak dapat ditampilkan' : rawContent;
  const content = contentStr || (displayMsg.caption && '📷 ' + displayMsg.caption) || 'Media';
  const isQuotedMedia = displayMsg.type === 'image' || displayMsg.type === 'video' || (displayMsg.mimetype && displayMsg.mimetype.includes('/'));

  const handleJumpTo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    scrollToMessage(targetId);
  };

  return (
    <div
      onClick={handleJumpTo}
      className={`mb-2 rounded-lg border-l-4 p-2 cursor-pointer transition-colors max-w-full overflow-hidden flex items-center gap-2 ${isMe ? 'bg-black/5 hover:bg-black/10 dark:bg-[#004a3c] dark:hover:bg-wa-outgoing border-wa-green' : 'bg-wa-quoted-bg border-wa-green hover:bg-wa-hover'
        }`}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-wa-green text-[12.5px] font-bold truncate mb-0.5">
          {sender}
        </p>
        <div className="flex items-center gap-1.5 overflow-hidden w-full">
          {isQuotedMedia && (
            <div className="w-8 h-8 rounded shrink-0 bg-black/20 flex items-center justify-center">
              {displayMsg.type === 'image' ? <ImageIcon size={14} className="text-[#aebac1]" /> : <Film size={14} className="text-[#aebac1]" />}
            </div>
          )}
          <p className="text-wa-secondary text-[13px] truncate whitespace-nowrap overflow-hidden flex-1 min-w-0">
            {formatWhatsAppText(content)}
          </p>
        </div>
      </div>
    </div>
  );
};

const MediaRenderer = ({ msg, activeSession, setPreviewMedia }) => {
  const [fullMediaUrl, setFullMediaUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isRawBase64 = msg.body && typeof msg.body === 'string' && msg.body.length > 200 && !msg.body.includes(' ');
  const isDataUri = msg.body && typeof msg.body === 'string' && msg.body.startsWith('data:');
  const isMedia = msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'file' || isDataUri || isRawBase64;

  if (!isMedia) return null;

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
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDownloading) return null;

    setIsDownloading(true);
    try {
      const { MessageService } = await import('../services/messageService');
      const data = await MessageService.downloadMedia(activeSession, msg);

      let b64 = typeof data === 'string' ? data : (data.base64 || data.data);
      if (!b64) throw new Error("Base64 string not found in response");

      if (b64.startsWith('data:')) {
        b64 = b64.split(',')[1];
      }

      const mime = msg.mimetype || 'application/octet-stream';
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mime });
      const blobUrl = URL.createObjectURL(blob);

      MediaCache.set(msgId, blobUrl);
      setFullMediaUrl(blobUrl);

      if (triggerBrowserDownload) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return blobUrl;
    } catch (err) {
      console.error("Gagal mendownload media HD:", err);
      alert("Gagal mengambil media beresolusi tinggi.");
      return null;
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMediaClick = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!fullMediaUrl && msg.type === 'image') {
      await handleDownloadHD(null, false);
      return;
    }

    setPreviewMedia({
      url: fullMediaUrl || mediaUrl,
      type: msg.type,
      fileName: fileName,
      onDownload: (ev) => {
        if (ev && ev.preventDefault) ev.preventDefault();
        handleDownloadHD(null, true);
      }
    });
  };

  if (msg.type === 'image' || (mediaUrl && mediaUrl.startsWith('data:image/')) || (mediaUrl && mediaUrl.startsWith('blob:'))) {
    return (
      <div className="relative group rounded-[6px] overflow-hidden bg-[#202c33]/30 min-h-[50px] min-w-[100px] flex justify-center items-center">
        {mediaUrl ? (
          <div className="relative cursor-pointer max-w-full inline-block group" onClick={handleMediaClick} title="Klik untuk Pratinjau">
            <img src={mediaUrl} alt="Media" className={`w-[330px] max-w-full h-auto object-cover max-h-[350px] block transition-transform group-hover:brightness-95 ${!fullMediaUrl && msg.type === 'image' && 'blur-[1px]'}`} />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {!fullMediaUrl ? (
                <div className="flex flex-col items-center gap-2">
                  {isDownloading ? (
                    <div className="p-3 bg-black/60 rounded-full text-white animate-spin">
                      <RefreshCw size={24} />
                    </div>
                  ) : (
                    <div className="p-3 bg-black/60 rounded-full text-white backdrop-blur-md hover:bg-black/80 transition-colors shadow-lg">
                      <ArrowDown size={24} />
                    </div>
                  )}
                  <span className="text-white text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded uppercase">Muat HD</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="p-2.5 bg-black/60 rounded-full text-white backdrop-blur-md hover:bg-black/80 transition-colors shadow-lg">
                    <Maximize2 size={20} />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownloadHD(e, true); }}
              className="absolute bottom-2 right-2 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>
        ) : (
          <ImageIcon size={32} className="text-[#8696a0]" />
        )}
      </div>
    );
  }

  if (msg.type === 'video' || (mediaUrl && mediaUrl.startsWith('data:video/')) || (mediaUrl && mediaUrl.startsWith('blob:'))) {
    return (
      <div className="relative rounded-[6px] overflow-hidden bg-[#202c33]/30 min-h-[50px] min-w-[100px] flex justify-center items-center group">
        {mediaUrl ? (
          <div className="relative w-full">
            <video src={mediaUrl} className="w-[330px] max-w-full h-auto object-cover max-h-[350px] outline-none block cursor-pointer" onClick={handleMediaClick} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="p-4 bg-black/40 rounded-full text-white backdrop-blur-sm group-hover:bg-black/60 transition-colors">
                <Film size={32} />
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleDownloadHD(e, true); }}
              className="absolute bottom-2 right-2 p-1.5 bg-black/40 hover:bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
              title="Download"
            >
              <Download size={16} />
            </button>
          </div>
        ) : (
          <Film size={32} className="text-[#8696a0]" />
        )}
      </div>
    );
  }

  return (
    <div onClick={(e) => handleDownloadHD(e, true)} className="block group cursor-pointer" title="Unduh Dokumen Asli">
      <div className={`mb-1 mt-0.5 flex flex-col justify-center rounded-[8px] min-w-[260px] max-w-[320px] transition-colors p-3 ${isMe ? 'bg-black/5 group-hover:bg-black/10 dark:bg-[#016854] dark:group-hover:bg-wa-outgoing' : 'bg-wa-input-bg group-hover:bg-wa-hover'}`}>
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
            <span className="text-wa-text text-[14.5px] font-medium truncate block leading-tight">
              {fileName}
            </span>
            <div className="flex items-center gap-1.5 mt-1.5 opacity-80 border-t border-black/5 dark:border-white/10 pt-1.5">
              <span className="text-wa-text text-[11px] font-semibold tracking-wider">
                {fileExt}
              </span>
              <span className="text-wa-text text-[11px]">•</span>
              <span className="text-wa-text text-[10.5px] font-medium uppercase tracking-wide">
                {isDownloading ? 'MENGUNDUH...' : 'UNDUH DOKUMEN'}
              </span>
            </div>
          </div>
          <Download size={18} className="text-wa-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
};

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
  const [previewMedia, setPreviewMedia] = useState(null);
  const menuRef = useRef(null);

  const handleForwardClick = (msg) => {
    setForwardingMsg(msg);
  };

  const handleExecuteForward = (targetChatId) => {
    if (!forwardingMsg || !targetChatId) return;

    onForwardMessage?.(getMsgId(forwardingMsg), targetChatId, forwardingMsg)
      .then((res) => {
        console.log('[Forward] SERVER_SUCCESS_RESPONSE:', res);
        alert('Pesan berhasil diteruskan!');
      })
      .catch((err) => {
        console.error('[Forward] SERVER_ERROR:', err);
        alert('Gagal meneruskan pesan.');
      })
      .finally(() => setForwardingMsg(null));
  };

  const scrollToMessage = (msgId) => {
    if (!msgId) return;
    
    // 1. Mencari element dengan ID persis
    let element = document.getElementById(`msg-${msgId}`);
    
    // 2. Jika tidak ketemu, coba balikkan prefix true_ / false_ (karena perspektif pengirim/penerima beda)
    if (!element && typeof msgId === 'string') {
        const flippedId = msgId.startsWith('true_') 
            ? 'false_' + msgId.substring(5) 
            : msgId.startsWith('false_') 
                ? 'true_' + msgId.substring(6) 
                : msgId;
        
        if (flippedId !== msgId) {
            element = document.getElementById(`msg-${flippedId}`);
        }
    }
    
    // 3. Jika masih tidak ketemu, coba cari berdasarkan "Internal ID" (bagian akhir setelah underscore terakhir)
    if (!element && typeof msgId === 'string') {
        const shortId = msgId.split('_').pop();
        const allMsgs = document.querySelectorAll('[id^="msg-"]');
        for (const el of allMsgs) {
            if (el.id.endsWith(shortId)) {
                element = el;
                break;
            }
        }
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('message-highlight');
      setTimeout(() => element.classList.remove('message-highlight'), 2000);
    } else {
      console.warn("Message not found in DOM:", msgId);
    }
  };

  // --- CHAT KEYBOARD NAVIGATION (Esc) ---
  useEffect(() => {
    const handleChatKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Priority 1: Media Preview
        if (previewMedia) {
          setPreviewMedia(null);
          return;
        }
        
        // Priority 2: Forwarding Modal
        if (forwardingMsg) {
          setForwardingMsg(null);
          return;
        }

        // Priority 3: Profile Overlay
        if (showProfile) {
          setShowProfile(false);
          return;
        }

        // Priority 4: Search Bar
        if (showSearchBar) {
          setShowSearchBar(false);
          setSearchMsgQuery('');
          return;
        }

        // Priority 5: Menu Dropdown
        if (showMenu) {
          setShowMenu(false);
          return;
        }

        // Priority 6: Replying State
        if (replyingTo) {
          setReplyingTo(null);
          return;
        }

        // Priority 7: Close Chat (Deselect)
        if (chatInfo) {
          onCloseChat?.();
        }
      }
    };

    window.addEventListener('keydown', handleChatKeyDown);
    return () => window.removeEventListener('keydown', handleChatKeyDown);
  }, [previewMedia, forwardingMsg, showProfile, showSearchBar, showMenu, replyingTo, chatInfo, onCloseChat]);

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
      <div className="flex-1 bg-wa-bg flex flex-col items-center justify-center border-l border-wa-border relative h-full w-full transition-colors duration-300">
        <div className="text-center max-w-[80%] md:max-w-md z-10 flex flex-col items-center">
          {/* Ilustrasi WA Web */}
          <div className="w-64 h-64 mb-8 opacity-20">
            <svg viewBox="0 0 440 440" fill="currentColor" className="text-[#e9edef]">
              <path d="M220,0C98.5,0,0,98.5,0,220s98.5,220,220,220s220-98.5,220-220S341.5,0,220,0z M220,400c-99.4,0-180-80.6-180-180 S120.6,40,220,40s180,80.6,180,180S319.4,400,220,400z" />
            </svg>
          </div>
          <h1 className="text-[32px] font-light text-wa-text mb-4">WhatsApp Web</h1>
          <p className="text-wa-secondary text-[14px] leading-relaxed">
            Kirim dan terima pesan tanpa perlu menghubungkan telepon Anda ke internet.<br />
            Gunakan WhatsApp tanpa batasan perangkat tertaut dan 1 telepon secara bersamaan.
          </p>
        </div>

        {/* Enkripsi End-to-end */}
        <div className="absolute bottom-10 text-wa-secondary text-[12px] flex items-center gap-1.5">
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



  const displayName = getChatName(chatInfo);
  const avatarColor = getAvatarColor(getChatId(chatInfo));

  return (
    <div className="flex-1 flex flex-col h-full bg-wa-chat-bg relative overflow-hidden w-full border-l border-wa-border transition-colors duration-300">

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
      <header className="h-15 bg-wa-panel flex items-center shadow-sm w-full z-20 shrink-0 transition-colors duration-300">
        <div 
          className="w-full flex items-center justify-between mx-auto"
          // PAKSA PADDING: Kiri 16px, Kanan 24px agar sejajar dengan Sidebar & Chat Bubbles
          style={{ paddingLeft: '16px', paddingRight: '24px' }}
        >
          {/* LEFT SECTION (Profile) */}
          <div
            data-profile-trigger
            className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={async () => {
              if (chatInfo.isGroup) return;
              setShowProfile(true);
              setLoadingProfile(true);
              setResolvedPhone(null);
              try {
                const chatId = getChatId(chatInfo);
                const data = await ChatService.getContactDetail(activeSession, chatId);
                setContactDetail(data);
                if (chatId.includes('@lid')) {
                  const lidResult = await ChatService.getPhoneFromLid(activeSession, chatId);
                  if (lidResult) {
                    const phone = lidResult.user || lidResult.phone || lidResult.wid?.user ||
                      (typeof lidResult === 'string' ? lidResult : null);
                    setResolvedPhone(phone);
                  }
                } else {
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
              className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center font-medium shadow-sm"
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
            {/* TEXT INFO */}
            <div className="flex flex-col justify-center min-w-0 leading-tight">
              <h2 className="text-wa-text text-[16px] font-semibold truncate">
                {displayName}
              </h2>
              <p className="text-[13px] text-wa-secondary truncate mt-0.5 lowercase font-medium">
                {presence || (chatInfo.isGroup ? 'klik untuk info grup' : 'offline')}
              </p>
            </div>
          </div>

          {/* RIGHT SECTION: Action Buttons */}
          <div className="flex items-center gap-1 text-wa-secondary shrink-0">
            <button
              onClick={() => { setShowSearchBar(!showSearchBar); setSearchMsgQuery(''); }}
              className={`p-2.5 hover:bg-wa-hover rounded-full transition-colors ${showSearchBar ? 'text-wa-green bg-wa-hover' : ''}`}
              title="Cari Pesan"
            >
              <Search size={20} strokeWidth={2} />
            </button>
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`p-2.5 hover:bg-wa-hover rounded-full transition-colors ${showMenu ? 'text-wa-green bg-wa-hover' : ''}`}
                title="Menu"
              >
                <MoreVertical size={20} strokeWidth={2} />
              </button>

              {/* DROPDOWN MENU */}
              {showMenu && (
                <div 
                  className="absolute right-0 top-12 bg-wa-panel rounded-xl shadow-2xl border border-wa-border z-50 animate-in fade-in zoom-in-95 duration-150 transition-colors"
                  style={{ width: '220px', padding: '8px' }}
                >
                  {!chatInfo.isGroup && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowProfile(true);
                      }}
                      className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-wa-text text-[14px]"
                      style={{ padding: '10px 12px', gap: '12px' }}
                    >
                      <Info size={18} strokeWidth={2} className="text-wa-secondary" /> 
                      <span className="font-medium">Info Kontak</span>
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); onRefreshMessages?.(); }}
                    className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-wa-text text-[14px]"
                    style={{ padding: '10px 12px', gap: '12px' }}
                  >
                    <RefreshCw size={18} strokeWidth={2} className="text-wa-secondary" /> 
                    <span className="font-medium">Refresh Pesan</span>
                  </button>
                  
                  <div className="bg-wa-border/50" style={{ height: '1px', margin: '6px 4px' }} />
                  
                  <button
                    onClick={() => { setShowMenu(false); onCloseChat?.(); }}
                    className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-red-400 text-[14px]"
                    style={{ padding: '10px 12px', gap: '12px' }}
                  >
                    <LogOut size={18} strokeWidth={2} /> 
                    <span className="font-medium">Tutup Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* SEARCH BAR (Professional Style) */}
      {showSearchBar && (
        <div 
          className="bg-wa-panel border-b border-wa-border z-20 shrink-0 animate-in slide-in-from-top-2 duration-200 transition-colors"
          style={{ paddingLeft: '16px', paddingRight: '24px', paddingTop: '8px', paddingBottom: '8px' }}
        >
          <div 
            className="bg-wa-bg flex items-center h-[38px] rounded-lg gap-3 transition-colors focus-within:ring-1 focus-within:ring-wa-green/40"
            style={{ paddingLeft: '14px', paddingRight: '14px' }}
          >
            <Search size={16} strokeWidth={2} className="text-wa-secondary shrink-0" />
            <input
              type="text"
              value={searchMsgQuery}
              onChange={(e) => setSearchMsgQuery(e.target.value)}
              placeholder="Cari pesan di chat ini..."
              autoFocus
              className="bg-transparent border-none outline-none text-[14px] text-wa-text placeholder:text-wa-secondary flex-1"
            />
            {searchMsgQuery && (
              <div className="flex items-center gap-3">
                <span className="text-wa-secondary text-[12px] font-medium bg-wa-panel px-2 py-0.5 rounded">
                  {messages.filter(m => (m.body || m.text || m.content || '').toLowerCase().includes(searchMsgQuery.toLowerCase())).length} hasil
                </span>
                <button 
                  onClick={() => { setShowSearchBar(false); setSearchMsgQuery(''); }} 
                  className="text-wa-secondary hover:text-wa-text"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            )}
            {!searchMsgQuery && (
              <button onClick={() => setShowSearchBar(false)} className="text-wa-secondary hover:text-wa-text">
                <X size={18} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* MAIN VIEW AREA (H-Full container for chat + profile) */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        {/* AREA PESAN (CHAT BUBBLES) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 z-10 custom-scrollbar flex flex-col relative"
        >

          {/* MAIN MESSAGE WRAPPER (Responsive Container) - Provides structural padding automatically */}
          <div className="flex-1 py-8 flex flex-col gap-1 relative z-10 min-w-0 mx-auto w-full max-w-[1200px]"
          style={{ paddingLeft: '20px', paddingRight: '24px' }}>
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
                      <div className="bg-wa-quoted-bg text-wa-secondary text-[12.5px] px-4 py-1.5 rounded-lg shadow-md border border-wa-border/50 font-medium tracking-wide transition-colors">
                        {formatDateDivider(msgTimestamp)}
                      </div>
                    </div>
                  )}

                  <div
                    id={`msg-${getMsgId(msg)}`}
                    className={`message-row w-full flex ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0'} transition-opacity duration-200 ${isSearchActive && !isMatch ? 'opacity-20' : 'opacity-100'}`}
                  >
                    <div
                      className={`message-bubble relative group/bubble rounded-xl flex-shrink-1 w-fit max-w-[85%] md:max-w-[75%] lg:max-w-[65%] min-w-0 transition-colors shadow-sm ${isMe
                        ? `bg-wa-outgoing text-wa-text ${isFirstInGroup ? 'rounded-tr-none bubble-tail-out' : ''}`
                        : `bg-wa-incoming text-wa-text ${isFirstInGroup ? 'rounded-tl-none bubble-tail-in' : ''}`
                        }`}
                    >
                      {/* HOVER ACTIONS (Reply/Forward) */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-gradient-to-l from-wa-panel/80 to-transparent pr-1 pl-6 py-0.5 rounded-tr-xl flex items-center gap-1 z-30">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }} 
                          className="text-wa-secondary hover:text-wa-green p-1.5 hover:bg-wa-hover rounded-full transition-all" 
                          title="Balas"
                        >
                          <CornerUpLeft size={18} strokeWidth={2.5} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleForwardClick(msg); }} 
                          className="text-wa-secondary hover:text-wa-green p-1.5 hover:bg-wa-hover rounded-full transition-all" 
                          title="Teruskan"
                        >
                          <CornerUpRight size={18} strokeWidth={2.5} />
                        </button>
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
                        {/* FORWARDED INDICATOR */}
                        {(msg.isForwarded || msg.forwarded || (msg.forwardingScore && msg.forwardingScore > 0)) && (
                          <div className={`flex items-center gap-1 text-[#8696a0] text-[12.5px] italic mb-1 ${renderedMedia ? 'px-2 pt-1' : ''}`}>
                            <CornerUpRight size={13} strokeWidth={2.5} />
                            <span>Diteruskan</span>
                          </div>
                        )}

                        {/* QUOTED MESSAGE */}
                        {msg.quotedMsg && (
                          <QuotedMessage 
                            quotedMsg={msg.quotedMsg} 
                            isMe={isMe} 
                            scrollToMessage={scrollToMessage} 
                            messages={messages}
                          />
                        )}

                        {/* 1. MEDIA RENDER (Jika ada) */}
                        {renderedMedia && React.cloneElement(renderedMedia, { setPreviewMedia })}

                        {/* 2. TEXT RENDER (Jika ada) */}
                        {hasText && (
                          <div className={`text-[14.5px] leading-[1.4] whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0 ${renderedMedia ? 'px-2 pt-2' : ''}`}>
                            {formatWhatsAppText(getMessageContent(msg), isSearchActive && isMatch ? searchMsgQuery : null)}

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

        {/* PROFILE OVERLAY */}
        <div className={`transition-all duration-500 ease-in-out absolute inset-0 bg-[#0b141a] z-[100] flex flex-col ${showProfile ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
          {showProfile && (
            <>
              {/* 1. Header */}
              <div className="h-16 bg-[#202c33] flex items-center gap-6 px-6 shrink-0 border-b border-white/5 shadow-md z-20">
                <button
                  onClick={() => setShowProfile(false)}
                  className="text-[#8696a0] hover:text-white transition-all p-2 hover:bg-white/5 rounded-full"
                >
                  <X size={22} strokeWidth={2.5} />
                </button>
                <h3 className="text-[#e9edef] text-[18px] font-bold">Info Kontak</h3>
              </div>

              {/* 2. Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-6">
                
                {loadingProfile ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="animate-spin w-10 h-10 border-2 border-[#00a884] border-t-transparent rounded-full" />
                    <span className="text-[#8696a0] text-sm">Sinkronisasi...</span>
                  </div>
                ) : (
                  <div className="w-[92%] max-w-[450px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* --- HERO SECTION (Avatar & Nama) --- */}
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-36 h-36 rounded-full overflow-hidden shadow-2xl border-[3px] border-[#202c33] relative z-10">
                        {chatInfo.avatar ? (
                          <img src={chatInfo.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[60px] text-white/10 font-light" style={{ background: avatarColor }}>
                            {displayName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="mt-5 text-center">
                        <h2 className="text-[#e9edef] text-[24px] font-bold tracking-tight mb-1">
                          {contactDetail?.pushname || contactDetail?.name || displayName}
                        </h2>
                        <p className="text-[#00a884] text-[15px] font-medium opacity-90">
                          {resolvedPhone ? `+${resolvedPhone}` : (chatInfo.id?.user ? `+${chatInfo.id.user}` : 'Nomor Privat')}
                        </p>
                      </div>
                    </div>

                    {/* --- DETAIL CARDS (PERBAIKAN: LEBIH KOTAK & TEXT OFFSET) --- */}
                    <div className="space-y-5">
                      
                      {/* Card 1: Nomor Telepon */}
                      <div className="w-full group">
                        <div className="flex items-center gap-2 mb-2 ml-2 opacity-80">
                          <Smartphone size={14} className="text-[#00a884]" />
                          <span className="text-[#00a884] text-[11px] font-bold uppercase tracking-[0.15em]">Telepon</span>
                        </div>
                        
                        {/* Perbaikan: px-6 agar teks tidak nempel kiri, rounded-lg (lebih kotak), py-5 (tinggi pas) */}
                        <div className="bg-[#202c33] rounded-lg px-12 py-16 shadow-lg border border-white/[0.05] flex items-center justify-between transition-all hover:bg-[#26353d]">
                          <span className="text-[#e9edef] text-[19px] font-mono font-medium tracking-tight">
                            {resolvedPhone || chatInfo.id?.user || '---'}
                          </span>
                          <button
                            onClick={() => {
                              const num = resolvedPhone || chatInfo.id?.user;
                              if (num) {
                                navigator.clipboard.writeText(num);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }
                            }}
                            className={`p-2.5 rounded-lg transition-all ${copied ? 'bg-[#00a884] text-white' : 'bg-[#2a3942] text-[#8696a0] hover:text-white'}`}
                          >
                            {copied ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Card 2: Bio */}
                      <div className="w-full group">
                        <div className="flex items-center gap-2 mb-2 ml-2 opacity-80">
                          <Info size={14} className="text-[#00a884]" />
                          <span className="text-[#00a884] text-[11px] font-bold uppercase tracking-[0.15em]">Tentang / Bio</span>
                        </div>
                        
                        {/* Perbaikan: px-6 dan py-6 agar teks bio lega tapi tetap rapi */}
                        <div className="bg-[#202c33] rounded-lg px-6 py-6 shadow-lg border border-white/[0.05] transition-all hover:bg-[#26353d]">
                          <p className="text-[#e9edef] text-[16px] leading-relaxed italic opacity-85">
                            "{contactDetail?.about || 'Status tidak tersedia'}"
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Footer */}
                    <div className="mt-12 text-center pb-8">
                      <p className="text-[#8696a0] text-[10px] uppercase tracking-[0.2em] opacity-20 font-bold">
                        End-to-End Encrypted
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
      <footer className="z-20 w-full shrink-0 bg-wa-panel transition-colors duration-300">
        <div className="w-full mx-auto">
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

      {/* MEDIA PREVIEW LIGHTBOX */}
      {previewMedia && (
        <MediaPreview 
          isOpen={!!previewMedia}
          onClose={() => setPreviewMedia(null)}
          mediaUrl={previewMedia.url}
          type={previewMedia.type}
          fileName={previewMedia.fileName}
          onDownload={previewMedia.onDownload}
        />
      )}
    </div>
  );
};