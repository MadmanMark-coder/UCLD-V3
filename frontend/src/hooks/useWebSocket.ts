import { useState, useEffect, useCallback, useRef } from 'react'
import { SocketService } from '../services/socket'

interface VitalSigns {
  heart_rate?: number
  sbp?: number
  dbp?: number
  spo2?: number
  resp_rate?: number
  temperature?: number
  glucose?: number
}

interface Alert {
  id: string
  severity: string
  title: string
  description: string
  generated_at: string
}

interface Incident {
  id: string
  type: string
  status: string
  detected_at: string
  summary?: string
}

interface WebSocketState {
  connected: boolean
  vitals: Record<string, VitalSigns>
  alerts: Alert[]
  emergency: Incident | null
  patientCount: number
  replaySpeed: number
  currentTime: string
}

interface WebSocketActions {
  changeSpeed: (speed: number) => void
  selectCohort: (name: string) => void
  acknowledgeAlert: (id: string) => void
}

export function useWebSocket(): WebSocketState & WebSocketActions {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    vitals: {},
    alerts: [],
    emergency: null,
    patientCount: 0,
    replaySpeed: 5,
    currentTime: '',
  })

  const socketRef = useRef<SocketService | null>(null)

  useEffect(() => {
    const socket = new SocketService()
    socketRef.current = socket

    socket.connect('ws://localhost:8000/ws')

    socket.on('__connected', () => {
      setState(prev => ({ ...prev, connected: true }))
    })

    socket.on('__disconnected', () => {
      setState(prev => ({ ...prev, connected: false }))
    })

    socket.on('VITALS_UPDATE', (raw: unknown) => {
      const msg = raw as { stay_id: number; vitals: VitalSigns }
      setState(prev => ({
        ...prev,
        vitals: { ...prev.vitals, [String(msg.stay_id)]: msg.vitals },
      }))
    })

    socket.on('ALERT_TRIGGERED', (raw: unknown) => {
      const alert = raw as Alert
      setState(prev => ({
        ...prev,
        alerts: [alert, ...prev.alerts].slice(0, 100),
      }))
    })

    socket.on('EMERGENCY_START', (raw: unknown) => {
      setState(prev => ({ ...prev, emergency: raw as Incident }))
    })

    socket.on('EMERGENCY_RESOLVE', () => {
      setState(prev => ({ ...prev, emergency: null }))
    })

    socket.on('COHORT_CHANGED', (raw: unknown) => {
      const msg = raw as { cohort_name: string; patient_count: number }
      setState(prev => ({ ...prev, patientCount: msg.patient_count }))
    })

    socket.on('REPLAY_STATUS', (raw: unknown) => {
      const msg = raw as { speed: number; current_time: string }
      setState(prev => ({
        ...prev,
        replaySpeed: msg.speed,
        currentTime: msg.current_time,
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const changeSpeed = useCallback((speed: number) => {
    socketRef.current?.send('CHANGE_SPEED', { speed })
  }, [])

  const selectCohort = useCallback((name: string) => {
    socketRef.current?.send('SELECT_COHORT', { cohort: name })
  }, [])

  const acknowledgeAlert = useCallback((id: string) => {
    socketRef.current?.send('ACKNOWLEDGE_ALERT', { alert_id: id })
  }, [])

  return { ...state, changeSpeed, selectCohort, acknowledgeAlert }
}
