import { ElevationPoint, LinkCalculationResult, Obstacle, SiteConfig } from '../types/antenna';

// Earth radius in km
const EARTH_RADIUS_KM = 6371;
// Effective earth radius multiplier (k-factor = 4/3 standard atmosphere)
const K_FACTOR = 4 / 3;
const EFFECTIVE_EARTH_RADIUS_KM = EARTH_RADIUS_KM * K_FACTOR; // ~8494.67 km

/**
 * Calculates Haversine distance in km between two lat/lng points
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates Initial Bearing / Azimuth in degrees (0 - 360) from origin to destination
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (theta * (180 / Math.PI) + 360) % 360;
}

/**
 * Computes an intermediate point at fraction t (0..1) along the great circle arc
 */
export function interpolateLatLng(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): { lat: number; lng: number } {
  const phi1 = (lat1 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((phi1 - phi2) / 2), 2) +
          Math.cos(phi1) *
            Math.cos(phi2) *
            Math.pow(Math.sin((lambda1 - lambda2) / 2), 2)
      )
    );

  if (d === 0) return { lat: lat1, lng: lon1 };

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
  const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
  const z = A * Math.sin(phi1) + B * Math.sin(phi2);

  const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lambda = Math.atan2(y, x);

  return {
    lat: (phi * 180) / Math.PI,
    lng: (lambda * 180) / Math.PI,
  };
}

/**
 * Earth curvature height bulge (in meters) at distance d1 from site A and d2 from site B
 * Formula: h = (d1 * d2) / (2 * Reff) in km, converted to meters (* 1000)
 */
export function calculateEarthBulge(d1Km: number, d2Km: number): number {
  if (d1Km <= 0 || d2Km <= 0) return 0;
  return ((d1Km * d2Km) / (2 * EFFECTIVE_EARTH_RADIUS_KM)) * 1000;
}

/**
 * 1st Fresnel Zone Radius in meters
 * Formula: r = 17.32 * sqrt( (d1 * d2) / (f_GHz * D) )
 * where d1, d2, D are in km, f is in GHz
 */
export function calculateFresnelRadius(
  d1Km: number,
  d2Km: number,
  totalDistanceKm: number,
  frequencyGHz: number
): number {
  if (totalDistanceKm <= 0 || frequencyGHz <= 0 || d1Km <= 0 || d2Km <= 0) return 0;
  const value = (d1Km * d2Km) / (frequencyGHz * totalDistanceKm);
  return 17.32 * Math.sqrt(Math.max(0, value));
}

/**
 * Free Space Path Loss (FSPL) in dB
 * FSPL(dB) = 20*log10(d_km) + 20*log10(f_MHz) + 32.44
 */
export function calculateFSPL(distanceKm: number, frequencyGHz: number): number {
  if (distanceKm <= 0 || frequencyGHz <= 0) return 0;
  const fMHz = frequencyGHz * 1000;
  return 20 * Math.log10(distanceKm) + 20 * Math.log10(fMHz) + 32.44;
}

/**
 * Evaluates full RF Link, compatibility, elevation profile, and Line-of-Sight status
 */
