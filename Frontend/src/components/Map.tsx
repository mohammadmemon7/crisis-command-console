import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { useReports } from '../context/ReportsContext'
import socketService from '../services/socket'
import { toast } from 'sonner'
import type { Report } from '../mock/mockData'
import { MOCK_VOLUNTEERS } from '../mock/mockData'

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
function getMarkerIcon(urgency: number, status: string, source: string, isNew: boolean = false): L.DivIcon {
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

  const icon = urgency === 5 ? '🚨' : urgency;

  return L.divIcon({
    className: isNew ? 'marker-bounce' : '',
    html: `
      <div style="position:relative; display:inline-block; ${pulse}">
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
        ">${icon}</div>
        ${source === 'sms' ? `
          <span style="
            position: absolute;
            top: -6px;
            right: -10px;
            background: #25D336;
            color: white;
            font-size: 8px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 3px;
            line-height: 1.4;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            z-index: 10;
          ">SMS</span>` : ''}
        ${source === 'voice' ? `
          <span style="
            position: absolute;
            top: -6px;
            right: -10px;
            background: #7C3AED;
            color: white;
            font-size: 8px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 3px;
            line-height: 1.4;
            white-space: nowrap;
            z-index: 10;
          ">MIC</span>` : ''}
        ${source === 'sos' ? `
          <span style="
            position: absolute;
            top: -6px;
            right: -10px;
            background: #DC2626;
            color: white;
            font-size: 8px;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 3px;
            line-height: 1.4;
            white-space: nowrap;
            z-index: 10;
          ">SOS</span>` : ''}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
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

// getTimelineHtml HELPER
const getTimelineHtml = (report: Report) => {
  const created = new Date(report.createdAt)
  const now = new Date()
  
  // Helper: minutes ago from a date
  const minsAgoLabel = (date: Date) => {
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff === 1) return '1 min ago'
    return `${diff} mins ago`
  }

  // Mock derived timestamps from createdAt
  const classifiedTime = new Date(created.getTime() + 30 * 1000)   // +30 seconds
  const assignedTime   = new Date(created.getTime() + 2 * 60 * 1000) // +2 minutes
  const resolvedTime   = new Date(created.getTime() + 10 * 60 * 1000) // +10 minutes

  const isAssigned = report.status === 'assigned' || report.status === 'resolved'
  const isResolved = report.status === 'resolved'

  return `
    <div style="
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
    ">
      <div style="
        font-size: 10px;
        font-weight: bold;
        color: #6b7280;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      ">TIMELINE</div>

      <!-- Reported -->
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px;">
        <div style="
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #EF4444;
          margin-top: 2px;
          flex-shrink: 0;
          box-shadow: 0 0 4px rgba(239,68,68,0.5);
        "></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: #111;">Reported</div>
          <div style="font-size: 10px; color: #6b7280;">${minsAgoLabel(created)}</div>
        </div>
      </div>

      <!-- AI Classified -->
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px;">
        <div style="
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #A855F7;
          margin-top: 2px;
          flex-shrink: 0;
          box-shadow: 0 0 4px rgba(168,85,247,0.5);
        "></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: #111;">AI Classified</div>
          <div style="font-size: 10px; color: #6b7280;">${minsAgoLabel(classifiedTime)}</div>
        </div>
      </div>

      <!-- Volunteer Assigned — only if assigned or resolved -->
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; opacity:${isAssigned ? '1' : '0.3'};">
        <div style="
          width: 10px; height: 10px;
          border-radius: 50%;
          background: ${isAssigned ? '#F97316' : '#d1d5db'};
          margin-top: 2px;
          flex-shrink: 0;
          ${isAssigned ? 'box-shadow: 0 0 4px rgba(249,115,22,0.5);' : ''}
        "></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: ${isAssigned ? '#111' : '#9ca3af'};">
            Volunteer Assigned
          </div>
          <div style="font-size: 10px; color: #6b7280;">
            ${isAssigned ? minsAgoLabel(assignedTime) : 'Pending...'}
          </div>
        </div>
      </div>

      <!-- Resolved — only if resolved -->
      <div style="display:flex; align-items:flex-start; gap:8px; opacity:${isResolved ? '1' : '0.3'};">
        <div style="
          width: 10px; height: 10px;
          border-radius: 50%;
          background: ${isResolved ? '#22C55E' : '#d1d5db'};
          margin-top: 2px;
          flex-shrink: 0;
          ${isResolved ? 'box-shadow: 0 0 4px rgba(34,197,94,0.5);' : ''}
        "></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: ${isResolved ? '#111' : '#9ca3af'};">
            Resolved
          </div>
          <div style="font-size: 10px; color: #6b7280;">
            ${isResolved ? minsAgoLabel(resolvedTime) : '—'}
          </div>
        </div>
      </div>

    </div>
  `
}

// FILTER TYPES
type FilterType = 'all' | 'critical' | 'unassigned' | 'resolved'

// COMPONENT — Map()
const Map = () => {
  const { reports } = useReports()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [newReportIds, setNewReportIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const handleNewReport = (report: Report) => {
      // Toast notification
      toast.error("🚨 New Incident Alert", {
        description: `${report.location} — Urgency ${report.urgency}/5`,
        duration: 3000,
      })

      // Add to new IDs for bounce effect
      setNewReportIds(prev => new Set([...prev, report.id]))
      
      // Remove bounce after animation finishes
      setTimeout(() => {
        setNewReportIds(prev => {
          const next = new Set(prev)
          next.delete(report.id)
          return next
        })
      }, 3000)
    }

    socketService.on('newReport', handleNewReport)
    return () => {
      socketService.off('newReport', handleNewReport)
    }
  }, [])

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

        {/* --- ADDITION 2: Dashed polylines for assigned reports --- */}
        {reports
          .filter(r => r.status === 'assigned' && r.coordinates)
          .map(report => {
            // Find matching volunteer
            const assignedVol = MOCK_VOLUNTEERS.find(v =>
              v.id === report.assignedTo ||
              v.id === report.assignedVolunteer ||
              v.name === report.assignedTo ||
              v.name === report.assignedVolunteer ||
              !v.isAvailable  // fallback: pair with any busy volunteer nearby
            )

            if (!assignedVol) return null

            return (
              <Polyline
                key={`line-${report.id}`}
                positions={[
                  [assignedVol.location.lat, assignedVol.location.lng],
                  [report.coordinates.lat, report.coordinates.lng]
                ]}
                pathOptions={{
                  color: '#FF8C00',
                  weight: 2,
                  dashArray: '5,10',
                  opacity: 0.7
                }}
              />
            )
          })
        }

        {filteredReports.map(report => (
          <Marker
            key={report.id}
            position={[report.coordinates.lat, report.coordinates.lng]}
            icon={getMarkerIcon(report.urgency, report.status, report.source, newReportIds.has(report.id))}
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

                {/* Source Line */}
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#888' }}>
                  {report.source === 'sms' ? '📱' : 
                    report.source === 'voice' ? '🎤' : 
                    report.source === 'sos' ? '🆘' : '💻'} 
                  {' '}Source: {
                    report.source === 'sms' ? 'SMS (Twilio)' :
                    report.source === 'voice' ? 'Voice Input' :
                    report.source === 'sos' ? 'SOS Button' :
                    'App'
                  }
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

                {/* --- ADDITION 3: Popup update for assigned reports --- */}
                {report.status === 'assigned' ? (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 8px',
                    background: '#FFF7ED',
                    borderLeft: '3px solid #FF8C00',
                    borderRadius: '0 4px 4px 0',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#EA580C' }}>
                      👤 Volunteer Assigned
                    </div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                      {(() => {
                        const vol = MOCK_VOLUNTEERS.find(v =>
                          v.id === report.assignedTo || 
                          v.id === report.assignedVolunteer || 
                          v.name === report.assignedTo || 
                          v.name === report.assignedVolunteer
                        )
                        return vol ? vol.name : 'En route...'
                      })()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '2px' }}>
                      🚗 En route to your location
                    </div>
                  </div>
                ) : null}

                {/* --- TIMELINE SECTION --- */}
                <div dangerouslySetInnerHTML={{ __html: getTimelineHtml(report) }} />
              </div>
            </Popup>
          </Marker>
        ))}

        {/* --- ADDITION 1: Volunteer blue pins --- */}
        {MOCK_VOLUNTEERS.filter(v => !v.isAvailable).map(vol => {
          const volIcon = L.divIcon({
            className: '',
            html: `
              <div style="
                position: relative;
                display: inline-block;
              ">
                <div style="
                  width: 26px;
                  height: 26px;
                  border-radius: 50%;
                  background: #2563EB;
                  border: 2px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 11px;
                  font-weight: bold;
                ">V</div>
                <span style="
                  position: absolute;
                  top: -6px;
                  right: -12px;
                  background: #1D4ED8;
                  color: white;
                  font-size: 7px;
                  font-weight: bold;
                  padding: 1px 3px;
                  border-radius: 3px;
                  white-space: nowrap;
                  z-index: 10;
                ">EN ROUTE</span>
              </div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })

          return (
            <Marker
              key={`vol-${vol.id}`}
              position={[vol.location.lat, vol.location.lng]}
              icon={volIcon}
            >
              <Popup>
                <div style={{ fontFamily: 'sans-serif', minWidth: '160px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                    👤 {vol.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                    🛠 Skills: {vol.skills.join(', ')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    📍 Area: {vol.area}
                  </div>
                  <div style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#2563EB',
                    fontWeight: 'bold',
                  }}>
                    🚗 En route to active case
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default Map
