import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatService } from '../services/chatService';
import { SessionService } from '../services/sessionService';

export const useChats = (activeSession) => {
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
    if (activeSession) {
      isInitialLoadRef.current = true;
      fetchChats();
    }
  }, [activeSession, fetchChats]);

  return { chats, loading, error, fetchChats };
};
