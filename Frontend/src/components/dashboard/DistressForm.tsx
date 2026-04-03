import { useState, useEffect } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { useReports } from "../../context/ReportsContext";
import type { Report } from "../../mock/mockData";

export function DistressForm() {
  const { addReport } = useReports();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recording, setRecording] = useState(false);

  const handleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    setRecording(true);
    recognition.start();

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setMessage(prev => prev + (prev ? " " : "") + transcript);
      setRecording(false);
    };

    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    
    // Simulate AI Processing
    setTimeout(() => {
      const latOffset = (Math.random() - 0.5) * 0.1;
      const lngOffset = (Math.random() - 0.5) * 0.1;

      const fakeReport: Report = {
        id: Date.now().toString(),
        rawMessage: message,
        location: "Admin Report — " + message.slice(0, 20),
        coordinates: {
          lat: 19.076 + (Math.random() - 0.5) * 0.05,
          lng: 72.877 + (Math.random() - 0.5) * 0.05,
        },
        urgency: 4,
        peopleCount: 1,
        needs: ['rescue'],
        status: 'pending',
        source: 'app',
        createdAt: new Date() as any, // Prompt asked for toISOString() but interface requires Date
      };

      addReport(fakeReport);
      setLoading(false);
      setSuccess(true);
      setMessage("");

      // Reset success message after 2s
      setTimeout(() => setSuccess(false), 2000);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground"
        style={{ fontFamily: "var(--font-mono)" }}>
        Distress Signal
      </label>
      
      <div className="relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter distress message..."
          rows={3}
          className={`w-full resize-none rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all ${
            recording ? 'border-red-500 ring-2 ring-red-500/20' : 'border-border'
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
        />
        
        {/* Mic Button */}
        <button
          type="button"
          onClick={handleMic}
          className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-border py-1.5 text-[10.5px] font-bold uppercase tracking-wider transition-all hover:bg-white/5 active:scale-95 ${
            recording ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-muted-foreground'
          }`}
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <span style={{ fontSize: '14px' }}>{recording ? "🔴" : "🎤"}</span>
          {recording ? "Recording..." : "Voice Input (hi-IN)"}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading || !message.trim()}
        className={`flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] ${
          loading || !message.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 rotate-45" />
            Submit Report
          </>
        )}
      </button>

      {success && (
        <div className="text-center text-[11px] font-bold text-green-500 animate-in fade-in slide-in-from-top-1">
          ✅ Report Added to Map
        </div>
      )}
    </form>
  );
}
