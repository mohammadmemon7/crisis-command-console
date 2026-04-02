import { useState } from "react";
import { Send } from "lucide-react";

export function DistressForm() {
  const [message, setMessage] = useState("");

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground"
        style={{ fontFamily: "var(--font-mono)" }}>
        Distress Signal
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter distress message..."
        rows={3}
        className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        style={{ fontFamily: "var(--font-mono)" }}
      />
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
      >
        <Send className="h-4 w-4" />
        Submit Report
      </button>
    </form>
  );
}
