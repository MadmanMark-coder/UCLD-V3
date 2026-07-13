import { useState, useRef, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { ChatMessage as ChatMessageComponent } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '../../types'

interface Props {
  onOpenPalette?: () => void
}

export function AIPanel({ onOpenPalette }: Props) {
  const { connected } = useWebSocketContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session_id: sessionId.current }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No response',
        timestamp: new Date(),
        streaming: true,
      }
      setMessages(prev => [...prev, aiMsg])

      setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, streaming: false } : m))
      }, Math.min(data.response?.length * 15 || 1000, 3000))
    } catch {
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearHistory = () => setMessages([])

  if (collapsed) {
    return (
      <div style={{
        position: 'fixed', bottom: 80, right: 24, zIndex: 100,
      }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--ai-message)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
          }}
          title="Open AI Assistant"
        >
          AI
        </button>
      </div>
    )
  }

  return (
    <div style={{
      width: 320,
      borderLeft: '1px solid var(--border-default)',
      background: 'var(--bg-deepest)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--ai-message)' : 'var(--text-muted)',
            boxShadow: connected ? '0 0 8px rgba(139,92,246,0.6)' : 'none',
            display: 'inline-block',
          }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            UCLD Assistant
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {onOpenPalette && (
            <button onClick={onOpenPalette} style={{
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              fontSize: 14, cursor: 'pointer', padding: '4px 6px', fontFamily: 'inherit',
            }} title="Commands (Ctrl+Space)">
              ⌘
            </button>
          )}
          <button onClick={clearHistory} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: 11, cursor: 'pointer', padding: '4px 8px', fontFamily: 'inherit',
          }}>
            Clear
          </button>
          <button onClick={() => setCollapsed(true)} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            fontSize: 16, cursor: 'pointer', padding: '4px', lineHeight: 1,
          }}>
            ×
          </button>
        </div>
      </div>

      <div ref={listRef} style={{
        flex: 1, overflow: 'auto', padding: 12,
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 40, color: 'var(--text-muted)',
            fontSize: 12, lineHeight: 1.6,
          }}>
            Ask me anything about patients, beds, equipment, or the ICU.
          </div>
        )}
        {messages.map(m => (
          <ChatMessageComponent key={m.id} message={m} />
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--ai-message)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              AI
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 12,
              background: 'var(--ai-badge)',
              fontSize: 12, color: 'var(--text-muted)',
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Thinking</span>
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  )
}
