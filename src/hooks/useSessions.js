import { useState, useEffect } from 'react';
import { SessionService } from '../services/sessionService';
import { socketService } from '../services/socketService';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  const [activeSession, setActiveSession] = useState(null);

  const loadSessions = async () => {
    try {
      const data = await SessionService.getAllSessions();
      setSessions(Array.isArray(data) ? data : []);
      // If there are sessions and no active one, pick the first connected one
      if (Array.isArray(data) && data.length > 0 && !activeSession) {
        const connected = data.find(s => s.status === 'CONNECTED');
        if (connected) setActiveSession(connected.session);
      }
    } catch (err) {
      console.error("UI Error Handler:", err);
    }
  };

  const createNewSession = async (name) => {
    setLoading(true);
    setQrCode(null); // Reset QR code when starting new
    try {
      const res = await SessionService.startSession(name);
      console.log("Start session response:", res);

      if (res.qrcode) {
        setQrCode(res.qrcode);
      }

      await loadSessions();
    } catch (err) {
      console.error("Error creating session", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time session listeners
  useEffect(() => {
    const cleanupQR = socketService.on('qrCode', (data) => {
      console.log("Real-time QR received:", data);
      setQrCode(data.data); // data.data contains the base64 string
    });

    const cleanupLogged = socketService.on('session-logged', (data) => {
      console.log("Session logged in real-time:", data);
      if (data.status) {
        setQrCode(null); // Hide QR when logged in
        loadSessions(); // Refresh list to show CONNECTED
        if (!activeSession) setActiveSession(data.session);
      }
    });

    return () => {
      cleanupQR();
      cleanupLogged();
    };
  }, [activeSession]);

  useEffect(() => {
    loadSessions();
  }, []);

  return { sessions, loading, qrCode, createNewSession, setQrCode, activeSession, setActiveSession };
};