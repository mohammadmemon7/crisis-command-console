import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { toast } from 'sonner'
import socketService from '../services/socket'

const STYLES = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'monospace',
    color: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '40px 30px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    textAlign: 'center' as const,
    letterSpacing: '2px',
    background: 'linear-gradient(to right, #FF8C00, #FF3B3B)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: '1px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  button: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(to right, #FF8C00, #FF3B3B)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 20px -5px rgba(255, 140, 0, 0.3)',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 59, 59, 0.1)',
    border: '1px solid rgba(255, 59, 59, 0.2)',
    borderRadius: '8px',
    color: '#FF3B3B',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '20px',
  },
  backBtn: {
    alignSelf: 'flex-start',
    color: 'rgba(255, 255, 255, 0.6)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  profileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  }
}

export default function VolunteerPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', area: '' })
  const [loading, setLoading] = useState(false)
  const [pendingReports, setPendingReports] = useState<any[]>([])
  const [incomingRequest, setIncomingRequest] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('volunteer')
    if (saved) {
      const parsedUser = JSON.parse(saved)
      setUser(parsedUser)
      // Register socket for volunteer
      socketService.emit('registerVolunteer', parsedUser._id)
    }
  }, [])

  useEffect(() => {
    const handleNewRequest = (data: any) => {
      setIncomingRequest({
        ...data,
        reportId: data._id
      })
      toast.info("🚨 New Manual Request!", {
        description: `Location: ${data.location}`,
        duration: 10000,
      })
    }

    socketService.on("newManualRequest", handleNewRequest)
    return () => {
      socketService.off("newManualRequest", handleNewRequest)
    }
  }, [])

  const fetchVolunteerStatus = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/volunteers`);
      const data = await res.json();
      const current = data.find((v: any) => v._id === user._id);
      if (current) {
        setUser(current);
        localStorage.setItem('volunteer', JSON.stringify(current));
      }
    } catch (err) {
      console.error('Failed to fetch volunteer status:', err);
    }
  }

  useEffect(() => {
    if (user) {
      fetchVolunteerStatus();
      const statusInterval = setInterval(fetchVolunteerStatus, 5000);
      return () => clearInterval(statusInterval);
    }
  }, [user?._id])

  const fetchPendingReports = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reports`)
      const data = await res.json()
      setPendingReports(data.filter((r: any) => r.status === 'pending'))
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    }
  }

  useEffect(() => {
    if (user && user.status === 'free') {
      fetchPendingReports()
      const interval = setInterval(fetchPendingReports, 5000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleRespond = async (reportId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`${API_URL}/api/reports/${reportId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, volunteerId: user._id })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Request ${action}ed!`)
        if (action === 'accept') {
          const updatedUser = { ...user, status: 'busy' }
          localStorage.setItem('volunteer', JSON.stringify(updatedUser))
          setUser(updatedUser)
        }
        setIncomingRequest(null)
        fetchPendingReports()
      }
    } catch (err) {
      toast.error('Failed to respond to request')
    }
  }

  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      )
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      toast.info("Requesting location permission...")
      const coords = await getLocation()
      
      console.log("Sending POST request to:", `${API_URL}/api/volunteer/login`);
      const res = await fetch(`${API_URL}/api/volunteer/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ ...form, coordinates: coords })
      })

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server responded with ${res.status}: ${errorText || 'Unknown Error'}`)
      }

      const data = await res.json()
      console.log("LOGIN RESPONSE RECEIVED:", data);
      if (data.volunteer) {
        localStorage.setItem('volunteer', JSON.stringify(data.volunteer))
        setUser(data.volunteer)
        // Register socket for volunteer after login
        socketService.emit('registerVolunteer', data.volunteer._id)
        toast.success("Successfully logged in!", {
          description: `Welcome, ${data.volunteer.name}. Mission active.`
        })
      }
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error("Login failed", {
        description: err.code === 1 ? "Location permission is required to join!" : err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('volunteer')
    setUser(null)
  }

  if (!user) {
    return (
      <div style={STYLES.page}>
        <div style={STYLES.card}>
          <button onClick={() => navigate(-1)} style={STYLES.backBtn}>
            ← Back
          </button>
          <div style={STYLES.title}>CRISISNET VOLUNTEER</div>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={STYLES.inputGroup}>
              <label style={STYLES.label}>Name</label>
              <input
                style={STYLES.input}
                placeholder="Full Name"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div style={STYLES.inputGroup}>
              <label style={STYLES.label}>Phone Number</label>
              <input
                style={STYLES.input}
                placeholder="+91 XXXXXXXXXX"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div style={STYLES.inputGroup}>
              <label style={STYLES.label}>Area</label>
              <input
                style={STYLES.input}
                placeholder="e.g. Kurla, Bandra"
                value={form.area}
                onChange={e => setForm({ ...form, area: e.target.value })}
                required
              />
            </div>

            <button type="submit" style={STYLES.button} disabled={loading}>
              {loading ? 'GETTING LOCATION...' : 'JOIN MISSION'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <div style={STYLES.title}>VOLUNTEER PROFILE</div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={STYLES.profileRow}>
            <span style={STYLES.label}>Name</span>
            <span style={{ fontWeight: 600 }}>{user.name}</span>
          </div>
          <div style={STYLES.profileRow}>
            <span style={STYLES.label}>Phone</span>
            <span style={{ fontWeight: 600 }}>{user.phone}</span>
          </div>
          <div style={STYLES.profileRow}>
            <span style={STYLES.label}>Area</span>
            <span style={{ fontWeight: 600 }}>{user.area}</span>
          </div>
          <div style={STYLES.profileRow}>
            <span style={STYLES.label}>Status</span>
            <span style={{ 
              fontWeight: 700, 
              color: user.status === 'busy' ? '#FF8C00' : '#00C851',
              textTransform: 'uppercase'
            }}>
              {user.status}
            </span>
          </div>

          <div style={{ 
            marginTop: '30px',
            padding: '20px',
            background: user.status === 'busy' ? 'rgba(255, 140, 0, 0.1)' : 'rgba(0, 200, 81, 0.1)',
            border: `1px solid ${user.status === 'busy' ? 'rgba(255, 140, 0, 0.2)' : 'rgba(0, 200, 81, 0.2)'}`,
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <div style={{ 
              display: 'inline-block',
              width: '10px', height: '10px', 
              background: user.status === 'busy' ? '#FF8C00' : '#00C851', 
              borderRadius: '50%',
              marginRight: '10px',
              boxShadow: `0 0 10px ${user.status === 'busy' ? '#FF8C00' : '#00C851'}`
            }} />
            <span style={{ 
              color: user.status === 'busy' ? '#FF8C00' : '#00C851', 
              fontWeight: 700, 
              fontSize: '14px' 
            }}>
              {user.status === 'busy' ? 'MISSION IN PROGRESS' : 'READY & AVAILABLE'}
            </span>
          </div>

          {incomingRequest && user.status === 'free' && (
            <div style={{ 
              marginTop: '24px', 
              background: 'rgba(255, 140, 0, 0.1)', 
              padding: '20px', 
              borderRadius: '16px',
              border: '2px solid #FF8C00',
              animation: 'pulse 2s infinite'
            }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#FF8C00', marginBottom: '10px' }}>
                🚨 INSTANT ALERT
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '5px' }}>📍 {incomingRequest.location}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>
                Urgency: {incomingRequest.urgency}/5 | People: {incomingRequest.peopleCount}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => handleRespond(incomingRequest.reportId, 'accept')}
                  style={{ 
                    flex: 1, padding: '12px', background: '#00C851', border: 'none', 
                    borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 200, 81, 0.3)'
                  }}
                >
                  ACCEPT
                </button>
                <button 
                  onClick={() => handleRespond(incomingRequest.reportId, 'reject')}
                  style={{ 
                    flex: 1, padding: '12px', background: 'rgba(255,255,255,0.1)', border: 'none', 
                    borderRadius: '8px', color: '#fff', fontWeight: 800, cursor: 'pointer' 
                  }}
                >
                  REJECT
                </button>
              </div>
            </div>
          )}

          {user.status === 'free' && !incomingRequest && pendingReports.length > 0 && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: '#FF8C00', fontWeight: 700, textAlign: 'left' }}>
                🚨 NEW INCOMING REQUESTS
              </div>
              {pendingReports.map(report => (
                <div key={report._id} style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '15px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  textAlign: 'left'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>📍 {report.location}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    Urgency: {report.priority}/5 | People: {report.peopleCount}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                    <button 
                      onClick={() => handleRespond(report._id, 'accept')}
                      style={{ 
                        flex: 1, padding: '8px', background: '#00C851', border: 'none', 
                        borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer' 
                      }}
                    >
                      ACCEPT
                    </button>
                    <button 
                      onClick={() => handleRespond(report._id, 'reject')}
                      style={{ 
                        flex: 1, padding: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', 
                        borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer' 
                      }}
                    >
                      REJECT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={logout} style={STYLES.logoutBtn}>LOGOUT FROM SESSION</button>
        </div>
      </div>
    </div>
  )
}
