import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, AlertCircle, TrendingUp, Cpu, CheckCircle2 } from 'lucide-react'

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [timeframe, setTimeframe] = useState('LIVE')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="outfit" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={22} color="var(--text-accent)" /> Predictive Risk Engine
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, paddingLeft: 32 }}>
            Powered by UCLD Deep Learning Models
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['LIVE', '1H FORECAST', '4H FORECAST', '12H FORECAST'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 14px',
                background: timeframe === tf ? 'var(--bg-elevated)' : 'transparent',
                color: timeframe === tf ? 'var(--text-primary)' : 'var(--text-muted)',
                border: timeframe === tf ? '1px solid var(--border-active)' : '1px solid var(--border-default)',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingRight: 4 }}>

          {/* Active Alerts */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} color="var(--status-critical)" /> ACTIVE PREDICTIVE ALERTS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="critical-pulse" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-critical)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-critical)' }}>Sepsis Trajectory Detected</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Patient 204 (ICU-3) — 92% confidence</div>
                  </div>
                </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => navigate('/patients/204')}>VIEW PATIENT</button>
                    <button className="btn-critical" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => navigate('/emergency')}>ACTIVATE PROTOCOL</button>
                  </div>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.05)', border: '1px solid rgba(249, 115, 22, 0.2)', borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--status-high-risk)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-high-risk)' }}>Respiratory Deterioration Forecast</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Patient 108 (ER-7) — Expected within 2h</div>
                  </div>
                </div>
                <button style={{ background: 'var(--bg-deepest)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate('/patients/108')}>REVIEW INTERVENTIONS</button>
              </div>
            </div>
          </div>

          {/* Heatmap + Factor Analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>DEPARTMENT RISK HEATMAP</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { name: 'ICU', risk: 85, color: 'var(--status-critical)' },
                  { name: 'ER', risk: 65, color: 'var(--status-high-risk)' },
                  { name: 'Med/Surg', risk: 42, color: 'var(--status-elevated)' },
                  { name: 'Cardiology', risk: 28, color: 'var(--status-observation)' },
                  { name: 'Pediatrics', risk: 12, color: 'var(--status-stable)' }
                ].map(dept => (
                  <div key={dept.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{dept.name}</span>
                      <span className="mono" style={{ color: dept.color, fontWeight: 600 }}>{dept.risk}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'var(--border-default)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${dept.risk}%`, height: '100%', background: dept.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 className="outfit" style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>MODEL FACTOR ANALYSIS</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, marginTop: 0, lineHeight: 1.5 }}>
                Top contributing factors to current predictive models.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { factor: 'Lactate Trends', weight: '+34%' },
                  { factor: 'Heart Rate Variability', weight: '+28%' },
                  { factor: 'WBC Count Changes', weight: '+22%' },
                  { factor: 'Respiratory Rate', weight: '+16%' }
                ].map(f => (
                  <div key={f.factor} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border-default)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.factor}</span>
                    <span className="mono" style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{f.weight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 className="outfit" style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="var(--text-accent)" /> SYSTEM CONFIDENCE
            </h3>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
              <div style={{
                width: 110, height: 110, borderRadius: '50%',
                background: `conic-gradient(var(--text-accent) 0% 94%, var(--border-default) 94% 100%)`,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}>
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>94%</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
              Overall AI Model Accuracy<br />(Trailing 30 days)
            </div>
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 12 }}>SYSTEM LOGS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { text: 'Model recalibrated', sub: '4,291 new records — 10:42 AM' },
                  { text: '3 true positives identified', sub: 'Sepsis detection — 10:15 AM' },
                  { text: 'Batch processing complete', sub: 'Daily run — 09:00 AM' },
                ].map((log, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    <CheckCircle2 size={14} color="var(--status-stable)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ color: 'var(--text-secondary)' }}>{log.text}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{log.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 className="outfit" style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="var(--text-accent)" /> MODEL STATUS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Sepsis Detector', status: 'ACTIVE', ok: true },
                { name: 'Resp. Monitor', status: 'ACTIVE', ok: true },
                { name: 'Cardiac Risk', status: 'DEGRADED', ok: false },
              ].map(m => (
                <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: m.ok ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                    color: m.ok ? 'var(--status-stable)' : 'var(--status-high-risk)',
                    border: `1px solid ${m.ok ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)'}`
                  }}>{m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
