import { useState, useCallback, useEffect } from 'react';
import { MessageService } from '../services/messageService';
import { socketService } from '../services/socketService';

export const useMessages = (activeSession, selectedChatId, isGroup = false) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!activeSession || !selectedChatId) return;
    setLoading(true);
    try {
      const data = await MessageService.getMessages(activeSession, selectedChatId, isGroup);
      const messageList = Array.isArray(data) ? data : [];

      // Mengurutkan pesan dari yang terlama ke terbaru untuk tampilan chat
      const sortedMessages = [...messageList].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(sortedMessages);
    } catch (err) {
      if (err.response?.status === 404) {
        console.warn(`Chat ${selectedChatId} not yet synced or not found.`);
        setMessages([]);
      } else {
        console.error("Error fetching messages:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [activeSession, selectedChatId, isGroup]);

  // Real-time listener
  useEffect(() => {
    if (!activeSession || !selectedChatId) return;

    const cleanup = socketService.on('received-message', (data) => {
      const msg = data.response;

      // Filter by session and chat ID
      const msgChatId = msg.fromMe ? (msg.to || msg.chatId) : (msg.from || msg.chatId);

      if (msg.session === activeSession && (msgChatId === selectedChatId || msg.chatId === selectedChatId)) {
        console.log("New real-time message received:", msg);
        setMessages(prev => {
          // Check if message already exists (to avoid duplicates from mensagem-enviada or re-fetch)
          const exists = prev.some(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });
      }
    });

    const cleanupSent = socketService.on('mensagem-enviada', (data) => {
      // data is often an array or single object from the controller
      const results = Array.isArray(data) ? data : [data];
      results.forEach(msg => {
        if (msg.session === activeSession && (msg.to === selectedChatId || msg.chatId === selectedChatId)) {
          setMessages(prev => {
            const exists = prev.some(m => m.id === msg.id);
            if (exists) return prev;
            return [...prev, msg];
          });
        }
      });
    });

    return () => {
      cleanup();
      cleanupSent();
    };
  }, [activeSession, selectedChatId]);

  const sendMessage = async (text, replyMessageId = null) => {
    if (!activeSession || !selectedChatId || !text) return;
    try {
      const res = await MessageService.sendMessage(activeSession, selectedChatId, text, isGroup, replyMessageId);
      return res;
    } catch (err) {
      console.error("Error sending message:", err);
      throw err;
    }
  };

  const sendFile = async (file, caption = '', replyMessageId = null) => {
    if (!activeSession || !selectedChatId || !file) return;
    try {
      const res = await MessageService.sendFile(activeSession, selectedChatId, file, caption, isGroup, replyMessageId);
      return res;
    } catch (err) {
      console.error("Error sending file:", err);
      throw err;
    }
  };

  const forwardMsg = async (messageId, targetPhone) => {
    if (!activeSession || !messageId || !targetPhone) return;
    try {
      // isGroup di-set manual atau dari chat utils jika diperlukan
      const res = await MessageService.forwardMessage(activeSession, targetPhone, messageId, targetPhone.includes('@g.us'));
      return res;
    } catch (err) {
      const serverMsg = err.response?.data?.response?.message || err.response?.data?.message || err.message;
      console.error(`Error forwarding message: ${serverMsg}`, err.response?.data);
      throw err;
    }
  };

  return { messages, setMessages, loading, fetchMessages, sendMessage, sendFile, forwardMsg };
};
