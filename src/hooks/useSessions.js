import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionService } from '../services/sessionService';
import { socketService } from '../services/socketService';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionToWatch, setSessionToWatch] = useState(null); // Track which session we want QR for

  const loadSessions = useCallback(async () => {
    try {
      const data = await SessionService.getAllSessions();
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList);
      
      // Auto-pick first connected session IF none active
      if (sessionList.length > 0 && !activeSession) {
        const connected = sessionList.find(s => s.status === 'CONNECTED');
        if (connected) setActiveSession(connected.session);
      }

      // If active session is now connected, clear QR
      const current = sessionList.find(s => s.session === activeSession);
      if (current?.status === 'CONNECTED') {
          setQrCode(null);
          setSessionToWatch(null);
      }
    } catch (err) {
      console.error("UI Error Handler:", err);
    }
  }, [activeSession]);

  const startSession = async (name) => {
    setIsInitializing(true);
    setQrCode(null);
    setSessionToWatch(name); // Explicitly watch this session
    try {
      const res = await SessionService.startSession(name);
      // If already has QR in initial response
      if (res.qrcode || res.response?.qrcode) {
        setQrCode(res.qrcode || res.response.qrcode);
      }
      await loadSessions();
    } catch (err) {
      console.error("Error starting session", err);
      setSessionToWatch(null);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectSession = async (sessionName) => {
    const session = sessions.find(s => s.session === sessionName);
    setActiveSession(sessionName);
    
    // Only auto-start and watch if NOT connected
    if (session && session.status !== 'CONNECTED') {
      await startSession(sessionName);
    } else {
      setQrCode(null);
      setSessionToWatch(null);
    }
  };

  const createNewSession = async (name) => {
    setLoading(true);
    await startSession(name);
    setLoading(false);
  };

  // Real-time session listeners
  useEffect(() => {
    const cleanupQR = socketService.on('qrCode', (data) => {
      // ONLY set QR if it matches the session we are currently watching
      if (sessionToWatch && (data.session === sessionToWatch || data.session === activeSession)) {
        console.log("Relevant QR received:", data.session);
        setQrCode(data.data || data.qrcode || data.code);
        setIsInitializing(false);
      }
    });

    const cleanupLogged = socketService.on('session-logged', (data) => {
      if (data.session === sessionToWatch || data.session === activeSession) {
        setQrCode(null);
        setSessionToWatch(null);
        setIsInitializing(false);
        loadSessions();
      }
    });

    return () => {
      cleanupQR();
      cleanupLogged();
    };
  }, [sessionToWatch, activeSession, loadSessions]);

  useEffect(() => {
    loadSessions();
  }, []); // Only on mount

  const deleteSession = async (name) => {
    setLoading(true);
    try {
      await SessionService.deleteSession(name);
      if (activeSession === name) {
        setActiveSession(null);
      }
      await loadSessions();
    } catch (err) {
      console.error("Error deleting session", err);
      alert("Gagal menghapus sesi. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return { 
    sessions, 
    loading, 
    qrCode, 
    isInitializing,
    createNewSession, 
    deleteSession,
    setQrCode, 
    activeSession, 
    setActiveSession: handleSelectSession, 
    refreshSessions: loadSessions
  };
};