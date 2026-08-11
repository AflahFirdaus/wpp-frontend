import { useState, useEffect, useCallback, useRef } from 'react';
import { SessionService } from '../services/sessionService';
import { socketService } from '../services/socketService';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionToWatch, setSessionToWatch] = useState(null);

  const sessionToWatchRef = useRef(null);
  const activeSessionRef = useRef(null);
  const qrCodeRef = useRef(null);

  useEffect(() => { sessionToWatchRef.current = sessionToWatch; }, [sessionToWatch]);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);
  useEffect(() => { qrCodeRef.current = qrCode; }, [qrCode]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await SessionService.getAllSessions();
      const sessionList = Array.isArray(data) ? data : [];
      setSessions(sessionList);

      // Auto-pick connected session on initial load only
      if (sessionList.length > 0 && !activeSessionRef.current) {
        const connected = sessionList.find(s => s.status === 'CONNECTED');
        if (connected) {
          setActiveSession(connected.session);
          activeSessionRef.current = connected.session;
        } else {
          setActiveSession(sessionList[0].session);
          activeSessionRef.current = sessionList[0].session;
        }
      }

      // Check current watched session status from updated list
      const watching = sessionToWatchRef.current;
      if (watching) {
        const watchedObj = sessionList.find(s => s.session === watching);
        if (watchedObj?.status === 'CONNECTED') {
          console.log('[loadSessions] Watched session is CONNECTED, clearing QR modal');
          setQrCode(null);
          qrCodeRef.current = null;
          setSessionToWatch(null);
          sessionToWatchRef.current = null;
        }
      }
    } catch (err) {
      console.error("UI Error Handler:", err);
    }
  }, []);

  const startSession = async (name) => {
    setIsInitializing(true);
    setQrCode(null);
    qrCodeRef.current = null;

    // Immediately set activeSession and sessionToWatch to target session!
    setActiveSession(name);
    activeSessionRef.current = name;
    setSessionToWatch(name);
    sessionToWatchRef.current = name;

    try {
      const res = await SessionService.startSession(name);
      console.log('[startSession] response for', name, ':', res);

      const qr = res?.qrcode || res?.response?.qrcode;
      if (qr) {
        console.log('[startSession] Got QR from HTTP response for session:', name);
        setQrCode(qr);
        qrCodeRef.current = qr;
        setIsInitializing(false);
      }

      await loadSessions();
    } catch (err) {
      console.error("Error starting session:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSelectSession = async (sessionName) => {
    const session = sessions.find(s => s.session === sessionName);
    setActiveSession(sessionName);
    activeSessionRef.current = sessionName;
    setSessionToWatch(sessionName);
    sessionToWatchRef.current = sessionName;

    if (session && session.status !== 'CONNECTED') {
      await startSession(sessionName);
    } else {
      setQrCode(null);
      qrCodeRef.current = null;
      setSessionToWatch(null);
      sessionToWatchRef.current = null;
    }
  };

  const createNewSession = async (name) => {
    setLoading(true);
    await startSession(name);
    setLoading(false);
  };

  // Real-time socket listeners & status polling
  useEffect(() => {
    const cleanupQR = socketService.on('qrCode', (data) => {
      const watching = sessionToWatchRef.current;
      const active = activeSessionRef.current;
      console.log('[Socket qrCode] received for session:', data?.session, '| watching:', watching, '| active:', active);

      if (data?.session && (data.session === watching || data.session === active)) {
        const qrData = data.data || data.qrcode || data.code;
        console.log('[Socket qrCode] Setting QR for session:', data.session);
        setQrCode(qrData);
        qrCodeRef.current = qrData;
        setIsInitializing(false);
      }
    });

    const cleanupLogged = socketService.on('session-logged', (data) => {
      const watching = sessionToWatchRef.current;
      const active = activeSessionRef.current;
      console.log('[Socket session-logged]', data?.session, '| watching:', watching, '| active:', active);

      if (!data?.session || data.session === watching || data.session === active) {
        console.log('[Socket session-logged] Session connected — clearing QR and refreshing list');
        setQrCode(null);
        qrCodeRef.current = null;
        setSessionToWatch(null);
        sessionToWatchRef.current = null;
        setIsInitializing(false);
        loadSessions();
      }
    });

    const cleanupError = socketService.on('session-error', (sessionName) => {
      const watching = sessionToWatchRef.current;
      if (sessionName === watching) {
        console.warn('[Socket session-error] Error for session:', sessionName);
        setIsInitializing(false);
      }
    });

    // Polling backup to detect when status changes to CONNECTED after scanning
    const pollInterval = setInterval(() => {
      if (sessionToWatchRef.current || qrCodeRef.current) {
        loadSessions();
      }
    }, 3000);

    return () => {
      cleanupQR();
      cleanupLogged();
      cleanupError();
      clearInterval(pollInterval);
    };
  }, [loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const deleteSession = async (name) => {
    setLoading(true);
    try {
      await SessionService.deleteSession(name);
      if (activeSessionRef.current === name) {
        setActiveSession(null);
        activeSessionRef.current = null;
      }
      await loadSessions();
    } catch (err) {
      console.error("Error deleting session:", err);
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