import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { formatLastSeen } from '../utils/chatUtils';

/**
 * Hook untuk menangani status kehadiran (Online/Last Seen/Typing) secara real-time.
 */
export const usePresence = (activeSession, selectedChatId, isGroup = false) => {
  const [presence, setPresence] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  // 1. Fungsi untuk memperbarui status berdasarkan data presence
  const updatePresenceStatus = useCallback((data) => {
    // WPPConnect presence data structure
    // { id: '...', isOnline: true/false, chatstate: 'typing'/'composing'/'recording' }

    if (data.isOnline) {
      let statusText = 'online';
      if (data.chatstate === 'composing' || data.chatstate === 'typing') {
        statusText = 'sedang mengetik...';
      } else if (data.chatstate === 'recording') {
        statusText = 'sedang merekam audio...';
      }
      setPresence(statusText);
      setIsOnline(true);
    } else {
      // Jika offline, coba ambil last seen (Pastikan formatLastSeen mengembalikan string)
      const lastSeenText = formatLastSeen(data.lastSeen || data.updatedAt);
      setPresence(typeof lastSeenText === 'string' ? lastSeenText : '');
      setIsOnline(false);
    }
  }, []);

  // 2. Initial Fetch & Subscription
  useEffect(() => {
    if (!activeSession || !selectedChatId || isGroup) {
      setPresence(isGroup ? 'klik untuk info grup' : '');
      setIsOnline(false);
      return;
    }

    let isMounted = true;

    const initPresence = async () => {
      try {
        // A. Ambil status terakhir dari API
        const data = await ChatService.getLastSeen(activeSession, selectedChatId);
        if (isMounted && data) {
          // Jika backend mengembalikan isOnline true
          if (data.isOnline) {
            setPresence('online');
            setIsOnline(true);
          } else {
            const lastSeenText = formatLastSeen(data.lastSeen || data.updatedAt);
            setPresence(typeof lastSeenText === 'string' ? lastSeenText : '');
            setIsOnline(false);
          }
        }

        // B. Subscribe ke update presence (Sangat penting untuk real-time)
        await ChatService.subscribePresence(activeSession, selectedChatId, isGroup);
      } catch (err) {
        console.warn("Presence init error:", err);
      }
    };

    initPresence();

    // C. Listener Socket.io untuk update real-time
    const cleanup = socketService.on('onpresencechanged', (data) => {
      // Backend emits: { session: '...', response: { id: '...', isOnline: true... } }
      const res = data.response || data;
      // Normalisasi ID untuk perbandingan
      const incomingId = res.id?._serialized || res.id || res.chatId;

      if (data.session === activeSession && (incomingId === selectedChatId || (incomingId && incomingId.split('@')[0] === selectedChatId.split('@')[0]))) {
        updatePresenceStatus(res);
      }
    });

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [activeSession, selectedChatId, isGroup, updatePresenceStatus]);

  return { presence, isOnline };
};
