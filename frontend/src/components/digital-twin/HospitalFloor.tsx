import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatientMarker } from './PatientMarker'
import { EquipmentMarker } from './EquipmentMarker'
import type { Patient, Equipment } from '../../types'

const ROOM_COORDS: Record<string, { x: number; y: number }> = {
  '301': { x: 100, y: 80 },
  '302': { x: 260, y: 80 },
  '303': { x: 420, y: 80 },
  '304': { x: 580, y: 80 },
  '305': { x: 740, y: 80 },
  '306': { x: 900, y: 80 },
  '307': { x: 100, y: 175 },
  '308': { x: 260, y: 175 },
  '309': { x: 420, y: 175 },
  '310': { x: 580, y: 175 },
  '311': { x: 740, y: 175 },
  '312': { x: 900, y: 175 },
}

function extractRoomNumber(location: string): string | null {
  const match = location.match(/(\d{3})/)
  return match ? match[1] : null
}

interface Props {
  patients: Patient[]
  equipment?: Equipment[]
}

export function HospitalFloor({ patients, equipment = [] }: Props) {
  const navigate = useNavigate()

  const occupiedRooms = new Set(patients.map(p => p.first_careunit?.match(/(\d{3})/)?.[1]).filter(Boolean))

  return (
    <div style={{
      position: 'relative',
      background: 'var(--bg-deepest)',
      borderRadius: 12,
      border: '1px solid var(--border-default)',
      overflow: 'hidden',
    }}>
      <svg viewBox="0 0 1300 360" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <rect width="1300" height="360" fill="var(--bg-deepest, #0a0a14)"/>

        <text x="70" y="30" fill="var(--text-muted, #666)" fontSize="10" fontWeight="600" fontFamily="monospace" opacity="0.6">MICU</text>
        <text x="370" y="30" fill="var(--text-muted, #666)" fontSize="10" fontWeight="600" fontFamily="monospace" opacity="0.6">SICU</text>
        <text x="670" y="30" fill="var(--text-muted, #666)" fontSize="10" fontWeight="600" fontFamily="monospace" opacity="0.6">CCU</text>
        <text x="970" y="30" fill="var(--text-muted, #666)" fontSize="10" fontWeight="600" fontFamily="monospace" opacity="0.6">STEPDOWN</text>
        <text x="1170" y="30" fill="var(--text-muted, #666)" fontSize="10" fontWeight="600" fontFamily="monospace" opacity="0.6">ED</text>

        {Object.entries(ROOM_COORDS).map(([room, coord]) => (
          <g key={room}>
            <rect
              x={coord.x - 70} y={coord.y - 40}
              width="140" height="80" rx="4"
              stroke={occupiedRooms.has(room) ? 'var(--border-active)' : 'var(--border-default)'}
              strokeWidth={occupiedRooms.has(room) ? 1.5 : 0.5}
              fill="var(--bg-surface)"
            />
            <text
              x={coord.x} y={coord.y + 4}
              fill="var(--text-muted)" fontSize="11" fontFamily="monospace" textAnchor="middle"
            >
              {room}
            </text>
          </g>
        ))}

        <line x1="175" y1="40" x2="175" y2="215" stroke="var(--border-default, #444)" strokeWidth="0.5" strokeDasharray="4 2"/>
        <line x1="335" y1="40" x2="335" y2="215" stroke="var(--border-default, #444)" strokeWidth="0.5" strokeDasharray="4 2"/>
        <line x1="495" y1="40" x2="495" y2="215" stroke="var(--border-default, #444)" strokeWidth="0.5" strokeDasharray="4 2"/>
        <line x1="655" y1="40" x2="655" y2="215" stroke="var(--border-default, #444)" strokeWidth="0.5" strokeDasharray="4 2"/>
        <line x1="815" y1="40" x2="815" y2="215" stroke="var(--border-default, #444)" strokeWidth="0.5" strokeDasharray="4 2"/>

        <rect x="30" y="235" width="300" height="90" rx="6" stroke="var(--border-active, #555)" strokeWidth="0.5" fill="var(--bg-hover, #1a1a2e)" strokeDasharray="2 2"/>
        <text x="180" y="280" fill="var(--text-muted, #999)" fontSize="12" fontWeight="600" fontFamily="monospace" textAnchor="middle">NURSE STATION</text>
        <text x="180" y="295" fill="var(--text-muted, #666)" fontSize="9" fontFamily="monospace" textAnchor="middle">◻ ◻ ◻  (3 desks)</text>

        <rect x="350" y="235" width="200" height="90" rx="6" stroke="var(--border-default, #444)" strokeWidth="0.5" fill="var(--bg-surface, #14141f)"/>
        <text x="450" y="280" fill="var(--text-muted, #999)" fontSize="11" fontWeight="600" fontFamily="monospace" textAnchor="middle">EQUIPMENT</text>
        <text x="450" y="296" fill="var(--text-muted, #666)" fontSize="10" fontFamily="monospace" textAnchor="middle">Ventilators · Defibrillators</text>

        <rect x="830" y="235" width="300" height="90" rx="6" stroke="var(--border-default, #444)" strokeWidth="0.5" fill="var(--bg-surface, #14141f)"/>
        <text x="980" y="280" fill="var(--text-muted, #999)" fontSize="11" fontWeight="600" fontFamily="monospace" textAnchor="middle">STEPDOWN UNIT</text>
        <text x="980" y="296" fill="var(--text-muted, #666)" fontSize="10" fontFamily="monospace" textAnchor="middle">6 beds · Telemetry</text>

        <rect x="1150" y="40" width="120" height="175" rx="6" stroke="var(--border-default, #444)" strokeWidth="0.5" fill="var(--bg-surface, #14141f)"/>
        <text x="1210" y="130" fill="var(--text-muted, #999)" fontSize="11" fontWeight="600" fontFamily="monospace" textAnchor="middle">EMERGENCY</text>
        <text x="1210" y="146" fill="var(--text-muted, #666)" fontSize="10" fontFamily="monospace" textAnchor="middle">DEPARTMENT</text>
        <rect x="1165" y="160" width="90" height="40" rx="4" stroke="var(--border-default, #444)" strokeWidth="0.5" fill="var(--bg-deepest, #0a0a14)"/>
        <text x="1210" y="184" fill="var(--text-muted, #888)" fontSize="10" fontFamily="monospace" textAnchor="middle">Bed 1</text>

        {patients.map(p => {
          const room = extractRoomNumber(p.first_careunit || '')
          const coord = room ? ROOM_COORDS[room] : null
          if (!coord) return null
          return (
            <PatientMarker
              key={p.stay_id}
              x={coord.x}
              y={coord.y - 10}
              status={p.stability_category as 'critical' | 'elevated' | 'stable' | 'empty'}
              name={`Patient ${p.subject_id}`}
              score={p.stability_score ?? 80}
              onClick={() => navigate(`/patients/${p.stay_id}`)}
            />
          )
        })}

        {equipment.map(eq => {
          const room = extractRoomNumber(eq.location || '')
          const coord = room ? ROOM_COORDS[room] : null
          if (!coord) return null
          return (
            <EquipmentMarker
              key={eq.id}
              x={coord.x + 25}
              y={coord.y - 10}
              type={eq.type}
              status={eq.status as 'available' | 'in_use' | 'maintenance' | 'fault'}
              name={eq.name}
              onClick={() => alert(`Equipment: ${eq.name} (${eq.type}, ${eq.status})`)}
            />
          )
        })}

        <text x="1020" y="310" fill="var(--text-muted, #666)" fontSize="8" fontFamily="monospace">● Patient  ■ Equipment</text>
      </svg>
    </div>
  )
}
