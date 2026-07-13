import { EquipmentList } from '../components/equipment/EquipmentList'
import { EquipmentMap } from '../components/equipment/EquipmentMap'

export function EquipmentPage() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 60%', minWidth: 400 }}>
          <EquipmentList />
        </div>
        <div style={{ flex: '1 1 35%', minWidth: 300 }}>
          <EquipmentMap />
        </div>
      </div>
    </div>
  )
}
