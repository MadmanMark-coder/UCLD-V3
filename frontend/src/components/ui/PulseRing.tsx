interface Props {
  color?: string
  size?: number
  count?: number
}

export function PulseRing({ color = 'var(--status-critical)', size = 40, count = 3 }: Props) {
  return (
    <span style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="animate-pulse-ring"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: `2px solid ${color}`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </span>
  )
}
