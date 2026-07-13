import { createContext, useContext, type ReactNode } from 'react'
import { useWebSocket } from '../hooks/useWebSocket'

const WebSocketContext = createContext<ReturnType<typeof useWebSocket> | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useWebSocket()
  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const ctx = useContext(WebSocketContext)
  if (!ctx) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return ctx
}
