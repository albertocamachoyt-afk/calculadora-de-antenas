import React from 'react';
import { AntennaPreset, SiteConfig } from '../types/antenna';
import { ANTENNA_CATALOG } from '../data/antennaCatalog';
import { Radio, Sliders, MapPin, ArrowUp, Zap, HelpCircle } from 'lucide-react';

interface Props {
  site: SiteConfig;
  label: string;
  themeColor: 'cyan' | 'indigo';
  onChange: (updated: SiteConfig) => void;
  calculatedBearing: number;
  calculatedTilt: number;
}

export const SiteConfigCard: React.FC<Props> = ({
  site,
  label,
  themeColor,
  onChange,
  calculatedBearing,
  calculatedTilt,
}) => {
  const isCyan = themeColor === 'cyan';

  const handleAntennaSelect = (presetId: string) => {
    const found = ANTENNA_CATALOG.find((a) => a.id === presetId);
    if (found) {
      onChange({
        ...site,
        antenna: found,
        txPowerDbm: found.defaultTxPowerDbm,
        cableLossDb: found.defaultCableLossDb,
      });
    }
  };

  return (
    <div
      className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-sm transition-all ${
        isCyan ? 'border-cyan-500/30' : 'border-indigo-500/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
              isCyan ? 'bg-cyan-600' : 'bg-indigo-600'
            }`}
          >
            {label}
          </div>
          <div>
            <input
              type="text"
              value={site.name}
              onChange={(e) => onChange({ ...site, name: e.target.value })}
              className="font-semibold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-400 focus:outline-none text-sm sm:text-base px-1"
            />
            <p className="text-[11px] text-slate-400 px-1">
              Elev. Terreno: <strong className="text-slate-200">{site.elevation}m</strong> + Mástil: <strong className="text-slate-200">{site.towerHeight}m</strong> = <span className="text-cyan-400 font-medium">{site.elevation + site.towerHeight}m ASL</span>
            </p>
          </div>
        </div>

        {/* Alignment Target readout */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
            Apuntamiento
          </span>
          <span className="text-xs font-bold text-slate-200">
            Az: <strong className={isCyan ? 'text-cyan-400' : 'text-indigo-400'}>{calculatedBearing}°</strong> | Tilt:{' '}
            <strong className={calculatedTilt < 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {calculatedTilt > 0 ? `+${calculatedTilt}°` : `${calculatedTilt}°`}
            </strong>
          </span>
        </div>
      </div>

      {/* GPS Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            Latitud GPS
          </label>
          <input
            type="number"
            step="0.000001"
            value={site.lat}
            onChange={(e) => onChange({ ...site, lat: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mb-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            Longitud GPS
          </label>
          <input
            type="number"
            step="0.000001"
            value={site.lng}
            onChange={(e) => onChange({ ...site, lng: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-100 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Antenna Model Selector */}
      <div className="mb-4">
        <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-1">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-slate-500" />
            Modelo de Antena / Radio
          </span>
          <span className="text-[10px] text-slate-500">
            {site.antenna.frequencyBand}
          </span>
        </label>
        <select
          value={site.antenna.id}
          onChange={(e) => handleAntennaSelect(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-slate-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none"
        >
          {ANTENNA_CATALOG.map((ant) => (
            <option key={ant.id} value={ant.id}>
              {ant.brand} - {ant.model} ({ant.gainDbi} dBi, {ant.frequencyBand})
            </option>
          ))}
        </select>
      </div>

      {/* Antenna Specs Pill Badges */}
      <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] text-slate-400 block">Ganancia</span>
          <span className="text-xs font-bold text-white">{site.antenna.gainDbi} dBi</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Apertura</span>
          <span className="text-xs font-bold text-slate-200">{site.antenna.beamwidthDeg}°</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Polariz.</span>
          <span className="text-xs font-bold text-slate-200 capitalize">{site.antenna.polarization}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Frecuencia</span>
          <span className="text-xs font-bold text-cyan-400">{site.antenna.frequencyGHz} GHz</span>
        </div>
      </div>

      {/* Sliders: Tower Height & Tx Power */}
      <div className="space-y-3 pt-1">
        {/* Tower Height */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <ArrowUp className="w-3 h-3 text-slate-500" />
              Altura de Torre / Mástil
            </span>
            <span className="font-bold text-white text-xs">{site.towerHeight} metros</span>
          </div>
          <input
            type="range"
            min="2"
            max="120"
            step="1"
            value={site.towerHeight}
            onChange={(e) => onChange({ ...site, towerHeight: parseInt(e.target.value) || 2 })}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
            <span>2m (Mástil techo)</span>
            <span>30m (Torre arriostrada)</span>
            <span>120m (Torreta cumbre)</span>
          </div>
        </div>

        {/* Tx Power & Cable Loss Row */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-slate-500" />
                Potencia Tx
              </span>
              <span className="font-bold text-slate-200">{site.txPowerDbm} dBm</span>
            </div>
            <input
              type="range"
              min="10"
              max="33"
              step="1"
              value={site.txPowerDbm}
              onChange={(e) => onChange({ ...site, txPowerDbm: parseInt(e.target.value) || 10 })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">Pérdida Cable</span>
              <span className="font-bold text-slate-200">{site.cableLossDb} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="0.5"
              value={site.cableLossDb}
              onChange={(e) => onChange({ ...site, cableLossDb: parseFloat(e.target.value) || 0 })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
