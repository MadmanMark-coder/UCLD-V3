import { useState, useEffect } from 'react'

type Viewport = 'monitor' | 'laptop' | 'tablet' | 'mobile'

interface UseResponsiveReturn {
  viewport: Viewport
  isMonitor: boolean
  isLaptop: boolean
  isTablet: boolean
  isMobile: boolean
  isDesktop: boolean
  width: number
  height: number
}

function getViewport(width: number): Viewport {
  if (width >= 1920) return 'monitor'
  if (width >= 1024) return 'laptop'
  if (width >= 768) return 'tablet'
  return 'mobile'
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null

export function useResponsive(): UseResponsiveReturn {
  const [width, setWidth] = useState(window.innerWidth)
  const [height, setHeight] = useState(window.innerHeight)

  useEffect(() => {
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        setWidth(window.innerWidth)
        setHeight(window.innerHeight)
      }, 150)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [])

  const viewport = getViewport(width)

  return {
    viewport,
    isMonitor: viewport === 'monitor',
    isLaptop: viewport === 'laptop',
    isTablet: viewport === 'tablet',
    isMobile: viewport === 'mobile',
    isDesktop: viewport === 'monitor' || viewport === 'laptop',
    width,
    height,
  }
}
