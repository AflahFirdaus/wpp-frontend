import { io } from 'socket.io-client';

// The backend URL - in production this would be from .env
// For development, it's typically http://localhost:21465
const SOCKET_URL = 'http://localhost:21465';

class SocketService {
  constructor() {
    this.socket = null;
    this.callbacks = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Universal message handler
    this.socket.onAny((eventName, ...args) => {
      console.log(`Socket Event [${eventName}]:`, args);
      const eventCallbacks = this.callbacks.get(eventName) || [];
      eventCallbacks.forEach(callback => callback(...args));
    });
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
    
    // Return cleanup function
    return () => {
      const callbacks = this.callbacks.get(event);
      if (callbacks) {
        this.callbacks.set(event, callbacks.filter(cb => cb !== callback));
      }
    };
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
}

export const socketService = new SocketService();
