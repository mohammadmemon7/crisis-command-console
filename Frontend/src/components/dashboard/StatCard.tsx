import { useRef, useEffect } from 'react'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: number | string
  accent?: 'red' | 'green' | 'blue' | 'orange'
}

const ACCENT_COLORS: Record<string, { bg: string; glow: string; icon: string }> = {
  red:    { bg: 'rgba(255,59,59,0.12)',   glow: 'rgba(255,59,59,0.25)',   icon: '#FF3B3B' },
  green:  { bg: 'rgba(0,200,81,0.12)',    glow: 'rgba(0,200,81,0.25)',    icon: '#00C851' },
  blue:   { bg: 'rgba(87,206,235,0.12)',  glow: 'rgba(87,206,235,0.25)',  icon: '#57CEEB' },
  orange: { bg: 'rgba(255,140,0,0.12)',   glow: 'rgba(255,140,0,0.25)',   icon: '#FF8C00' },
}

const DEFAULT_ACCENT = ACCENT_COLORS.orange

export function StatCard({ icon: Icon, label, value, accent }: StatCardProps) {
  const colors = (accent && ACCENT_COLORS[accent]) ? ACCENT_COLORS[accent] : DEFAULT_ACCENT
  const valueRef = useRef<HTMLParagraphElement>(null)
  const prevValue = useRef<number | string>(value)

  useEffect(() => {
    if (prevValue.current !== value && valueRef.current) {
      valueRef.current.style.transition = 'none'
      valueRef.current.style.opacity = '0.3'
      valueRef.current.style.transform = 'translateY(-4px)'

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (valueRef.current) {
            valueRef.current.style.transition = 'opacity 0.3s ease, transform 0.3s ease'
            valueRef.current.style.opacity = '1'
            valueRef.current.style.transform = 'translateY(0)'
          }
        })
      })

      prevValue.current = value
    }
  }, [value])

  return (
    <div
      className="flex items-center gap-3 rounded-lg p-3.5 border border-border"
      style={{
        background: 'hsl(var(--card))',
        boxShadow: `0 0 0 0 transparent`,
        transition: 'box-shadow 0.3s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 12px ${colors.glow}`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 0 transparent'
      }}
    >
      {/* Icon box with accent background */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: colors.bg,
          boxShadow: `0 0 8px ${colors.glow}`,
        }}
      >
        <Icon className="h-5 w-5" style={{ color: colors.icon }} />
      </div>

      <div>
        <p
          ref={valueRef}
          className="text-2xl font-bold text-foreground leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </p>
        <p
          className="text-[11px] text-muted-foreground mt-0.5"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
