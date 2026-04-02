import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue in React using CDN-based configuration
// This is necessary because icons are often not correctly bundled in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Dummy data for 3 markers
const dummyMarkers = [
  {
    id: 1,
    latitude: 19.0760,
    longitude: 72.8777,
    name: "Dharavi Relief Camp",
    urgency: "Immediate",
    needs: "Fresh water, Medical kits, Blankets"
  },
  {
    id: 2,
    latitude: 19.0178,
    longitude: 72.8478,
    name: "Worli Flood Sector",
    urgency: "Critical",
    needs: "Evacuation boats, Rescue teams"
  },
  {
    id: 3,
    latitude: 19.1136,
    longitude: 72.8697,
    name: "Andheri Supply Hub",
    urgency: "Moderate",
    needs: "Volunteers, Battery packs"
  }
];

const Map = () => {
  return (
    <div className="h-full w-full border-none outline-none">
      <MapContainer 
        center={[19.0760, 72.8777]} 
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {dummyMarkers.map(marker => (
          <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[150px]">
                <h3 className="text-sm font-bold m-0 mb-1 text-gray-900">{marker.name}</h3>
                <p className="text-[10px] m-0 text-red-600 font-bold uppercase tracking-wider">
                  Urgency: {marker.urgency}
                </p>
                <div className="mt-2 pt-2 border-t border-gray-100 italic text-[11px] text-gray-600">
                   <strong>Needs:</strong> {marker.needs}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default Map;
