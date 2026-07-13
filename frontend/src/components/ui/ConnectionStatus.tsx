interface Props {
  isConnected: boolean
  reconnectAttempts?: number
  maxAttempts?: number
  onRetry?: () => void
}

export function ConnectionStatus({ isConnected, reconnectAttempts = 0, maxAttempts = 5, onRetry }: Props) {
  if (isConnected) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '4px 16px',
        background: 'rgba(16,185,129,0.12)',
        borderBottom: '1px solid rgba(16,185,129,0.2)',
        fontSize: 11, color: 'var(--status-stable)',
        animation: 'fade-in 0.3s ease',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-stable)', display: 'inline-block' }} />
        Connected
      </div>
    )
  }

  const failed = reconnectAttempts >= maxAttempts
  const bgColor = failed ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'
  const borderColor = failed ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'
  const textColor = failed ? 'var(--status-critical)' : 'var(--status-elevated)'

  return (
    <div
      className="animate-slide-in"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '6px 16px',
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        fontSize: 12, color: textColor,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: failed ? 'var(--status-critical)' : 'var(--status-elevated)',
        display: 'inline-block',
        animation: failed ? 'none' : 'pulse 1.5s ease-in-out infinite',
      }} />
      {failed
        ? 'Unable to reconnect. '
        : `Connection lost. Reconnecting... (${reconnectAttempts}/${maxAttempts})`
      }
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '2px 12px',
            color: textColor, fontSize: 11, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Retry Now
        </button>
      )}
    </div>
  )
}
