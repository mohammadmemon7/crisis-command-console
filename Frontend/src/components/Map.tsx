import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { useReports } from '../context/ReportsContext'
import socketService from '../services/socket'
import { toast } from 'sonner'
import type { Report } from '../mock/mockData'
import type { ApiVolunteer } from '../context/ReportsContext'

function hasValidCoords(r: Report): boolean {
  const c = (r as any).coordinates
  return !!(c && typeof c.lat === 'number' && typeof c.lng === 'number' && !Number.isNaN(c.lat) && !Number.isNaN(c.lng))
}

function volHasLocation(v: ApiVolunteer): boolean {
  const loc = v.location
  return !!(loc && typeof loc.lat === 'number' && typeof loc.lng === 'number')
}

// LEAFLET ICON FIX
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// getMarkerIcon FUNCTION
function getMarkerIcon(urgency: number, status: string, source: string): L.DivIcon {
  const colorMap: Record<string, string> = {
    resolved: '#00C851',
    assigned: '#2563EB', // Blue pin for assigned
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

  const iconText = urgency === 5 ? '🚨' : urgency;

  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative; display:inline-block;">
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
        ">${iconText}</div>
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

// Helpers
function getUrgencyColor(urgency: number): string {
  const map: Record<number, string> = {
    5: '#FF3B3B', 4: '#FF8C00', 3: '#FFD700', 2: '#87CEEB', 1: '#87CEEB'
  }
  return map[urgency] ?? '#87CEEB'
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#FF8C00',
    assigned: '#2563EB',
    resolved: '#00C851',
  }
  return map[status] ?? '#888'
}

function getMinutesAgo(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60000)
}

const getTimelineHtml = (report: Report) => {
  const created = new Date(report.createdAt)
  const now = new Date()
  
  const minsAgoLabel = (date: Date) => {
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff === 1) return '1 min ago'
    return `${diff} mins ago`
  }

  const isAssigned = report.status === 'assigned' || report.status === 'resolved'
  const isResolved = report.status === 'resolved'

  return `
    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
      <div style="font-size: 10px; font-weight: bold; color: #6b7280; letter-spacing: 0.05em; margin-bottom: 6px;">TIMELINE</div>
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444; margin-top: 2px; flex-shrink: 0;"></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: #111;">Reported</div>
          <div style="font-size: 10px; color: #6b7280;">${minsAgoLabel(created)}</div>
        </div>
      </div>
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:5px; opacity:${isAssigned ? '1' : '0.3'};">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${isAssigned ? '#2563EB' : '#d1d5db'}; margin-top: 2px; flex-shrink: 0;"></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: ${isAssigned ? '#111' : '#9ca3af'};">Volunteer Assigned</div>
          <div style="font-size: 10px; color: #6b7280;">${isAssigned ? 'En route' : 'Pending...'}</div>
        </div>
      </div>
      <div style="display:flex; align-items:flex-start; gap:8px; opacity:${isResolved ? '1' : '0.3'};">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${isResolved ? '#22C55E' : '#d1d5db'}; margin-top: 2px; flex-shrink: 0;"></div>
        <div>
          <div style="font-size: 11px; font-weight: 600; color: ${isResolved ? '#111' : '#9ca3af'};">Resolved</div>
          <div style="font-size: 10px; color: #6b7280;">${isResolved ? 'Rescue Complete' : '—'}</div>
        </div>
      </div>
    </div>
  `
}

type FilterType = 'all' | 'critical' | 'unassigned' | 'resolved'

