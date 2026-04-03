import Map from '../Map'
import { useReports } from '../../context/ReportsContext'

export function MapArea() {
  const { stats } = useReports()

  return (
    <main className="relative flex-1 overflow-hidden bg-[#111111]">

      {/* Stats overlay — top right */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 500,
        background: 'rgba(10,10,18,0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '8px 14px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.5px',
      }}>
        <span>
          <span style={{ color: '#888' }}>ACTIVE </span>
          <span style={{ color: '#FF3B3B' }}>{stats.active}</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span>
          <span style={{ color: '#888' }}>RESOLVED </span>
          <span style={{ color: '#00C851' }}>{stats.resolved}</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span>
          <span style={{ color: '#888' }}>AVG </span>
          <span style={{ color: '#FF8C00' }}>{Number(stats.avgResponseTimeMinutes).toFixed(2)}m</span>
        </span>
      </div>

      <div className="h-full w-full">
        <Map />
      </div>
    </main>
  )
}
