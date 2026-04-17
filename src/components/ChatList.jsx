import React from 'react';
import { getChatId, getChatName, getLastMessageText, getAvatarColor } from '../utils/chatUtils';

export const ChatList = ({ chats, onSelectChat, selectedChatId }) => {
  // Helper for date formatting like WhatsApp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);  
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#111b21] h-full">
      {chats.map((chat, idx) => {
        const serializedId = getChatId(chat) || `chat-fallback-${idx}`;
        const displayName = getChatName(chat);
        const avatarColor = getAvatarColor(serializedId);
        const initials = displayName !== 'Kontak Baru' ? displayName.charAt(0).toUpperCase() : '?';
        const isSelected = selectedChatId === serializedId;

        return (
          <div
            key={serializedId} 
            onClick={() => onSelectChat(serializedId)}
            className={`group flex items-center h-[72px] cursor-pointer transition-all duration-200 relative ${
              isSelected ? 'bg-[#2a3942] chat-item-floating shadow-lg z-10' : 'hover:bg-[#202c33]'
            }`}
          >
            {/* 1. AREA AVATAR (Standard WA padding) */}
            <div className="pl-3 pr-3 flex-shrink-0 h-full flex items-center">
              <div
                // Ukuran Avatar sedikit dibesarkan menjadi 50x50px
                className="w-[50px] h-[50px] rounded-full overflow-hidden flex items-center justify-center shadow-sm"
                style={{ backgroundColor: chat.avatar ? 'transparent' : avatarColor }}
              >
                {chat.avatar ? (
                  <img
                    src={chat.avatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[#e9edef] text-[19px] font-medium uppercase select-none">
                    {initials}
                  </span>
                )}
              </div>
            </div>

            {/* 2. AREA TEKS (Diberi jarak ekstra pr-6 agar jam/angka tidak menempel ke scrollbar) */}
            <div className="flex-1 min-w-0 pr-6 h-full flex flex-col justify-center border-b border-[#222d34] group-last:border-transparent">
              
              {/* Baris Atas: Nama & Waktu */}
              <div className="flex justify-between items-center mb-0.5">
                <h3 className="text-[#e9edef] text-[16px] font-normal truncate leading-snug pr-3">
                  {displayName}
                </h3>
                {(chat.t || chat.timestamp) && (
                  <span className={`text-[12px] shrink-0 mt-0.5 ${chat.unreadCount > 0 ? 'text-[#00a884] font-medium' : 'text-[#8696a0]'}`}>
                    {formatTime(chat.t || chat.timestamp)}
                  </span>
                )}
              </div>

              {/* Baris Bawah: Pesan Terakhir & Badge Unread */}
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[14px] text-[#8696a0] truncate leading-snug pr-4">
                  {getLastMessageText(chat)}
                </p>

                {chat.unreadCount > 0 && (
                  <div className="flex items-center shrink-0">
                    <span className="bg-[#00a884] text-[#111b21] text-[11px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5 flex items-center justify-center shadow-sm">
                      {chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};