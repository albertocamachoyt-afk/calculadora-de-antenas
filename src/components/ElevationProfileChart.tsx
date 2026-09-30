import React, { useState } from 'react';
import { ElevationPoint, LinkCalculationResult, Obstacle, SiteConfig } from '../types/antenna';
import { AlertTriangle, CheckCircle, ShieldAlert, Radio, HelpCircle, Layers } from 'lucide-react';

interface Props {
  calculation: LinkCalculationResult;
  siteA: SiteConfig;
  siteB: SiteConfig;
  obstacles: Obstacle[];
  onAddObstacleAtKm?: (km: number) => void;
  isLoadingElevation?: boolean;
}

export const ElevationProfileChart: React.FC<Props> = ({
  calculation,
  siteA,
  siteB,
  obstacles,
  onAddObstacleAtKm,
  isLoadingElevation,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<ElevationPoint | null>(null);
  const [showFresnelHelp, setShowFresnelHelp] = useState(false);

  const profile = calculation.elevationProfile;
  if (!profile || profile.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-xl text-slate-400">
        Calculando perfil de elevación...
      </div>
    );
  }

  // Calculate chart boundaries
  const totalDistance = calculation.distanceKm;
  let minAlt = Infinity;
  let maxAlt = -Infinity;

  profile.forEach((pt) => {
    minAlt = Math.min(minAlt, pt.groundElevation, pt.fresnelLowerMeters);
    maxAlt = Math.max(
      maxAlt,
      pt.losRayElevation + 10,
      pt.fresnelUpperMeters + 10,
      pt.groundElevation + pt.totalObstacleMeters + pt.earthBulgeMeters + 10
    );
  });

  // Add padding
  minAlt = Math.max(0, Math.floor(minAlt - 15));
  maxAlt = Math.ceil(maxAlt + 20);
  const altRange = Math.max(20, maxAlt - minAlt);

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 320;
  const padLeft = 60;
  const padRight = 60;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (dKm: number) => {
    if (totalDistance <= 0) return padLeft;
    return padLeft + (dKm / totalDistance) * plotWidth;
  };

  const getY = (altMeters: number) => {
    return padTop + plotHeight - ((altMeters - minAlt) / altRange) * plotHeight;
  };

  // Build ground profile SVG path (with earth bulge)
  const groundPoints = profile.map((pt) => {
    const x = getX(pt.distanceFromAKm);
    const y = getY(pt.groundElevation + pt.earthBulgeMeters);
    return `${x},${y}`;
  });

  const groundFillPath = `M ${getX(0)},${getY(minAlt)} L ${groundPoints.join(' L ')} L ${getX(
    totalDistance
  )},${getY(minAlt)} Z`;

  // Build direct LOS ray path
  const losRayStart = {
    x: getX(0),
    y: getY(siteA.elevation + siteA.towerHeight),
  };
  const losRayEnd = {
    x: getX(totalDistance),
    y: getY(siteB.elevation + siteB.towerHeight),
  };

  // Build 1st Fresnel zone polygon (upper and lower points)
  const fresnelUpperPoints = profile.map((pt) => `${getX(pt.distanceFromAKm)},${getY(pt.fresnelUpperMeters)}`);
  const fresnelLowerPoints = [...profile]
    .reverse()
    .map((pt) => `${getX(pt.distanceFromAKm)},${getY(pt.fresnelLowerMeters)}`);
  const fresnelPolygonPath = `M ${fresnelUpperPoints.join(' L ')} L ${fresnelLowerPoints.join(' L ')} Z`;

  // 60% Fresnel clearance line
  const fresnel60Points = profile.map((pt) => `${getX(pt.distanceFromAKm)},${getY(pt.fresnel60LowerMeters)}`);

  // Status badge details
  const isBlocked = calculation.linkStatus === 'nlos_blocked';
  const isFresnelWarn = calculation.linkStatus === 'fresnel_blocked';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Perfil de Elevación y Zona de Fresnel
            </h3>
            {isLoadingElevation && (
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full animate-pulse">
                Sondeando datos topográficos...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Corte transversal de orografía, curvatura terrestre ($k=4/3$) y despeje electromagnético
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isBlocked ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              Línea de Vista Bloqueada (NLOS)
            </span>
          ) : isFresnelWarn ? (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              Intrusión en 1ª Zona de Fresnel
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle className="w-3.5 h-3.5" />
              Línea de Vista Limpia (LOS OK)
            </span>
          )}

          <button
            onClick={() => setShowFresnelHelp(!showFresnelHelp)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="¿Qué es la Zona de Fresnel?"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFresnelHelp && (
        <div className="mb-4 p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 space-y-1.5">
          <p className="font-semibold text-slate-100">
            Regla de Oro en Telecomunicaciones (Zona de Fresnel):
          </p>
          <p>
            No basta con ver el otro extremo ópticamente. Las ondas de radio viajan en un elipsoide tridimensional. Si el terreno o edificios invaden más del <strong>40% de la 1ª Zona de Fresnel</strong> (dejando menos del 60% libre), se produce difracción y la señal se degrada drásticamente (hasta 20 dB de pérdida).
          </p>
        </div>
      )}

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto bg-slate-950/70 border border-slate-800/80 rounded-xl p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[700px] select-none"
          onClick={(e) => {
            if (!onAddObstacleAtKm) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = ((e.clientX - rect.left) / rect.width) * svgWidth;
            if (clickX >= padLeft && clickX <= padLeft + plotWidth) {
              const km = ((clickX - padLeft) / plotWidth) * totalDistance;
              onAddObstacleAtKm(Number(km.toFixed(2)));
            }
          }}
        >
          <defs>
            {/* Terrain Gradient */}
            <linearGradient id="terrainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
            </linearGradient>

            {/* Fresnel Corridor Gradient */}
            <linearGradient id="fresnelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.12" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.12" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const alt = minAlt + frac * altRange;
            const y = getY(alt);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  {Math.round(alt)}m
                </text>
              </g>
            );
          })}

          {/* Grid lines vertical (Distance in km) */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const d = frac * totalDistance;
            const x = getX(d);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotHeight}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />
                <text
                  x={x}
                  y={padTop + plotHeight + 18}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {d.toFixed(1)} km
                </text>
              </g>
            );
          })}

          {/* 1st Fresnel zone ellipse envelope */}
          <path d={fresnelPolygonPath} fill="url(#fresnelGrad)" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />

          {/* 60% Fresnel Zone lower boundary line */}
          <path
            d={`M ${fresnel60Points.join(' L ')}`}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="1.2"
            strokeDasharray="5 3"
            opacity="0.8"
          />

          {/* Direct Line-of-Sight (LOS) Ray */}
          <line
            x1={losRayStart.x}
            y1={losRayStart.y}
            x2={losRayEnd.x}
            y2={losRayEnd.y}
            stroke={isBlocked ? '#f43f5e' : isFresnelWarn ? '#f59e0b' : '#10b981'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Ground Terrain Fill */}
          <path d={groundFillPath} fill="url(#terrainGrad)" />
          {/* Ground Terrain Contour Line */}
          <path
            d={`M ${groundPoints.join(' L ')}`}
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* User-added Obstacles (Buildings, Trees) */}
          {obstacles.map((obs) => {
            const x = getX(obs.distanceFromAKm);
            // find ground elevation at this point
            const pt = profile.find((p) => Math.abs(p.distanceFromAKm - obs.distanceFromAKm) < 0.2);
            const ground = (pt?.groundElevation ?? siteA.elevation) + (pt?.earthBulgeMeters ?? 0);
            const yBase = getY(ground);
            const yTop = getY(ground + obs.heightMeters);
            const heightPx = Math.max(4, yBase - yTop);

            return (
              <g key={obs.id}>
                <rect
                  x={x - 6}
                  y={yTop}
                  width="12"
                  height={heightPx}
                  fill="#f43f5e"
                  fillOpacity="0.75"
                  stroke="#fda4af"
                  strokeWidth="1.5"
                  rx="1"
                />
                <text
                  x={x}
                  y={yTop - 6}
                  fill="#fecdd3"
                  fontSize="9"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  +{obs.heightMeters}m
                </text>
              </g>
            );
          })}

          {/* Obstruction Violations Highlights */}
          {profile.map((pt, idx) => {
            if (pt.isObstructed) {
              const x = getX(pt.distanceFromAKm);
              const y = getY(pt.groundElevation + pt.earthBulgeMeters + pt.totalObstacleMeters);
              return (
                <circle
                  key={`obs-${idx}`}
                  cx={x}
                  cy={y}
                  r="4.5"
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              );
            }
            if (pt.isFresnelViolated) {
              const x = getX(pt.distanceFromAKm);
              const y = getY(pt.groundElevation + pt.earthBulgeMeters + pt.totalObstacleMeters);
              return (
                <circle
                  key={`fres-${idx}`}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#f59e0b"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            }
            return null;
          })}

          {/* Tower A Pillar and Icon */}
          {(() => {
            const x = getX(0);
            const yGround = getY(siteA.elevation);
            const yTop = losRayStart.y;
            return (
              <g>
                <line x1={x} y1={yGround} x2={x} y2={yTop} stroke="#38bdf8" strokeWidth="3" />
                <circle cx={x} cy={yTop} r="5" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
                <text
                  x={x + 8}
                  y={yTop + 4}
                  fill="#38bdf8"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  Torre A ({siteA.towerHeight}m)
                </text>
              </g>
            );
          })()}

          {/* Tower B Pillar and Icon */}
          {(() => {
            const x = getX(totalDistance);
            const yGround = getY(siteB.elevation);
            const yTop = losRayEnd.y;
            return (
              <g>
                <line x1={x} y1={yGround} x2={x} y2={yTop} stroke="#818cf8" strokeWidth="3" />
                <circle cx={x} cy={yTop} r="5" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" />
                <text
                  x={x - 8}
                  y={yTop + 4}
                  fill="#818cf8"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="end"
                  fontFamily="sans-serif"
                >
                  Torre B ({siteB.towerHeight}m)
                </text>
              </g>
            );
          })()}

          {/* Interactive Hover Listener Overlay */}
          {profile.map((pt, idx) => {
            const x = getX(pt.distanceFromAKm);
            const width = plotWidth / (profile.length - 1);
            return (
              <rect
                key={`hover-${idx}`}
                x={x - width / 2}
                y={padTop}
                width={width}
                height={plotHeight}
                fill="transparent"
                className="cursor-crosshair hover:fill-white/5"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}

          {/* Hover indicator line & dot */}
          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.distanceFromAKm)}
                y1={padTop}
                x2={getX(hoveredPoint.distanceFromAKm)}
                y2={padTop + plotHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.distanceFromAKm)}
                cy={getY(
                  hoveredPoint.groundElevation +
                    hoveredPoint.earthBulgeMeters +
                    hoveredPoint.totalObstacleMeters
                )}
                r="4"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Legend & Hover Details */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" />
            <span>Haz Directo (LOS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-sky-400/20 border border-sky-400 border-dashed inline-block rounded" />
            <span>1ª Zona Fresnel ({calculation.maxFresnelRadiusMeters}m radio máx)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 inline-block border-b border-dashed" />
            <span>Límite 60% Despeje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-slate-700 border border-slate-500 inline-block rounded" />
            <span>Terreno + Curvatura ({calculation.maxMidpointBulgeMeters}m abultamiento)</span>
          </div>
        </div>

        {hoveredPoint && (
          <div className="bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-3">
            <span>
              <strong>{hoveredPoint.distanceFromAKm} km</strong> de A
            </span>
            <span className="text-slate-400">|</span>
            <span>
              Terreno: <strong>{hoveredPoint.groundElevation}m</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              Curvatura: <strong>+{hoveredPoint.earthBulgeMeters}m</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              Despeje LOS:{' '}
              <strong
                className={
                  hoveredPoint.clearanceMeters < 0
                    ? 'text-rose-400'
                    : hoveredPoint.isFresnelViolated
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              >
                {hoveredPoint.clearanceMeters}m
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
