import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SiteConfig, Obstacle, LinkCalculationResult } from './types/antenna';
import { ANTENNA_CATALOG } from './data/antennaCatalog';
import { computeLinkCalculations } from './lib/rfCalculations';
import { MapContainer } from './components/MapContainer';
import { ElevationProfileChart } from './components/ElevationProfileChart';
import { SiteConfigCard } from './components/SiteConfigCard';
import { LinkBudgetCard } from './components/LinkBudgetCard';
import { CompatibilityPanel } from './components/CompatibilityPanel';
import { ObstacleManager } from './components/ObstacleManager';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';
import { DemoQuotaBanner } from './components/DemoQuotaBanner';
import {
  Radio,
  Layers,
  Sparkles,
  RotateCcw,
  Download,
  Info,
  Sliders,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  ExternalLink,
} from 'lucide-react';

// Default presets
const PRESET_SCENARIOS = {
  mountain: {
    siteA: {
      id: 'siteA' as const,
      name: 'Estación A - Cerro de la Estrella',
      lat: 19.3435,
      lng: -99.0888,
      elevation: 2460,
      towerHeight: 25,
      antenna: ANTENNA_CATALOG[0], // RocketDish 5G-30
      txPowerDbm: 27,
      cableLossDb: 1,
    },
    siteB: {
      id: 'siteB' as const,
      name: 'Estación B - Centro Urbano',
      lat: 19.4326,
      lng: -99.1332,
      elevation: 2240,
      towerHeight: 15,
      antenna: ANTENNA_CATALOG[2], // LiteBeam 5AC Gen2
      txPowerDbm: 24,
      cableLossDb: 0,
    },
    obstacles: [
      {
        id: 'obs-m1',
        name: 'Edificio Residencial Insurgentes',
        distanceFromAKm: 6.5,
        heightMeters: 35,
      },
    ],
  },
  urban: {
    siteA: {
      id: 'siteA' as const,
      name: 'Sede Corporativa (Torre Norte)',
      lat: 19.427,
      lng: -99.1677,
      elevation: 2250,
      towerHeight: 18,
      antenna: ANTENNA_CATALOG[2], // LiteBeam 5AC
      txPowerDbm: 22,
      cableLossDb: 0.5,
    },
    siteB: {
      id: 'siteB' as const,
      name: 'Sucursal Bancaria (Azotea)',
      lat: 19.4442,
      lng: -99.1824,
      elevation: 2245,
      towerHeight: 12,
      antenna: ANTENNA_CATALOG[2], // LiteBeam 5AC
      txPowerDbm: 22,
      cableLossDb: 0.5,
    },
    obstacles: [
      {
        id: 'obs-u1',
        name: 'Centro Comercial Reforma',
        distanceFromAKm: 1.4,
        heightMeters: 28,
      },
    ],
  },
  long: {
    siteA: {
      id: 'siteA' as const,
      name: 'Repetidor Cumbre Este',
      lat: 19.3005,
      lng: -98.985,
      elevation: 2720,
      towerHeight: 30,
      antenna: ANTENNA_CATALOG[1], // airFiber 5XHD Dish 34
      txPowerDbm: 29,
      cableLossDb: 0.5,
    },
    siteB: {
      id: 'siteB' as const,
      name: 'Nodo Base Valle Central',
      lat: 19.524,
      lng: -99.195,
      elevation: 2235,
      towerHeight: 24,
      antenna: ANTENNA_CATALOG[1], // airFiber 5XHD Dish 34
      txPowerDbm: 29,
      cableLossDb: 0.5,
    },
    obstacles: [],
  },
};

