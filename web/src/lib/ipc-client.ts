import { BackendEvent, FrontendCommand, DumperAction } from './types';

type EventListener = (event: BackendEvent) => void;
type StatusListener = (connected: boolean) => void;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const QUEUE_LIMIT = 200;

/**
 * WebSocket client for the AstralOS engine IPC (default ws://127.0.0.1:42857).
 *
 * Robustness guarantees:
 * - Commands sent while disconnected are queued and flushed on the next
 *   successful connection (capped, oldest dropped first).
 * - A stale socket's `onerror`/`onclose` can never tear down a newer
 *   connection (guards against `this.ws` replacement races).
 * - Reconnect uses exponential backoff with jitter, capped at 10s.
 */
export class IpcClient {
  private url: string;
  private ws: WebSocket | null = null;
  private listeners: Set<EventListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private queue: FrontendCommand[] = [];

  constructor(url: string = 'ws://127.0.0.1:42857') {
    this.url = url;
    this.connect();
  }

  public connect(url?: string) {
    if (url && url !== this.url) {
      this.url = url;
      // Re-targeting: drop the old socket entirely before reconnecting.
      this.teardownSocket();
    }

    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    try {
      const socket = new WebSocket(this.url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return; // stale socket won the race
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.flushQueue();
        this.notifyStatus(true);
        console.log('[IPC] Connected to AstralOS backend');
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        try {
          const data: BackendEvent = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (e) {
          console.error('[IPC] Failed to parse message:', e, event.data);
        }
      };

      socket.onclose = () => {
        if (this.ws !== socket) return; // a newer socket already replaced us
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        // Closing the socket that errored (not `this.ws`, which may be newer).
        socket.close();
      };
    } catch (e) {
      console.debug('[IPC] Connect exception:', e);
      this.scheduleReconnect();
    }
  }

  private teardownSocket() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      // Detach handlers so closing the old socket doesn't schedule a reconnect.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
    this.isConnected = false;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const backoff = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS
    );
    const jitter = backoff * (0.75 + Math.random() * 0.5);
    this.reconnectAttempts += 1;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, jitter);
  }

  private flushQueue() {
    while (this.queue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const command = this.queue.shift();
      if (!command) break;
      this.ws.send(JSON.stringify(command));
    }
  }

  /**
   * Send a command. If disconnected, the command is queued and delivered on
   * reconnect. Returns false only when the command was queued, true when
   * sent immediately.
   */
  public send(command: FrontendCommand): boolean {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
      return true;
    }

    if (this.queue.length >= QUEUE_LIMIT) {
      this.queue.shift(); // drop oldest under pressure
    }
    this.queue.push(command);
    console.debug('[IPC] Offline, command queued:', command.type);
    return false;
  }

  public runDumper(action: DumperAction) {
    return this.send({ type: 'run_dumper', action });
  }

  public startSniffer() {
    return this.send({ type: 'start_sniffer' });
  }

  public stopSniffer() {
    return this.send({ type: 'stop_sniffer' });
  }

  public clearSniffer() {
    return this.send({ type: 'clear_sniffer' });
  }

  public executeLua(script: string) {
    return this.send({ type: 'execute_lua', script });
  }

  public executeLuaOnLoad(script: string) {
    return this.send({ type: 'execute_lua_on_load', script });
  }

  public setCheatEnabled(name: string, enabled: boolean) {
    return this.send({ type: 'set_cheat_enabled', name, enabled });
  }

  public setDumperEnabled(enabled: boolean) {
    return this.send({ type: 'set_dumper_enabled', enabled });
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected));
  }
}

export const ipc = new IpcClient();
