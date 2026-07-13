export interface VitalSigns {
  heart_rate?: number
  sbp?: number
  dbp?: number
  spo2?: number
  resp_rate?: number
  temperature?: number
  glucose?: number
  charttime?: string
}

export interface VitalHistory {
  charttime: string
  heart_rate?: number
  sbp?: number
  dbp?: number
  spo2?: number
  resp_rate?: number
  temperature?: number
  glucose?: number
}

export interface Patient {
  stay_id: number
  subject_id: number
  gender: string
  age: number
  admission_diagnosis: string
  first_careunit: string
  latest_vitals: VitalSigns
  stability_score: number
  stability_category: StabilityCategory
  diagnoses?: Diagnosis[]
  prescriptions?: Prescription[]
  labs?: LabResult[]
  risk_analysis?: RiskAnalysis
}

export type StabilityCategory = 'stable' | 'observation' | 'elevated' | 'high_risk' | 'critical'

export interface Diagnosis {
  icd_code: string
  icd_version: number
  long_title: string
}

export interface Prescription {
  drug: string
  route: string
  dose_val_rx: number
  dose_unit_rx: string
  starttime: string
  stoptime: string
}

export interface LabResult {
  itemid: number
  valuenum: number
  charttime: string
  label?: string
  lab_name?: string
  flag?: 'normal' | 'low' | 'high'
  reference_range?: { low: number; high: number; unit: string }
  fluid?: string
  category?: string
}

export interface Alert {
  id: string
  patient_id: string
  stay_id: number
  severity: 'info' | 'warning' | 'critical' | 'emergency'
  category: string
  title: string
  description: string
  what_changed?: string
  why_matters?: string
  confidence?: number
  next_steps?: string
  priority_score?: number
  acknowledged: boolean
  generated_at: string
}

export interface Incident {
  id: string
  patient_id: string
  stay_id: number
  type: string
  status: 'detected' | 'notified' | 'responding' | 'stabilized' | 'resolved'
  detected_at: string
  resolved_at?: string
  timeline?: string[]
  summary?: string
}

export interface Equipment {
  id: string
  name: string
  type: string
  status: string
  location: string
  department: string
  battery_level: number
  last_maintenance?: string
  next_maintenance?: string
}

export interface Bed {
  id: string
  room_number: string
  department: string
  bed_type: string
  status: string
  current_patient_id?: string
  current_stay_id?: number
  isolation_type?: string
}

export interface ReplayStatus {
  cohort_name: string
  patient_count: number
  speed: number
  current_time: string
  status: 'playing' | 'stopped'
}

export interface VitalsUpdateEvent {
  stay_id: number
  vitals: VitalSigns
  charttime: string
}

export interface CohortChangedEvent {
  cohort_name: string
  patient_count: number
}

export interface ReplayStatusEvent {
  speed: number
  current_time: string
  status: string
}

export interface ClinicalSummary {
  one_liner: string
  status: string
  stability_trend: string
  key_changes: string[]
  risks: RiskAssessment[]
  summary: string
  recommendations: string[]
}

export interface RiskAssessment {
  condition: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  recommendation: string
}

export interface RiskAnalysis {
  sepsis_risk: RiskScore
  mortality_risk?: RiskScore
  cardiac_event_risk: RiskScore
  cardiac_arrest_risk?: RiskScore
  respiratory_failure_risk: RiskScore
  fall_risk: RiskScore
  icu_escalation_risk?: RiskScore
  icu_transfer_risk?: RiskScore
  readmission_risk?: RiskScore
  organ_failure_risk?: RiskScore
  length_of_stay_risk?: RiskScore
  medication_complication_risk?: RiskScore
}

export interface RiskScore {
  riskPercentage: number
  confidence: number
  contributors: string[]
  recommendation: string
}

export interface EmergencyIncident {
  id: string
  patient_id: string
  stay_id: number
  type: string
  status: 'detected' | 'notified' | 'responding' | 'stabilized' | 'resolved'
  detected_at: string
  resolved_at?: string
  timeline?: string[]
  summary?: string
  alert_id?: string
}

export interface EmergencyKit {
  incident_id: string
  patient_location: string
  defibrillators: Equipment[]
  ventilators: Equipment[]
  oxygen_tanks: Equipment[]
}

export interface VoiceCommandResponse {
  intent: string
  response: string
  session_id: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  streaming?: boolean
}

export interface PatientDemographics {
  subject_id: number
  gender: string
  age: number
  admission_type: string
  admission_location: string
  insurance?: string
  language?: string
  marital_status?: string
  race?: string
  diagnosis?: string
  stay_id: number
  hadm_id: number
  first_careunit: string
  last_careunit?: string
  intime?: string
  outtime?: string
}

export interface PatientOverview {
  patient: Patient
  demographics: PatientDemographics
  diagnoses: Diagnosis[]
  risk_summary: { [key: string]: RiskScore }
  ai_summary: ClinicalSummary | null
}

export interface TimelineEvent {
  type: string
  detail: string
  time: string
}

export interface PatientTimeline {
  events: TimelineEvent[]
}

export interface PatientMedications {
  medications: Prescription[]
  current: Prescription[]
  past: Prescription[]
}

export interface PatientLabs {
  labs: LabResult[]
  microbiology: any[]
}

export interface PatientNotes {
  id: string
  patient_id: string
  content: string
  category: string
  author: string
  created_at: string
  updated_at: string
}

export interface StaffMember {
  id: string
  name: string
  role?: string
  department?: string
  experience?: number
  workload?: number
  available?: boolean
  phone?: string
  specialty?: string
  rating?: number
  est_arrival_min?: number
  response_time_min?: number
}

export interface DeteriorationInfo {
  has_deteriorated: boolean
  confidence: number
  description: string
  indicators: string[]
  severity?: string
}

export interface ForecastWindow {
  deterioration_score: number
  confidence: number
  explanation: string
  suggested_interventions: string[]
  risk_trend: string
}

export interface PatientRisk {
  risk_analysis: RiskAnalysis
  deterioration: DeteriorationInfo
  stability_score: number
  stability_category: string
}

export interface AggregatePatientRisk {
  stay_id: number
  subject_id: number
  age?: number
  gender?: string
  admission_diagnosis: string
  first_careunit: string
  stability_score: number
  stability_category: string
  risks: { [key: string]: RiskScore }
}

export interface ForecastValue {
  value: number
  confidence: number
  trend: 'improving' | 'stable' | 'declining'
  patients_high_risk: number
}

export interface ForecastMetaWindow {
  deterioration_distribution: { critical: number; high: number; elevated: number; low: number }
  model: string
}

export interface PatientRisksResponse {
  patient_count: number
  patient_risks: AggregatePatientRisk[]
  risk_averages: { [key: string]: number }
  high_risk_counts: { [key: string]: number }
  forecasts: { [key: string]: { [key: string]: ForecastValue } }
  forecast_meta: { [key: string]: ForecastMetaWindow }
  generated_at: string
}
