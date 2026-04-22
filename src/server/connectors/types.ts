/**
 * Connector interfaces. Each external data source implements a subset of these.
 * Production connectors should wrap real APIs; stubs ship with mock data so the
 * full enrichment pipeline can be exercised end-to-end in dev.
 */

export type ConnectorStatus = "success" | "partial" | "failed";

export type ConnectorResult<T> = {
  source: string;
  status: ConnectorStatus;
  confidence?: number;
  fetchedAt: string;
  raw: unknown;
  normalized: T;
  error?: string;
};

export type AddressInput = {
  line1: string;
  line2?: string;
  neighborhood?: string;
  municipality?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type ValidatedAddress = {
  line1: string;
  line2?: string;
  neighborhood?: string;
  municipality?: string;
  state?: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
};

export type PostalData = {
  postalCode: string;
  neighborhoodOptions: string[]; // a CP can map to multiple colonias in MX
  municipality: string;
  state: string;
};

export type LandUseData = {
  landUseCode?: string;        // "HC/3/20"
  landUseLabel?: string;       // "Habitacional con comercio 3 niveles 20% área libre"
  surfaceM2?: number;
  frontageM?: number;
  depthM?: number;
  polygonGeoJson?: string;     // GeoJSON polygon for the parcel
  fichaUrl?: string;           // SEDUVI PDF
  sourceName: string;          // e.g. "CDMX-SEDUVI"
};

export type DemographicsBand = {
  radiusMeters: number;
  population?: number;
  households?: number;
  avgAge?: number;
  avgHouseholdIncome?: number;
  socioeconomic?: {
    abc1Pct?: number;
    c2Pct?: number;
    cPct?: number;
    dPct?: number;
    ePct?: number;
  };
};

export type DemographicsData = {
  bands: DemographicsBand[];
};

export type CommercialBand = {
  radiusMeters: number;
  byCategory: Record<string, { count: number; brands: string[] }>;
};

export type CommercialData = {
  bands: CommercialBand[];
};

export interface AddressConnector {
  validateAddress(input: AddressInput): Promise<ConnectorResult<ValidatedAddress>>;
  reverseGeocode(lat: number, lng: number): Promise<ConnectorResult<ValidatedAddress>>;
  fetchPostalData(postalCode: string): Promise<ConnectorResult<PostalData>>;
}

export interface LandUseConnector {
  fetchLandUseAndPolygon(
    coords: { lat: number; lng: number },
    address?: ValidatedAddress,
  ): Promise<ConnectorResult<LandUseData>>;
}

export interface DemographicsConnector {
  fetchDemographics(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
  ): Promise<ConnectorResult<DemographicsData>>;
}

export interface CommercialConnector {
  fetchCommercialContext(
    coords: { lat: number; lng: number },
    radiiMeters: number[],
    categories?: string[],
  ): Promise<ConnectorResult<CommercialData>>;
}
