import { useState, useRef, useEffect } from 'react'
import { VoiceButton } from './VoiceButton'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const voiceBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [disabled])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'm' || e.key === 'M') && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        if (voiceBtnRef.current) {
          voiceBtnRef.current.click()
        } else {
          inputRef.current?.focus()
        }
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript.trim()) {
      onSend(transcript)
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px',
      borderTop: '1px solid var(--border-default)',
      background: 'var(--bg-surface)',
      alignItems: 'center',
    }}>
      <VoiceButton onTranscript={handleVoiceTranscript} disabled={disabled} buttonRef={voiceBtnRef} />
      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
        placeholder="Ask the AI assistant..."
        disabled={disabled}
        style={{
          flex: 1,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          color: 'var(--text-primary)',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        style={{
          background: disabled ? 'var(--bg-hover)' : 'var(--text-accent)',
          border: 'none',
          borderRadius: 8,
          padding: '8px 12px',
          color: disabled ? 'var(--text-muted)' : '#000',
          fontSize: 13,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
      >
        Send
      </button>
    </div>
  )
}
