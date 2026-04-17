import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSessions } from './hooks/useSessions';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { QrModal } from './components/QrModal';
import { ChatList } from './components/ChatList';
import { getChatId, getChatName } from './utils/chatUtils';
import { ChatWindow } from './components/ChatWindow';
import { SquarePlus, MoreVertical, Search, Settings, ChevronLeft, RefreshCw, Users } from 'lucide-react';
import { socketService } from './services/socketService';

function App() {
  const { sessions, qrCode, createNewSession, setQrCode, activeSession, setActiveSession } = useSessions();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showSessionManager, setShowSessionManager] = useState(!activeSession);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const sidebarMenuRef = useRef(null);

  const { chats, loading: loadingChats, error: chatError, fetchChats } = useChats(activeSession);
  const [searchQuery, setSearchQuery] = useState('');

  // --- LOGIKA RESIZABLE SIDEBAR ---
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('idos-sidebar-width');
    return saved ? parseInt(saved) : 350;
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      const minWidth = window.innerWidth * 0.2; // Minimal 20%
      const maxWidth = window.innerWidth * 0.5; // Maksimal 50%

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
        localStorage.setItem('idos-sidebar-width', newWidth.toString());
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);
  // --------------------------------
  const filteredChats = chats?.filter(c => {
    if (!searchQuery.trim()) return true;
    const name = getChatName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const selectedChatInfo = chats?.find(c => getChatId(c) === selectedChatId);
  const isGroup = selectedChatInfo?.isGroup || selectedChatId?.endsWith('@g.us');

  const { messages, loading: loadingMessages, fetchMessages, sendMessage, sendFile, forwardMsg } = useMessages(activeSession, selectedChatId, isGroup);

  // Connect socket on mount
  useEffect(() => {
    socketService.connect();
    return () => socketService.disconnect();
  }, []);

  // Close sidebar menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sidebarMenuRef.current && !sidebarMenuRef.current.contains(e.target)) setShowSidebarMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-fetch chats when active session changes
  useEffect(() => {
    if (activeSession) {
      fetchChats();
    }
  }, [activeSession, fetchChats]);

  // Auto-fetch messages when selected chat changes
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages();
    }
  }, [selectedChatId, fetchMessages]);

  const handleAddSession = () => {
    const sessionName = prompt("Masukkan nama sesi (contoh: idos_dev):");
    if (sessionName) createNewSession(sessionName);
  };

  // PERBAIKAN: Menghapus return ( yang dobel
  return (
    <div className={`flex h-screen w-full bg-[#111b21] overflow-hidden text-[#e9edef] font-sans antialiased ${isResizing ? 'is-resizing' : ''}`}>

      {/* KOLOM KIRI (SIDEBAR) */}
      <div
        className={`bg-[#111b21] flex flex-col border-r border-[#222d34] z-20 shrink-0 ${selectedChatId ? 'hidden sm:flex' : 'flex'}`}
        style={{ width: window.innerWidth >= 640 ? `${sidebarWidth}px` : '100%' }}
      >
        {/* Konten Sidebar tetap sama... */}

        {/* HEADER SIDEBAR (Modern WhatsApp Style) */}
        {!showSessionManager && (
          <header className="px-6 pt-12 pb-6 flex justify-between items-center shrink-0">
            <h1 className="text-[28px] font-bold text-[#e9edef] tracking-tight">Chats</h1>
            <div className="flex items-center gap-5 text-[#aebac1]">
              <button onClick={handleAddSession} className="p-2 hover:bg-[#202c33] rounded-full transition-colors" title="New Chat">
                <SquarePlus size={22} strokeWidth={1.5} />
              </button>
              <div className="relative" ref={sidebarMenuRef}>
                <button
                  onClick={() => setShowSidebarMenu(!showSidebarMenu)}
                  className={`p-2 hover:bg-[#202c33] rounded-full transition-colors ${showSidebarMenu ? 'text-[#00a884]' : ''}`}
                >
                  <MoreVertical size={22} strokeWidth={1.5} />
                </button>
                {showSidebarMenu && (
                  <div className="absolute right-0 top-10 bg-[#233138] rounded-xl shadow-2xl py-2 w-[200px] border border-white/5 z-50 animate-in slide-in-from-top-1 duration-150">
                    <button
                      onClick={() => { setShowSidebarMenu(false); fetchChats(); }}
                      className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                    >
                      <RefreshCw size={16} className="text-[#8696a0]" /> Refresh Chat
                    </button>
                    <button
                      onClick={() => { setShowSidebarMenu(false); setShowSessionManager(true); }}
                      className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                    >
                      <Settings size={16} className="text-[#8696a0]" /> Kelola Sesi
                    </button>
                    <button
                      onClick={() => { setShowSidebarMenu(false); handleAddSession(); }}
                      className="flex items-center gap-3 w-full px-5 py-3 hover:bg-white/5 transition-colors text-left text-[#e9edef] text-[14px]"
                    >
                      <SquarePlus size={16} className="text-[#8696a0]" /> Tambah Sesi Baru
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {showSessionManager && (
          <header className="h-[75px] bg-[#202c33] px-8 flex justify-between items-center shrink-0">
            <div className="flex items-center">
              <div
                className="w-10 h-10 rounded-full bg-[#51585c] overflow-hidden cursor-pointer flex items-center justify-center font-medium"
                onClick={() => setShowSessionManager(false)}
              >
                <img src={`https://ui-avatars.com/api/?name=${activeSession || 'Me'}&background=random`} alt="me" />
              </div>
            </div>
            <div className="flex items-center gap-3 text-[#aebac1]">
              <button key="add-session" onClick={handleAddSession} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Add Session">
                <SquarePlus size={22} strokeWidth={1.5} />
              </button>
            </div>
          </header>
        )}

        {/* SEARCH BAR (Professional & Spacious) */}
        {!showSessionManager && (
          <div className="px-8 pb-8 shrink-0">
            <div className="bg-[#202c33] flex items-center h-[42px] px-4 rounded-xl gap-4">
              <Search size={18} strokeWidth={1.5} className="text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search or start a new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[14px] w-full placeholder:text-[#8696a0] text-[#d1d7db]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-[#8696a0] hover:text-[#e9edef]">
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* AREA KONTEN (DAFTAR CHAT / MANAJER SESI) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {showSessionManager ? (
            <div className="animate-in fade-in duration-300">
              <div className="px-8 py-6 flex items-center gap-2 text-[#00a884] text-sm font-medium tracking-wide">
                PILIH SESI AKTIF
              </div>
              {sessions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveSession(s.session);
                    setShowSessionManager(false);
                  }}
                  className={`px-8 py-3 border-b border-[#222d34] hover:bg-[#202c33] cursor-pointer flex gap-5 items-center transition-colors ${activeSession === s.session ? 'bg-[#2a3942]' : ''}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${s.status === 'CONNECTED' ? 'bg-[#00a884]' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#e9edef] truncate">{s.session}</p>
                    <p className="text-xs text-[#8696a0] truncate">{s.status}</p>
                  </div>
                  {activeSession === s.session && <div className="text-[#00a884] text-[11px] font-bold">AKTIF</div>}
                </div>
              ))}
            </div>
          ) : loadingChats ? (
            <div className="flex flex-col items-center justify-center p-10 gap-4">
              <div className="animate-spin w-8 h-8 border-[3px] border-[#00a884] border-t-transparent rounded-full" />
              <span className="text-[#8696a0] text-sm">Memuat chat...</span>
            </div>
          ) : chatError ? (
            <div className="p-10 text-center">
              <p className="text-red-400 text-sm mb-2">Gagal memuat chat</p>
              <p className="text-[#8696a0] text-xs mb-4">{chatError}</p>
              <button onClick={fetchChats} className="bg-[#00a884] text-[#111b21] px-4 py-2 rounded-full text-sm font-medium hover:bg-opacity-90">Coba Lagi</button>
            </div>
          ) : chats?.length === 0 ? (
            <div className="p-10 text-center text-[#8696a0] text-sm">
              <p>Belum ada chat.</p>
              <p className="text-xs mt-2">Pastikan nomor WhatsApp ini sudah pernah mengirim atau menerima pesan.</p>
              <button onClick={fetchChats} className="text-[#00a884] font-medium mt-4 hover:underline">Refresh</button>
            </div>
          ) : (
            <ChatList
              chats={filteredChats || []}
              onSelectChat={setSelectedChatId}
              selectedChatId={selectedChatId}
            />
          )}
        </div>

        {/* TOMBOL PENGATURAN SESI DI BAWAH */}
        {!showSessionManager && (
          <div
            className="p-3 bg-[#202c33] border-t border-[#222d34] flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 text-[#8696a0] text-[14px] shrink-0 transition-colors"
            onClick={() => setShowSessionManager(true)}
          >
            <Settings size={18} strokeWidth={1.5} />
            Kelola Sesi
          </div>
        )}
      </div>

      {/* RESIZER BAR (Hanya muncul di desktop/tablet >= 640px) */}
      <div
        onMouseDown={startResizing}
        className={`hidden sm:block w-[4px] cursor-col-resize hover:bg-[#00a884] active:bg-[#00a884] transition-colors z-30 shrink-0 ${isResizing ? 'bg-[#00a884]' : 'bg-transparent'}`}
        title="Geser untuk mengubah ukuran"
      />

      {/* KOLOM KANAN (AREA CHAT) */}
      <div className={`flex-1 min-w-0 flex-col bg-[#222e35] relative ${selectedChatId ? 'flex' : 'hidden sm:flex'}`}>
        {/* Tombol Back untuk Mobile (Hanya muncul di layar HP < 640px saat chat terbuka) */}
        {selectedChatId && (
          <button
            onClick={() => setSelectedChatId(null)}
            className="sm:hidden absolute top-3 left-2 z-50 p-2 text-[#aebac1] hover:bg-white/10 rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <ChatWindow
          messages={messages || []}
          chatInfo={selectedChatInfo}
          chats={chats || []}
          onSendMessage={sendMessage}
          onSendFile={sendFile}
          onForwardMessage={forwardMsg}
          loading={loadingMessages}
          activeSession={activeSession}
          onRefreshMessages={fetchMessages}
          onCloseChat={() => setSelectedChatId(null)}
        />
      </div>

      {/* MODAL QR CODE */}
      <QrModal qrData={typeof qrCode === 'string' ? qrCode : (qrCode?.code || null)} onClose={() => setQrCode(null)} />

    </div>
  );
}

export default App;