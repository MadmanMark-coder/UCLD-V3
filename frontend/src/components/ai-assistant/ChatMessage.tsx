import { useEffect, useState } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types'

interface Props {
  message: ChatMessageType
}

export function ChatMessage({ message }: Props) {
  const [displayedContent, setDisplayedContent] = useState(message.streaming ? '' : message.content)
  const isUser = message.role === 'user'

  useEffect(() => {
    if (!message.streaming) {
      setDisplayedContent(message.content)
      return
    }
    let idx = 0
    setDisplayedContent('')
    const interval = setInterval(() => {
      if (idx < message.content.length) {
        setDisplayedContent(prev => prev + message.content[idx])
        idx++
      } else {
        clearInterval(interval)
      }
    }, 15)
    return () => clearInterval(interval)
  }, [message.content, message.streaming])

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 8,
      marginBottom: 12,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: isUser ? 'var(--text-accent)' : 'var(--ai-message)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div style={{
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: 12,
        background: isUser ? 'var(--bg-hover)' : 'var(--ai-badge)',
        border: isUser
          ? '1px solid var(--border-default)'
          : '1px solid rgba(139,92,246,0.2)',
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {displayedContent}
        {message.streaming && displayedContent.length < message.content.length && (
          <span style={{ animation: 'pulse 1s infinite' }}>▊</span>
        )}
      </div>
    </div>
  )
}
