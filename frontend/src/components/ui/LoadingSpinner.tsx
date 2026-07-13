interface Props {
  size?: 'small' | 'medium' | 'large'
  variant?: 'dots' | 'skeleton'
  label?: string
  width?: string | number
  height?: string | number
}

const DOT_SIZE: Record<string, number> = { small: 6, medium: 8, large: 12 }

export function LoadingSpinner({ size = 'medium', variant = 'dots', label, width, height }: Props) {
  if (variant === 'skeleton') {
    return (
      <div
        className="animate-skeleton"
        style={{
          width: width ?? '100%',
          height: height ?? 80,
          background: 'var(--bg-elevated)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {label && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
        )}
      </div>
    )
  }

  const dotSize = DOT_SIZE[size]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: 24,
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              background: 'var(--text-muted)',
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      {label && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      )}
    </div>
  )
}
