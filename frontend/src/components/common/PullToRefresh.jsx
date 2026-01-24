import { useState, useRef, useCallback } from 'react'
import { ReloadOutlined } from '@ant-design/icons'

const PullToRefresh = ({ onRefresh, children, disabled = false }) => {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef(null)
  const startY = useRef(0)
  const currentY = useRef(0)

  const THRESHOLD = 80 // Distance to trigger refresh
  const MAX_PULL = 120 // Maximum pull distance

  const handleTouchStart = useCallback((e) => {
    if (disabled || refreshing) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    startY.current = e.touches[0].clientY
    setPulling(true)
  }, [disabled, refreshing])

  const handleTouchMove = useCallback((e) => {
    if (!pulling || disabled || refreshing) return

    const container = containerRef.current
    if (!container || container.scrollTop > 0) {
      setPullDistance(0)
      return
    }

    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)

    if (distance > 0) {
      e.preventDefault()
      // Apply resistance effect
      const newDistance = Math.min(distance * 0.5, MAX_PULL)
      setPullDistance(newDistance)
    }
  }, [pulling, disabled, refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling || disabled) return

    setPulling(false)

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [pulling, pullDistance, onRefresh, disabled])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const shouldTrigger = pullDistance >= THRESHOLD

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        minHeight: '100%',
        touchAction: pullDistance > 0 ? 'none' : 'auto',
      }}
    >
      {/* Pull indicator */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: pullDistance,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: pulling ? 'none' : 'height 0.3s ease',
        background: 'linear-gradient(180deg, #f0f7ff 0%, transparent 100%)',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          opacity: progress,
          transform: `scale(${0.5 + progress * 0.5})`,
          transition: pulling ? 'none' : 'all 0.3s ease',
        }}>
          <ReloadOutlined
            spin={refreshing}
            style={{
              fontSize: 20,
              color: shouldTrigger ? '#2a9299' : '#999',
              transform: `rotate(${progress * 180}deg)`,
              transition: refreshing ? 'none' : 'transform 0.1s ease',
            }}
          />
          <span style={{
            fontSize: 12,
            color: shouldTrigger ? '#2a9299' : '#999',
            fontWeight: 500,
          }}>
            {refreshing ? 'Đang tải...' : shouldTrigger ? 'Thả để làm mới' : 'Kéo xuống để làm mới'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        transform: `translateY(${pullDistance}px)`,
        transition: pulling ? 'none' : 'transform 0.3s ease',
      }}>
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh
