import { OrbitalRing } from './OrbitalRing'
import { DataStream } from './DataStream'
import { AlertMatrix } from './AlertMatrix'
import type { Patient, VitalSigns, Alert } from '../../types'

interface Props {
  patients: Patient[]
  vitals: Record<string, VitalSigns>
  alerts: Alert[]
}

export function GlobeView({ patients, vitals, alerts }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        display: 'flex', gap: 16, flexWrap: 'wrap',
      }}>
        <OrbitalRing patients={patients} />
        <DataStream patients={patients} vitals={vitals} />
      </div>
      <AlertMatrix alerts={alerts} />
    </div>
  )
}
