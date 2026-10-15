import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  useMapEvents, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Crosshair, 
  Layers, 
  Trash2, 
  Check, 
  Undo, 
  Maximize2,
  Navigation
} from 'lucide-react';

// Custom SVG Icon for Leaflet Marker to avoid missing png assets in bundler
const createCustomIcon = (color = '#059669') => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const farmCenterIcon = createCustomIcon('#059669'); // Emerald
const cornerPointIcon = createCustomIcon('#d97706'); // Amber

// Map Controller for programmatically flying to coordinates
function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Map Event Handler for Click Interactions
function MapClickHandler({ mode, onMapClick, onAddBoundaryPoint }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (mode === 'center') {
        onMapClick(lat, lng);
      } else if (mode === 'boundary') {
        onAddBoundaryPoint(lat, lng);
      }
    },
  });
  return null;
}

// AP District Coordinates Presets
const AP_PRESETS = [
  { name: 'East Godavari (Kadiam/Rajahmundry)', lat: 16.9890, lng: 81.7840 },
  { name: 'West Godavari (Bhimavaram)', lat: 16.5449, lng: 81.5212 },
  { name: 'Krishna (Gudivada)', lat: 16.4410, lng: 80.9926 },
  { name: 'Guntur (Tenali)', lat: 16.2437, lng: 80.6400 },
  { name: 'Nellore (Kovur)', lat: 14.4858, lng: 79.9864 },
  { name: 'Srikakulam', lat: 18.2969, lng: 83.8967 },
  { name: 'Kurnool', lat: 15.8281, lng: 78.0373 }
];

