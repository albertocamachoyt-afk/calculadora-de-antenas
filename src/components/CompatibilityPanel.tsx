import React from 'react';
import { LinkCalculationResult, SiteConfig } from '../types/antenna';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Info, Check } from 'lucide-react';

interface Props {
  siteA: SiteConfig;
  siteB: SiteConfig;
  calculation: LinkCalculationResult;
}

export const CompatibilityPanel: React.FC<Props> = ({ siteA, siteB, calculation }) => {
  const isCompatible = calculation.compatibilityIssues.length === 0;
  const freqMatch = Math.abs(siteA.antenna.frequencyGHz - siteB.antenna.frequencyGHz) <= 0.4;
  const polarizationMatch =
    siteA.antenna.polarization === 'dual' ||
    siteB.antenna.polarization === 'dual' ||
    siteA.antenna.polarization === siteB.antenna.polarization;
  const distOk = calculation.distanceKm <= Math.min(siteA.antenna.maxDistanceKm, siteB.antenna.maxDistanceKm);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          {isCompatible ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          Matriz de Compatibilidad de Antenas y Equipamiento RF
        </h3>

        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
            isCompatible
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}
        >
          {isCompatible ? 'Antenas Compatibles' : 'Incompatibilidad Detectada'}
        </span>
      </div>

      {/* 4 Key Validation Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Frequency */}
        <div
          className={`p-3 rounded-xl border ${
            freqMatch
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Banda de Frecuencia
            </span>
            {freqMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
          </div>
          <p className="text-xs font-bold text-white">
            {siteA.antenna.frequencyGHz} GHz ↔ {siteB.antenna.frequencyGHz} GHz
          </p>
          <span className="text-[11px] block mt-1 text-slate-400">
            {freqMatch ? 'Misma banda de operación RF' : 'Frecuencias incompatibles'}
          </span>
        </div>

        {/* Polarization */}
        <div
          className={`p-3 rounded-xl border ${
            polarizationMatch
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Polarización
            </span>
            {polarizationMatch ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <p className="text-xs font-bold text-white capitalize">
            {siteA.antenna.polarization} ↔ {siteB.antenna.polarization}
          </p>
          <span className="text-[11px] block mt-1 text-slate-400">
            {polarizationMatch ? 'Alineación de planos electromagnéticos OK' : 'Atenuación por polarización cruzada'}
          </span>
        </div>

        {/* Distance Range */}
        <div
          className={`p-3 rounded-xl border ${
            distOk
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Alcance de Diseño
            </span>
            {distOk ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
          </div>
          <p className="text-xs font-bold text-white">
            {calculation.distanceKm} km / Máx: {Math.min(siteA.antenna.maxDistanceKm, siteB.antenna.maxDistanceKm)} km
          </p>
          <span className="text-[11px] block mt-1 text-slate-400">
            {distOk ? 'Dentro del rango del fabricante' : 'Supera la distancia óptima'}
          </span>
        </div>

        {/* Beamwidth & Aiming */}
        <div className="p-3 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Apertura del Haz (HPBW)
            </span>
            <Info className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xs font-bold text-white">
            {siteA.antenna.beamwidthDeg}° (A) ↔ {siteB.antenna.beamwidthDeg}° (B)
          </p>
          <span className="text-[11px] block mt-1 text-slate-400">
            {Math.min(siteA.antenna.beamwidthDeg, siteB.antenna.beamwidthDeg) < 5
              ? 'Haz muy estrecho (ajuste fino)'
              : 'Tolerancia de apuntamiento media'}
          </span>
        </div>
      </div>

      {/* Issues or Notes list */}
      <div className="space-y-2">
        {calculation.compatibilityIssues.map((issue, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
          >
            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{issue}</span>
          </div>
        ))}

        {calculation.compatibilityNotes.map((note, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
