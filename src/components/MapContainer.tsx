import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import { LinkCalculationResult, Obstacle, SiteConfig } from '../types/antenna';
import {
  Radio,
  Locate,
  Maximize2,
  Map as MapIcon,
  Layers,
  Sparkles,
  Building,
  RotateCcw,
} from 'lucide-react';

interface MapContainerProps {
  siteA: SiteConfig;
  siteB: SiteConfig;
  calculation: LinkCalculationResult;
  obstacles: Obstacle[];
  onSiteAChange: (lat: number, lng: number) => void;
  onSiteBChange: (lat: number, lng: number) => void;
  onAddObstacleAtCoords?: (lat: number, lng: number) => void;
  onLoadPreset?: (presetName: string) => void;
}

// Child component to manage Polyline on Google Map
const LinkPolyline: React.FC<{
  siteA: SiteConfig;
  siteB: SiteConfig;
  linkStatus: LinkCalculationResult['linkStatus'];
}> = ({ siteA, siteB, linkStatus }) => {
  const map = useMap();

  const strokeColor = useMemo(() => {
    switch (linkStatus) {
      case 'nlos_blocked':
      case 'incompatible':
        return '#f43f5e'; // Rose
      case 'fresnel_blocked':
      case 'marginal':
        return '#f59e0b'; // Amber
      case 'optimal':
      default:
        return '#10b981'; // Emerald
    }
  }, [linkStatus]);

  useEffect(() => {
    if (!map) return;

    const path = [
      { lat: siteA.lat, lng: siteA.lng },
      { lat: siteB.lat, lng: siteB.lng },
    ];

    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 4,
      map,
    });

    // Also render Fresnel zone visual corridor width (approximate translucent envelope)
    return () => {
      polyline.setMap(null);
    };
  }, [map, siteA.lat, siteA.lng, siteB.lat, siteB.lng, strokeColor]);

  return null;
};

// Component to handle auto-fit bounds
const AutoFitBounds: React.FC<{ siteA: SiteConfig; siteB: SiteConfig; trigger: number }> = ({
  siteA,
  siteB,
  trigger,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: siteA.lat, lng: siteA.lng });
    bounds.extend({ lat: siteB.lat, lng: siteB.lng });
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, siteA.lat, siteA.lng, siteB.lat, siteB.lng, trigger]);

  return null;
};