export function computeLinkCalculations(
  siteA: SiteConfig,
  siteB: SiteConfig,
  obstacles: Obstacle[],
  rawElevationData?: { elevation: number; location: { lat: number; lng: number } }[]
): LinkCalculationResult {
  const distanceKm = calculateHaversineDistance(siteA.lat, siteA.lng, siteB.lat, siteB.lng);
  const distanceMiles = distanceKm * 0.621371;
  const bearingAtoB = calculateBearing(siteA.lat, siteA.lng, siteB.lat, siteB.lng);
  const bearingBtoA = calculateBearing(siteB.lat, siteB.lng, siteA.lat, siteA.lng);

  // Mean operating frequency (average or frequency of Site A)
  const frequencyGHz = siteA.antenna.frequencyGHz;

  // Max midpoint Earth bulge
  const maxMidpointBulgeMeters = calculateEarthBulge(distanceKm / 2, distanceKm / 2);
  // Max midpoint Fresnel radius
  const maxFresnelRadiusMeters = calculateFresnelRadius(
    distanceKm / 2,
    distanceKm / 2,
    distanceKm,
    frequencyGHz
  );

  // Total absolute antenna heights (ASL)
  const totalHeightA = siteA.elevation + siteA.towerHeight;
  const totalHeightB = siteB.elevation + siteB.towerHeight;

  // Mechanical tilt angle in degrees:
  // Tilt A = atan2( (HB - HA - bulge(D)) , D*1000 )
  const heightDeltaMeters = totalHeightB - totalHeightA;
  const tiltAngleA =
    (Math.atan2(heightDeltaMeters - maxMidpointBulgeMeters, distanceKm * 1000) * 180) / Math.PI;
  const tiltAngleB =
    (Math.atan2(-heightDeltaMeters - maxMidpointBulgeMeters, distanceKm * 1000) * 180) / Math.PI;

  // Free space path loss
  const fsplDb = calculateFSPL(distanceKm, frequencyGHz);

  // EIRP (Equivalent Isotropically Radiated Power) in dBm
  const eirpDbm = siteA.txPowerDbm + siteA.antenna.gainDbi - siteA.cableLossDb;

  // Received Signal Level (RSL / RSSI) in dBm
  // RSL = EIRP - FSPL + GainRx - CableLossRx
  const rslDbm = eirpDbm - fsplDb + siteB.antenna.gainDbi - siteB.cableLossDb;

  // Fade Margin in dB
  const rxSens = Math.min(siteA.antenna.rxSensitivityDbm, siteB.antenna.rxSensitivityDbm);
  const fadeMarginDb = rslDbm - rxSens;

  // Build Elevation Profile
  const samples = 41; // Equidistant points along the link
  const elevationProfile: ElevationPoint[] = [];

  let hasNlosObstruction = false;
  let hasFresnelViolation = false;
  let worstClearancePoint: ElevationPoint | undefined = undefined;
  let minClearanceMeters = Infinity;

  for (let i = 0; i < samples; i++) {
    const fraction = i / (samples - 1);
    const d1 = distanceKm * fraction;
    const d2 = distanceKm * (1 - fraction);
    const { lat, lng } = interpolateLatLng(siteA.lat, siteA.lng, siteB.lat, siteB.lng, fraction);

    // Ground elevation from API or synthetic terrain estimation
    let groundElevation = 0;
    if (rawElevationData && rawElevationData.length > 0) {
      const idx = Math.min(
        rawElevationData.length - 1,
        Math.round(fraction * (rawElevationData.length - 1))
      );
      groundElevation = rawElevationData[idx]?.elevation ?? 0;
    } else {
      // Linear baseline between Site A and Site B elevations + subtle undulating synthetic terrain
      const baseAlt = siteA.elevation + fraction * (siteB.elevation - siteA.elevation);
      // Terrain roughness function for realism when offline
      const undulating = Math.sin(fraction * Math.PI) * (distanceKm > 5 ? 15 : 4);
      groundElevation = Math.max(0, baseAlt + undulating);
    }

    // Earth bulge at this specific distance
    const earthBulgeMeters = calculateEarthBulge(d1, d2);

    // Any manual obstacle at or near this distance?
    let obstacleHeightAtPoint = 0;
    for (const obs of obstacles) {
      const distDiff = Math.abs(obs.distanceFromAKm - d1);
      // Apply obstacle influence within a 200m radius window
      if (distDiff <= (distanceKm / samples) * 1.2) {
        obstacleHeightAtPoint = Math.max(obstacleHeightAtPoint, obs.heightMeters);
      }
    }

    // Direct Line-of-Sight Ray height at this point (Linear interpolation from A to B)
    const losRayElevation = totalHeightA + fraction * (totalHeightB - totalHeightA);

    // Fresnel Zone radius at this point
    const fresnelRadiusMeters = calculateFresnelRadius(d1, d2, distanceKm, frequencyGHz);
    const fresnel60 = 0.6 * fresnelRadiusMeters;

    const fresnelUpperMeters = losRayElevation + fresnelRadiusMeters;
    const fresnelLowerMeters = losRayElevation - fresnelRadiusMeters;
    const fresnel60LowerMeters = losRayElevation - fresnel60;

    // Total physical obstruction height (ground + earth bulge + building/tree obstacle)
    const totalPhysicalHeight = groundElevation + earthBulgeMeters + obstacleHeightAtPoint;

    // Clearance relative to direct LOS ray
    const clearanceMeters = losRayElevation - totalPhysicalHeight;

    // Obstruction checks
    const isObstructed = totalPhysicalHeight >= losRayElevation;
    const isFresnelViolated = totalPhysicalHeight >= fresnel60LowerMeters;

    if (isObstructed) hasNlosObstruction = true;
    if (isFresnelViolated) hasFresnelViolation = true;

    const point: ElevationPoint = {
      distanceFromAKm: Number(d1.toFixed(2)),
      lat,
      lng,
      groundElevation: Number(groundElevation.toFixed(1)),
      earthBulgeMeters: Number(earthBulgeMeters.toFixed(1)),
      totalObstacleMeters: obstacleHeightAtPoint,
      losRayElevation: Number(losRayElevation.toFixed(1)),
      fresnelUpperMeters: Number(fresnelUpperMeters.toFixed(1)),
      fresnelLowerMeters: Number(fresnelLowerMeters.toFixed(1)),
      fresnel60LowerMeters: Number(fresnel60LowerMeters.toFixed(1)),
      fresnelRadiusMeters: Number(fresnelRadiusMeters.toFixed(1)),
      clearanceMeters: Number(clearanceMeters.toFixed(1)),
      isObstructed,
      isFresnelViolated,
    };

    elevationProfile.push(point);

    if (clearanceMeters < minClearanceMeters && i > 0 && i < samples - 1) {
      minClearanceMeters = clearanceMeters;
      worstClearancePoint = point;
    }
  }

  // Antenna Compatibility Assessment
  const compatibilityIssues: string[] = [];
  const compatibilityNotes: string[] = [];

  // 1. Frequency Band Compatibility
  const freqDiff = Math.abs(siteA.antenna.frequencyGHz - siteB.antenna.frequencyGHz);
  if (freqDiff > 0.4) {
    compatibilityIssues.push(
      `Incompatibilidad de Frecuencia Crítica: Sitio A opera a ${siteA.antenna.frequencyGHz} GHz (${siteA.antenna.frequencyBand}) y Sitio B a ${siteB.antenna.frequencyGHz} GHz (${siteB.antenna.frequencyBand}). No podrán sincronizar radioenlace.`
    );
  } else {
    compatibilityNotes.push(
      `Frecuencias compatibles: Ambos radios operan en el espectro ${siteA.antenna.frequencyBand} (~${siteA.antenna.frequencyGHz} GHz).`
    );
  }

  // 2. Polarization Check
  if (
    siteA.antenna.polarization !== 'dual' &&
    siteB.antenna.polarization !== 'dual' &&
    siteA.antenna.polarization !== siteB.antenna.polarization
  ) {
    compatibilityIssues.push(
      `Desajuste de Polarización: Antena A es polarización "${siteA.antenna.polarization}" y Antena B es "${siteB.antenna.polarization}". Pérdida por polarización cruzada superior a 20 dB.`
    );
  } else if (siteA.antenna.polarization === 'dual' || siteB.antenna.polarization === 'dual') {
    compatibilityNotes.push(
      `Polarización óptima: Polarización Dual / Slant 45° con soporte MIMO 2x2 para máxima tasa de datos y resistencia a ruido.`
    );
  }

  // 3. Distance vs Maximum Specs
  const minMaxDist = Math.min(siteA.antenna.maxDistanceKm, siteB.antenna.maxDistanceKm);
  if (distanceKm > minMaxDist) {
    compatibilityIssues.push(
      `Distancia límite excedida: La distancia del enlace (${distanceKm.toFixed(1)} km) supera la distancia recomendada de diseño (${minMaxDist} km) para estas antenas.`
    );
  }

  // 4. Narrow beamwidth aiming warning
  if (siteA.antenna.beamwidthDeg < 5 || siteB.antenna.beamwidthDeg < 5) {
    compatibilityNotes.push(
      `Alineación milimétrica requerida: Apertura de haz muy estrecha (${Math.min(
        siteA.antenna.beamwidthDeg,
        siteB.antenna.beamwidthDeg
      )}°). Requiere soporte antiviento y ajuste de azimut/elevación de alta precisión.`
    );
  }

  // Determine Overall Link Status
  let linkStatus: LinkCalculationResult['linkStatus'] = 'optimal';
  let statusMessage = 'Línea de vista perfecta (LOS) y despeje superior al 60% de la 1ª Zona de Fresnel.';

  if (compatibilityIssues.length > 0) {
    linkStatus = 'incompatible';
    statusMessage = 'Incompatibilidad detectada entre las antenas seleccionadas.';
  } else if (hasNlosObstruction) {
    linkStatus = 'nlos_blocked';
    statusMessage = 'Enlace OBSTRUIDO (NLOS): El terreno o las edificaciones bloquean el haz directo.';
  } else if (hasFresnelViolation) {
    linkStatus = 'fresnel_blocked';
    statusMessage =
      'Alerta de Zona de Fresnel: Hay obstáculos invadiendo el 60% de la 1ª Zona de Fresnel, lo que causará difracción y atenuación severa.';
  } else if (fadeMarginDb < 10) {
    linkStatus = 'marginal';
    statusMessage =
      'Margen de señal marginal (<10 dB). El enlace es vulnerable a caídas por lluvia o cambios térmicos.';
  }

  return {
    distanceKm: Number(distanceKm.toFixed(2)),
    distanceMiles: Number(distanceMiles.toFixed(2)),
    bearingAtoB: Number(bearingAtoB.toFixed(1)),
    bearingBtoA: Number(bearingBtoA.toFixed(1)),
    tiltAngleA: Number(tiltAngleA.toFixed(2)),
    tiltAngleB: Number(tiltAngleB.toFixed(2)),
    maxMidpointBulgeMeters: Number(maxMidpointBulgeMeters.toFixed(2)),
    maxFresnelRadiusMeters: Number(maxFresnelRadiusMeters.toFixed(2)),
    fsplDb: Number(fsplDb.toFixed(1)),
    eirpDbm: Number(eirpDbm.toFixed(1)),
    rslDbm: Number(rslDbm.toFixed(1)),
    fadeMarginDb: Number(fadeMarginDb.toFixed(1)),
    linkStatus,
    statusMessage,
    compatibilityIssues,
    compatibilityNotes,
    worstClearancePoint,
    elevationProfile,
  };
}
