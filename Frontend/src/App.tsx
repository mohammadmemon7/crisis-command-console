import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ReportsProvider, useReports } from "./context/ReportsContext"
import { useEffect } from "react"
import Index from "./pages/Index"
import VictimPage from "./pages/VictimPage"
import VolunteerPage from "./pages/VolunteerPage"
import NotFound from "./pages/NotFound"

const queryClient = new QueryClient()

const AppContent = () => {
  const { injectChaos, resetReports } = useReports()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === 'c' || e.key === 'C') {
        injectChaos()
      }
      if (e.key === 'r' || e.key === 'R') {
        resetReports()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [injectChaos, resetReports])

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/victim" element={<VictimPage />} />
        <Route path="/volunteer" element={<VolunteerPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* GLOBAL HINT BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] 
        bg-gray-950/90 backdrop-blur-sm border-t border-white/10 
        py-1.5 px-4 text-center text-[10px] text-gray-500 font-mono tracking-wider uppercase">
        Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-primary border border-white/5 mx-1">C</kbd> — Inject Chaos &nbsp;|&nbsp;
        Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-primary border border-white/5 mx-1">R</kbd> — Reset Reports
      </div>
    </>
  )
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ReportsProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ReportsProvider>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