export default function FarmMapPicker({
  latitude,
  longitude,
  boundaryPoints = [],
  onChangeCoordinates,
  onChangeBoundary,
  isEditable = true,
  lang = 'Telugu',
  farmName = 'వరి పొలం'
}) {
  const isTelugu = lang === 'Telugu';
  const defaultLat = latitude ? parseFloat(latitude) : 16.9890;
  const defaultLng = longitude ? parseFloat(longitude) : 81.7840;

  const [mode, setMode] = useState('center'); // 'center' or 'boundary'
  const [tileLayerType, setTileLayerType] = useState('satellite'); // 'satellite' or 'osm'
  const [mapCenter, setMapCenter] = useState([defaultLat, defaultLng]);
  const [locating, setLocating] = useState(false);

  // Parse boundary points if passed as JSON string
  const parsedBoundary = Array.isArray(boundaryPoints) 
    ? boundaryPoints 
    : (typeof boundaryPoints === 'string' && boundaryPoints ? JSON.parse(boundaryPoints) : []);

  const [localBoundary, setLocalBoundary] = useState(parsedBoundary);

  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter([parseFloat(latitude), parseFloat(longitude)]);
    }
  }, [latitude, longitude]);

  const handleCenterClick = (lat, lng) => {
    if (!isEditable) return;
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    onChangeCoordinates(roundedLat, roundedLng);
    setMapCenter([roundedLat, roundedLng]);
  };

  const handleAddBoundaryPoint = (lat, lng) => {
    if (!isEditable) return;
    const newPoint = { lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) };
    const updated = [...localBoundary, newPoint];
    setLocalBoundary(updated);
    if (onChangeBoundary) {
      onChangeBoundary(updated);
    }
  };

  const handleUndoBoundaryPoint = () => {
    if (localBoundary.length === 0) return;
    const updated = localBoundary.slice(0, -1);
    setLocalBoundary(updated);
    if (onChangeBoundary) {
      onChangeBoundary(updated);
    }
  };

  const handleClearBoundary = () => {
    setLocalBoundary([]);
    if (onChangeBoundary) {
      onChangeBoundary([]);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setMapCenter([lat, lng]);
        if (isEditable) {
          onChangeCoordinates(lat, lng);
        }
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation failed, using preset:", err);
        setLocating(false);
      },
      { timeout: 7000 }
    );
  };

  const polygonPositions = localBoundary.map(p => [p.lat, p.lng]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Map Control Toolbar */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Modes & Layer Selector */}
        <div className="flex items-center gap-2">
          {isEditable && (
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setMode('center')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  mode === 'center'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isTelugu ? "📍 పొలం కేంద్రం (Pin)" : "📍 Center Pin"}
              </button>
              <button
                type="button"
                onClick={() => setMode('boundary')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  mode === 'boundary'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isTelugu ? "📐 హద్దులు గీయండి (Boundary)" : "📐 Draw Boundary"}
              </button>
            </div>
          )}

          {/* Satellite vs Street Map toggle */}
          <button
            type="button"
            onClick={() => setTileLayerType(tileLayerType === 'satellite' ? 'osm' : 'satellite')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 font-semibold text-slate-700 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>{tileLayerType === 'satellite' ? (isTelugu ? "ఉపగ్రహ వీక్షణ" : "Satellite View") : (isTelugu ? "రోడ్ మ్యాప్" : "Street Map")}</span>
          </button>
        </div>

        {/* Right: GPS locate and presets */}
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                const [pLat, pLng] = e.target.value.split(',').map(Number);
                setMapCenter([pLat, pLng]);
                if (isEditable) onChangeCoordinates(pLat, pLng);
              }
            }}
            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="">{isTelugu ? "జిల్లా పరిధికి వెళ్లండి..." : "Jump to AP District..."}</option>
            {AP_PRESETS.map((p) => (
              <option key={p.name} value={`${p.lat},${p.lng}`}>{p.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold border border-emerald-300"
          >
            <Crosshair className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
            <span>{locating ? "Locating..." : (isTelugu ? "నా GPS" : "Locate Me")}</span>
          </button>
        </div>
      </div>

      {/* Mode Instructions Ribbon */}
      {isEditable && (
        <div className={`px-4 py-1.5 text-xs font-medium flex items-center justify-between ${
          mode === 'center' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
        }`}>
          <span>
            {mode === 'center' 
              ? (isTelugu ? "మ్యాప్‌పై క్లిక్ చేసి మీ వరి పొలం కేంద్రాన్ని గుర్తించండి." : "Click on the map to place or reposition your rice field center pin.")
              : (isTelugu ? "పొలం చుట్టూ మూలలను వరుసగా క్లిక్ చేసి హద్దులను గీయండి (కనీసం 3 మూలలు)." : "Click on field corners in sequence to define your boundary polygon (min 3 corners).")}
          </span>

          {mode === 'boundary' && (
            <div className="flex items-center gap-2">
              <span className="font-bold">{localBoundary.length} corners</span>
              <button
                type="button"
                onClick={handleUndoBoundaryPoint}
                disabled={localBoundary.length === 0}
                className="hover:underline flex items-center gap-0.5 disabled:opacity-40"
              >
                <Undo className="w-3 h-3" />
                <span>Undo</span>
              </button>
              <button
                type="button"
                onClick={handleClearBoundary}
                disabled={localBoundary.length === 0}
                className="text-red-700 hover:underline flex items-center gap-0.5 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaflet Map Container */}
      <div className="w-full h-80 sm:h-96 relative">
        <MapContainer
          center={mapCenter}
          zoom={15}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Tile Layer: ESRI World Imagery (High-res satellite) or OSM */}
          {tileLayerType === 'satellite' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* Programmatic FlyTo Controller */}
          <MapFlyTo center={mapCenter} zoom={15} />

          {/* Map Click Interactions */}
          <MapClickHandler
            mode={mode}
            onMapClick={handleCenterClick}
            onAddBoundaryPoint={handleAddBoundaryPoint}
          />

          {/* Farm Center Pin */}
          {latitude && longitude && (
            <Marker position={[parseFloat(latitude), parseFloat(longitude)]} icon={farmCenterIcon}>
              <Popup>
                <div className="text-xs font-sans">
                  <div className="font-bold text-emerald-800 text-sm mb-1">{farmName}</div>
                  <div>Lat: {latitude}</div>
                  <div>Lon: {longitude}</div>
                  <div className="text-slate-500 text-[10px] mt-1">Andhra Pradesh Rice Plot</div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Boundary Corner Pins */}
          {localBoundary.map((pt, idx) => (
            <Marker key={idx} position={[pt.lat, pt.lng]} icon={cornerPointIcon}>
              <Popup>
                <div className="text-xs font-sans">Corner #{idx + 1}: {pt.lat}, {pt.lng}</div>
              </Popup>
            </Marker>
          ))}

          {/* Field Boundary Polygon */}
          {polygonPositions.length >= 3 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{
                color: '#10b981',
                fillColor: '#34d399',
                fillOpacity: 0.35,
                weight: 3,
                dashArray: mode === 'boundary' ? '6, 6' : undefined
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Coordinate & Area Summary Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 font-mono">
        <div className="flex items-center gap-3">
          <span>Lat: <strong className="text-slate-900">{latitude || '16.989000'}</strong></span>
          <span>Lon: <strong className="text-slate-900">{longitude || '81.784000'}</strong></span>
        </div>
        <div>
          {localBoundary.length >= 3 ? (
            <span className="text-emerald-700 font-bold font-sans">
              ✓ {localBoundary.length} {isTelugu ? "మూలల హద్దు నిర్ధారించబడింది" : "boundary corners marked"}
            </span>
          ) : (
            <span className="text-slate-400 font-sans">
              {isTelugu ? "హద్దులను గీయడానికి 'హద్దులు గీయండి' మోడ్‌ను ఎంచుకోండి" : "Switch to 'Draw Boundary' mode to map field polygon corners"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
