import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { MOCK_REPORTS } from '../mock/mockData'
import socketService from '../services/socket'
import type { Report } from '../mock/mockData'

const MOCK_MODE = false
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 
  || 'https://crisis-command-console-production.up.railway.app'

interface Stats {
  active: number
  resolved: number
  volunteersDeployed: number
}

interface ReportsContextType {
  reports: Report[]
  addReport: (report: Report) => void
  updateReport: (id: string, update: Partial<Report>) => void
  resetReports: () => void
  injectChaos: (onProgress?: (progress: string) => void) => void
  stats: Stats
}

const ReportsContext = createContext<ReportsContextType | null>(null)

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

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<Stats>({
    active: 0,
    resolved: 0,
    volunteersDeployed: 0,
  })

  // Load existing reports and volunteers on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [repRes, volRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/reports`),
          fetch(`${BACKEND_URL}/api/volunteers`)
        ])
        
        const { reports: initialReports } = await repRes.json()
        const { volunteers } = await volRes.json()
        
        setReports(initialReports || [])
        
        // Calculate stats
        const activeCount = initialReports.filter((r: any) => 
          r.status === 'pending' || r.status === 'assigned'
        ).length
        const resolvedCount = initialReports.filter((r: any) => r.status === 'resolved').length
        const deployedCount = volunteers.filter((v: any) => !v.isAvailable).length
        
        setStats({
          active: activeCount,
          resolved: resolvedCount,
          volunteersDeployed: deployedCount
        })
      } catch (err) {
        console.error('Failed to load initial data:', err)
        // Fallback to mock data if backend fails
        setReports(MOCK_REPORTS)
      }
    }
    
    if (!MOCK_MODE) {
      loadInitialData()
    } else {
      setReports(MOCK_REPORTS)
    }
  }, [])

  const addReport = (report: Report) => {
    setReports(prev => {
      // Avoid duplicates from socket
      if (prev.find(r => r.id === report.id || r._id === report._id || r.id === report._id)) return prev
      return [report, ...prev]
    })
    setStats(prev => ({ ...prev, active: prev.active + 1 }))
  }

  const updateReport = (id: string, update: Partial<Report>) => {
    setReports(prev =>
      prev.map(r => (r.id === id || r._id === id) ? { ...r, ...update } : r)
    )
    if (update.status === 'resolved') {
      setStats(prev => ({
        ...prev,
        resolved: prev.resolved + 1,
        active: Math.max(0, prev.active - 1),
        volunteersDeployed: Math.max(0, prev.volunteersDeployed - 1)
      }))
    }
    if (update.status === 'assigned') {
      setStats(prev => ({
        ...prev,
        volunteersDeployed: prev.volunteersDeployed + 1,
      }))
    }
  }

  const resetReports = () => {
    setReports(MOCK_REPORTS)
    setStats({
      active: MOCK_REPORTS.filter(r => r.status !== 'resolved').length,
      resolved: MOCK_REPORTS.filter(r => r.status === 'resolved').length,
      volunteersDeployed: MOCK_REPORTS.filter(r => r.status === 'assigned').length,
    })
  }

  const injectChaos = async (onProgress?: (progress: string) => void) => {
    for (let i = 0; i < CHAOS_MESSAGES.length; i++) {
      const msg = CHAOS_MESSAGES[i]
      const loc = MUMBAI_LOCATIONS[i % MUMBAI_LOCATIONS.length]
      const latOffset = (Math.random() - 0.5) * 0.008
      const lngOffset = (Math.random() - 0.5) * 0.008

      const payload = {
        message: msg,
        source: 'app',
        coordinates: { lat: loc.lat + latOffset, lng: loc.lng + lngOffset }
      }

      try {
        if (MOCK_MODE) {
          // Mock version
          const report: Report = {
            id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            location: loc.name,
            coordinates: payload.coordinates,
            urgency: (Math.ceil(Math.random() * 5)) as 1 | 2 | 3 | 4 | 5,
            peopleCount: Math.ceil(Math.random() * 10),
            needs: ['rescue'],
            status: 'pending',
            source: 'app',
            createdAt: new Date(),
          }
          addReport(report)
        } else {
          // Real backend version
          await fetch(`${BACKEND_URL}/api/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        }

        if (onProgress) {
          if (i < CHAOS_MESSAGES.length - 1) {
            onProgress(`Sending ${i + 2}/20...`)
          } else {
            onProgress('Chaos Injected! 20 Reports Sent')
          }
        }
      } catch (err) {
        console.error('Chaos injection failed for message:', i, err)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  useEffect(() => {
    socketService.on('newReport', (report: Report) => {
      addReport(report)
    })
    socketService.on('reportUpdated', (update: any) => {
      // Backend format: { reportId, status, volunteerName }
      const id = update.reportId || update.id
      updateReport(id, { 
        status: update.status,
        assignedTo: update.volunteerName,
        assignedVolunteer: update.volunteerName
      })
    })
  }, [])

  return (
    <ReportsContext.Provider value={{ reports, addReport, updateReport, resetReports, injectChaos, stats }}>
      {children}
    </ReportsContext.Provider>
  )
}

export function useReports(): ReportsContextType {
  const ctx = useContext(ReportsContext)
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider')
  return ctx
}
