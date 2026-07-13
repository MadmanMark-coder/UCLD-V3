import { useAlerts } from '../hooks/useAlerts'
import { AlertPanel } from '../components/alerts/AlertPanel'

export function AlertsPage() {
  const { alerts, acknowledgeAlert, acknowledgeAll, fetchAlerts } = useAlerts()

  return (
    <div>
      <AlertPanel
        alerts={alerts}
        onAcknowledge={acknowledgeAlert}
        onAcknowledgeAll={acknowledgeAll}
        onRefresh={() => fetchAlerts()}
      />
    </div>
  )
}