export default function App() {
  const [siteA, setSiteA] = useState<SiteConfig>(PRESET_SCENARIOS.mountain.siteA);
  const [siteB, setSiteB] = useState<SiteConfig>(PRESET_SCENARIOS.mountain.siteB);
  const [obstacles, setObstacles] = useState<Obstacle[]>(PRESET_SCENARIOS.mountain.obstacles);
  const [rawElevation, setRawElevation] = useState<
    { elevation: number; location: { lat: number; lng: number } }[] | undefined
  >(undefined);
  const [loadingElevation, setLoadingElevation] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'budget' | 'compatibility' | 'obstacles' | 'ai'>(
    'profile'
  );

  // Debounced Elevation Fetch
  const fetchTimeoutRef = useRef<any>(null);

  const fetchElevationPath = useCallback((latA: number, lngA: number, latB: number, lngB: number) => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    fetchTimeoutRef.current = setTimeout(async () => {
      setLoadingElevation(true);
      try {
        const pathParam = `${latA},${lngA}|${latB},${lngB}`;
        const res = await fetch(`/api/elevation?path=${encodeURIComponent(pathParam)}&samples=41`);

        if (res.status === 429) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          return;
        }

        const data = await res.json();
        if (data.status === 'OK' && Array.isArray(data.results)) {
          setRawElevation(data.results);
          // Also sync site ground elevations if available
          if (data.results.length >= 2) {
            const elevA = Math.round(data.results[0].elevation);
            const elevB = Math.round(data.results[data.results.length - 1].elevation);
            setSiteA((prev) => ({ ...prev, elevation: elevA }));
            setSiteB((prev) => ({ ...prev, elevation: elevB }));
          }
        }
      } catch (err) {
        console.warn('Elevation fetch fallback to synthetic model:', err);
      } finally {
        setLoadingElevation(false);
      }
    }, 600);
  }, []);

  // Fetch elevation on mount & coordinate changes
  useEffect(() => {
    fetchElevationPath(siteA.lat, siteA.lng, siteB.lat, siteB.lng);
  }, [siteA.lat, siteA.lng, siteB.lat, siteB.lng, fetchElevationPath]);

  // Main RF & LOS Calculations
  const calculation: LinkCalculationResult = computeLinkCalculations(
    siteA,
    siteB,
    obstacles,
    rawElevation
  );

  // Handlers for marker dragging / manual editing
  const handleSiteAChangeCoords = (lat: number, lng: number) => {
    setSiteA((prev) => ({ ...prev, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }));
  };

  const handleSiteBChangeCoords = (lat: number, lng: number) => {
    setSiteB((prev) => ({ ...prev, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }));
  };

  const handleAddObstacle = (obs: Obstacle) => {
    setObstacles((prev) => [...prev, obs]);
  };

  const handleRemoveObstacle = (id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  };

  const handleUpdateObstacle = (id: string, updated: Partial<Obstacle>) => {
    setObstacles((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
  };

  const handleLoadPreset = (key: string) => {
    const preset = PRESET_SCENARIOS[key as keyof typeof PRESET_SCENARIOS];
    if (preset) {
      setSiteA(preset.siteA);
      setSiteB(preset.siteB);
      setObstacles(preset.obstacles);
    }
  };

  // Export report as JSON/Text
  const handleExportSummary = () => {
    const summary = {
      timestamp: new Date().toISOString(),
      distanceKm: calculation.distanceKm,
      linkStatus: calculation.linkStatus,
      siteA: {
        name: siteA.name,
        coords: { lat: siteA.lat, lng: siteA.lng },
        antenna: siteA.antenna.model,
        towerHeight: siteA.towerHeight,
        bearingToB: calculation.bearingAtoB,
        tiltAngle: calculation.tiltAngleA,
      },
      siteB: {
        name: siteB.name,
        coords: { lat: siteB.lat, lng: siteB.lng },
        antenna: siteB.antenna.model,
        towerHeight: siteB.towerHeight,
        bearingToA: calculation.bearingBtoA,
        tiltAngle: calculation.tiltAngleB,
      },
      linkBudget: {
        fsplDb: calculation.fsplDb,
        rslDbm: calculation.rslDbm,
        fadeMarginDb: calculation.fadeMarginDb,
        maxMidpointBulgeMeters: calculation.maxMidpointBulgeMeters,
        maxFresnelRadiusMeters: calculation.maxFresnelRadiusMeters,
      },
      obstacles,
    };

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radioenlace_${calculation.distanceKm}km_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Mandatory Quota Defense Banner (Section 8 Case A) */}
      <DemoQuotaBanner />

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Calculador de Enlaces RF y Línea de Vista
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Google Maps + Balística RF
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Cálculo de distancias GPS, zona de Fresnel, perfil de elevación y compatibilidad de antenas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Descargar informe técnico"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Status Pillar */}
          <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                calculation.linkStatus === 'optimal'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : calculation.linkStatus === 'fresnel_blocked'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {calculation.linkStatus === 'optimal' ? (
                <CheckCircle className="w-6 h-6" />
              ) : calculation.linkStatus === 'fresnel_blocked' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Estado del Radioenlace
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${
                    calculation.linkStatus === 'optimal'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : calculation.linkStatus === 'fresnel_blocked'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {calculation.linkStatus === 'optimal'
                    ? 'Viable (LOS OK)'
                    : calculation.linkStatus === 'fresnel_blocked'
                    ? 'Atenuación Fresnel'
                    : 'No Viable (NLOS)'}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-1 leading-snug">
                {calculation.statusMessage}
              </p>
            </div>
          </div>

          {/* Metric Distance */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium">Distancia GPS (Línea de Vista)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-cyan-400 tracking-tight">
                {calculation.distanceKm}
              </span>
              <span className="text-xs text-slate-400">km ({calculation.distanceMiles} millas)</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Azimut A➔B: <strong className="text-slate-300">{calculation.bearingAtoB}°</strong> | B➔A:{' '}
              <strong className="text-slate-300">{calculation.bearingBtoA}°</strong>
            </span>
          </div>

          {/* Metric Signal */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col justify-center">
            <span className="text-xs text-slate-400 font-medium">Nivel Recibido (RSSI / Fade Margin)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-2xl font-black tracking-tight ${
                  calculation.fadeMarginDb >= 15
                    ? 'text-emerald-400'
                    : calculation.fadeMarginDb >= 8
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {calculation.rslDbm}
              </span>
              <span className="text-xs text-slate-400">dBm (+{calculation.fadeMarginDb} dB margen)</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Frecuencia: <strong className="text-indigo-400">{siteA.antenna.frequencyGHz} GHz</strong> (FSPL: {calculation.fsplDb} dB)
            </span>
          </div>
        </div>

        {/* SECTION 1: Interactive Google Map with Visual LOS Line */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              1. Mapa Interactivo Google Maps (Línea de Vista Satelital)
            </h2>
            <span className="text-xs text-slate-400">
              Línea:{' '}
              <span
                className={
                  calculation.linkStatus === 'optimal'
                    ? 'text-emerald-400 font-bold'
                    : calculation.linkStatus === 'fresnel_blocked'
                    ? 'text-amber-400 font-bold'
                    : 'text-rose-400 font-bold'
                }
              >
                {calculation.linkStatus === 'optimal'
                  ? 'Verde (Línea Despejada)'
                  : calculation.linkStatus === 'fresnel_blocked'
                  ? 'Amarilla (Zona Fresnel Obstruida)'
                  : 'Roja (Línea Bloqueada)'}
              </span>
            </span>
          </div>

          <MapContainer
            siteA={siteA}
            siteB={siteB}
            calculation={calculation}
            obstacles={obstacles}
            onSiteAChange={handleSiteAChangeCoords}
            onSiteBChange={handleSiteBChangeCoords}
            onLoadPreset={handleLoadPreset}
          />
        </section>

        {/* SECTION 2: Elevation Profile & Fresnel Zone Cross Section */}
        <section>
          <ElevationProfileChart
            calculation={calculation}
            siteA={siteA}
            siteB={siteB}
            obstacles={obstacles}
            isLoadingElevation={loadingElevation}
            onAddObstacleAtKm={(km) => {
              setObstacles((prev) => [
                ...prev,
                {
                  id: 'obs-' + Date.now(),
                  name: `Edificio a ${km} km`,
                  distanceFromAKm: km,
                  heightMeters: 25,
                },
              ]);
              setActiveTab('obstacles');
            }}
          />
        </section>

        {/* SECTION 3: Antenna Configurations (Site A & Site B) */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              2. Parámetros de Antenas y Coordenadas GPS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SiteConfigCard
              site={siteA}
              label="A"
              themeColor="cyan"
              onChange={setSiteA}
              calculatedBearing={calculation.bearingAtoB}
              calculatedTilt={calculation.tiltAngleA}
            />

            <SiteConfigCard
              site={siteB}
              label="B"
              themeColor="indigo"
              onChange={setSiteB}
              calculatedBearing={calculation.bearingBtoA}
              calculatedTilt={calculation.tiltAngleB}
            />
          </div>
        </section>

        {/* SECTION 4: Analysis Tabs (Link Budget, Compatibility, Obstacles, AI Advisor) */}
        <section className="space-y-4">
          {/* Navigation Pill Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('budget')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Link Budget y Balística RF
            </button>

            <button
              onClick={() => setActiveTab('compatibility')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'compatibility'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Matriz de Compatibilidad
            </button>

            <button
              onClick={() => setActiveTab('obstacles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'obstacles'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Obstáculos y Edificios ({obstacles.length})
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-purple-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Asesor IA (Google Maps Grounding)
            </button>
          </div>

          {/* Active Tab Panel */}
          {activeTab === 'budget' && (
            <LinkBudgetCard calculation={calculation} siteA={siteA} siteB={siteB} />
          )}

          {activeTab === 'compatibility' && (
            <CompatibilityPanel siteA={siteA} siteB={siteB} calculation={calculation} />
          )}

          {activeTab === 'obstacles' && (
            <ObstacleManager
              obstacles={obstacles}
              maxDistanceKm={calculation.distanceKm}
              onAddObstacle={handleAddObstacle}
              onRemoveObstacle={handleRemoveObstacle}
              onUpdateObstacle={handleUpdateObstacle}
            />
          )}

          {activeTab === 'ai' && (
            <AiAdvisorDrawer
              siteA={siteA}
              siteB={siteB}
              calculation={calculation}
              obstacles={obstacles}
            />
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Calculador de Enlaces RF y Línea de Vista (LOS) • Telecomunicaciones y Redes Inalámbricas PTP
          </p>
          <p className="text-slate-400">
            Google Maps Platform • Curvatura Terrestre $k=4/3$ • Zona de Fresnel $F_1$
          </p>
        </div>
      </footer>
    </div>
  );
}
