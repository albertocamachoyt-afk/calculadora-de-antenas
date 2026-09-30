export type AntennaType = 'dish' | 'sector' | 'panel' | 'omni' | 'yagi' | 'grid';
export type Polarization = 'vertical' | 'horizontal' | 'dual' | 'slant45' | 'circular';

export interface AntennaPreset {
  id: string;
  brand: string;
  model: string;
  frequencyBand: string; // e.g. "5 GHz", "2.4 GHz", "60 GHz", "24 GHz", "915 MHz"
  frequencyGHz: number;
  gainDbi: number;
  beamwidthDeg: number;
  type: AntennaType;
  polarization: Polarization;
  defaultTxPowerDbm: number;
  defaultCableLossDb: number;
  rxSensitivityDbm: number;
  maxDistanceKm: number;
  description: string;
}

export interface SiteConfig {
  id: 'siteA' | 'siteB';
  name: string;
  lat: number;
  lng: number;
  elevation: number; // Ground elevation in meters ASL
  towerHeight: number; // Tower/mast height in meters AGL
  antenna: AntennaPreset;
  txPowerDbm: number;
  cableLossDb: number;
}

export interface Obstacle {
  id: string;
  name: string;
  distanceFromAKm: number;
  heightMeters: number; // Height above ground (building, trees, etc.)
  lat?: number;
  lng?: number;
  groundElevation?: number;
}

export interface ElevationPoint {
  distanceFromAKm: number;
  lat: number;
  lng: number;
  groundElevation: number;
  earthBulgeMeters: number;
  totalObstacleMeters: number;
  losRayElevation: number;
  fresnelUpperMeters: number;
  fresnelLowerMeters: number;
  fresnel60LowerMeters: number;
  fresnelRadiusMeters: number;
  clearanceMeters: number;
  isObstructed: boolean;
  isFresnelViolated: boolean;
}

export interface LinkCalculationResult {
  distanceKm: number;
  distanceMiles: number;
  bearingAtoB: number;
  bearingBtoA: number;
  tiltAngleA: number; // mechanical degrees uptilt(+) or downtilt(-)
  tiltAngleB: number;
  maxMidpointBulgeMeters: number;
  maxFresnelRadiusMeters: number;
  fsplDb: number;
  eirpDbm: number;
  rslDbm: number; // Received Signal Level (RSSI)
  fadeMarginDb: number;
  linkStatus: 'optimal' | 'marginal' | 'fresnel_blocked' | 'nlos_blocked' | 'incompatible';
  statusMessage: string;
  compatibilityIssues: string[];
  compatibilityNotes: string[];
  worstClearancePoint?: ElevationPoint;
  elevationProfile: ElevationPoint[];
}
