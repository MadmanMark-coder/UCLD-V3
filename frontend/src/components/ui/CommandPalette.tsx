import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface Command {
  id: string
  label: string
  description: string
  path?: string
  action?: () => void
  shortcut?: string
  category: string
}

interface Props {
  open: boolean
  onClose: () => void
  extraCommands?: Command[]
}

const defaultCommands: Command[] = [
  { id: 'patients', label: 'Patients', description: 'View patient list', path: '/', category: 'Navigation' },
  { id: 'beds', label: 'Bed Board', description: 'Manage bed assignments', path: '/beds', category: 'Navigation' },
  { id: 'equipment', label: 'Equipment', description: 'Track medical equipment', path: '/equipment', category: 'Navigation' },
  { id: 'alerts', label: 'Alert Center', description: 'View and manage alerts', path: '/alerts', category: 'Navigation' },
  { id: 'emergency', label: 'Emergency Center', description: 'Code blue and emergency incidents', path: '/emergency', category: 'Navigation' },
]

export function CommandPalette({ open, onClose, extraCommands = [] }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allCommands = [...defaultCommands, ...extraCommands]

  const filtered = query.trim()
    ? allCommands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const execute = useCallback((cmd: Command) => {
    onClose()
    if (cmd.action) {
      cmd.action()
    } else if (cmd.path) {
      navigate(cmd.path)
    }
  }, [navigate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      execute(filtered[selectedIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!open) return null

  const categories = [...new Set(filtered.map(c => c.category))]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 560,
          maxWidth: '90vw',
          maxHeight: '50vh',
          background: 'var(--bg-deepest)',
          border: '1px solid var(--border-default)',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {categories.map(cat => (
            <div key={cat}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {cat}
              </div>
              {filtered.filter(c => c.category === cat).map((cmd, i) => {
                const globalIndex = filtered.indexOf(cmd)
                return (
                  <div
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: globalIndex === selectedIndex ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {cmd.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {cmd.description}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg-surface)', color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No commands found
            </div>
          )}
        </div>

        <div style={{
          display: 'flex', gap: 16, padding: '8px 16px',
          borderTop: '1px solid var(--border-default)',
          fontSize: 11, color: 'var(--text-muted)',
        }}>
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  )
}
