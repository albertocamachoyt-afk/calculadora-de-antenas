import React from 'react';
import { LinkCalculationResult, SiteConfig } from '../types/antenna';
import { Compass, Activity, Signal, Globe, ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';

interface Props {
  calculation: LinkCalculationResult;
  siteA: SiteConfig;
  siteB: SiteConfig;
}

export const LinkBudgetCard: React.FC<Props> = ({ calculation, siteA, siteB }) => {
  // S-Meter / RSSI gauge percentage (-95 dBm to -40 dBm mapped to 0..100%)
  const rsl = calculation.rslDbm;
  const clampedRsl = Math.min(-40, Math.max(-95, rsl));
  const rslPercent = ((clampedRsl - (-95)) / (-40 - (-95))) * 100;

  // Fade margin color
  const fadeColor =
    calculation.fadeMarginDb >= 20
      ? 'text-emerald-400'
      : calculation.fadeMarginDb >= 10
      ? 'text-sky-400'
      : calculation.fadeMarginDb >= 5
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Balance de Radioenlace (Link Budget) y Balística RF
        </h3>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">FSPL:</span>
          <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
            {calculation.fsplDb} dB
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {/* Distance */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block mb-0.5">Distancia GPS</span>
          <span className="text-xl font-extrabold text-white">
            {calculation.distanceKm} <span className="text-xs text-slate-400 font-normal">km</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {calculation.distanceMiles} mi ({(calculation.distanceKm * 1000).toLocaleString()} m)
          </span>
        </div>

        {/* Received Signal Level */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block mb-0.5">Nivel Señal (RSL / RSSI)</span>
          <span className={`text-xl font-extrabold ${fadeColor}`}>
            {calculation.rslDbm} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                rslPercent > 60 ? 'bg-emerald-500' : rslPercent > 35 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.max(5, rslPercent)}%` }}
            />
          </div>
        </div>

        {/* Fade Margin */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block mb-0.5">Margen Desvanecimiento</span>
          <span className={`text-xl font-extrabold ${fadeColor}`}>
            +{calculation.fadeMarginDb} <span className="text-xs text-slate-400 font-normal">dB</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {calculation.fadeMarginDb >= 15
              ? 'Margen Óptimo (>15dB)'
              : calculation.fadeMarginDb >= 8
              ? 'Margen Aceptable'
              : 'Riesgo Desconexión'}
          </span>
        </div>

        {/* EIRP */}
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          <span className="text-[11px] text-slate-400 block mb-0.5">Potencia Radiada (PIRE)</span>
          <span className="text-xl font-extrabold text-cyan-400">
            {calculation.eirpDbm} <span className="text-xs text-slate-400 font-normal">dBm</span>
          </span>
          <span className="text-[11px] text-slate-500 block mt-0.5">
            {((10 ** (calculation.eirpDbm / 10)) / 1000).toFixed(1)} Watts PIRE
          </span>
        </div>
      </div>

      {/* Geometry & Curvature Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/70">
        {/* Azimuth & Compass */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
            <Compass
              className="w-5 h-5 transition-transform"
              style={{ transform: `rotate(${calculation.bearingAtoB}deg)` }}
            />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Rumbos de Azimut</span>
            <span className="text-xs font-semibold text-slate-200">
              A ➔ B: <strong className="text-cyan-400">{calculation.bearingAtoB}°</strong> | B ➔ A:{' '}
              <strong className="text-indigo-400">{calculation.bearingBtoA}°</strong>
            </span>
          </div>
        </div>

        {/* Earth Curvature Bulge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Abultamiento Terrestre (k=4/3)</span>
            <span className="text-xs font-semibold text-slate-200">
              <strong className="text-indigo-400">{calculation.maxMidpointBulgeMeters} metros</strong> al punto medio
            </span>
          </div>
        </div>

        {/* Fresnel Radius */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
            <Signal className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Radio 1ª Zona Fresnel</span>
            <span className="text-xs font-semibold text-slate-200">
              <strong className="text-sky-400">R = {calculation.maxFresnelRadiusMeters}m</strong> (60% = {(calculation.maxFresnelRadiusMeters * 0.6).toFixed(1)}m)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
