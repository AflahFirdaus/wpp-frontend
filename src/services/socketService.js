import { io } from "socket.io-client";

// The backend URL - untuk testing lokal (backend di laptop yang sama)
const SOCKET_URL = "http://localhost:21465";

class SocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Universal message handler with optimization
    this.socket.onAny((eventName, ...args) => {
      // Data Thinning & Throttling
      if (eventName === "onpresencechanged" || eventName === "typing") {
        this.throttleEvent(eventName, args);
      } else {
        this.executeCallbacks(eventName, args);
      }
    });
  }

  // Throttle helper to avoid UI lag on high-frequency events
  throttleEvent(eventName, args) {
    const now = Date.now();
    const lastRun = this.lastRunTime?.get(eventName) || 0;

    if (now - lastRun > 1000) {
      // Max 1 update per second for status
      if (!this.lastRunTime) this.lastRunTime = new Map();
      this.lastRunTime.set(eventName, now);
      this.executeCallbacks(eventName, args);
    }
  }

  executeCallbacks(eventName, args) {
    const eventCallbacks = this.callbacks.get(eventName) || [];
    eventCallbacks.forEach((callback) => callback(...args));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);

    return () => {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        this.callbacks.set(
          event,
          callbacks.filter((cb) => cb !== callback),
        );
      }
    };
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Heartbeat - Check if socket is still alive
  checkHeartbeat() {
    if (this.socket && !this.socket.connected) {
      console.log("Socket connection lost, reconnecting...");
      this.socket.connect();
    }
  }
}

export const socketService = new SocketService();
