import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Zap } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const markers = [
  { position: [19.076, 72.8777] as [number, number], name: "Dharavi Relief Camp", urgency: 5, needs: "Food, Water, Medical" },
  { position: [19.0178, 72.8478] as [number, number], name: "Worli Flood Zone", urgency: 4, needs: "Rescue Boats, Shelter" },
  { position: [19.1136, 72.8697] as [number, number], name: "Andheri Supply Hub", urgency: 2, needs: "Volunteers, Clothing" },
];

export function MapArea() {
  return (
    <main className="flex-1 relative">
      <MapContainer
        center={[19.076, 72.8777]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((m, i) => (
          <Marker key={i} position={m.position}>
            <Popup>
              <div style={{ fontFamily: "sans-serif", minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{m.name}</strong>
                <div style={{ marginTop: 4, fontSize: 12, color: "#D4541A" }}>
                  Urgency: {"🔴".repeat(m.urgency)}{"⚪".repeat(5 - m.urgency)}
                </div>
                <div style={{ marginTop: 4, fontSize: 12 }}>Needs: {m.needs}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <button className="absolute top-5 right-5 z-[1000] flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-destructive-foreground shadow-lg shadow-destructive/25 transition-all hover:brightness-110 hover:shadow-destructive/40 active:scale-[0.97]">
        <Zap className="h-4 w-4" />
        Inject Chaos
      </button>
    </main>
  );
}
