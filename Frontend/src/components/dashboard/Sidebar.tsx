import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Users, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { StatCard } from './StatCard'
import { DistressForm } from './DistressForm'
import { MOCK_REPORTS, MOCK_VOLUNTEERS } from '../../mock/mockData'
import socketService from '../../services/socket'
import type { Report } from '../../mock/mockData'
import { useReports } from '../../context/ReportsContext'

const CHAOS_MESSAGES: string[] = [
  "Main Kurla station ke paas hun, paani bahut aa gaya, 3 bachche fanse hain",
  "Dharavi flooding badly, need medical help urgently, 2 log injured hain",
  "Bandra west mein building partial collapse, rescue team chahiye abhi",
  "Andheri subway mein paani ghus gaya, 10+ log trapped hain",
  "Malad east mein nala overflow, 5 families stranded on rooftop",
  "Borivali national park road blocked, elderly couple needs evacuation",
  "Sion hospital ke paas road submerged, ambulance cannot pass",
  "Dadar TT circle mein bijli ka khamba gira, bahut dangerous hai",
  "Ghatkopar mein 4 foot paani, need boat rescue immediately",
  "Vikhroli pipe line burst, 3 log injured, medical needed",
  "Kurla LBS road mein truck accident + flooding, 6 log fanse",
  "Dharavi 90 feet road completely underwater, 20+ residents stranded",
  "Bandra reclamation mein sea waves aa rahi hain, evacuate karo",
  "Andheri west market flooding, shop owners need help, bijli bhi gayi",
  "Malad link road bridge pe crack, engineers chahiye turant",
  "Borivali station platform 3 par paani, train service band ho gayi",
  "Sion-Panvel highway mein landslide, 2 gaadiyaan dabi hain",
  "Dadar shivaji park mein tree fall, 1 person injured seriously",
  "Ghatkopar east mein building basement flooded, 8 cars doob gayi",
  "Vikhroli check naka completely submerged, rescue boats needed now"
]

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
  const { reports, addReport, stats } = useReports()
  
  // LIVE clock state
  const [clock, setClock] = useState<string>('')
  
  // Recent reports state (first 5 from ReportsContext, newest first)
  const recentReports = [...reports].slice(0, 5)
  
  // Volunteers collapse state
  const [volunteersOpen, setVolunteersOpen] = useState<boolean>(false)
  
  // Chaos injection state
  const [isInjecting, setIsInjecting] = useState<boolean>(false)
  const [chaosProgress, setChaosProgress] = useState<string>('')

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

  // Chaos injection handler
  const handleInjectChaos = () => {
    if (isInjecting) return
    setIsInjecting(true)
    setChaosProgress('Sending 1/20...')

    const MUMBAI_LOCATIONS = [
      { name: 'Kurla Station', lat: 19.0726, lng: 72.8795 },
      { name: 'Dharavi', lat: 19.0422, lng: 72.8553 },
      { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
      { name: 'Andheri East', lat: 19.1197, lng: 72.8468 },
      { name: 'Malad West', lat: 19.1874, lng: 72.8479 },
      { name: 'Borivali East', lat: 19.2307, lng: 72.8567 },
      { name: 'Sion', lat: 19.0397, lng: 72.8644 },
      { name: 'Dadar', lat: 19.0186, lng: 72.8440 },
      { name: 'Ghatkopar', lat: 19.0863, lng: 72.9073 },
      { name: 'Vikhroli', lat: 19.0989, lng: 72.9252 },
      { name: 'Chembur', lat: 19.0522, lng: 72.8994 },
      { name: 'Mulund', lat: 19.1726, lng: 72.9560 },
      { name: 'Thane', lat: 19.2183, lng: 72.9781 },
      { name: 'Powai', lat: 19.1176, lng: 72.9060 },
      { name: 'Juhu', lat: 19.1075, lng: 72.8263 },
      { name: 'Versova', lat: 19.1307, lng: 71.8148 },
      { name: 'Goregaon', lat: 19.1663, lng: 72.8526 },
      { name: 'Kandivali', lat: 19.2067, lng: 72.8567 },
      { name: 'Colaba', lat: 18.9067, lng: 72.8147 },
      { name: 'Worli', lat: 19.0178, lng: 72.8178 },
    ]

    const ALL_NEEDS = ['rescue', 'medical', 'food', 'water', 'shelter', 'boat']

    CHAOS_MESSAGES.forEach((msg, index) => {
      setTimeout(() => {
        const loc = MUMBAI_LOCATIONS[index % MUMBAI_LOCATIONS.length]
        
        // Add small random offset so pins don't stack exactly
        const latOffset = (Math.random() - 0.5) * 0.008
        const lngOffset = (Math.random() - 0.5) * 0.008

        const needsCount = Math.ceil(Math.random() * 3)
        const shuffled = [...ALL_NEEDS].sort(() => Math.random() - 0.5)
        const needs = shuffled.slice(0, needsCount)

        const report: Report = {
          id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          location: loc.name,
          coordinates: {
            lat: loc.lat + latOffset,
            lng: loc.lng + lngOffset,
          },
          urgency: (Math.ceil(Math.random() * 5)) as 1 | 2 | 3 | 4 | 5,
          peopleCount: Math.ceil(Math.random() * 10),
          needs,
          status: 'pending',
          source: 'app',
          createdAt: new Date(),
        }

        addReport(report)

        if (index < CHAOS_MESSAGES.length - 1) {
          setChaosProgress(`Sending ${index + 2}/20...`)
        } else {
          setChaosProgress('Chaos Injected! 20 Reports Sent')
          setTimeout(() => {
            setIsInjecting(false)
            setChaosProgress('')
          }, 3000)
        }
      }, index * 300)
    })
  }

  return (
    <aside
      className="w-[300px] shrink-0 flex flex-col border-r border-border overflow-y-auto"
      style={{ background: 'hsl(var(--sidebar-bg))' }}
    >
      {/* Header with LIVE text + clock */}
      <div className="p-6 pb-4">
        {/* Logo row */}
        <div className="flex items-center gap-2 mb-1">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <h1
            className="text-xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            CrisisNet
          </h1>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#FF8C00',
            letterSpacing: '1px',
            marginLeft: '4px',
          }}>
            LIVE
          </span>
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
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {recentReports.map(report => (
            <div
              key={report.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 0',
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
                padding: '1px 5px',
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
            {MOCK_VOLUNTEERS.map(vol => (
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
          style={{
            width: '100%',
            padding: '12px',
            background: isInjecting
              ? 'rgba(255,59,59,0.3)'
              : 'rgba(255,59,59,0.15)',
            border: '1px solid rgba(255,59,59,0.6)',
            borderRadius: '8px',
            color: '#FF3B3B',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '1px',
            cursor: isInjecting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isInjecting ? 'none' : '0 0 12px rgba(255,59,59,0.3)',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <Zap size={14} />
          {chaosProgress || 'INJECT CHAOS'}
        </button>
      </div>

    </aside>
  )
}
