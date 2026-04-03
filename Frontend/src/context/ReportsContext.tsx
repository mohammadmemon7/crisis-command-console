import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { MOCK_REPORTS } from '../mock/mockData'
import socketService from '../services/socket'
import type { Report } from '../mock/mockData'

import { API_URL } from '../config'

const MOCK_MODE = false

interface Stats {
  active: number
  resolved: number
  volunteersDeployed: number
  avgResponseTimeMinutes: number
}

export type ApiVolunteer = {
  _id: string
  name: string
  phone?: string
  skills?: string[]
  area?: string
  location?: { lat: number; lng: number }
  homeLocation?: { lat: number; lng: number }
  status?: 'free' | 'busy'
  isAvailable?: boolean
  activeCase?: string | null
}

interface ReportsContextType {
  reports: Report[]
  volunteers: ApiVolunteer[]
  addReport: (report: Report) => void
  updateReport: (id: string, update: Partial<Report>) => void
  resetReports: () => void
  refreshReports: () => Promise<void>
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
  const [volunteers, setVolunteers] = useState<ApiVolunteer[]>([])
  const [stats, setStats] = useState<Stats>({
    active: 0,
    resolved: 0,
    volunteersDeployed: 0,
    avgResponseTimeMinutes: 0,
  })

  const refreshReports = useCallback(async () => {
    try {
      const [repRes, volRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports`),
        fetch(`${API_URL}/api/volunteers`),
        fetch(`${API_URL}/api/stats`)
      ])

      const repJson = await repRes.json()
      const volJson = await volRes.json()
      const statsJson = await statsRes.json().catch(() => ({}))
      const initialReports = repJson.reports
      const initialVolunteers = volJson.volunteers || []
      console.log('Reports:', (initialReports || []).length)
      console.log('Volunteers:', initialVolunteers.length)

      setReports(initialReports || [])
      setVolunteers(initialVolunteers)

      if (statsJson.success) {
        setStats({
          active: statsJson.active ?? 0,
          resolved: statsJson.totalResolvedLifetime ?? statsJson.resolved ?? 0,
          volunteersDeployed: statsJson.volunteersDeployed ?? 0,
          avgResponseTimeMinutes: statsJson.avgResponseTimeMinutes ?? 0
        })
      } else {
        const deployedCount = initialVolunteers.filter((v: any) => !v.isAvailable).length
        setStats({
          active: (initialReports || []).filter((r: any) =>
            r.status === 'pending' || r.status === 'assigned'
          ).length,
          resolved: 0,
          volunteersDeployed: deployedCount,
          avgResponseTimeMinutes: 0
        })
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
      if (MOCK_MODE) {
        setReports(MOCK_REPORTS)
        setVolunteers([])
      }
    }
  }, [])

  useEffect(() => {
    if (!MOCK_MODE) {
      refreshReports()
    } else {
      setReports(MOCK_REPORTS)
    }
  }, [refreshReports])

  const addReport = (report: any) => {
    setReports(prev => {
      if (prev.find(r => r.id === report.id || (r as any)._id === report._id || r.id === report._id)) return prev
      return [report, ...prev]
    })
    // REMOVED manual stats increment to ensure sync with DB
  }

  const updateReport = (id: string, update: Partial<Report>) => {
    setReports(prev =>
      prev.map(r => (r.id === id || (r as any)._id === id) ? { ...r, ...update } : r)
    )
    // Stats will eventually sync via socket or refresh, removing manual update
  }

  const resetReports = () => {
    setReports(MOCK_REPORTS)
  }

  const injectChaos = async (onProgress?: (progress: string) => void) => {
    for (let i = 0; i < CHAOS_MESSAGES.length; i++) {
      const msg = CHAOS_MESSAGES[i]
      const loc = MUMBAI_LOCATIONS[i % MUMBAI_LOCATIONS.length]
      const latOffset = (Math.random() - 0.5) * 0.008
      const lngOffset = (Math.random() - 0.5) * 0.008

      const payload = {
        rawMessage: msg,
        source: 'app',
        coordinates: { lat: loc.lat + latOffset, lng: loc.lng + lngOffset }
      }

      try {
        if (!MOCK_MODE) {
          const res = await fetch(`${API_URL}/api/reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          if (!res.ok) {
            const t = await res.text()
            console.error('Chaos POST failed:', t)
          }
        }

        if (onProgress) {
          if (i < CHAOS_MESSAGES.length - 1) {
            onProgress(`Sending ${i + 2}/${CHAOS_MESSAGES.length}...`)
          } else {
            onProgress(`Chaos Injected! ${CHAOS_MESSAGES.length} Reports Sent`)
          }
        }
      } catch (err) {
        console.error('Chaos injection failed for message:', i, err)
      }

    }
    if (!MOCK_MODE) await refreshReports()
  }

  useEffect(() => {
    if (!MOCK_MODE) {
      const id = window.setInterval(() => {
        refreshReports()
      }, 2000)
      return () => clearInterval(id)
    }
  }, [refreshReports])

  useEffect(() => {
    socketService.on('newReport', refreshReports)
    socketService.on('reportUpdated', refreshReports)
    socketService.on('reportDeleted', refreshReports)
    socketService.on('statsUpdated', refreshReports)
    socketService.on('simulationTick', refreshReports)
    return () => {
      socketService.off('newReport', refreshReports)
      socketService.off('reportUpdated', refreshReports)
      socketService.off('reportDeleted', refreshReports)
      socketService.off('statsUpdated', refreshReports)
      socketService.off('simulationTick', refreshReports)
    }
  }, [refreshReports])

  return (
    <ReportsContext.Provider value={{ reports, volunteers, addReport, updateReport, resetReports, refreshReports, injectChaos, stats }}>
      {children}
    </ReportsContext.Provider>
  )
}

export function useReports(): ReportsContextType {
  const ctx = useContext(ReportsContext)
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider')
  return ctx
}

