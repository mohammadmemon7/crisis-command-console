import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ReportsProvider } from "./context/ReportsContext"
import Index from "./pages/Index"
import VictimPage from "./pages/VictimPage"
import VolunteerPage from "./pages/VolunteerPage"
import NotFound from "./pages/NotFound"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReportsProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/victim" element={<VictimPage />} />
            <Route path="/volunteer" element={<VolunteerPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ReportsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
)

export default App
