import { io, Socket } from 'socket.io-client';
import { MOCK_REPORTS, Report, Volunteer, Stats } from '../mock/mockData';

export type { Report, Volunteer, Stats };

const MOCK_MODE = true;

interface SocketService {
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
  emit(event: string, data: any): void;
  disconnect(): void;
  onConnect(cb: () => void): void;
  onDisconnect(cb: () => void): void;
  isConnected(): boolean;
  getSocket(): any;
}

const intervals: ReturnType<typeof setInterval>[] = [];

const socketService: SocketService = MOCK_MODE ? {
  on(event: string, callback: Function) {
    if (event === 'newReport') {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * MOCK_REPORTS.length);
        const baseReport = MOCK_REPORTS[randomIndex];
        const newReport: Report = {
          ...baseReport,
          id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          createdAt: new Date()
        };
        callback(newReport);
      }, 8000);
      intervals.push(interval);
    } else if (event === 'reportUpdated') {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * MOCK_REPORTS.length);
        const report = MOCK_REPORTS[randomIndex];
        const newStatus: 'assigned' | 'resolved' = Math.random() > 0.5 ? 'assigned' : 'resolved';
        callback({ id: report.id, status: newStatus });
      }, 15000);
      intervals.push(interval);
    }
  },
  off(event: string, callback: Function) {
    console.log(`[MockSocket] off → ${event}`);
  },
  emit(event: string, data: any) {
    console.log(`[MockSocket] emit → ${event}`, data);
  },
  disconnect() {
    intervals.forEach(clearInterval);
    intervals.length = 0;
    console.log('[MockSocket] disconnected, all intervals cleared');
  },
  onConnect(cb: () => void) {
    setTimeout(cb, 500);
  },
  onDisconnect(cb: () => void) {
  },
  isConnected() {
    return true;
  },
  getSocket() {
    return {
      on: (ev: string, cb: Function) => this.on(ev, cb),
      off: (ev: string, cb: Function) => this.off(ev, cb),
    };
  }
} : (() => {
  const socket: Socket = io(import.meta.env.VITE_BACKEND_URL);
  return {
    on(event: string, callback: Function) {
      socket.on(event, callback as any);
    },
    off(event: string, callback: Function) {
      socket.off(event, callback as any);
    },
    emit(event: string, data: any) {
      socket.emit(event, data);
    },
    disconnect() {
      socket.disconnect();
    },
    getSocket() {
      return socket;
    },
    onConnect(cb: () => void) {
      socket.on('connect', cb);
    },
    onDisconnect(cb: () => void) {
      socket.on('disconnect', cb);
    },
    isConnected() {
      return socket.connected;
    }
  };
})();

export default socketService;
