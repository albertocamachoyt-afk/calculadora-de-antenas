import React, { useState } from 'react';
import { LinkCalculationResult, Obstacle, SiteConfig } from '../types/antenna';
import { Sparkles, Loader2, MapPin, ExternalLink, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  siteA: SiteConfig;
  siteB: SiteConfig;
  calculation: LinkCalculationResult;
  obstacles: Obstacle[];
}

interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: Array<{
        reviewText?: string;
        authorAttribution?: {
          displayName?: string;
        };
      }>;
    };
  };
  web?: {
    uri?: string;
    title?: string;
  };
}

export const AiAdvisorDrawer: React.FC<Props> = ({ siteA, siteB, calculation, obstacles }) => {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        siteA: {
          name: siteA.name,
          lat: siteA.lat,
          lng: siteA.lng,
          elevation: siteA.elevation,
          towerHeight: siteA.towerHeight,
          antennaName: siteA.antenna.model,
          gainDbi: siteA.antenna.gainDbi,
          antennaType: siteA.antenna.type,
          polarization: siteA.antenna.polarization,
          txPowerDbm: siteA.txPowerDbm,
        },
        siteB: {
          name: siteB.name,
          lat: siteB.lat,
          lng: siteB.lng,
          elevation: siteB.elevation,
          towerHeight: siteB.towerHeight,
          antennaName: siteB.antenna.model,
          gainDbi: siteB.antenna.gainDbi,
          antennaType: siteB.antenna.type,
          polarization: siteB.antenna.polarization,
        },
        distanceKm: calculation.distanceKm,
        frequencyGHz: siteA.antenna.frequencyGHz,
        obstructions: obstacles,
        linkBudget: {
          fsplDb: calculation.fsplDb,
          rslDbm: calculation.rslDbm,
          fadeMarginDb: calculation.fadeMarginDb,
          maxFresnelRadiusMeters: calculation.maxFresnelRadiusMeters,
          maxMidpointBulgeMeters: calculation.maxMidpointBulgeMeters,
          tiltAngleA: calculation.tiltAngleA,
          tiltAngleB: calculation.tiltAngleB,
        },
      };

      const res = await fetch('/api/gemini/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al obtener análisis de IA');
      }

      setAnalysisText(data.text);
      setGroundingChunks(data.groundingChunks || []);
      setIsExpanded(true);
    } catch (err: any) {
      console.error('AI Link analysis error:', err);
      setError(err.message || 'Error de conexión con el servicio de análisis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Dictamen Técnico de IA con Google Maps Grounding
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluación experta de propagación electromagnética, orografía satelital y compatibilidad asistida por Gemini 3.8 Flash
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analizando Orografía y Balística RF...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{analysisText ? 'Volver a Evaluar con IA' : 'Generar Dictamen con IA'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {analysisText && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Informe de Ingeniería Generado
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              {isExpanded ? (
                <>
                  <span>Ocultar</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Mostrar</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {isExpanded && (
            <div className="prose prose-invert max-w-none text-xs leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-slate-300 space-y-3 whitespace-pre-line">
              {analysisText}
            </div>
          )}

          {/* Google Maps Grounding Links (MANDATORY REQUIREMENT) */}
          {groundingChunks && groundingChunks.length > 0 && (
            <div className="mt-3 p-3 bg-slate-950/90 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Fuentes y Coordenadas de Google Maps Grounding:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {groundingChunks.map((chunk, idx) => {
                  const uri = chunk.maps?.uri || chunk.web?.uri;
                  const title = chunk.maps?.title || chunk.web?.title || `Lugar en Google Maps #${idx + 1}`;
                  if (!uri) return null;
                  return (
                    <a
                      key={idx}
                      href={uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-[11px] border border-slate-700 transition-colors"
                    >
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>{title}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
