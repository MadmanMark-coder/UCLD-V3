import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { PatientsPage } from './pages/PatientsPage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { AlertsPage } from './pages/AlertsPage'
import { BedsPage } from './pages/BedsPage'
import { EquipmentPage } from './pages/EquipmentPage'
import { EmergencyPage } from './pages/EmergencyPage'
import { PredictiveRiskPage } from './pages/PredictiveRiskPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/beds" element={<BedsPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/analytics" element={<PredictiveRiskPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
