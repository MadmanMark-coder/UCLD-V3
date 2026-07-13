import { useState, useEffect, useCallback } from 'react'
import { Users, Brain, Building2, Bell, Shield, Monitor, HardDrive, UserPlus, X, CheckCircle, Loader, Search, Activity, Database, Cpu, Server, Wifi, Clock, AlertTriangle, ChevronRight, Edit3, Trash2, Plus, RefreshCw, Download, Upload } from 'lucide-react'

const API = '/api'

type SettingsTab = 'users' | 'ai' | 'hospital' | 'notifications' | 'security' | 'monitoring' | 'backup'

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('monitoring')
  const [users, setUsers] = useState<any[]>([])
  const [aiSettings, setAiSettings] = useState<any>({})
  const [hospitalConfig, setHospitalConfig] = useState<any>({})
  const [notifications, setNotifications] = useState<any>({})
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [systemStatus, setSystemStatus] = useState<any>({})
  const [backups, setBackups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedAuditAction, setSelectedAuditAction] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const fetchUsers = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/users`); if (r.ok) { const d = await r.json(); setUsers(d.users) } } catch {}
  }, [])
  const fetchAiSettings = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/ai-settings`); if (r.ok) setAiSettings(await r.json()) } catch {}
  }, [])
  const fetchHospitalConfig = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/hospital-config`); if (r.ok) setHospitalConfig(await r.json()) } catch {}
  }, [])
  const fetchNotifications = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/notifications`); if (r.ok) setNotifications(await r.json()) } catch {}
  }, [])
  const fetchAuditLog = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/audit-log?limit=100${selectedAuditAction ? `&action=${selectedAuditAction}` : ''}`); if (r.ok) { const d = await r.json(); setAuditLog(d.entries) } } catch {}
  }, [selectedAuditAction])
  const fetchSystemStatus = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/system-status`); if (r.ok) setSystemStatus(await r.json()) } catch {}
  }, [])
  const fetchBackups = useCallback(async () => {
    try { const r = await fetch(`${API}/admin/backups`); if (r.ok) { const d = await r.json(); setBackups(d.backups) } } catch {}
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])
  useEffect(() => { if (tab === 'ai') fetchAiSettings() }, [tab, fetchAiSettings])
  useEffect(() => { if (tab === 'hospital') fetchHospitalConfig() }, [tab, fetchHospitalConfig])
  useEffect(() => { if (tab === 'notifications') fetchNotifications() }, [tab, fetchNotifications])
  useEffect(() => { if (tab === 'security') fetchAuditLog() }, [tab, fetchAuditLog])
  useEffect(() => { if (tab === 'monitoring') { fetchSystemStatus(); const i = setInterval(fetchSystemStatus, 5000); return () => clearInterval(i) } }, [tab, fetchSystemStatus])
  useEffect(() => { if (tab === 'backup') fetchBackups() }, [tab, fetchBackups])

  const updateAISetting = async (key: string, value: any) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/ai-settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (r.ok) { const d = await r.json(); setAiSettings(d); showToast('AI settings updated') }
    } catch {} finally { setLoading(false) }
  }

  const updateHospital = async (key: string, value: any) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/hospital-config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (r.ok) { const d = await r.json(); setHospitalConfig(d); showToast('Hospital config updated') }
    } catch {} finally { setLoading(false) }
  }

  const updateNotification = async (key: string, value: any) => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/notifications`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (r.ok) { const d = await r.json(); setNotifications(d); showToast('Notification settings updated') }
    } catch {} finally { setLoading(false) }
  }

  const deleteUser = async (id: string) => {
    try { await fetch(`${API}/admin/users/${id}`, { method: 'DELETE' }); fetchUsers(); showToast('User deleted') } catch {}
  }

  const createBackup = async () => {
    setLoading(true)
    try { const r = await fetch(`${API}/admin/backup`, { method: 'POST' }); if (r.ok) { showToast('Backup created'); fetchBackups() } } catch {} finally { setLoading(false) }
  }

  const handleExport = async () => {
    try {
      const r = await fetch(`${API}/admin/export`)
      const data = await r.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ucld_export_${new Date().toISOString().slice(0,10)}.json`; a.click()
      URL.revokeObjectURL(url)
      showToast('Data exported')
    } catch {}
  }

  const tabs: { key: SettingsTab; label: string; icon: any }[] = [
    { key: 'monitoring', label: 'System', icon: <Monitor size={16} /> },
    { key: 'users', label: 'Users', icon: <Users size={16} /> },
    { key: 'ai', label: 'AI Settings', icon: <Brain size={16} /> },
    { key: 'hospital', label: 'Hospital', icon: <Building2 size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { key: 'security', label: 'Audit Log', icon: <Shield size={16} /> },
    { key: 'backup', label: 'Backup', icon: <HardDrive size={16} /> },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div className="outfit" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          ADMIN SETTINGS
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hospital administration and configuration panel</div>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 20, overflow: 'hidden' }}>
        {/* Tab Nav */}
        <div className="glass-panel" style={{ width: 180, padding: 12, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: tab === t.key ? 'var(--bg-elevated)' : 'transparent',
                color: tab === t.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: '1px solid transparent', borderRadius: 6, fontSize: 13, fontWeight: tab === t.key ? 600 : 500,
                cursor: 'pointer', width: '100%', textAlign: 'left',
              }}>
                {t.icon} {t.label}
                {tab === t.key && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-accent)' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>

          {/* SYSTEM MONITORING */}
          {tab === 'monitoring' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={18} color="var(--text-accent)" /> SYSTEM MONITORING
                </h3>
                <button className="btn-outline" onClick={fetchSystemStatus} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={12} /> REFRESH
                </button>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'API', status: systemStatus.api_status, color: systemStatus.api_status === 'operational' ? 'var(--status-stable)' : 'var(--status-critical)' },
                  { label: 'UCLD DB', status: systemStatus.database_status, color: systemStatus.database_status === 'connected' ? 'var(--status-stable)' : 'var(--status-critical)' },
                  { label: 'MIMIC DB', status: systemStatus.mimic_database_status, color: systemStatus.mimic_database_status === 'connected' ? 'var(--status-stable)' : 'var(--status-critical)' },
                  { label: 'Groq AI', status: systemStatus.ai_status, color: systemStatus.ai_status === 'configured' ? 'var(--status-stable)' : 'var(--status-elevated)' },
                  { label: 'Replay', status: systemStatus.replay_status?.status, color: systemStatus.replay_status?.status === 'playing' ? 'var(--status-stable)' : 'var(--status-elevated)' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, padding: '12px 16px', background: 'var(--bg-deepest)', borderRadius: 8, border: `1px solid ${s.color}33` }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, fontWeight: 700, fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                      {s.status?.toUpperCase().replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Server Resources */}
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Server size={14} color="var(--text-accent)" /> SERVER RESOURCES
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'CPU', value: `${systemStatus.server?.cpu_percent || '--'}%`, icon: <Cpu size={14} />, color: (systemStatus.server?.cpu_percent || 0) > 80 ? 'var(--status-critical)' : 'var(--text-primary)' },
                  { label: 'Memory', value: `${systemStatus.server?.memory_percent || '--'}% (${systemStatus.server?.memory_used_gb || '--'}GB/${systemStatus.server?.memory_total_gb || '--'}GB)`, icon: <Activity size={14} />, color: (systemStatus.server?.memory_percent || 0) > 80 ? 'var(--status-critical)' : 'var(--text-primary)' },
                  { label: 'Disk', value: `${systemStatus.server?.disk_percent || '--'}%`, icon: <HardDrive size={14} />, color: (systemStatus.server?.disk_percent || 0) > 80 ? 'var(--status-critical)' : 'var(--text-primary)' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.icon} {m.label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              {/* Database Stats */}
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={14} color="var(--text-accent)" /> DATABASE STATISTICS
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Active Patients', value: systemStatus.database?.active_patients || 0 },
                  { label: 'MIMIC Patients', value: systemStatus.database?.mimic_patients || 0 },
                  { label: 'UCLD Alerts', value: systemStatus.database?.ucld_alerts || 0 },
                  { label: 'Timeline Events', value: systemStatus.database?.timeline_events || 0 },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                    <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Replay Info */}
              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--text-accent)" /> REPLAY ENGINE
              </h4>
              <div style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)', fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Status: </span><span style={{ color: systemStatus.replay_status?.status === 'playing' ? 'var(--status-stable)' : 'var(--text-primary)', fontWeight: 600 }}>{systemStatus.replay_status?.status}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Patients: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{systemStatus.replay_status?.patient_count}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Speed: </span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{systemStatus.replay_status?.speed}x</span></div>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {tab === 'users' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} color="var(--text-accent)" /> USER MANAGEMENT
                </h3>
                <button className="btn-primary" onClick={() => setShowAddUser(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} /> ADD USER
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {users.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                        <span>@{u.username}</span>
                        <span style={{ color: u.role === 'admin' ? 'var(--text-accent)' : 'var(--text-secondary)' }}>{u.role}</span>
                        <span>{u.department}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: u.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: u.status === 'active' ? 'var(--status-stable)' : 'var(--status-critical)' }}>
                        {u.status}
                      </span>
                      <button onClick={() => deleteUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI SETTINGS */}
          {tab === 'ai' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Brain size={18} color="var(--text-accent)" /> AI CONFIGURATION
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Model Selection</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {['clinical_model', 'operations_model', 'voice_model'].map(k => (
                      <div key={k} style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{k.replace('_model', '').toUpperCase()}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-accent)', fontWeight: 500, wordBreak: 'break-all' }}>{aiSettings[k] || '--'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Parameters</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Confidence Threshold</div>
                      <input type="range" min="0" max="1" step="0.1" value={aiSettings.confidence_threshold || 0.6}
                        onChange={e => updateAISetting('confidence_threshold', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <div style={{ fontSize: 12, color: 'var(--text-accent)', fontWeight: 700 }}>{aiSettings.confidence_threshold}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Alert Sensitivity</div>
                      <select value={aiSettings.alert_sensitivity || 'medium'}
                        onChange={e => updateAISetting('alert_sensitivity', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Max Tokens</div>
                      <input type="number" value={aiSettings.max_tokens || 1024}
                        onChange={e => updateAISetting('max_tokens', parseInt(e.target.value))}
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Temperature</div>
                      <input type="range" min="0" max="1" step="0.1" value={aiSettings.temperature || 0.3}
                        onChange={e => updateAISetting('temperature', parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                      />
                      <div style={{ fontSize: 12, color: 'var(--text-accent)', fontWeight: 700 }}>{aiSettings.temperature}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Feature Toggles</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[['enable_ai_summaries', 'AI Summaries'], ['enable_risk_analysis', 'Risk Analysis'], ['enable_deterioration_detection', 'Deterioration Detection'], ['enable_voice_assistant', 'Voice Assistant']].map(([k, label]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={!!aiSettings[k]} onChange={e => updateAISetting(k, e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: 'var(--text-accent)' }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HOSPITAL CONFIG */}
          {tab === 'hospital' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building2 size={18} color="var(--text-accent)" /> HOSPITAL CONFIGURATION
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>HOSPITAL NAME</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{hospitalConfig.hospital_name}</div>
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Bed Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[['total_icu_beds', 'Total ICU Beds'], ['micu_beds', 'MICU Beds'], ['sicu_beds', 'SICU Beds'],
                      ['ccu_beds', 'CCU Beds'], ['ed_beds', 'ED Beds'], ['stepdown_beds', 'Stepdown Beds'],
                    ].map(([k, label]) => (
                      <div key={k} style={{ padding: 12, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                        <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{(hospitalConfig as any)[k] || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Operational Settings</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[['max_patients_per_nurse', 'Max Patients/Nurse', 'number'], ['replay_speed', 'Replay Speed (x)', 'number']].map(([k, label, type]) => (
                      <div key={k} style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                        <input type={type} value={(hospitalConfig as any)[k] || ''}
                          onChange={e => updateHospital(k, type === 'number' ? parseInt(e.target.value) : e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                        />
                      </div>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={!!hospitalConfig.auto_assign_beds} onChange={e => updateHospital('auto_assign_beds', e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--text-accent)' }}
                      />
                      Auto-assign beds to patients
                    </label>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Departments</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(hospitalConfig.departments || []).map((d: string, i: number) => (
                      <span key={i} style={{ padding: '4px 12px', background: 'rgba(0,229,255,0.1)', borderRadius: 16, fontSize: 12, color: 'var(--text-accent)', fontWeight: 600 }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={18} color="var(--text-accent)" /> NOTIFICATION SETTINGS
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[['email_enabled', 'Email Notifications'], ['sms_enabled', 'SMS Notifications'],
                  ['push_enabled', 'Push Notifications'], ['critical_alerts_push', 'Critical Alerts via Push'],
                  ['daily_summary_enabled', 'Daily Summary'],
                ].map(([k, label]) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 14 }}>
                    <input type="checkbox" checked={!!(notifications as any)[k]} onChange={e => updateNotification(k, e.target.checked)}
                      style={{ width: 20, height: 20, accentColor: 'var(--text-accent)' }}
                    />
                    {label}
                  </label>
                ))}
                <div style={{ padding: 16, background: 'var(--bg-deepest)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>Alert Cooldown (seconds)</div>
                  <input type="number" value={notifications.alert_cooldown_seconds || 60}
                    onChange={e => updateNotification('alert_cooldown_seconds', parseInt(e.target.value))}
                    style={{ width: 200, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AUDIT LOG */}
          {tab === 'security' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="var(--text-accent)" /> SECURITY AUDIT LOG
              </h3>
              <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                {['', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'AI_SETTINGS_UPDATED', 'HOSPITAL_CONFIG_UPDATED', 'BACKUP_CREATED', 'BACKUP_RESTORED'].map(a => (
                  <button key={a} onClick={() => setSelectedAuditAction(a)}
                    style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: selectedAuditAction === a ? 'var(--text-accent)' : 'var(--bg-deepest)', color: selectedAuditAction === a ? '#000' : 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                    {a || 'ALL'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditLog.map((e: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--bg-deepest)', borderRadius: 6, border: '1px solid var(--border-default)', fontSize: 13, alignItems: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(0,229,255,0.1)', color: 'var(--text-accent)' }}>{e.action}</span>
                    <span style={{ color: 'var(--text-muted)', flex: 1 }}>{e.detail}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.user}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(e.timestamp).toLocaleString()}</span>
                  </div>
                ))}
                {auditLog.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit log entries</div>}
              </div>
            </div>
          )}

          {/* BACKUP & RECOVERY */}
          {tab === 'backup' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 className="outfit" style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HardDrive size={18} color="var(--text-accent)" /> BACKUP & RECOVERY
              </h3>
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button className="btn-primary" onClick={createBackup} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                  {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={16} />}
                  CREATE BACKUP
                </button>
                <button className="btn-outline" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px' }}>
                  <Download size={16} /> EXPORT DATA
                </button>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Available Backups</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {backups.map((b: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-deepest)', borderRadius: 6, border: '1px solid var(--border-default)', fontSize: 13 }}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.name}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{b.size_kb} KB • {new Date(b.modified).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}>RESTORE</button>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No backups yet. Create one above.</div>}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onSaved={() => { fetchUsers(); setShowAddUser(false); showToast('User created') }} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, background: 'rgba(34,197,94,0.95)', color: 'white', padding: '12px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 2000, fontSize: 14, fontWeight: 600 }}>
          <CheckCircle size={18} /> {toast}
        </div>
      )}
    </div>
  )
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('nurse')
  const [department, setDepartment] = useState('MICU')

  const handleSave = async () => {
    if (!username || !name) return
    try {
      const r = await fetch(`${API}/admin/users`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, name, role, department })
      })
      if (r.ok) onSaved()
    } catch {}
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ width: 420, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 className="outfit" style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={16} color="var(--text-accent)" /> ADD USER
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
            style={{ padding: '10px 14px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
          />
          <input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
            style={{ padding: '10px 14px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
          />
          <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="specialist">Specialist</option><option value="admin">Administrator</option>
          </select>
          <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '10px 14px', background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="MICU">MICU</option><option value="SICU">SICU</option><option value="CCU">CCU</option>
            <option value="ED">ED</option><option value="Cardiology">Cardiology</option><option value="Neurology">Neurology</option>
            <option value="Administration">Administration</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn-outline" onClick={onClose}>CANCEL</button>
          <button className="btn-primary" onClick={handleSave}>CREATE USER</button>
        </div>
      </div>
    </div>
  )
}
