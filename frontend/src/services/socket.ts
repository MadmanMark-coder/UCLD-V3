type EventCallback = (data: unknown) => void

export class SocketService {
  private ws: WebSocket | null = null
  private url = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 99
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventListeners = new Map<string, Set<EventCallback>>()
  private intentionalClose = false

  connect(url: string): void {
    this.url = url
    this.intentionalClose = false
    this.reconnectAttempts = 0
    this._createConnection()
  }

  private _createConnection(): void {
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this._emit('__connected', null)
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.event && msg.data !== undefined) {
          this._emit(msg.event, msg.data)
        }
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this._emit('__disconnected', null)
      if (!this.intentionalClose) {
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      // onclose fires after onerror, reconnect handled there
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => {
      this._createConnection()
    }, delay)
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    this.eventListeners.get(event)?.delete(callback)
  }

  send(event: string, data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }))
    }
  }

  disconnect(): void {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }

  private _emit(event: string, data: unknown): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data))
  }
}
