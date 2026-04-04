import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import socketService from '../services/socket'
import { useReports } from '../context/ReportsContext'

const API_URL = "https://crisis-command-console-production.up.railway.app"

const MOCK_MODE = false
// Set to false when real backend is connected

type VictimState = 'idle' | 'recording' | 'submitting' | 'waiting' | 'assigned' | 'resolved'

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
  textarea: {
    width: '100%',
    minHeight: '120px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '12px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontFamily: 'monospace',
    resize: 'none' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  btnOrange: {
    width: '100%',
    padding: '14px',
    background: '#FF8C00',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  btnRed: {
    width: '100%',
    padding: '16px',
    background: 'rgba(255,59,59,0.15)',
    border: '2px solid rgba(255,59,59,0.6)',
    borderRadius: '10px',
    color: '#FF3B3B',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '2px',
    boxShadow: '0 0 20px rgba(255,59,59,0.2)',
  },
  btnGreen: {
    width: '100%',
    padding: '14px',
    background: 'rgba(0,200,81,0.15)',
    border: '2px solid rgba(0,200,81,0.5)',
    borderRadius: '10px',
    color: '#00C851',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  micBtn: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center' as const,
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

export default function VictimPage() {
  const navigate = useNavigate()
  const { refreshReports } = useReports()
  
  const [state, setState] = useState<VictimState>('idle')
  const [message, setMessage] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [countdown, setCountdown] = useState(120)
  const [reportId, setReportId] = useState<string | null>(null)
  const [assignedName, setAssignedName] = useState('Ramesh Patil')
  const [assignedEta, setAssignedEta] = useState<string | number>(7)
  const [voiceUsed, setVoiceUsed] = useState(false)
  
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = `
      @keyframes victimPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(255,59,59,0.7); }
        50% { box-shadow: 0 0 0 12px rgba(255,59,59,0); }
      }
      @keyframes waitingPulse {
        0%,100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (state === 'waiting') {
      setCountdown(120)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [state])

  // Socket listeners for real backend integration
  useEffect(() => {
    if (MOCK_MODE) return
    if (!reportId) return

    const handleCaseAccepted = (data: {
      reportId: string
      volunteerName: string
      eta: string
      volunteerPhone?: string
    }) => {
      if (data.reportId !== reportId) return
      setAssignedName(data.volunteerName)
      setAssignedEta(data.eta || '8')
      setState('assigned')
    }

    const handleCaseResolved = (data: {
      reportId: string
    }) => {
      if (data.reportId !== reportId) return
      setState('resolved')
    }

    socketService.getSocket().on('caseAccepted', handleCaseAccepted)
    socketService.getSocket().on('caseResolved', handleCaseResolved)

    return () => {
      socketService.getSocket().off('caseAccepted', handleCaseAccepted)
      socketService.getSocket().off('caseResolved', handleCaseResolved)
    }
  }, [reportId])

  const GEO_OPTS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 25000,
    maximumAge: 0,
  }

  const submitReportWithPosition = async (
    pos: GeolocationPosition,
    source: 'app' | 'sos' | 'voice',
    rawMessageOverride?: string
  ) => {
    const raw = (rawMessageOverride ?? message).trim()
    if (!raw) return

    console.log("🚀 Sending request to backend...");

    const lat = pos.coords.latitude
    const lng = pos.coords.longitude

    setState('submitting')

    const res = await fetch(`${API_URL}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawMessage: raw,
        source,
        lat,
        lng,
        mode: "manual",
        location: "User Location",
        name: reporterName.trim() || undefined,
      }),
    })

    console.log("📡 Response status:", res.status)

    if (!res.ok) {
      const text = await res.text()
      console.error("❌ Backend error:", text)
      throw new Error("Backend failed")
    }

    const data = await res.json()
    console.log("✅ Saved in DB:", data)

    await refreshReports()

    if (data.report && data.report._id) {
      setReportId(data.report._id)
      if (data.assigned === true) {
        setAssignedName(data.volunteer || 'Rajesh Patil')
        setAssignedEta('8')
        setState('assigned')
      } else {
        setState('waiting')
      }
    } else if (data._id) {
      setReportId(data._id)
      setState('waiting')
    }

    alert("Report submitted successfully")
  }

  const handleSubmit = async () => {
    if (!message.trim()) return
    if (!navigator.geolocation) {
      alert("Geolocation is required to submit")
      return
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTS)
      })
      await submitReportWithPosition(pos, voiceUsed ? 'voice' : 'app')
    } catch (err) {
      console.error("❌ Submit failed:", err)
      alert("Location permission required to submit report")
      setState('idle')
    }
  }

  const handleSOS = async () => {
    if (!navigator.geolocation) {
      alert("GPS not supported")
      return
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTS)
      })
      const text = `SOS — ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
      setMessage(text)
      await submitReportWithPosition(pos, 'sos', text)
    } catch (err) {
      console.error("❌ SOS failed:", err)
      alert("Location required for SOS")
      setState('idle')
    }
  }

  const handleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser')
      return
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'hi-IN'
    recognition.continuous = false
    recognition.interimResults = false

    setState('recording')
    recognition.start()

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setMessage(transcript)
      setVoiceUsed(true)
      setState('idle')
    }
    recognition.onerror = () => setState('idle')
    recognition.onend = () => {
      setState(prev => prev === 'recording' ? 'idle' : prev)
    }
  }

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const renderContent = () => {
    if (state === 'idle' || state === 'recording') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CRISISNET</div>

          <div>
            <div style={{ ...STYLES.label, marginBottom: '6px' }}>Aapka naam (optional)</div>
            <input
              type="text"
              style={{ ...STYLES.textarea, minHeight: '44px', marginBottom: '10px' }}
              placeholder="Naam..."
              value={reporterName}
              onChange={e => setReporterName(e.target.value)}
            />
            <div style={{ ...STYLES.label, marginBottom: '6px' }}>Apni situation batao</div>
            <textarea
              style={STYLES.textarea}
              placeholder="Apni situation batao... (Hindi ya English)"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <button
            onClick={handleMic}
            style={{
              ...STYLES.micBtn,
              background: state === 'recording'
                ? 'rgba(255,59,59,0.2)'
                : 'rgba(255,255,255,0.08)',
              border: state === 'recording'
                ? '2px solid #FF3B3B'
                : '2px solid rgba(255,255,255,0.15)',
              animation: state === 'recording' ? 'victimPulse 1s infinite' : 'none',
            }}
          >
            🎤
          </button>

          <button onClick={handleSOS} style={STYLES.btnRed}>
            🆘 SOS — Abhi Khatre Mein Hoon
          </button>

          <button
            onClick={handleSubmit}
            style={{
              ...STYLES.btnOrange,
              opacity: message.trim() ? 1 : 0.5,
              cursor: message.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Help Maango →
          </button>
        </div>
      )
    }

    if (state === 'submitting') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CRISISNET</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '3px solid rgba(255,140,0,0.2)',
              borderTop: '3px solid #FF8C00',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <div style={STYLES.bigText}>AI process kar raha hai...</div>
            <div style={{ ...STYLES.subText, marginTop: '8px' }}>Aapki report classify ho rahi hai</div>
          </div>
        </div>
      )
    }

    if (state === 'waiting') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CRISISNET</div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
            <div style={STYLES.bigText}>Report Mili</div>
            <div style={{
              ...STYLES.subText,
              marginTop: '12px',
              animation: 'waitingPulse 1.5s infinite',
            }}>
              Volunteer dhundh rahe hain...
            </div>
            <div style={{
              marginTop: '20px',
              fontSize: '32px',
              fontWeight: 700,
              color: '#FF8C00',
              fontFamily: 'monospace',
            }}>
              {formatCountdown(countdown)}
            </div>
            <div style={{ ...STYLES.subText, marginTop: '4px' }}>Estimated wait time</div>
          </div>
        </div>
      )
    }

    if (state === 'assigned') {
      return (
        <div style={STYLES.card}>
          <div style={STYLES.logo}>⚡ CRISISNET</div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚑</div>
            <div style={{ ...STYLES.label, marginBottom: '8px' }}>Volunteer Assigned</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#00C851' }}>
              {assignedName}
            </div>
            <div style={{ ...STYLES.subText, marginTop: '12px' }}>
              <span style={{ color: '#FF8C00', fontSize: '20px', fontWeight: 700 }}>
                {assignedEta}
              </span>
              {' '}minutes mein aa raha hai
            </div>
            <div style={{
              marginTop: '16px',
              padding: '10px',
              background: 'rgba(0,200,81,0.08)',
              border: '1px solid rgba(0,200,81,0.2)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#888',
            }}>
              Apni jagah pe rehna. Help aa rahi hai.
            </div>
          </div>
        </div>
      )
    }

    return (
      <div style={STYLES.card}>
        <div style={STYLES.logo}>⚡ CRISISNET</div>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ ...STYLES.bigText, color: '#00C851' }}>Help Pahunch Gayi!</div>
          <div style={{ ...STYLES.subText, marginTop: '8px' }}>
            Aap safe hain. Case resolved.
          </div>
        </div>
        <button
          onClick={() => {
            setState('idle')
            setMessage('')
            setReporterName('')
            setReportId(null)
          }}
          style={STYLES.btnGreen}
        >
          Wapas Jao
        </button>
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
