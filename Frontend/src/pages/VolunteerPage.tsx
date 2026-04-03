import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { MOCK_VOLUNTEERS } from '../mock/mockData'
import socketService from '../services/socket'
import { API_URL } from '../config'
import { useReports, type ApiVolunteer } from '../context/ReportsContext'

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const MOCK_MODE = false
// Set to false when real backend is connected

type VolunteerState = 'available' | 'newCase' | 'accepted' | 'resolved'

interface Case {
  _id?: string
  id?: string
  location: string
  urgency: 1 | 2 | 3 | 4 | 5
  peopleCount: number
  needs: string[]
  distance?: number | string
  minutesAgo?: number
  coordinates: { lat: number; lng: number }
}

const MOCK_CASE: Case = {
  id: 'mock_001',
  location: 'Kurla Station ke paas, Platform 2',
  urgency: 5,
  peopleCount: 4,
  needs: ['rescue', 'medical'],
  distance: 2.3,
  minutesAgo: 3,
  coordinates: { lat: 19.0726, lng: 72.8795 },
}

const STYLES = {
  page: {
    minHeight: '100%',
    background: '#0a0a12',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: 'monospace',
    color: '#e0e0e0',
  },
  card: {
    width: '100%',
    background: 'transparent',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  logo: {
    fontSize: '11px',
    letterSpacing: '3px',
    color: '#FF8C00',
    fontWeight: 700,
    textAlign: 'center' as const,
    marginBottom: '8px',
  },
  label: {
    fontSize: '11px',
    color: '#888',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  bigText: {
    fontSize: '20px',
    fontWeight: 700,
    textAlign: 'center' as const,
  },
  subText: {
    fontSize: '13px',
    color: '#888',
    textAlign: 'center' as const,
  },
  needsBadge: {
    padding: '1px 5px',
    borderRadius: '4px',
    background: 'rgba(255,140,0,0.15)',
    color: '#FF8C00',
    fontSize: '11px',
    fontWeight: 600,
    border: '1px solid rgba(255,140,0,0.3)',
  },
  btnAccept: {
    width: '100%',
    padding: '14px',
    background: '#00C851',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnDecline: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: '2px solid #FF3B3B',
    borderRadius: '10px',
    color: '#FF3B3B',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  selectStyle: {
    width: '100%',
    padding: '10px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
  },
  caseCard: {
    border: '2px solid #FF3B3B',
    boxShadow: '0 0 20px rgba(255,59,59,0.3)',
  },
}

const BACK_BTN_STYLE = {
  position: 'absolute' as const,
  top: '20px',
  left: '20px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '10px',
  color: '#888',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontWeight: 600,
  zIndex: 100,
}

const PhoneFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 font-sans">
    <div className="relative mx-auto max-w-[390px] w-full border-4 border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden bg-gray-800 p-2 aspect-[9/19.5]">
      <div className="rounded-[2rem] overflow-hidden bg-background h-full w-full relative border border-white/5">
        {children}
      </div>
    </div>
  </div>
)

export default function VolunteerPage() {
  const navigate = useNavigate()
  const { volunteers: apiVolunteers, refreshReports } = useReports()
  const volunteersList: ApiVolunteer[] = useMemo(
    () =>
      MOCK_MODE
        ? MOCK_VOLUNTEERS.map(v => ({
            _id: v.id,
            name: v.name,
            area: v.area,
            skills: v.skills,
            coordinates: v.location,
            isAvailable: v.isAvailable,
            status: v.isAvailable ? 'free' : 'busy',
          }))
        : apiVolunteers,
    [apiVolunteers]
  )

  const [volunteerState, setVolunteerState] = useState<VolunteerState>('available')
  const [selectedVolunteer, setSelectedVolunteer] = useState<ApiVolunteer | null>(null)
  const [currentCase, setCurrentCase] = useState<Case>(MOCK_CASE)
  const [caseTimer, setCaseTimer] = useState(30)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!volunteersList.length) {
      setSelectedVolunteer(null)
      return
    }
    setSelectedVolunteer(prev => {
      if (prev && volunteersList.some(v => String(v._id) === String(prev._id))) return prev
      return volunteersList[0]
    })
  }, [volunteersList])

  useEffect(() => {
    if (volunteerState === 'available' && MOCK_MODE) {
      const t = setTimeout(() => {
        setVolunteerState('newCase')
      }, 12000)
      return () => clearTimeout(t)
    }
  }, [volunteerState])

  useEffect(() => {
    if (volunteerState === 'newCase') {
      setCaseTimer(30)
      timerRef.current = setInterval(() => {
        setCaseTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setVolunteerState('available')
            return 30
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [volunteerState])

  useEffect(() => {
    // Listen for new case assignments from backend
    const handleNewCase = (caseData: any) => {
      setCurrentCase(caseData)
      setVolunteerState('newCase')
    }

    socketService.getSocket().on('newCase', handleNewCase)

    return () => {
      socketService.getSocket().off('newCase', handleNewCase)
    }
  }, [])

  const acceptCase = async (caseId: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (MOCK_MODE) {
      setVolunteerState('accepted')
      return
    }
    try {
      await fetch(`${API_URL}/api/reports/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          volunteerId: selectedVolunteer?._id
        })
      })
      await refreshReports()
      setVolunteerState('accepted')
    } catch (err) {
      console.error('Accept failed:', err)
    }
  }

  const resolveCase = async (caseId: string) => {
    if (MOCK_MODE) {
      setVolunteerState('available')
      return
    }
    try {
      await fetch(`${API_URL}/api/reports/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      })
      await refreshReports()
      setVolunteerState('available')
    } catch (err) {
      console.error('Resolve failed:', err)
    }
  }

  const declineCase = async (caseId: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (MOCK_MODE) {
      setVolunteerState('available')
      return
    }
    try {
      await fetch(`${API_URL}/api/reports/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'false_alarm',
          volunteerId: selectedVolunteer?._id
        })
      })
      await refreshReports()
      setVolunteerState('available')
    } catch (err) {
      console.error('Decline failed:', err)
    }
  }

  const renderContent = () => {
    if (volunteerState === 'available') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CRISISNET VOLUNTEER</div>
          
          <div>
            <div style={STYLES.label}>Volunteer Select Karo ({volunteersList.length})</div>
            <select
              value={selectedVolunteer?._id || ''}
              onChange={(e) => {
                const vol = volunteersList.find(v => String(v._id) === e.target.value)
                if (vol) setSelectedVolunteer(vol)
              }}
              style={STYLES.selectStyle}
              disabled={!volunteersList.length}
            >
              {volunteersList.map(v => (
                <option key={v._id} value={v._id}>{v.name} — {v.area || ''}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'center' }}>
            <div style={{
              width: 10, height: 10, borderRadius:'50%',
              background: '#00C851', boxShadow: '0 0 8px #00C851'
            }} />
            <span style={{ color:'#00C851', fontWeight:700 }}>Ready — Koi Case Nahi</span>
          </div>
          
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', justifyContent:'center' }}>
            {(selectedVolunteer?.skills || []).map(skill => (
              <span key={skill} style={STYLES.needsBadge}>{skill}</span>
            ))}
          </div>
          
          <div style={STYLES.subText}>MongoDB volunteers: {volunteersList.length}</div>
        </div>
      )
    }

    if (volunteerState === 'newCase') {
      return (
        <div style={{ ...STYLES.card, ...STYLES.caseCard, padding: '20px' }}>
          <div style={{ ...STYLES.logo, color:'#FF3B3B' }}>🚨 NAYA CASE AAYA</div>
          
          <div style={{ textAlign:'center' }}>
            <div style={{
              fontSize: 32, fontWeight: 700,
              color: caseTimer <= 10 ? '#FF3B3B' : '#FF8C00'
            }}>
              {caseTimer}s
            </div>
            <div style={STYLES.subText}>baad auto-decline</div>
          </div>
          
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            fontSize: '13px'
          }}>
            <div>📍 {currentCase.location}</div>
            
            <div>
              <div style={STYLES.label}>URGENCY {currentCase.urgency}/5</div>
              <div style={{
                width: '100%', height: 6,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 3, marginTop: 4
              }}>
                <div style={{
                  width: (currentCase.urgency / 5 * 100) + '%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #FF8C00, #FF3B3B)',
                  borderRadius: 3
                }} />
              </div>
            </div>
            
            <div>👥 {currentCase.peopleCount} log</div>
            
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {currentCase.needs.map(need => (
                <span key={need} style={STYLES.needsBadge}>{need}</span>
              ))}
            </div>
            
            <div style={{ display:'flex', justifyContent:'space-between', color: '#888' }}>
              <span>📏 {currentCase.distance || '2.3'} km door</span>
              <span>⏱️ {currentCase.minutesAgo || '3'} min ago</span>
            </div>
          </div>
          
          <button onClick={() => acceptCase(currentCase?.id || currentCase?._id || '')} style={STYLES.btnAccept}>✅ ACCEPT</button>
          <button onClick={() => declineCase(currentCase?.id || currentCase?._id || '')} style={STYLES.btnDecline}>❌ DECLINE</button>
        </div>
      )
    }

    if (volunteerState === 'accepted') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CASE ACCEPTED</div>
          
          <div style={{ height: 220, borderRadius: 10, overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            <MapContainer
              center={[currentCase.coordinates.lat, currentCase.coordinates.lng]}
              zoom={14}
              style={{ height:'100%', width:'100%' }}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              
              <Marker
                position={[currentCase.coordinates.lat, currentCase.coordinates.lng]}
                icon={L.divIcon({
                  className:'',
                  html:`<div style="width:14px;height:14px;background:#FF3B3B;border-radius:50%;
                    border:2px solid white;box-shadow:0 0 8px #FF3B3B"></div>`,
                  iconSize:[14, 14], iconAnchor:[7, 7]
                })}
              >
                <Popup>Victim: {currentCase.location}</Popup>
              </Marker>
              
              <Marker
                position={[
                  (selectedVolunteer!.coordinates || selectedVolunteer!.location)!.lat,
                  (selectedVolunteer!.coordinates || selectedVolunteer!.location)!.lng
                ]}
                icon={L.divIcon({
                  className:'',
                  html:`<div style="width:14px;height:14px;background:#57CEEB;border-radius:50%;
                    border:2px solid white;box-shadow:0 0 8px #57CEEB"></div>`,
                  iconSize:[14, 14], iconAnchor:[7, 7]
                })}
              >
                <Popup>Volunteer: {selectedVolunteer.name}</Popup>
              </Marker>
            </MapContainer>
          </div>
          
          <div style={{ ...STYLES.subText, textAlign:'center', color: '#e0e0e0' }}>
            📍 {currentCase.location}
          </div>
          
          <button onClick={() => resolveCase(currentCase?.id || currentCase?._id || '')} style={STYLES.btnAccept}>✅ RESCUE COMPLETE</button>
          <button onClick={() => resolveCase(currentCase?.id || currentCase?._id || '')} style={STYLES.btnDecline}>🚩 FALSE ALARM</button>
        </div>
      )
    }

    return (
      <div style={STYLES.card}>
        <div style={STYLES.logo}>⚡ CRISISNET VOLUNTEER</div>
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div style={{ ...STYLES.bigText, color:'#00C851', marginTop: 12 }}>Case Resolved!</div>
          <div style={{ ...STYLES.subText, marginTop: 8 }}>3 seconds mein wapas ready ho jaoge</div>
        </div>
      </div>
    )
  }

  return (
    <PhoneFrame>
      <div style={STYLES.page}>
        <button
          onClick={() => navigate('/')}
          style={BACK_BTN_STYLE}
        >
          ← Command Centre
        </button>
        {renderContent()}
      </div>
    </PhoneFrame>
  )
}
