import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Users, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { StatCard } from './StatCard'
import { DistressForm } from './DistressForm'
import { MOCK_VOLUNTEERS } from '../../mock/mockData'
import socketService from '../../services/socket'
import type { Report } from '../../mock/mockData'
import { useReports } from '../../context/ReportsContext'

const MOCK_MODE = true

function getUrgencyColor(urgency: number): string {
  const map: Record<number, string> = {
    5: '#FF3B3B',
    4: '#FF8C00',
    3: '#FFD700',
    2: '#87CEEB',
    1: '#87CEEB',
  }
  return map[urgency] ?? '#87CEEB'
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#FF8C00',
    assigned: '#9B59B6',
    resolved: '#00C851',
  }
  return map[status] ?? '#888'
}

function getMinutesAgo(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { reports, stats, injectChaos } = useReports()
  
  // LIVE clock state
  const [clock, setClock] = useState<string>('')
  
  // Connection Status State
  const [connectionStatus, setConnectionStatus] = useState<'simulation' | 'live' | 'disconnected'>('simulation')
  
  // Flashing state for LIVE indicator
  const [isFlashing, setIsFlashing] = useState(false)
  
  // Recent reports state (first 5 from ReportsContext, newest first)
  const recentReports = [...reports].slice(0, 5)
  
  // Volunteers collapse state
  const [volunteersOpen, setVolunteersOpen] = useState<boolean>(false)
  
  // Chaos injection state
  const [isInjecting, setIsInjecting] = useState<boolean>(false)
  const [chaosProgress, setChaosProgress] = useState<string>('')

  // Connection Tracking useEffect
  useEffect(() => {
    if (MOCK_MODE) {
      setConnectionStatus('simulation')
      return
    }

    // Check initial connection state
    if (socketService.isConnected()) {
      setConnectionStatus('live')
    } else {
      setConnectionStatus('disconnected')
    }

    // Listen for changes
    socketService.onConnect(() => setConnectionStatus('live'))
    socketService.onDisconnect(() => setConnectionStatus('disconnected'))
  }, [])

  // Clock useEffect
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const ss = String(now.getSeconds()).padStart(2, '0')
      setClock(`${hh}:${mm}:${ss}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen for new reports to flash the LIVE indicator
  useEffect(() => {
    const handleNewReport = () => {
      setIsFlashing(true)
      setTimeout(() => setIsFlashing(false), 1000)
    }
    socketService.on('newReport', handleNewReport)
    return () => {
      socketService.off('newReport', handleNewReport)
    }
  }, [])

  // Chaos injection handler
  const handleInjectChaos = () => {
    if (isInjecting) return
    setIsInjecting(true)
    setChaosProgress('Processing...')
    
    injectChaos((progress) => {
      setChaosProgress(progress)
      if (progress.includes('Chaos Injected')) {
        setTimeout(() => {
          setIsInjecting(false)
          setChaosProgress('')
        }, 3000)
      }
    })
  }

  return (
    <aside
      className="w-[300px] shrink-0 flex flex-col border-r border-border overflow-y-auto"
      style={{ background: 'hsl(var(--sidebar-bg))' }}
    >
      {/* Header with Connection Status + clock */}
      <div className="p-6 pb-4">
        {/* Logo row */}
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CrisisNet
          </h1>
          
          {/* Connection Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: connectionStatus === 'live' 
              ? 'rgba(34,197,94,0.15)' 
              : connectionStatus === 'simulation'
              ? 'rgba(234,179,8,0.15)'
              : 'rgba(239,68,68,0.15)',
            border: `1px solid ${
              connectionStatus === 'live' 
                ? 'rgba(34,197,94,0.3)' 
                : connectionStatus === 'simulation'
                ? 'rgba(234,179,8,0.3)'
                : 'rgba(239,68,68,0.3)'
            }`,
          }}>
            {/* Dot */}
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isFlashing 
                ? '#EF4444'
                : connectionStatus === 'live' 
                ? '#22C55E' 
                : connectionStatus === 'simulation'
                ? '#EAB308'
                : '#EF4444',
              animation: connectionStatus === 'disconnected' 
                ? 'pulse 1s infinite' 
                : connectionStatus === 'live'
                ? 'none'
                : 'pulse 2s infinite',
              boxShadow: connectionStatus === 'live'
                ? '0 0 6px rgba(34,197,94,0.8)'
                : connectionStatus === 'simulation'
                ? '0 0 6px rgba(234,179,8,0.6)'
                : '0 0 6px rgba(239,68,68,0.8)',
            }} />
            
            {/* Text */}
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: connectionStatus === 'live' 
                ? '#22C55E' 
                : connectionStatus === 'simulation'
                ? '#EAB308'
                : '#EF4444',
            }}>
              {connectionStatus === 'live' && 'LIVE'}
              {connectionStatus === 'simulation' && 'SIMULATION'}
              {connectionStatus === 'disconnected' && 'DISCONNECTED'}
            </span>
          </div>
        </div>

        <p
          className="text-xs text-muted-foreground tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          AI Disaster Command Center
        </p>

        {/* Live clock */}
        <div style={{
          marginTop: '6px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#FF8C00',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '2px',
        }}>
          {clock}
        </div>

        {/* CHANGE 1 — Nav buttons */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginTop: '12px',
        }}>
          {[
            { path: '/', label: '🖥️ Command' },
            { path: '/victim', label: '🆘 Victim' },
            { path: '/volunteer', label: '👤 Volunteer' },
          ].map(({ path, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                flex: 1,
                padding: '4px 2px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.3px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                background: location.pathname === path
                  ? '#FF8C00'
                  : 'rgba(255,255,255,0.07)',
                color: location.pathname === path ? '#fff' : '#888',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CHANGE 4 — Demo bar */}
        <div style={{
          marginTop: '10px',
          padding: '6px 8px',
          background: 'rgba(255,140,0,0.08)',
          border: '1px solid rgba(255,140,0,0.2)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: '9px',
            color: '#FF8C00',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '1px',
          }}>
            DEMO:
          </span>
          {[
            { label: 'Admin', path: '/', newTab: false },
            { label: 'Victim ↗', path: '/victim', newTab: true },
            { label: 'Volunteer ↗', path: '/volunteer', newTab: true },
          ].map(({ label, path, newTab }) => (
            <button
              key={label}
              onClick={() => {
                if (newTab) {
                  window.open(path, '_blank')
                } else {
                  navigate(path)
                }
              }}
              style={{
                padding: '2px 7px',
                fontSize: '9px',
                fontWeight: 600,
                border: '1px solid rgba(255,140,0,0.3)',
                borderRadius: '4px',
                cursor: 'pointer',
                background: 'transparent',
                color: '#FF8C00',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Form */}
      <div className="p-5">
        <DistressForm />
      </div>

      <div className="h-px bg-border" />

      {/* Stats with 4th card */}
      <div className="p-5 flex flex-col gap-3">
        <p
          className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Live Statistics
        </p>
        <StatCard icon={AlertTriangle} label="Active Cases"        value={stats.active}       accent="red"    />
        <StatCard icon={CheckCircle}   label="Resolved Cases"      value={stats.resolved}      accent="green"  />
        <StatCard icon={Users}         label="Volunteers Deployed" value={stats.volunteersDeployed} accent="blue"   />
        <StatCard icon={Clock}         label="Avg Response"        value="8.3 min"  accent="orange" />
      </div>

      <div className="h-px bg-border" />

      {/* Recent Reports */}
      <div className="p-5">
        <p
          className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Recent Reports
        </p>
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {recentReports.map(report => (
            <div
              key={report.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Urgency dot */}
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: getUrgencyColor(report.urgency),
                flexShrink: 0,
              }} />

              {/* Location + time */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#e0e0e0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {report.location}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#888',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {getMinutesAgo(report.createdAt)} min ago
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: getStatusColor(report.status),
                color: 'white',
                fontSize: '9px',
                fontWeight: 700,
                flexShrink: 0,
                textTransform: 'uppercase',
              }}>
                {report.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Volunteers collapsible */}
      <div className="p-5">
        <button
          onClick={() => setVolunteersOpen(prev => !prev)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: volunteersOpen ? '10px' : 0,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest text-muted-foreground"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Volunteers
          </p>
          {volunteersOpen
            ? <ChevronUp size={14} color="#888" />
            : <ChevronDown size={14} color="#888" />
          }
        </button>

        {volunteersOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MOCK_VOLUNTEERS.slice(0, 4).map(vol => (
              <div
                key={vol.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '6px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Available dot */}
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: vol.isAvailable ? '#00C851' : '#FF3B3B',
                  marginTop: '4px',
                  flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + area */}
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#e0e0e0',
                  }}>
                    {vol.name}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#888',
                    marginBottom: '4px',
                  }}>
                    {vol.area}
                  </div>

                  {/* Skills badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                    {vol.skills.map(skill => (
                      <span key={skill} style={{
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(255,140,0,0.15)',
                        color: '#FF8C00',
                        fontSize: '9px',
                        fontWeight: 600,
                        border: '1px solid rgba(255,140,0,0.3)',
                      }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* INJECT CHAOS button at bottom */}
      <div className="p-5">
        <button
          onClick={handleInjectChaos}
          disabled={isInjecting}
          className={`w-full p-3 rounded-lg border flex items-center justify-center gap-2 font-mono text-xs font-bold transition-all duration-300 ${
            isInjecting 
              ? 'bg-red-500/30 border-red-500/50 text-red-500 cursor-not-allowed' 
              : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 hover:border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.1)] active:scale-95'
          }`}
        >
          <Zap size={14} className={isInjecting ? 'animate-pulse' : ''} />
          {chaosProgress || 'INJECT MASSIVE CHAOS (ALT+C)'}
        </button>
      </div>

    </aside>
  )
}
