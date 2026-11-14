import type {
  MannKendallResult,
  MonthlyClimatology,
  ObservationPoint,
  SeasonalityResult,
  StatisticalAnalysisResult,
  TrendClassification,
} from '../../src/types/omi.ts';

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Standard normal cumulative distribution function Phi(z) using Abramowitz & Stegun erfc approximation.
 */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - d * poly : d * poly;
}

export function computeMannKendall(values: number[], alpha = 0.05): MannKendallResult {
  const n = values.length;
  if (n < 4) {
    return {s: 0, variance: 0, z: 0, tau: 0, pValue: 1, significant: false, alpha};
  }

  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const diff = values[j] - values[i];
      if (diff > 0) s += 1;
      else if (diff < 0) s -= 1;
    }
  }

  // Count tied groups for exact tie-corrected variance
  const tieCounts = new Map<number, number>();
  for (const v of values) {
    tieCounts.set(v, (tieCounts.get(v) || 0) + 1);
  }
  let tieAdjustment = 0;
  for (const count of tieCounts.values()) {
    if (count > 1) {
      tieAdjustment += count * (count - 1) * (2 * count + 5);
    }
  }

  const variance = (n * (n - 1) * (2 * n + 5) - tieAdjustment) / 18;
  let z = 0;
  if (variance > 0) {
    if (s > 0) z = (s - 1) / Math.sqrt(variance);
    else if (s < 0) z = (s + 1) / Math.sqrt(variance);
  }

  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z)))));
  const totalPairs = (n * (n - 1)) / 2;
  const tau = totalPairs > 0 ? s / totalPairs : 0;

  return {
    s,
    variance,
    z,
    tau,
    pValue,
    significant: pValue < alpha && n >= 6,
    alpha,
  };
}

export function computeLinearRegression(points: ObservationPoint[]): {
  slopePerYear: number;
  interceptAtStart: number;
} {
  const n = points.length;
  if (n < 2) return {slopePerYear: 0, interceptAtStart: points[0]?.value ?? 0};

  const t0 = points[0].timestamp;
  const xs = points.map((p) => (p.timestamp - t0) / MS_PER_YEAR);
  const ys = points.map((p) => p.value);

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }

  const slopePerYear = den > 0 ? num / den : 0;
  const interceptAtStart = meanY - slopePerYear * meanX;
  return {slopePerYear, interceptAtStart};
}

export function computeSensSlopePerYear(points: ObservationPoint[]): number {
  const n = points.length;
  if (n < 2) return 0;

  const t0 = points[0].timestamp;
  const slopes: number[] = [];

  // For very large datasets (> 400 points), sample uniformly to keep O(n^2) responsive while preserving median accuracy
  const step = n > 400 ? Math.ceil(n / 400) : 1;
  const sampled = step === 1 ? points : points.filter((_, idx) => idx % step === 0 || idx === n - 1);

  for (let i = 0; i < sampled.length - 1; i++) {
    const xi = (sampled[i].timestamp - t0) / MS_PER_YEAR;
    for (let j = i + 1; j < sampled.length; j++) {
      const xj = (sampled[j].timestamp - t0) / MS_PER_YEAR;
      const dt = xj - xi;
      if (dt > 1e-6) {
        slopes.push((sampled[j].value - sampled[i].value) / dt);
      }
    }
  }

  if (slopes.length === 0) return 0;
  slopes.sort((a, b) => a - b);
  const mid = Math.floor(slopes.length / 2);
  return slopes.length % 2 === 0 ? (slopes[mid - 1] + slopes[mid]) / 2 : slopes[mid];
}

export function computeSeasonality(points: ObservationPoint[]): SeasonalityResult {
  const buckets = new Map<number, number[]>();
  for (const p of points) {
    const arr = buckets.get(p.month) || [];
    arr.push(p.value);
    buckets.set(p.month, arr);
  }

  const monthlyAverages: MonthlyClimatology[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = buckets.get(m);
    if (vals && vals.length > 0) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      monthlyAverages.push({month: m, label: MONTH_LABELS[m - 1], mean, count: vals.length});
    }
  }

  if (monthlyAverages.length < 4 || points.length < 12) {
    return {detected: false, strength: 0, monthlyAverages};
  }

  const overallMean = points.reduce((acc, p) => acc + p.value, 0) / points.length;
  const totalSS = points.reduce((acc, p) => acc + (p.value - overallMean) ** 2, 0);
  if (totalSS <= 1e-9) {
    return {detected: false, strength: 0, monthlyAverages};
  }

  const monthMeanMap = new Map(monthlyAverages.map((m) => [m.month, m.mean]));
  const residualSS = points.reduce((acc, p) => {
    const mMean = monthMeanMap.get(p.month) ?? overallMean;
    return acc + (p.value - mMean) ** 2;
  }, 0);

  const strength = Math.max(0, Math.min(1, 1 - residualSS / totalSS));
  return {
    detected: strength >= 0.3,
    strength,
    monthlyAverages,
  };
}

