import { useVoiceAssistant } from '../../hooks/useVoiceAssistant'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
  size?: number
  buttonRef?: React.RefObject<HTMLButtonElement | null>
}

export function VoiceButton({ onTranscript, disabled, size = 36, buttonRef }: Props) {
  const {
    isSupported,
    isListening,
    startListening,
    stopListening,
  } = useVoiceAssistant(onTranscript)

  if (!isSupported) return null

  const speaking = isListening

  const handleClick = () => {
    if (speaking) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      title={speaking ? 'Stop listening' : 'Start voice input'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 'none',
        background: speaking
          ? 'var(--ai-message)'
          : 'var(--bg-elevated)',
        color: speaking ? '#fff' : 'var(--text-secondary)',
        fontSize: size * 0.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
        boxShadow: speaking ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
        animation: speaking ? 'pulse 1.5s infinite' : 'none',
      }}
    >
      {speaking ? '◉' : '🎤'}
    </button>
  )
}