export const MapContainer: React.FC<MapContainerProps> = ({
  siteA,
  siteB,
  calculation,
  obstacles,
  onSiteAChange,
  onSiteBChange,
  onAddObstacleAtCoords,
  onLoadPreset,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const [mapTypeId, setMapTypeId] = useState<'hybrid' | 'roadmap' | 'terrain'>('terrain');
  const [fitTrigger, setFitTrigger] = useState(0);

  // Compute map center
  const center = useMemo(() => {
    return {
      lat: (siteA.lat + siteB.lat) / 2,
      lng: (siteA.lng + siteB.lng) / 2,
    };
  }, [siteA.lat, siteA.lng, siteB.lat, siteB.lng]);

  const handleCenterLink = () => {
    setFitTrigger((prev) => prev + 1);
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onSiteAChange(pos.coords.latitude, pos.coords.longitude);
          setFitTrigger((prev) => prev + 1);
        },
        (err) => {
          console.warn('Geolocation error:', err);
        }
      );
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex flex-col">
      {/* Floating Header Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Status Chip */}
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              calculation.linkStatus === 'optimal'
                ? 'bg-emerald-400 animate-pulse'
                : calculation.linkStatus === 'fresnel_blocked'
                ? 'bg-amber-400'
                : 'bg-rose-400'
            }`}
          />
          <span className="text-xs font-semibold text-white">
            {calculation.distanceKm} km ({calculation.distanceMiles} mi)
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-xs text-slate-300">
            Azimut: <strong className="text-cyan-400">{calculation.bearingAtoB}°</strong>
          </span>
        </div>

        {/* Map Type & Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-lg">
          <button
            onClick={() => setMapTypeId('terrain')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              mapTypeId === 'terrain'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Relieve
          </button>
          <button
            onClick={() => setMapTypeId('hybrid')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              mapTypeId === 'hybrid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Satélite
          </button>
          <button
            onClick={() => setMapTypeId('roadmap')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              mapTypeId === 'roadmap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Calles
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            onClick={handleCenterLink}
            title="Centrar en el enlace"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleUseMyLocation}
            title="Ubicar Sitio A en mi GPS"
            className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Locate className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Scenarios Quick Select Bar (Bottom Floating) */}
      {onLoadPreset && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-medium hidden sm:inline">Ejemplos:</span>
          <button
            onClick={() => onLoadPreset('mountain')}
            className="text-slate-300 hover:text-white hover:underline transition-colors"
          >
            Montaña a Valle (14km)
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={() => onLoadPreset('urban')}
            className="text-slate-300 hover:text-white hover:underline transition-colors"
          >
            Rooftop Urbano (2.4km)
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={() => onLoadPreset('long')}
            className="text-slate-300 hover:text-white hover:underline transition-colors"
          >
            Troncal Larga Distancia (32km)
          </button>
        </div>
      )}

      {/* Draggable Hint (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-none bg-slate-900/85 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 shadow">
        💡 Arrastra los marcadores de las antenas para reposicionar el enlace
      </div>

      {/* The Google Map Container */}
      <div className="w-full h-full min-h-[500px]">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={center}
            defaultZoom={12}
            mapId="DEMO_MAP_ID"
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <AutoFitBounds siteA={siteA} siteB={siteB} trigger={fitTrigger} />
            <LinkPolyline siteA={siteA} siteB={siteB} linkStatus={calculation.linkStatus} />

            {/* Site A Marker (Draggable) */}
            <AdvancedMarker
              position={{ lat: siteA.lat, lng: siteA.lng }}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                  onSiteAChange(e.latLng.lat(), e.latLng.lng());
                }
              }}
              title={`Sitio A: ${siteA.name} (+${siteA.towerHeight}m)`}
            >
              <div className="group relative cursor-grab active:cursor-grabbing flex flex-col items-center">
                <div className="px-2 py-0.5 mb-1 bg-cyan-600 text-white font-bold text-[10px] rounded shadow-md border border-cyan-400/50 whitespace-nowrap">
                  A: {siteA.name} ({siteA.towerHeight}m)
                </div>
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-white shadow">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
                <div className="w-1.5 h-3 bg-cyan-400 rounded-b shadow" />
              </div>
            </AdvancedMarker>

            {/* Site B Marker (Draggable) */}
            <AdvancedMarker
              position={{ lat: siteB.lat, lng: siteB.lng }}
              draggable={true}
              onDragEnd={(e) => {
                if (e.latLng) {
                  onSiteBChange(e.latLng.lat(), e.latLng.lng());
                }
              }}
              title={`Sitio B: ${siteB.name} (+${siteB.towerHeight}m)`}
            >
              <div className="group relative cursor-grab active:cursor-grabbing flex flex-col items-center">
                <div className="px-2 py-0.5 mb-1 bg-indigo-600 text-white font-bold text-[10px] rounded shadow-md border border-indigo-400/50 whitespace-nowrap">
                  B: {siteB.name} ({siteB.towerHeight}m)
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
                <div className="w-1.5 h-3 bg-indigo-400 rounded-b shadow" />
              </div>
            </AdvancedMarker>

            {/* Obstacle Markers */}
            {obstacles.map((obs) => {
              if (obs.lat && obs.lng) {
                return (
                  <AdvancedMarker
                    key={obs.id}
                    position={{ lat: obs.lat, lng: obs.lng }}
                    title={`${obs.name}: +${obs.heightMeters}m`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="px-1.5 py-0.5 mb-0.5 bg-rose-600 text-white font-semibold text-[9px] rounded border border-rose-400 shadow">
                        {obs.name} (+{obs.heightMeters}m)
                      </div>
                      <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400 flex items-center justify-center text-rose-300">
                        <Building className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              }
              return null;
            })}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
};