export function classifyTrend(
  mk: MannKendallResult,
  sensSlopePerYear: number,
  linearSlopePerYear: number,
  seasonality: SeasonalityResult,
  stdDev: number,
  mean: number,
  spanYears: number,
): {
  trendDirection: TrendClassification;
  statisticalConfidenceNote: string;
} {
  const effectiveSlope = Math.abs(sensSlopePerYear) > 1e-9 ? sensSlopePerYear : linearSlopePerYear;
  const totalChangeOverSpan = Math.abs(effectiveSlope * Math.max(spanYears, 1));
  const noiseScale = Math.max(stdDev * 0.25, Math.abs(mean) * 0.005, 1e-6);

  if (mk.significant && totalChangeOverSpan >= noiseScale * 0.35) {
    if (mk.z > 0 && effectiveSlope > 0) {
      return {
        trendDirection: 'Increasing',
        statisticalConfidenceNote: `Statistically significant upward trend (Mann-Kendall p = ${mk.pValue.toFixed(4)} < ${mk.alpha}).`,
      };
    }
    if (mk.z < 0 && effectiveSlope < 0) {
      return {
        trendDirection: 'Decreasing',
        statisticalConfidenceNote: `Statistically significant downward trend (Mann-Kendall p = ${mk.pValue.toFixed(4)} < ${mk.alpha}).`,
      };
    }
  }

  // Distinguish seasonal cycles / fluctuating oscillations from flat stable series
  const cv = Math.abs(mean) > 1e-6 ? stdDev / Math.abs(mean) : stdDev;
  if (seasonality.detected || seasonality.strength >= 0.28 || cv >= 0.18) {
    return {
      trendDirection: 'Seasonal or fluctuating',
      statisticalConfidenceNote: `No statistically significant monotonic trend (Mann-Kendall p = ${mk.pValue.toFixed(4)} >= ${mk.alpha}); variation is dominated by seasonal or cyclical fluctuations (seasonal variance share ${(seasonality.strength * 100).toFixed(0)}%).`,
    };
  }

  return {
    trendDirection: 'Stable',
    statisticalConfidenceNote: `No statistically significant long-term trend (Mann-Kendall p = ${mk.pValue.toFixed(4)} >= ${mk.alpha}) and low seasonal amplitude; series remains relatively stable around the historical mean.`,
  };
}

export function runStatisticalAnalysis(
  points: ObservationPoint[],
  options?: {
    totalRows?: number;
    missingOrInvalidRows?: number;
    duplicateDatesCount?: number;
    unit?: string;
    variable?: string;
    alpha?: number;
  },
): StatisticalAnalysisResult {
  if (!points || points.length === 0) {
    throw new Error('Cannot run statistical analysis on an empty observation series.');
  }

  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const n = sorted.length;
  const totalRows = options?.totalRows ?? n;
  const missingOrInvalidRows = options?.missingOrInvalidRows ?? 0;
  const duplicateDatesCount = options?.duplicateDatesCount ?? 0;
  const alpha = options?.alpha ?? 0.05;
  const unit = options?.unit ?? '';
  const variable = options?.variable ?? 'measurement';

  const values = sorted.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const sortedVals = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sortedVals.length / 2);
  const median = sortedVals.length % 2 === 0 ? (sortedVals[mid - 1] + sortedVals[mid]) / 2 : sortedVals[mid];

  const varianceSample = n > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0;
  const stdDev = Math.sqrt(varianceSample);

  const {slopePerYear: linearSlopePerYear, interceptAtStart: linearIntercept} = computeLinearRegression(sorted);
  const sensSlopePerYear = computeSensSlopePerYear(sorted);
  const mannKendall = computeMannKendall(values, alpha);
  const seasonality = computeSeasonality(sorted);

  const spanYears = Math.max((sorted[n - 1].timestamp - sorted[0].timestamp) / MS_PER_YEAR, 1 / 12);
  const {trendDirection, statisticalConfidenceNote} = classifyTrend(
    mannKendall,
    sensSlopePerYear,
    linearSlopePerYear,
    seasonality,
    stdDev,
    mean,
    spanYears,
  );

  const completenessPercent = totalRows > 0 ? Math.round((n / totalRows) * 1000) / 10 : 100;
  const slopeStr = `${sensSlopePerYear >= 0 ? '+' : ''}${sensSlopePerYear.toFixed(4)} ${unit}/yr`;
  const explanation = `Across ${n} valid ${variable} observations from ${sorted[0].date} to ${sorted[n - 1].date}, values ranged from ${min.toFixed(2)} to ${max.toFixed(2)} ${unit} (mean ${mean.toFixed(2)} ${unit}, SD ${stdDev.toFixed(2)} ${unit}). The non-parametric Sen's slope is ${slopeStr}, and the series is classified as "${trendDirection}". ${statisticalConfidenceNote}`;

  return {
    validObservations: n,
    totalRows,
    missingOrInvalidRows,
    completenessPercent,
    duplicateDatesCount,
    dateRange: {
      start: sorted[0].date,
      end: sorted[n - 1].date,
    },
    mean,
    min,
    max,
    median,
    stdDev,
    linearSlopePerYear,
    linearIntercept,
    sensSlopePerYear,
    mannKendall,
    seasonality,
    trendDirection,
    statisticalConfidenceNote,
    explanation,
    series: sorted,
  };
}
