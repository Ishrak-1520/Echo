/**
 * Echo — FloatingCursor Component
 * Renders the custom cursor icon that follows the user's mouse at all times.
 * Uses a glowing AI Spark/Core SVG by default; user can override with their own image.
 */

import { memo, useMemo } from 'react'

interface FloatingCursorProps {
  pos: { x: number; y: number }
  isActive: boolean
  iconPath?: string
}

// Default: Modern abstract AI spark/core floating icon
const DefaultCursorSVG = ({ isActive }: { isActive: boolean }) => (
  <svg
    width="44"
    height="44"
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: isActive
        ? 'drop-shadow(0 0 10px #00E5FF) drop-shadow(0 0 30px rgba(138,43,226,0.6))'
        : 'drop-shadow(0 0 6px rgba(0,229,255,0.4))',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      transform: isActive ? 'scale(1.15)' : 'scale(1)'
    }}
  >
    {/* Background Soft Glow */}
    <circle cx="22" cy="22" r="16" fill="rgba(0, 229, 255, 0.04)" />
    
    {/* The main spark rings */}
    <circle
      cx="22"
      cy="22"
      r="12"
      stroke={isActive ? '#00E5FF' : '#8A2BE2'}
      strokeWidth={isActive ? "2" : "1.5"}
      strokeDasharray={isActive ? "none" : "3 3"}
      opacity={isActive ? "0.9" : "0.5"}
      style={{
        transformOrigin: '22px 22px',
        animation: isActive ? 'none' : 'spinSpark 6s linear infinite'
      }}
    />

    <path
      d="M22 6 L22 10 M22 34 L22 38 M6 22 L10 22 M34 22 L38 22"
      stroke={isActive ? '#00E5FF' : '#8A2BE2'}
      strokeWidth="2"
      strokeLinecap="round"
      opacity={isActive ? "1" : "0"}
      style={{ transition: 'opacity 0.3s ease' }}
    />

    {/* The Core */}
    <circle 
      cx="22" 
      cy="22" 
      r={isActive ? "6" : "4"} 
      fill={isActive ? '#00E5FF' : 'rgba(0, 229, 255, 0.5)'}
      style={{ transition: 'r 0.3s cubic-bezier(0.16, 1, 0.3, 1), fill 0.3s ease' }}
    />
    
    <circle cx="22" cy="22" r="2" fill="#ffffff" opacity={isActive ? "0.9" : "0.5"} />

    <style>
      {`
        @keyframes spinSpark {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}
    </style>
  </svg>
)

const FloatingCursor = memo(({ pos, isActive, iconPath }: FloatingCursorProps) => {
  // Offset so the icon orbits around the actual cursor tip
  const OFFSET_X = 24
  const OFFSET_Y = 24

  const style = useMemo(
    () => ({
      position: 'fixed' as const,
      left: pos.x + OFFSET_X,
      top: pos.y - OFFSET_Y,
      pointerEvents: 'none' as const,
      zIndex: 9999,
      transform: 'translate(-50%, -50%)',
      transition: 'left 0.025s linear, top 0.025s linear',
      userSelect: 'none' as const
    }),
    [pos.x, pos.y]
  )

  return (
    <div style={style} className={`echo-cursor ${isActive ? 'echo-cursor--active' : ''}`}>
      {iconPath ? (
        <img
          src={iconPath}
          width={44}
          height={44}
          alt="Echo Custom Cursor"
          style={{
            filter: isActive
              ? 'drop-shadow(0 0 12px #00E5FF) drop-shadow(0 0 30px rgba(138,43,226,0.8)) brightness(1.2) scale(1.15)'
              : 'drop-shadow(0 0 6px rgba(0,229,255,0.5)) scale(1)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
          draggable={false}
        />
      ) : (
        <DefaultCursorSVG isActive={isActive} />
      )}
    </div>
  )
})

FloatingCursor.displayName = 'FloatingCursor'
export default FloatingCursor
