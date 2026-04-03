import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { MOCK_REPORTS } from '../mock/mockData'
import socketService from '../services/socket'
import type { Report } from '../mock/mockData'

interface Stats {
  active: number
  resolved: number
  volunteersDeployed: number
}

interface ReportsContextType {
  reports: Report[]
  addReport: (report: Report) => void
  updateReport: (id: string, update: Partial<Report>) => void
  stats: Stats
}

const ReportsContext = createContext<ReportsContextType | null>(null)

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS)
  const [stats, setStats] = useState<Stats>({
    active: MOCK_REPORTS.filter(r => r.status !== 'resolved').length,
    resolved: MOCK_REPORTS.filter(r => r.status === 'resolved').length,
    volunteersDeployed: MOCK_REPORTS.filter(r => r.status === 'assigned').length,
  })

  const addReport = (report: Report) => {
    setReports(prev => [report, ...prev])
    setStats(prev => ({ ...prev, active: prev.active + 1 }))
  }

  const updateReport = (id: string, update: Partial<Report>) => {
    setReports(prev =>
      prev.map(r => r.id === id ? { ...r, ...update } : r)
    )
    if (update.status === 'resolved') {
      setStats(prev => ({
        ...prev,
        resolved: prev.resolved + 1,
        active: Math.max(0, prev.active - 1),
      }))
    }
    if (update.status === 'assigned') {
      setStats(prev => ({
        ...prev,
        volunteersDeployed: prev.volunteersDeployed + 1,
      }))
    }
  }

  useEffect(() => {
    socketService.on('newReport', (report: Report) => {
      addReport(report)
    })
    socketService.on('reportUpdated', (update: Partial<Report> & { id: string }) => {
      updateReport(update.id, update)
    })
  }, [])

  return (
    <ReportsContext.Provider value={{ reports, addReport, updateReport, stats }}>
      {children}
    </ReportsContext.Provider>
  )
}

export function useReports(): ReportsContextType {
  const ctx = useContext(ReportsContext)
  if (!ctx) throw new Error('useReports must be used inside ReportsProvider')
  return ctx
}
