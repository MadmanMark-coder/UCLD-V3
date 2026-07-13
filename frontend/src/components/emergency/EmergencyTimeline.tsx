interface TimelineEvent {
  timestamp: string
  description: string
  icon?: string
}

interface Props {
  events?: TimelineEvent[]
}

export function EmergencyTimeline({ events }: Props) {
  if (!events || events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
        Waiting for first response event...
      </div>
    )
  }

  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {sorted.map((ev, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '8px 0',
          borderLeft: '2px solid var(--border-default)',
          marginLeft: 8, paddingLeft: 16, position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: -6, top: 12,
            width: 10, height: 10, borderRadius: '50%',
            background: i === 0 ? 'var(--status-critical)' : 'var(--bg-hover)',
            border: '2px solid var(--border-default)',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(ev.timestamp).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>
              {ev.icon && <span style={{ marginRight: 4 }}>{ev.icon}</span>}
              {ev.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
