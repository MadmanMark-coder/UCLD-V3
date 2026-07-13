import type { ReactNode } from 'react'
import { useResponsive } from '../../hooks/useResponsive'

interface Props {
  children: ReactNode
}

export function ResponsiveWrapper({ children }: Props) {
  const { isMobile, isTablet } = useResponsive()

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...(isMobile || isTablet ? { maxWidth: '100vw' } : {}),
    }}>
      {children}
    </div>
  )
}
