import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useResponsive } from '../../hooks/useResponsive'
import { LayoutDashboard, Users, ShieldAlert, AlertTriangle, Stethoscope, Bed, Settings } from 'lucide-react'
import React from 'react'

const navGroups = [
  {
    title: 'CLINICAL MODULES',
    items: [
      { to: '/', label: 'Live Dashboard', icon: LayoutDashboard },
      { to: '/patients', label: 'Patient Monitoring', icon: Users },
      { to: '/analytics', label: 'Predictive Risk', icon: ShieldAlert },
      { to: '/emergency', label: 'Emergency Command', icon: AlertTriangle },
    ]
  },
  {
    title: 'OPERATIONAL MODULES',
    items: [
      { to: '/equipment', label: 'Resource Management', icon: Stethoscope },
      { to: '/beds', label: 'Bed Management', icon: Bed },
    ]
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { to: '/settings', label: 'System Admin', icon: Settings },
    ]
  }
]

export function Sidebar() {
  const { isDesktop } = useResponsive()
  const [isHovered, setIsHovered] = useState(false)

  const collapsedWidth = isDesktop ? 72 : 60
  const expandedWidth = 240

  return (
    <nav 
      className="glass-panel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? expandedWidth : collapsedWidth,
        height: 'calc(100vh - 64px)', // Adjust for topbar height
        borderTop: 'none',
        borderLeft: 'none',
        borderBottom: 'none',
        borderRadius: 0,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
        zIndex: 10,
        transition: 'width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        overflow: 'hidden',
        position: 'relative',
        background: 'var(--bg-primary)'
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: 1.2,
              paddingLeft: isHovered ? 24 : 0,
              textAlign: isHovered ? 'left' : 'center',
              marginBottom: 12,
              opacity: isHovered ? 1 : 0,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap'
            }}>
              {isHovered ? group.title : '•'}
            </div>
            
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  height: 40,
                  margin: '0 12px 4px 12px',
                  borderRadius: 6,
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                })}
                title={!isHovered ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div style={{ 
                      width: collapsedWidth - 24, 
                      display: 'flex', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {React.createElement(item.icon, { size: 18, color: isActive ? 'var(--text-accent)' : 'var(--text-muted)' })}
                    </div>
                    <span style={{ 
                      fontSize: 13, 
                      fontWeight: isActive ? 600 : 500,
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.15s',
                      marginLeft: 4
                    }}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  )
}
