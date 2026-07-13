import { Outlet } from 'react-router-dom'
import { WebSocketProvider } from '../../contexts/WebSocketContext'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomBar } from './BottomBar'
import { AIPanel } from '../ai-assistant/AIPanel'
import { CommandPalette } from '../ui/CommandPalette'
import { ConnectionStatus } from '../ui/ConnectionStatus'
import { ResponsiveWrapper } from './ResponsiveWrapper'
import { useCommandPalette } from '../../hooks/useCommandPalette'
import { useResponsive } from '../../hooks/useResponsive'

function AppContent() {
  const { connected } = useWebSocketContext()
  const commandPalette = useCommandPalette()
  const { isLaptop, isMobile, isTablet } = useResponsive()

  const handleRetry = () => window.location.reload()

  return (
    <>
      <CommandPalette open={commandPalette.open} onClose={commandPalette.closePalette} />
      <ConnectionStatus isConnected={connected} onRetry={handleRetry} />
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'transparent'
      }}>
        <Sidebar />
        <ResponsiveWrapper>
          <TopBar />
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
          }}>
            <main className="animate-fade-in" style={{
              flex: 1,
              overflow: 'auto',
              padding: isMobile ? 12 : isTablet ? 16 : 24,
              background: 'transparent',
              position: 'relative'
            }}>
              <Outlet />
            </main>
            {!isLaptop && !isTablet && !isMobile && (
              <AIPanel onOpenPalette={commandPalette.openPalette} />
            )}
          </div>
          <BottomBar />
        </ResponsiveWrapper>
      </div>
    </>
  )
}

export function AppShell() {
  return (
    <WebSocketProvider>
      <AppContent />
    </WebSocketProvider>
  )
}