const Map = () => {
  const { reports, volunteers, updateReport } = useReports()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    console.log('Reports:', reports.length)
    console.log('Volunteers:', volunteers.length)
  }, [reports, volunteers])

  useEffect(() => {
    // FIX 1: reportUpdated listener for real-time pin transitions
    const handleReportUpdate = (update: any) => {
      const id = update.reportId || update.id
      updateReport(id, {
        status: update.status,
        assignedTo: update.volunteerName,
        assignedVolunteer: update.volunteerName
      })

      toast.success("Incident Updated", {
        description: `Case ${id.slice(-4)} is now ${update.status.toUpperCase()}`,
        duration: 3000,
      })
    }

    const handleNewReport = (report: Report) => {
      toast.error("🚨 New Incident Alert", {
        description: `${report.location} — Priority ${(report as any).priority ?? report.urgency}/5`,
        duration: 3000,
      })
    }

    socketService.on('newReport', handleNewReport)
    socketService.on('reportUpdated', handleReportUpdate)
    return () => {
      socketService.off('newReport', handleNewReport)
      socketService.off('reportUpdated', handleReportUpdate)
    }
  }, [])

  const filteredReports = reports.filter(r => {
    if (!hasValidCoords(r)) return false
    if (activeFilter === 'all') return true
    if (activeFilter === 'critical') return ((r as any).priority ?? r.urgency) === 5
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
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, display: 'flex', gap: '6px' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer',
              background: activeFilter === f.key ? '#FF8C00' : 'rgba(20,20,30,0.85)', color: activeFilter === f.key ? '#fff' : '#ccc',
              backdropFilter: 'blur(4px)', transition: 'all 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <MapContainer center={[19.0760, 72.8777]} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {reports.filter(r => r.status === 'assigned' && hasValidCoords(r)).map(report => {
          const aid = (report as any).assignedTo
          const volId = typeof aid === 'object' && aid?._id ? aid._id : aid
          const assignedVol = volunteers.find(v => String(v._id) === String(volId))
          if (!assignedVol || !volHasLocation(assignedVol)) return null
          return (
            <Polyline
              key={`line-${report.id || (report as any)._id}`}
              positions={[[assignedVol.location!.lat, assignedVol.location!.lng], [(report as any).coordinates.lat, (report as any).coordinates.lng]]}
              pathOptions={{ color: '#2563EB', weight: 2, dashArray: '5,10', opacity: 0.7 }}
            />
          )
        })}

        {filteredReports.map(report => (
          <Marker
            key={report.id || (report as any)._id}
            position={[report.coordinates.lat, report.coordinates.lng]}
            icon={getMarkerIcon((report as any).priority ?? report.urgency, report.status, report.source)}
          >
            <Popup>
              <div style={{ minWidth: '200px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: '#1a1a2e' }}>{report.location}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span>Urgency:</span>
                  <span style={{ color: getUrgencyColor((report as any).priority ?? report.urgency), fontWeight: 'bold' }}>{(report as any).priority ?? report.urgency}/5</span>
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', color: '#888' }}>
                  {report.source === 'sms' ? '📱' : report.source === 'voice' ? '🎤' : report.source === 'sos' ? '🆘' : '💻'}
                  {' '}Source: {report.source === 'sms' ? 'SMS (Twilio)' : report.source === 'voice' ? 'Voice Input' : report.source === 'sos' ? 'SOS Button' : 'App'}
                </div>
                <div>👥 {report.peopleCount} log</div>
                <div>⏱️ {getMinutesAgo(report.createdAt)} min ago</div>
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {(report.needs || []).map(need => (
                    <span key={need} style={{ padding: '1px 6px', borderRadius: '4px', background: '#1a1a2e', color: '#FFD700', fontSize: '10px', fontWeight: 600 }}>{need}</span>
                  ))}
                </div>
                <div style={{ marginTop: '6px' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', background: getStatusColor(report.status), color: 'white', fontSize: '10px', fontWeight: 700 }}>{report.status.toUpperCase()}</span>
                </div>
                {report.status === 'assigned' && (
                  <div style={{ marginTop: '8px', padding: '6px 8px', background: '#EFF6FF', borderLeft: '3px solid #2563EB', borderRadius: '0 4px 4px 0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1E40AF' }}>👤 Volunteer Assigned</div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                      {typeof (report as any).assignedTo === 'object' && (report as any).assignedTo?.name
                        ? (report as any).assignedTo.name
                        : (report as any).assignedVolunteer || String((report as any).assignedTo || 'En route...')}
                    </div>
                  </div>
                )}
                <div dangerouslySetInnerHTML={{ __html: getTimelineHtml(report) }} />
              </div>
            </Popup>
          </Marker>
        ))}

        {volunteers.filter(volHasLocation).map(vol => {
          const busy = vol.status === 'busy' || vol.isAvailable === false
          const volIcon = L.divIcon({
            className: '',
            html: `<div style="position:relative;display:inline-block;"><div style="width:26px;height:26px;border-radius:50%;background:${busy ? '#F97316' : '#3B82F6'};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">V</div>${busy ? `<span style="position:absolute;top:-6px;right:-12px;background:#C2410C;color:white;font-size:7px;font-weight:bold;padding:1px 3px;border-radius:3px;white-space:nowrap;z-index:10;">BUSY</span>` : `<span style="position:absolute;top:-6px;right:-12px;background:#1D4ED8;color:white;font-size:7px;font-weight:bold;padding:1px 3px;border-radius:3px;white-space:nowrap;z-index:10;">FREE</span>`}</div>`,
            iconSize: [26, 26], iconAnchor: [13, 13],
          })
          return (
            <Marker key={`vol-${vol._id}`} position={[vol.location!.lat, vol.location!.lng]} icon={volIcon}>
              <Popup>
                <div style={{ fontFamily: 'sans-serif', minWidth: '160px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>👤 {vol.name}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>🛠 Skills: {(vol.skills || []).join(', ')}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>📍 Area: {vol.area || '—'}</div>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#2563EB', fontWeight: 'bold' }}>{busy ? '🚗 Deployed' : '✅ Available'}</div>
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
