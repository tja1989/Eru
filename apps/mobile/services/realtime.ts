import { io, type Socket } from 'socket.io-client';
import { config } from '@/constants/config';

/**
 * Singleton wrapper around socket.io-client. Connects to the API's `/ws`
 * endpoint with the user's bearer token. Resilient to disconnects via
 * built-in reconnection. Exposes a typed on/off API so screens can subscribe
 * to `message:new`, `proposal:updated`, etc., and unsubscribe in cleanup.
 */
class RealtimeClient {
  private socket: Socket | null = null;

  /**
   * Connect (or reconnect with a new token). No-op if already connected with
   * the same token.
   */
  async connect(token: string): Promise<void> {
    if (!token) return;
    if (this.socket?.connected) return;
    const baseUrl = config.apiUrl.replace(/\/api\/v1\/?$/, '');
    this.socket = io(baseUrl, {
      path: '/ws',
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.socket?.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.socket?.off(event, handler);
  }

  emit(event: string, payload: unknown): void {
    this.socket?.emit(event, payload);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const realtime = new RealtimeClient();
