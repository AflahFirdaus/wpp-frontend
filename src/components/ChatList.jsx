import React, { memo } from 'react';
import { getChatId, getChatName, getLastMessageText, getAvatarColor } from '../utils/chatUtils';
import { ChatAvatar } from './ChatAvatar';

// 1. Component ChatItem yang di-memoized untuk performa maksimal
const ChatItem = memo(({ chat, isSelected, onSelectChat, activeSession, serializedId }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const phone = serializedId.split('@')[0];
  const displayName = getChatName(chat);
  const avatarColor = getAvatarColor(serializedId);
  const lastMsg = chat.lastMessage || (chat.msgs && chat.msgs.length > 0 ? chat.msgs[chat.msgs.length - 1] : null);
  const timestamp = lastMsg?.t || lastMsg?.timestamp || chat.t || chat.timestamp;

  return (
    <div
      onClick={() => onSelectChat(serializedId)}
      className={`group flex items-center h-[72px] w-full cursor-pointer transition-colors ${
        isSelected ? 'bg-wa-hover' : 'hover:bg-wa-hover'
      }`}
    >
      <div className="flex-shrink-0" style={{ paddingLeft: '16px', paddingRight: '12px' }}>
        <ChatAvatar
          session={activeSession}
          phone={phone}
          isGroup={chat.isGroup}
          displayName={displayName}
          avatarColor={avatarColor}
          token={localStorage.getItem(`wpp_token_${activeSession}`)}
        />
      </div>

      <div
        className="flex-1 flex flex-col justify-center h-full min-w-0 border-b border-wa-border group-last:border-none"
        style={{ paddingRight: '24px' }}
      >
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-base text-wa-text font-normal truncate" style={{ paddingRight: '8px' }}>
            {displayName}
          </h3>
          <span className={`text-xs flex-shrink-0 ${chat.unreadCount > 0 ? 'text-wa-green font-medium' : 'text-wa-secondary'}`}>
            {formatTime(timestamp)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-wa-secondary truncate flex-1">
            {getLastMessageText(chat)}
          </p>
          {chat.unreadCount > 0 && (
            <span className="bg-wa-green text-wa-bg text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center" style={{ marginLeft: '8px' }}>
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Hanya re-render jika data chat yang krusial berubah atau status seleksi berubah
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.t === nextProps.chat.t &&
    prevProps.chat.lastMessage?.id === nextProps.chat.lastMessage?.id &&
    prevProps.chat.lastMessage?.ack === nextProps.chat.lastMessage?.ack
  );
});

export const ChatList = ({ chats, onSelectChat, selectedChatId, activeSession, sessionToken }) => {
  const [visibleCount, setVisibleCount] = React.useState(30);

  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 100;
    if (bottom && visibleCount < chats.length) {
      setVisibleCount(prev => Math.min(prev + 30, chats.length));
    }
  };

  return (
    <div className="w-full h-full flex-1 overflow-y-auto custom-scrollbar" onScroll={handleScroll}>
      {chats.slice(0, visibleCount).map((chat, idx) => {
        const serializedId = getChatId(chat) || `chat-fallback-${idx}`;
        return (
          <ChatItem
            key={serializedId}
            chat={chat}
            serializedId={serializedId}
            isSelected={selectedChatId === serializedId}
            onSelectChat={onSelectChat}
            activeSession={activeSession}
            sessionToken={sessionToken}
          />
        );
      })}
    </div>
  );
};