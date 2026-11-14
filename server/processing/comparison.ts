import type {
  AnalyzedDataset,
  ComparisonPairedPoint,
  ComparisonResult,
  ObservationPoint,
} from '../../src/types/omi.ts';

function normalizeUnitValue(value: number, fromUnit: string, targetUnit: string): number {
  const f = fromUnit.trim().toLowerCase();
  const t = targetUnit.trim().toLowerCase();
  if (f === t) return value;
  // Convert Kelvin to Celsius if comparing compatible temperature datasets
  if ((f === 'k' || f === 'kelvin') && (t === '°c' || t === 'c' || t === 'celsius')) {
    return value - 273.15;
  }
  if ((f === '°c' || f === 'c' || f === 'celsius') && (t === 'k' || t === 'kelvin')) {
    return value + 273.15;
  }
  return value;
}

function areUnitsCompatible(unitA: string, unitB: string): {compatible: boolean; targetUnit: string; note?: string} {
  const a = unitA.trim().toLowerCase();
  const b = unitB.trim().toLowerCase();
  if (a === b) return {compatible: true, targetUnit: unitA};

  const celsiusAliases = new Set(['°c', 'c', 'celsius', 'degc']);
  const kelvinAliases = new Set(['k', 'kelvin']);
  if (
    (celsiusAliases.has(a) && kelvinAliases.has(b)) ||
    (kelvinAliases.has(a) && celsiusAliases.has(b))
  ) {
    return {
      compatible: true,
      targetUnit: '°C',
      note: `Converted Kelvin values to °C so both series share °C.`,
    };
  }

  return {compatible: false, targetUnit: unitA};
}

function aggregateByKey(
  series: ObservationPoint[],
  keyMode: 'day' | 'month' | 'year',
  mode: 'mean' | 'sum',
): Map<string, number> {
  const buckets = new Map<string, number[]>();
  for (const pt of series) {
    const key =
      keyMode === 'day'
        ? pt.date
        : keyMode === 'month'
          ? pt.date.slice(0, 7)
          : String(pt.year);
    const list = buckets.get(key) || [];
    list.push(pt.value);
    buckets.set(key, list);
  }

  const out = new Map<string, number>();
  for (const [key, vals] of buckets.entries()) {
    const total = vals.reduce((a, b) => a + b, 0);
    out.set(key, mode === 'sum' ? total : total / vals.length);
  }
  return out;
}

function computePearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den > 1e-12 ? num / den : null;
}

