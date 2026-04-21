import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatService } from '../services/chatService';
import { SessionService } from '../services/sessionService';
import { socketService } from '../services/socketService';

export const useChats = (activeSession, selectedChatId) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isInitialLoadRef = useRef(true);

  const fetchChats = useCallback(async () => {
    if (!activeSession) return;
    
    if (isInitialLoadRef.current) {
      setLoading(true);
    }
    
    setError(null);
    try {
      // Ensure we have a token for this session before fetching chats
      let token = SessionService.getSessionToken(activeSession);
      if (!token) {
        console.log("No token found, generating one for:", activeSession);
        await SessionService.generateToken(activeSession);
      }

      // Fetch both regular and archived chats for completeness
      const [regularData, archivedData] = await Promise.all([
        ChatService.getAllChats(activeSession),
        ChatService.getArchivedChats(activeSession)
      ]);

      const allData = [
        ...(Array.isArray(regularData) ? regularData : []),
        ...(Array.isArray(archivedData) ? archivedData : [])
      ];

      // Remove duplicates by chat ID
      const uniqueChats = [];
      const chatIds = new Set();
      
      allData.forEach(chat => {
        const id = chat?.id?._serialized || chat?.id;
        if (id && !chatIds.has(id)) {
          chatIds.add(id);
          uniqueChats.push({
            ...chat,
            displayName: chat.name || chat.pushname || (chat.id && chat.id.user)
          });
        }
      });

      setChats(uniqueChats);
      
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
      if (isInitialLoadRef.current) {
        setError(err.message || "Failed to load chats");
        setChats([]);
      }
    } finally {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
      setLoading(false);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;

    const updateChatFromMessage = (payload) => {
      if (payload.session !== activeSession) return;
      const msg = payload.data || payload.response;
      if (!msg) return;

      // Detect Chat ID correctly for both incoming and outgoing
      const chatId = msg.fromMe 
        ? (msg.to || msg.chatId?._serialized || msg.chatId)
        : (msg.from || msg.chatId?._serialized || msg.chatId);
        
      if (!chatId) return;

      setChats(prevChats => {
        const chatIndex = prevChats.findIndex(c => (c.id?._serialized || c.id) === chatId);

        if (chatIndex > -1) {
          const isSelected = chatId === selectedChatId;
          const oldChat = prevChats[chatIndex];
          
          // Surgically update only the changed chat
          const updatedChat = { 
            ...oldChat,
            lastMessage: msg,
            msgs: [msg],
            unreadCount: isSelected ? 0 : (oldChat.unreadCount || 0) + (msg.fromMe ? 0 : 1),
            t: msg.timestamp || Math.floor(Date.now() / 1000)
          };
          
          const newChats = [...prevChats];
          newChats.splice(chatIndex, 1);
          newChats.unshift(updatedChat);
          return newChats;
        } else {
          // Fetch new chat list if not found
          fetchChats();
          return prevChats;
        }
      });
    };

    const handleAck = (payload) => {
      if (payload.session !== activeSession) return;
      const ack = payload.data;
      if (!ack) return;

      setChats(prevChats => {
        return prevChats.map(c => {
          const id = c.id?._serialized || c.id;
          if (id === ack.to && c.lastMessage && c.lastMessage.id === ack.id?._serialized) {
            return {
              ...c,
              lastMessage: { ...c.lastMessage, ack: ack.ack }
            };
          }
          return c;
        });
      });
    };

    const cleanupMsg = socketService.on('onmessage', updateChatFromMessage);
    const cleanupReceived = socketService.on('received-message', updateChatFromMessage);
    const cleanupUnread = socketService.on('unreadmessages', updateChatFromMessage);
    const cleanupAck = socketService.on('onack', handleAck);

    return () => {
      cleanupMsg();
      cleanupReceived();
      cleanupUnread();
      cleanupAck();
    };
  }, [activeSession, selectedChatId, fetchChats]);

  // Reset unread count when chat is selected
  useEffect(() => {
    if (selectedChatId && chats.length > 0) {
      setChats(prev => prev.map(c => {
        const id = c.id?._serialized || c.id;
        if (id === selectedChatId && c.unreadCount > 0) {
          return { ...c, unreadCount: 0 };
        }
        return c;
      }));
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (activeSession) {
      isInitialLoadRef.current = true;
      fetchChats();
    }
  }, [activeSession, fetchChats]);

  return { chats, loading, error, fetchChats };
};