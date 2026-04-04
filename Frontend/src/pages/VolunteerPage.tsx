import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../config'
import { toast } from 'sonner'

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
  }
}

export default function VolunteerPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState({ name: '', phone: '', area: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('volunteer')
    if (saved) setUser(JSON.parse(saved))
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    console.log("Sending POST request to:", `${API_URL}/api/volunteer/login`);
    try {
      const res = await fetch(`${API_URL}/api/volunteer/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(form)
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
        toast.success("Successfully logged in!", {
          description: `Welcome back, ${data.volunteer.name}. Redirecting to command center...`
        })
        setTimeout(() => {
          navigate('/')
        }, 1500)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error("Login failed", {
        description: err.message || "Please check your connection or try again later."
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
              {loading ? 'LOGGING IN...' : 'JOIN MISSION'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={STYLES.page}>
      <div style={STYLES.card}>
        <div style={STYLES.title}>MISSION ACTIVE</div>
        
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700 }}>Welcome, {user.name}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>📍 Assigned Area: {user.area}</div>
          
          <div style={{ 
            marginTop: '20px',
            padding: '20px',
            background: 'rgba(0, 200, 81, 0.1)',
            border: '1px solid rgba(0, 200, 81, 0.2)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{ 
              width: '10px', height: '10px', background: '#00C851', borderRadius: '50%',
              boxShadow: '0 0 10px #00C851'
            }} />
            <span style={{ color: '#00C851', fontWeight: 700, fontSize: '14px' }}>STATUS: READY & FREE</span>
          </div>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '10px', lineHeight: '1.6' }}>
            Jab koi emergency report aayegi, hum aapko nearest case assign karenge. Please app open rakhein.
          </p>

          <button onClick={logout} style={STYLES.logoutBtn}>LOGOUT</button>
        </div>
      </div>
    </div>
  )
}