export function compareRegions(lagos: AnalyzedDataset, edo: AnalyzedDataset): ComparisonResult {
  const reasons: string[] = [];

  if (lagos.metadata.variable !== edo.metadata.variable) {
    reasons.push(
      `Incompatible environmental variables: Lagos dataset measures "${lagos.metadata.variable}" while Edo dataset measures "${edo.metadata.variable}". Both datasets must measure the same variable.`,
    );
  }

  const unitCheck = areUnitsCompatible(lagos.metadata.unit, edo.metadata.unit);
  if (!unitCheck.compatible) {
    reasons.push(
      `Incompatible measurement units: Lagos uses "${lagos.metadata.unit}" while Edo uses "${edo.metadata.unit}". Convert or upload datasets with compatible units.`,
    );
  }

  // Choose coarsest common aggregation level so daily vs monthly or monthly vs annual align honestly
  const granOrder = {daily: 1, monthly: 2, annual: 3, irregular: 2};
  const coarsest = Math.max(
    granOrder[lagos.metadata.granularity],
    granOrder[edo.metadata.granularity],
  );
  const keyMode: 'day' | 'month' | 'year' =
    coarsest === 1 ? 'day' : coarsest === 2 ? 'month' : 'year';
  const aggMode: 'mean' | 'sum' =
    lagos.metadata.variable === 'rainfall' &&
    lagos.metadata.unit.toLowerCase() === 'mm' &&
    lagos.metadata.granularity !== edo.metadata.granularity
      ? 'sum'
      : 'mean';

  const aggregationMethod =
    lagos.metadata.granularity === edo.metadata.granularity && keyMode !== 'day'
      ? `Direct ${keyMode}ly alignment (${aggMode})`
      : `Aligned to ${keyMode}ly ${aggMode}s (${lagos.metadata.granularity} vs ${edo.metadata.granularity})`;

  if (reasons.length > 0) {
    return {
      compatible: false,
      reasons,
      variable: lagos.metadata.variable,
      unit: lagos.metadata.unit,
      aggregationMethod,
      overlapPeriod: null,
      lagosSummary: null,
      edoSummary: null,
      meanDifference: null,
      pearsonCorrelation: null,
      pairedSeries: [],
      interpretationSummary: reasons.join(' '),
    };
  }

  const lagosMap = aggregateByKey(lagos.analysis.series, keyMode, aggMode);
  const edoMap = aggregateByKey(edo.analysis.series, keyMode, aggMode);

  const commonKeys = [...lagosMap.keys()].filter((k) => edoMap.has(k)).sort();
  if (commonKeys.length < 4) {
    const overlapMsg =
      commonKeys.length === 0
        ? `No overlapping time periods exist between Lagos (${lagos.analysis.dateRange.start} to ${lagos.analysis.dateRange.end}) and Edo (${edo.analysis.dateRange.start} to ${edo.analysis.dateRange.end}).`
        : `Only ${commonKeys.length} overlapping ${keyMode}(s) exist between Lagos and Edo; at least 4 overlapping observations are required for a valid regional comparison.`;
    reasons.push(overlapMsg);

    return {
      compatible: false,
      reasons,
      variable: lagos.metadata.variable,
      unit: unitCheck.targetUnit,
      aggregationMethod,
      overlapPeriod:
        commonKeys.length > 0
          ? {start: commonKeys[0], end: commonKeys[commonKeys.length - 1], count: commonKeys.length}
          : null,
      lagosSummary: null,
      edoSummary: null,
      meanDifference: null,
      pearsonCorrelation: null,
      pairedSeries: [],
      interpretationSummary: overlapMsg,
    };
  }

  if (unitCheck.note) reasons.push(unitCheck.note);

  const pairedSeries: ComparisonPairedPoint[] = commonKeys.map((period) => {
    const lv = normalizeUnitValue(lagosMap.get(period)!, lagos.metadata.unit, unitCheck.targetUnit);
    const ev = normalizeUnitValue(edoMap.get(period)!, edo.metadata.unit, unitCheck.targetUnit);
    return {
      period,
      lagosValue: lv,
      edoValue: ev,
      difference: lv - ev,
    };
  });

  const lagosOverlapVals = pairedSeries.map((p) => p.lagosValue);
  const edoOverlapVals = pairedSeries.map((p) => p.edoValue);
  const lagosMeanOverlap = lagosOverlapVals.reduce((a, b) => a + b, 0) / pairedSeries.length;
  const edoMeanOverlap = edoOverlapVals.reduce((a, b) => a + b, 0) / pairedSeries.length;
  const meanDifference = lagosMeanOverlap - edoMeanOverlap;
  const pearsonCorrelation = computePearson(lagosOverlapVals, edoOverlapVals);

  const lagosSummary = {
    datasetId: lagos.metadata.id,
    name: lagos.metadata.name,
    source: lagos.metadata.source,
    mean: lagosMeanOverlap,
    min: Math.min(...lagosOverlapVals),
    max: Math.max(...lagosOverlapVals),
    sensSlopePerYear: lagos.analysis.sensSlopePerYear,
    trendDirection: lagos.analysis.trendDirection,
    pValue: lagos.analysis.mannKendall.pValue,
    significant: lagos.analysis.mannKendall.significant,
    observations: pairedSeries.length,
  };

  const edoSummary = {
    datasetId: edo.metadata.id,
    name: edo.metadata.name,
    source: edo.metadata.source,
    mean: edoMeanOverlap,
    min: Math.min(...edoOverlapVals),
    max: Math.max(...edoOverlapVals),
    sensSlopePerYear: edo.analysis.sensSlopePerYear,
    trendDirection: edo.analysis.trendDirection,
    pValue: edo.analysis.mannKendall.pValue,
    significant: edo.analysis.mannKendall.significant,
    observations: pairedSeries.length,
  };

  const diffSign = meanDifference >= 0 ? 'higher' : 'lower';
  const corrText =
    pearsonCorrelation !== null ? ` Co-variation correlation r = ${pearsonCorrelation.toFixed(3)}.` : '';
  const interpretationSummary = `Across ${pairedSeries.length} overlapping ${keyMode}ly periods (${commonKeys[0]} to ${commonKeys[commonKeys.length - 1]}), Lagos State averaged ${Math.abs(meanDifference).toFixed(2)} ${unitCheck.targetUnit} ${diffSign} than Edo State (${lagosMeanOverlap.toFixed(2)} vs ${edoMeanOverlap.toFixed(2)} ${unitCheck.targetUnit}).${corrText}`;

  return {
    compatible: true,
    reasons,
    variable: lagos.metadata.variable,
    unit: unitCheck.targetUnit,
    aggregationMethod,
    overlapPeriod: {
      start: commonKeys[0],
      end: commonKeys[commonKeys.length - 1],
      count: pairedSeries.length,
    },
    lagosSummary,
    edoSummary,
    meanDifference,
    pearsonCorrelation,
    pairedSeries,
    interpretationSummary,
  };
}
