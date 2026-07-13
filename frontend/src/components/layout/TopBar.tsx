import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { useAlerts } from '../../hooks/useAlerts'
import { AlertCenter } from '../alerts/AlertCenter'
import { StatusDot } from '../ui/StatusDot'
import { Search, Bell, User, Activity, X, Loader } from 'lucide-react'

export function TopBar() {
  const { connected, patientCount, replaySpeed } = useWebSocketContext()
  const { alerts: fullAlerts, acknowledgeAlert } = useAlerts()
  const [isDropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ query: string; answer: string } | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setShowSearchResults(true)
    try {
      const res = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      })
      if (!res.ok) {
        const text = await res.text()
        setSearchResults({ query: searchQuery, answer: 'Error (' + res.status + '): ' + text.slice(0, 200) })
        return
      }
      const data = await res.json()
      setSearchResults(data)
    } catch (e) {
      setSearchResults({ query: searchQuery, answer: 'Search unavailable (' + (e instanceof Error ? e.message : String(e)) + ')' })
    } finally {
      setSearchLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    if (!showSearchResults) return
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSearchResults])

  const unacknowledgedCount = fullAlerts.filter(a => !a.acknowledged).length

  useEffect(() => {
    if (!isDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isDropdownOpen])

  return (
    <header className="glass-header" style={{
      height: 64,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      flexShrink: 0,
      zIndex: 20,
    }}>
      {/* Left Section: Logo & Environment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'var(--text-accent)',
            width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16
          }}>
            <Activity size={16} color="#000" />
          </div>
          <span className="outfit" style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, letterSpacing: 1 }}>
            UCLD
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Central Hospital</span>
          <StatusDot
            status={connected ? 'online' : 'offline'}
            size="small"
            pulse={connected}
            label={connected ? 'Production Env' : 'Offline'}
          />
        </div>
      </div>

      {/* Center Section: Global Search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 600, margin: '0 40px', position: 'relative' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
          placeholder="Ask anything: 'How many patients?', 'Show critical patients', 'Average heart rate?'..."
          style={{
            width: '100%',
            background: 'var(--bg-deepest)',
            border: '1px solid var(--border-default)',
            borderRadius: 6,
            padding: '8px 72px 8px 36px',
            color: 'var(--text-primary)',
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-active)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-default)'; }}
        />
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
          <Search size={16} />
        </span>
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchResults(false) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
              <X size={14} />
            </button>
          )}
          <button onClick={handleSearch}
            style={{ background: 'var(--text-accent)', border: 'none', color: '#000', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {searchLoading ? <Loader size={12} /> : 'ASK'}
          </button>
        </div>
        {showSearchResults && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-default)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, maxHeight: 300, overflowY: 'auto',
          }}>
            {searchLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Querying MIMIC-IV database...
              </div>
            ) : searchResults ? (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                  QUERY: {searchResults.query}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {searchResults.answer}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right Section: Notifications, Profile, Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Patients:</span>
            <span className="mono" style={{ color: 'var(--text-accent)', fontSize: 14, fontWeight: 600 }}>
              {patientCount}
            </span>
          </div>

          {replaySpeed !== 1 && (
            <span className="mono" style={{ color: 'var(--text-accent)', fontSize: 12, background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
              {replaySpeed}x
            </span>
          )}

          <div
            ref={bellRef}
            onClick={() => setDropdownOpen(prev => !prev)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', cursor: 'pointer', padding: 8, borderRadius: '50%', background: 'transparent', transition: 'background 0.15s', border: '1px solid var(--border-default)' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Bell size={18} color={unacknowledgedCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)'} />
            
            {unacknowledgedCount > 0 && (
              <span className="mono" style={{
                position: 'absolute', top: -4, right: -4, background: 'var(--status-critical)', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px'
              }}>
                {unacknowledgedCount}
              </span>
            )}
            {isDropdownOpen && (
              <AlertCenter
                alerts={fullAlerts}
                onAcknowledge={acknowledgeAlert}
                onClose={() => setDropdownOpen(false)}
              />
            )}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--border-default)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Dr. Martinez</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emergency Lead</div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  )
}
