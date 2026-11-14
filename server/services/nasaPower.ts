import type {AnalyzedDataset, DatasetMetadata, ObservationPoint} from '../../src/types/omi.ts';
import {runStatisticalAnalysis} from '../processing/trendAnalysis.ts';

export const STUDY_REGIONS = {
  lagos: {
    id: 'lagos' as const,
    label: 'Lagos State',
    subRegion: 'South-West Nigeria',
    environment: 'Coastal urban environment',
    latitude: 6.5244,
    longitude: 3.3792,
    coordinates: '6.5244° N, 3.3792° E',
  },
  edo: {
    id: 'edo' as const,
    label: 'Edo State',
    subRegion: 'South-South Nigeria',
    environment: 'Inland and forest transition zone',
    latitude: 6.5438,
    longitude: 5.8987,
    coordinates: '6.5438° N, 5.8987° E',
  },
};

const NASA_PARAM_MAP = {
  temperature: {
    param: 'T2M',
    unit: '°C',
    label: 'Temperature at 2 Meters (T2M)',
  },
  rainfall: {
    param: 'PRECTOTCORR',
    unit: 'mm/day',
    label: 'Precipitation Corrected (PRECTOTCORR)',
  },
};

const nasaCache = new Map<string, AnalyzedDataset>();

export async function fetchNasaPowerSeries(params: {
  region: 'lagos' | 'edo';
  variable: 'temperature' | 'rainfall';
  startYear: number;
  endYear: number;
}): Promise<AnalyzedDataset> {
  const {region, variable, startYear, endYear} = params;

  const safeStart = Math.max(1981, Math.min(2024, Math.floor(startYear)));
  const safeEnd = Math.max(safeStart, Math.min(2025, Math.floor(endYear)));

  const cacheKey = `${region}:${variable}:${safeStart}:${safeEnd}`;
  const cached = nasaCache.get(cacheKey);
  if (cached) return cached;

  const regionInfo = STUDY_REGIONS[region];
  const paramInfo = NASA_PARAM_MAP[variable];

  const url =
    `https://power.larc.nasa.gov/api/temporal/monthly/point` +
    `?parameters=${paramInfo.param}` +
    `&community=AG` +
    `&longitude=${regionInfo.longitude}` +
    `&latitude=${regionInfo.latitude}` +
    `&start=${safeStart}` +
    `&end=${safeEnd}` +
    `&format=JSON`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Omi-AI-Earth-System-Trend-Detective/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(
      `NASA POWER API returned HTTP ${response.status}${errBody ? `: ${errBody.slice(0, 180)}` : ''}`,
    );
  }

  const json = (await response.json()) as {
    properties?: {
      parameter?: Record<string, Record<string, number>>;
    };
  };

  const rawMap = json?.properties?.parameter?.[paramInfo.param];
  if (!rawMap || typeof rawMap !== 'object') {
    throw new Error(`NASA POWER response did not contain parameter "${paramInfo.param}".`);
  }

  const points: ObservationPoint[] = [];
  let totalMonthlyEntries = 0;
  let missingOrSentinel = 0;

  for (const [ymKey, val] of Object.entries(rawMap)) {
    const match = ymKey.match(/^(\d{4})(\d{2})$/);
    if (!match) continue;
    const year = Number(match[1]);
    const month = Number(match[2]);
    // NASA POWER includes YYYY13 as an annual summary; exclude month 13 to preserve true monthly series
    if (month < 1 || month > 12) continue;

    totalMonthlyEntries++;
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= -990) {
      missingOrSentinel++;
      continue;
    }

    const mm = String(month).padStart(2, '0');
    points.push({
      date: `${year}-${mm}-01`,
      timestamp: Date.UTC(year, month - 1, 1),
      value: val,
      year,
      month,
    });
  }

  points.sort((a, b) => a.timestamp - b.timestamp);

  if (points.length < 6) {
    throw new Error(
      `NASA POWER returned only ${points.length} valid monthly observation(s) for ${regionInfo.label} (${safeStart}–${safeEnd}).`,
    );
  }

  const analysis = runStatisticalAnalysis(points, {
    totalRows: totalMonthlyEntries,
    missingOrInvalidRows: missingOrSentinel,
    duplicateDatesCount: 0,
    unit: paramInfo.unit,
    variable,
    alpha: 0.05,
  });

  const metadata: DatasetMetadata = {
    id: `nasa_${region}_${variable}_${safeStart}_${safeEnd}`,
    name: `${regionInfo.label} ${variable === 'temperature' ? 'Surface Temperature' : 'Precipitation'} (${safeStart}–${safeEnd})`,
    source: `NASA POWER Project (Monthly Point · ${paramInfo.param})`,
    sourceType: 'nasa_power',
    region,
    regionLabel: regionInfo.label,
    coordinates: regionInfo.coordinates,
    variable,
    unit: paramInfo.unit,
    description: `${paramInfo.label} retrieved live from NASA Langley POWER API for ${regionInfo.label} (${regionInfo.coordinates}).`,
    granularity: 'monthly',
    createdAt: new Date().toISOString(),
  };

  const dataset: AnalyzedDataset = {metadata, analysis};
  nasaCache.set(cacheKey, dataset);
  return dataset;
}
