import React, { useState } from 'react';
import { Obstacle } from '../types/antenna';
import { Building, Plus, Trash2, Trees, Mountain } from 'lucide-react';

interface Props {
  obstacles: Obstacle[];
  maxDistanceKm: number;
  onAddObstacle: (obstacle: Obstacle) => void;
  onRemoveObstacle: (id: string) => void;
  onUpdateObstacle: (id: string, updated: Partial<Obstacle>) => void;
}

export const ObstacleManager: React.FC<Props> = ({
  obstacles,
  maxDistanceKm,
  onAddObstacle,
  onRemoveObstacle,
  onUpdateObstacle,
}) => {
  const [name, setName] = useState('Edificio / Estructura');
  const [distanceKm, setDistanceKm] = useState(
    Number((maxDistanceKm * 0.5).toFixed(1))
  );
  const [heightMeters, setHeightMeters] = useState(25);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    const newObstacle: Obstacle = {
      id: 'obs-' + Date.now(),
      name: name || 'Obstáculo Intermedio',
      distanceFromAKm: Math.min(maxDistanceKm, Math.max(0.1, distanceKm)),
      heightMeters: Math.max(1, heightMeters),
    };
    onAddObstacle(newObstacle);
    setIsAdding(false);
    setName('Nuevo Edificio');
  };

  const handleQuickAdd = (type: 'building' | 'trees' | 'warehouse') => {
    const d = Number((maxDistanceKm * 0.45).toFixed(1));
    if (type === 'building') {
      onAddObstacle({
        id: 'obs-' + Date.now(),
        name: 'Edificio Residencial 7 Pisos',
        distanceFromAKm: d,
        heightMeters: 24,
      });
    } else if (type === 'trees') {
      onAddObstacle({
        id: 'obs-' + Date.now(),
        name: 'Masa Forestal / Árboles Altos',
        distanceFromAKm: d,
        heightMeters: 18,
      });
    } else {
      onAddObstacle({
        id: 'obs-' + Date.now(),
        name: 'Nave Industrial / Silo',
        distanceFromAKm: d,
        heightMeters: 14,
      });
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-rose-400" />
            Obstáculos y Edificaciones Intermedias
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Simula el impacto de construcciones, árboles o torres intermedias en la línea de vista y la Zona de Fresnel
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir Obstáculo
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="mb-4 p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Configurar Nuevo Obstáculo</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickAdd('building')}
                className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                + Edificio 24m
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd('trees')}
                className="text-[11px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
              >
                + Árboles 18m
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nombre / Tipo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Torre de Agua"
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Distancia desde Sitio A: <strong className="text-cyan-400">{distanceKm} km</strong>
              </label>
              <input
                type="number"
                min="0.1"
                max={maxDistanceKm}
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Altura sobre el Terreno: <strong className="text-rose-400">{heightMeters} m</strong>
              </label>
              <input
                type="number"
                min="1"
                max="200"
                step="1"
                value={heightMeters}
                onChange={(e) => setHeightMeters(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow"
            >
              Guardar Obstáculo
            </button>
          </div>
        </div>
      )}

      {/* Obstacles List */}
      {obstacles.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <Building className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs text-slate-400">No hay obstáculos manuales configurados.</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Puedes agregar edificios, arboledas o colinas intermedias para ver si intersectan el haz.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {obstacles.map((obs) => (
            <div
              key={obs.id}
              className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">{obs.name}</span>
                  <span className="text-[11px] text-slate-400">
                    A <strong className="text-cyan-400">{obs.distanceFromAKm} km</strong> de Sitio A ({((obs.distanceFromAKm / maxDistanceKm) * 100).toFixed(0)}% del trayecto)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-400 block">+{obs.heightMeters} m</span>
                  <span className="text-[10px] text-slate-500">sobre el suelo</span>
                </div>

                <button
                  onClick={() => onRemoveObstacle(obs.id)}
                  title="Eliminar obstáculo"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
