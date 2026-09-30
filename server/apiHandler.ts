import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Helper to parse JSON body
function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Safeguard against huge payloads
      if (body.length > 1e6) {
        req.socket.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
): Promise<void> {
  const url = new URL(req.url || '', 'http://localhost:3000');

  // 1. Google Maps Elevation Proxy (Solves CORS restriction CF1)
  if (url.pathname === '/api/elevation' && req.method === 'GET') {
    const pathParam = url.searchParams.get('path');
    const samplesParam = url.searchParams.get('samples') || '41';
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

    if (!pathParam || !apiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing path or API key configuration' }));
      return;
    }

    try {
      const gmpUrl = `https://maps.googleapis.com/maps/api/elevation/json?path=${encodeURIComponent(
        pathParam
      )}&samples=${samplesParam}&key=${apiKey}&solution_id=gmp_mcp_codeassist_v1_aistudio`;

      const response = await fetch(gmpUrl);
      const data = await response.json();

      if (response.status === 429 || data.status === 'OVER_QUERY_LIMIT') {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'RESOURCE_EXHAUSTED', status: 'OVER_QUERY_LIMIT' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    } catch (err: any) {
      console.error('Elevation proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Error fetching elevation' }));
      return;
    }
  }

  // 2. Gemini RF & Terrain Analysis with Google Maps Grounding
  if (url.pathname === '/api/gemini/analyze-link' && req.method === 'POST') {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'GEMINI_API_KEY no configurada. Configura la clave en la sección de Secretos.',
        })
      );
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const { siteA, siteB, distanceKm, frequencyGHz, obstructions, linkBudget } = body;

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const prompt = `Eres un Ingeniero Principal de Telecomunicaciones y Radioenlaces de Microondas.
Realiza un informe técnico riguroso y conciso sobre la viabilidad de este enlace inalámbrico punto a punto (PTP):

DATOS DEL RADIOENLACE:
- Sitio A: "${siteA.name}" (Lat: ${siteA.lat}, Lng: ${siteA.lng}) | Altura Mástil: ${siteA.towerHeight}m | Elevación Terreno: ${siteA.elevation}m
  Antena A: ${siteA.antennaName} | Ganancia: ${siteA.gainDbi} dBi | Tipo: ${siteA.antennaType} | Polarización: ${siteA.polarization} | Potencia Tx: ${siteA.txPowerDbm} dBm
- Sitio B: "${siteB.name}" (Lat: ${siteB.lat}, Lng: ${siteB.lng}) | Altura Mástil: ${siteB.towerHeight}m | Elevación Terreno: ${siteB.elevation}m
  Antena B: ${siteB.antennaName} | Ganancia: ${siteB.gainDbi} dBi | Tipo: ${siteB.antennaType} | Polarización: ${siteB.polarization}
- Distancia: ${distanceKm} km
- Frecuencia central: ${frequencyGHz} GHz
- Pérdida Espacio Libre (FSPL): ${linkBudget.fsplDb} dB
- Nivel de Señal Recibida (RSL / RSSI): ${linkBudget.rslDbm} dBm
- Margen de Desvanecimiento (Fade Margin): ${linkBudget.fadeMarginDb} dB
- Radio máximo 1ª Zona de Fresnel: ${linkBudget.maxFresnelRadiusMeters} m
- Abultamiento por Curvatura Terrestre: ${linkBudget.maxMidpointBulgeMeters} m
- Ángulos de Inclinación Mecánica (Tilt): Sitio A -> ${linkBudget.tiltAngleA}°, Sitio B -> ${linkBudget.tiltAngleB}°
- Obstáculos declarados por usuario: ${
        obstructions && obstructions.length > 0
          ? JSON.stringify(obstructions)
          : 'Ninguno declarado manualmente'
      }

Por favor, estructura tu respuesta en Markdown claro con los siguientes puntos:
1. **Dictamen de Línea de Vista (LOS) y Zona de Fresnel**: Análisis de despeje, criticidad del abultamiento de la Tierra y sugerencia de altura mínima de torre si corresponde.
2. **Compatibilidad Electromagnética y de Antenas**: Análisis de polarización, ganancias, ancho del haz y dificultad de alineación.
3. **Análisis de Entorno y Geografía**: Utiliza los datos de mapas para comentar sobre la orografía de la zona (valles, colinas, cuerpos de agua o zonas urbanas intermedias).
4. **Recomendaciones de Instalación y Ajustes**: Tilt exacto, protección climática (atenuación por lluvia en ${frequencyGHz} GHz) y ancho de canal recomendado.`;

      const midLat = (siteA.lat + siteB.lat) / 2;
      const midLng = (siteA.lng + siteB.lng) / 2;

      // In accordance with gemini-api skill:
      // Model: gemini-3.8-flash, tool: googleMaps, retrievalConfig latLng
      // Disallowed: responseMimeType, responseSchema
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: midLat,
                longitude: midLng,
              },
            },
          },
        },
      });

      const text = response.text || '';
      const groundingChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          text,
          groundingChunks,
        })
      );
      return;
    } catch (err: any) {
      console.error('Gemini analysis error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Error al invocar Gemini con Google Maps' }));
      return;
    }
  }

  next();
}
