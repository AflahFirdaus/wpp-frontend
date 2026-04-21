import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSessions } from './hooks/useSessions';
import { useChats } from './hooks/useChats';
import { useMessages } from './hooks/useMessages';
import { QrModal } from './components/QrModal';
import { ChatList } from './components/ChatList';
import { getChatId, getChatName } from './utils/chatUtils';
import { ChatWindow } from './components/ChatWindow';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SquarePlus, MoreVertical, Search, Settings, ChevronLeft, RefreshCw, Users, Trash2 } from 'lucide-react';
import { socketService } from './services/socketService';
import { AddSessionModal } from './components/AddSessionModal';
import { ConfirmModal } from './components/ConfirmModal';

function App() {
  const { sessions, qrCode, createNewSession, deleteSession, setQrCode, activeSession, setActiveSession } = useSessions();
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showSessionManager, setShowSessionManager] = useState(!activeSession);
  const [showSidebarMenu, setShowSidebarMenu] = useState(false);
  const sidebarMenuRef = useRef(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, sessionName: null });

  const { chats, loading: loadingChats, error: chatError, fetchChats } = useChats(activeSession, selectedChatId);
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
  const [chatFilter, setChatFilter] = useState('all'); // 'all', 'personal', 'group'

  const filteredChats = chats?.filter(c => {
    // Filter by search query
    if (searchQuery.trim()) {
      const name = getChatName(c).toLowerCase();
      if (!name.includes(searchQuery.toLowerCase())) return false;
    }
    
    // Filter by type
    if (chatFilter === 'personal') {
      return !c.isGroup;
    } else if (chatFilter === 'group') {
      return c.isGroup;
    }
    
    return true; // 'all'
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

  // --- GLOBAL KEYBOARD NAVIGATION (Esc) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        let handled = false;
        // Layered close for global modals
        if (confirmModal.isOpen) {
          setConfirmModal({ isOpen: false, sessionName: null });
          handled = true;
        } else if (isAddModalOpen) {
          setIsAddModalOpen(false);
          handled = true;
        } else if (qrCode) {
          setQrCode(null);
          handled = true;
        } else if (showSessionManager) {
          setShowSessionManager(false);
          handled = true;
        }

        if (handled) {
          e.stopImmediatePropagation();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [confirmModal, isAddModalOpen, qrCode, showSessionManager]);
  // ----------------------------------------

  // Auto-fetch messages when selected chat changes
  useEffect(() => {
    if (selectedChatId) {
      fetchMessages();
    }
  }, [selectedChatId, fetchMessages]);

  const handleAddSession = () => {
  setIsAddModalOpen(true); // Buka modalnya
};

// Buat fungsi baru untuk mengeksekusi saat tombol "Buat Sesi" di modal ditekan
const executeAddSession = (sessionName) => {
  createNewSession(sessionName);
};

  return (
    <div className={`flex h-screen w-full bg-wa-bg overflow-hidden text-wa-text font-sans antialiased transition-colors duration-300 ${isResizing ? 'is-resizing' : ''}`}>

      {/* KOLOM KIRI (SIDEBAR) */}
      <div
        className={`bg-wa-bg flex flex-col border-r border-wa-border z-20 shrink-0 transition-colors duration-300 ${selectedChatId ? 'hidden sm:flex' : 'flex'}`}
        style={{ width: window.innerWidth >= 640 ? `${sidebarWidth}px` : '100%' }}
      >
        
        {/* HEADER SIDEBAR (Modern WhatsApp Style) */}
        {!showSessionManager && (
          <header 
            className="flex justify-between items-center shrink-0 transition-colors duration-300"
            style={{ paddingLeft: '16px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}
          >
            <h1 className="text-[24px] font-bold text-wa-text tracking-tight">Chats</h1>
            <div className="flex items-center gap-3 text-wa-secondary">
              <ThemeToggle />
              <button onClick={handleAddSession} className="p-2 hover:bg-wa-panel rounded-full transition-colors" title="New Chat">
                <SquarePlus size={20} strokeWidth={2} />
              </button>
              <div className="relative" ref={sidebarMenuRef}>
                <button
                  onClick={() => setShowSidebarMenu(!showSidebarMenu)}
                  className={`p-2 hover:bg-wa-panel rounded-full transition-colors ${showSidebarMenu ? 'text-wa-green bg-wa-panel' : ''}`}
                >
                  <MoreVertical size={20} strokeWidth={2} />
                </button>
                {showSidebarMenu && (
                  <div 
                    className="absolute right-0 top-12 bg-wa-panel rounded-xl shadow-2xl border border-wa-border z-50 animate-in fade-in zoom-in-95 duration-150 transition-colors"
                    style={{ width: '240px', padding: '8px' }}
                  >
                    <button
                      onClick={() => { setShowSidebarMenu(false); fetchChats(); }}
                      className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-wa-text text-[14px]"
                      style={{ padding: '10px 12px', gap: '12px' }}
                    >
                      <RefreshCw size={18} strokeWidth={2} className="text-wa-secondary" /> 
                      <span className="font-medium">Refresh Chat</span>
                    </button>
                    <button
                      onClick={() => { setShowSidebarMenu(false); setShowSessionManager(true); }}
                      className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-wa-text text-[14px]"
                      style={{ padding: '10px 12px', gap: '12px', marginTop: '2px' }}
                    >
                      <Settings size={18} strokeWidth={2} className="text-wa-secondary" /> 
                      <span className="font-medium">Kelola Sesi</span>
                    </button>
                    <div className="bg-wa-border/50" style={{ height: '1px', margin: '6px 4px' }} />
                    <button
                      onClick={() => { setShowSidebarMenu(false); handleAddSession(); }}
                      className="flex items-center w-full rounded-lg hover:bg-wa-hover transition-colors text-left text-wa-text text-[14px]"
                      style={{ padding: '10px 12px', gap: '12px' }}
                    >
                      <SquarePlus size={18} strokeWidth={2} className="text-wa-secondary" /> 
                      <span className="font-medium">Tambah Sesi Baru</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* HEADER SESSION MANAGER */}
        {showSessionManager && (
          <header 
            className="h-16 bg-wa-panel flex justify-between items-center shrink-0 transition-colors duration-300 border-b border-wa-border/50"
            style={{ paddingLeft: '16px', paddingRight: '24px' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-[#51585c] overflow-hidden cursor-pointer flex items-center justify-center font-medium shadow-sm"
                onClick={() => setShowSessionManager(false)}
              >
                <img src={`https://ui-avatars.com/api/?name=${activeSession || 'Me'}&background=random`} alt="me" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold text-wa-text text-[16px]">Sesi Aktif</span>
            </div>
            <button onClick={handleAddSession} className="p-2 hover:bg-wa-hover rounded-full transition-colors text-wa-secondary">
              <SquarePlus size={20} strokeWidth={2} />
            </button>
          </header>
        )}

        {/* SEARCH BAR & FILTER TABS */}
        {!showSessionManager && (
          <div className="shrink-0 flex flex-col gap-3" style={{ paddingBottom: '12px' }}>
            {/* SEARCH BOX */}
            <div style={{ paddingLeft: '16px', paddingRight: '24px' }}>
              <div 
                className="bg-wa-panel flex items-center h-[36px] rounded-lg gap-3 transition-colors focus-within:ring-1 focus-within:ring-wa-green/50"
                style={{ paddingLeft: '14px', paddingRight: '14px' }}
              >
                <Search size={16} strokeWidth={2} className="text-wa-secondary shrink-0" />
                <input
                  type="text"
                  placeholder="Search or start a new chat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-[14px] w-full text-wa-text placeholder:text-wa-secondary"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-wa-secondary" style={{ width: '20px' }}>✕</button>
                )}
              </div>
            </div>

            {/* FILTER PILLS */}
            <div className="flex items-center gap-2" style={{ paddingLeft: '16px', paddingRight: '24px' }}>
              {[
                { id: 'all', label: 'Semua' },
                { id: 'personal', label: 'Personal' },
                { id: 'group', label: 'Grup' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setChatFilter(tab.id)}
                  className={`rounded-full text-[13px] font-medium transition-all duration-200 border ${
                    chatFilter === tab.id
                      ? 'bg-wa-green/10 text-wa-green border-wa-green/20'
                      : 'bg-wa-panel text-wa-secondary border-transparent hover:bg-wa-hover'
                  }`}
                  style={{ paddingTop: '6px', paddingBottom: '6px', paddingLeft: '14px', paddingRight: '14px', minWidth: '60px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AREA KONTEN (DAFTAR CHAT / MANAJER SESI) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border-t border-wa-border/50">
          {showSessionManager ? (
            <div className="animate-in fade-in duration-300">
              <div className="py-6 flex items-center gap-2 text-wa-green text-sm font-medium tracking-wide" style={{ paddingLeft: '16px', paddingRight: '24px' }}>
                PILIH SESI AKTIF
              </div>
              {sessions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => { setActiveSession(s.session); setShowSessionManager(false); }}
                  className={`py-4 border-b border-wa-border hover:bg-wa-hover cursor-pointer flex gap-4 items-center transition-colors ${activeSession === s.session ? 'bg-black/5 dark:bg-[#2a3942]' : ''}`}
                  style={{ paddingLeft: '16px', paddingRight: '24px' }}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.status === 'CONNECTED' ? 'bg-wa-green' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-wa-text truncate">{s.session}</p>
                    <p className="text-xs text-wa-secondary truncate">{s.status}</p>
                  </div>
                  {activeSession === s.session && <div className="text-wa-green text-[11px] font-bold">AKTIF</div>}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmModal({ isOpen: true, sessionName: s.session });
                    }}
                    className="p-2 hover:bg-red-500/10 text-wa-secondary hover:text-red-500 rounded-full transition-colors"
                    title="Hapus Sesi"
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <ChatList
              chats={filteredChats || []}
              onSelectChat={setSelectedChatId}
              selectedChatId={selectedChatId}
              activeSession={activeSession}
            />
          )}
        </div>

        {/* TOMBOL PENGATURAN SESI DI BAWAH */}
        {!showSessionManager && (
          <div
            className="p-3 bg-wa-panel border-t border-wa-border flex items-center justify-center gap-2 cursor-pointer hover:bg-wa-hover text-wa-secondary text-[14px] shrink-0 transition-colors"
            onClick={() => setShowSessionManager(true)}
          >
            <Settings size={18} strokeWidth={1.5} />
            Kelola Sesi
          </div>
        )}
      </div>

      {/* RESIZER BAR */}
      <div
        onMouseDown={startResizing}
        className={`hidden sm:block w-[4px] cursor-col-resize hover:bg-[#00a884] active:bg-[#00a884] transition-colors z-30 shrink-0 ${isResizing ? 'bg-[#00a884]' : 'bg-transparent'}`}
      />

      {/* KOLOM KANAN (AREA CHAT) */}
      <div className={`flex-1 min-w-0 flex flex-col bg-wa-bg relative transition-colors duration-300 ${selectedChatId ? 'flex' : 'hidden sm:flex'}`}>
        {selectedChatId && (
          <button
            onClick={() => setSelectedChatId(null)}
            className="sm:hidden absolute top-3 left-2 z-50 p-2 text-wa-secondary hover:bg-wa-hover rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <ErrorBoundary>
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
        </ErrorBoundary>
      </div>

      <QrModal qrData={typeof qrCode === 'string' ? qrCode : (qrCode?.code || null)} onClose={() => setQrCode(null)} />
      <AddSessionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={executeAddSession} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Hapus Sesi?"
        message={`Apakah Anda yakin ingin menghapus sesi "${confirmModal.sessionName}"? Semua data chat dan media pada server untuk sesi ini akan hilang secara permanen.`}
        confirmText="Hapus Permanen"
        onConfirm={() => {
          deleteSession(confirmModal.sessionName);
          setConfirmModal({ isOpen: false, sessionName: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, sessionName: null })}
      />
    </div>
  );
}

export default App;