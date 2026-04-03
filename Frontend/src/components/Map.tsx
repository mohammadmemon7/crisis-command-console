import React, { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useReports } from '../context/ReportsContext'
import type { Report } from '../mock/mockData'

// LEAFLET ICON FIX
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// KEYFRAME INJECTION
const style = document.createElement('style')
style.textContent = `@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255,59,59,0.7); }
  70% { box-shadow: 0 0 0 10px rgba(255,59,59,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,59,59,0); }
}`
document.head.appendChild(style)

// getMarkerIcon FUNCTION
function getMarkerIcon(urgency: number, status: string): L.DivIcon {
  const colorMap: Record<string, string> = {
    resolved: '#00C851',
    assigned: '#9B59B6',
    '5': '#FF3B3B',
    '4': '#FF8C00',
    '3': '#FFD700',
    '2': '#87CEEB',
    '1': '#87CEEB',
  }
  const color =
    status === 'resolved' ? colorMap.resolved
    : status === 'assigned' ? colorMap.assigned
    : colorMap[String(urgency)] ?? '#87CEEB'

  const pulse = urgency === 5 && status === 'pending'
    ? 'animation: pulse 1.5s infinite;' : ''

  return L.divIcon({
    className: '',
    html: `<div style="
      width:16px;height:16px;
      background:${color};
      border-radius:50%;
      border:2px solid rgba(255,255,255,0.8);
      box-shadow:0 0 8px ${color};
      ${pulse}
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

// getUrgencyColor HELPER
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

// getStatusColor HELPER
function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#FF8C00',
    assigned: '#9B59B6',
    resolved: '#00C851',
  }
  return map[status] ?? '#888'
}

// getMinutesAgo HELPER
function getMinutesAgo(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

// FILTER TYPES
type FilterType = 'all' | 'critical' | 'unassigned' | 'resolved'

// COMPONENT — Map()
const Map = () => {
  const { reports } = useReports()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const filteredReports = reports.filter(r => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'critical') return r.urgency === 5
    if (activeFilter === 'unassigned') return r.status === 'pending'
    if (activeFilter === 'resolved') return r.status === 'resolved'
    return true
  })

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'resolved', label: 'Resolved' },
  ]

  return (
    <div className="h-full w-full relative">

      {/* Filter buttons overlay — top left */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 1000,
        display: 'flex',
        gap: '6px',
      }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeFilter === f.key ? '#FF8C00' : 'rgba(20,20,30,0.85)',
              color: activeFilter === f.key ? '#fff' : '#ccc',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <MapContainer
        center={[19.0760, 72.8777]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {filteredReports.map(report => (
          <Marker
            key={report.id}
            position={[report.coordinates.lat, report.coordinates.lng]}
            icon={getMarkerIcon(report.urgency, report.status)}
          >
            <Popup>
              <div style={{
                minWidth: '200px',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.6',
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '6px',
                  color: '#1a1a2e',
                }}>
                  {report.location}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span>Urgency:</span>
                  <span style={{ color: getUrgencyColor(report.urgency), fontWeight: 'bold' }}>
                    {report.urgency}/5
                  </span>
                </div>

                <div>👥 {report.peopleCount} log</div>
                <div>⏱️ {getMinutesAgo(report.createdAt)} min ago</div>

                <div style={{
                  marginTop: '6px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '3px',
                }}>
                  {report.needs.map(need => (
                    <span key={need} style={{
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: '#1a1a2e',
                      color: '#FFD700',
                      fontSize: '10px',
                      fontWeight: 600,
                    }}>
                      {need}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: getStatusColor(report.status),
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}>
                    {report.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default Map
