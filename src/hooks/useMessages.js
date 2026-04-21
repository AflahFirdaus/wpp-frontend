import { useState, useCallback, useEffect } from 'react';
import { MessageService } from '../services/messageService';
import { socketService } from '../services/socketService';

const forwardedIds = new Set();
const quotedMessagesCache = new Map(); // [MsgID] -> QuotedMsgID

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
      
      // Re-attach metadata from local cache for persistence
      sortedMessages.forEach(m => {
          const idStr = m.id?._serialized || m.id;
          if (forwardedIds.has(idStr)) m.isForwarded = true;
          
          if (!m.quotedMsg && quotedMessagesCache.has(idStr)) {
              // If server lost the quote, but we remember it, show it on web
              m.quotedMsg = { id: quotedMessagesCache.get(idStr) };
          }
      });
      
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

    const handleNewMessage = (payload) => {
      const session = payload.session;
      const msg = payload.response || payload.data;
      
      if (!msg || session !== activeSession) return;

      const msgIdStr = msg.id?._serialized || msg.id;
      // Broad detection for forwarded status
      const isForwarded = msg.isForwarded || msg.forwarded || (msg.forwardingScore && msg.forwardingScore > 0);
      
      if (msgIdStr && (forwardedIds.has(msgIdStr) || isForwarded)) {
          msg.isForwarded = true;
          forwardedIds.add(msgIdStr); // Remember it for this session
      }

      const msgChatId = msg.fromMe ? (msg.to || msg.chatId) : (msg.from || msg.chatId);
      const isCurrentChat = (msgChatId === selectedChatId || msg.chatId === selectedChatId);

      if (isCurrentChat) {
        setMessages(prev => {
          let index = prev.findIndex(m => (m.id?._serialized || m.id) === msgIdStr);
          
          if (index === -1 && msg.fromMe) {
              index = prev.findIndex(m => m.temp && m.body === msg.body);
          }

          if (index !== -1) {
            const updated = [...prev];
            const existing = updated[index];
            // MERGE: Keep existing quotedMsg if the new one is missing
            const mergedMsg = { ...existing, ...msg, temp: false };
            if (!mergedMsg.quotedMsg && existing.quotedMsg) mergedMsg.quotedMsg = existing.quotedMsg;
            if (!mergedMsg.quotedMsg && quotedMessagesCache.has(msgIdStr)) {
                mergedMsg.quotedMsg = { id: quotedMessagesCache.get(msgIdStr) };
            }
            
            updated[index] = mergedMsg;
            return updated;
          }

          if (!msg.quotedMsg && quotedMessagesCache.has(msgIdStr)) {
              msg.quotedMsg = { id: quotedMessagesCache.get(msgIdStr) };
          }

          const newMessages = [...prev, { ...msg, temp: false }];
          return newMessages.sort((a, b) => (a.timestamp || a.t || 0) - (b.timestamp || b.t || 0));
        });
      }
    };

    const cleanup = socketService.on('received-message', handleNewMessage);
    const cleanupOnMsg = socketService.on('onmessage', handleNewMessage);

    const cleanupSent = socketService.on('mensagem-enviada', (data) => {
      const results = Array.isArray(data) ? data : [data];
      results.forEach(msg => {
        const msgIdStr = msg.id?._serialized || msg.id;
        const isForwarded = msg.isForwarded || msg.forwarded || (msg.forwardingScore && msg.forwardingScore > 0);

        if (msgIdStr && (forwardedIds.has(msgIdStr) || isForwarded)) {
            msg.isForwarded = true;
            forwardedIds.add(msgIdStr);
        }
          
        if (msg.session === activeSession && (msg.to === selectedChatId || msg.chatId === selectedChatId)) {
          setMessages(prev => {
            let index = prev.findIndex(m => (m.id?._serialized || m.id) === msgIdStr);
            
            // Optimistic matching for sent messages
            if (index === -1) {
                index = prev.findIndex(m => m.temp && m.body === msg.body);
            }

            if (index !== -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], ...msg, temp: false };
              return updated;
            }
            return [...prev, { ...msg, temp: false }].sort((a, b) => (a.timestamp || a.t || 0) - (b.timestamp || b.t || 0));
          });
        }
      });
    });

    return () => {
      cleanup();
      cleanupOnMsg();
      cleanupSent();
    };
  }, [activeSession, selectedChatId]);

  const sendMessage = async (text, replyMessageId = null) => {
    if (!activeSession || !selectedChatId || !text) return;
    
    // OPTIMISTIC UPDATE: Add message to UI immediately to fix "delay" perception
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
        id: tempId,
        body: text,
        fromMe: true,
        timestamp: Math.floor(Date.now() / 1000),
        ack: 0,
        temp: true,
        quotedMsg: replyMessageId ? { id: replyMessageId } : null // Simulasikan quote di UI
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await MessageService.sendMessage(activeSession, selectedChatId, text, isGroup, replyMessageId);
      
      if (res && res.id) {
          const idStr = res.id?._serialized || res.id;
          if (replyMessageId) quotedMessagesCache.set(idStr, replyMessageId);
          
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, ...res, temp: false } : m));
      }
      return res;
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
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

  const forwardMsg = async (messageId, targetPhone, fallbackObj = null) => {
    if (!activeSession || !messageId || !targetPhone) return;
    try {
      const res = await MessageService.forwardMessage(activeSession, targetPhone, messageId, targetPhone.includes('@g.us'), fallbackObj);
      
      if (res && res.id) {
          const idStr = typeof res.id === 'string' ? res.id : res.id?._serialized;
          if (idStr) forwardedIds.add(idStr);
      }
      
      return res;
    } catch (err) {
      const serverMsg = err.response?.data?.response?.message || err.response?.data?.message || err.message;
      console.error(`Error forwarding message: ${serverMsg}`, err.response?.data);
      throw err;
    }
  };

  return { messages, setMessages, loading, fetchMessages, sendMessage, sendFile, forwardMsg };
};
