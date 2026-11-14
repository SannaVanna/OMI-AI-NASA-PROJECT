import crypto from 'node:crypto';
import type {
  AnalyzedDataset,
  ChallengeProgress,
  ChallengePromptPayload,
  ChallengeSubmissionResult,
  ObservationPoint,
  TrendClassification,
} from '../../src/types/omi.ts';
import {runStatisticalAnalysis} from '../processing/trendAnalysis.ts';
import {fetchNasaPowerSeries, STUDY_REGIONS} from './nasaPower.ts';

interface StoredChallenge {
  challengeId: string;
  region: 'lagos' | 'edo';
  regionLabel: string;
  coordinates: string;
  variable: 'temperature' | 'rainfall';
  unit: string;
  source: string;
  sourceType: 'nasa_power' | 'uploaded_csv';
  datasetName: string;
  visibleCount: number;
  fullSeries: ObservationPoint[];
  fullAnalysis: ReturnType<typeof runStatisticalAnalysis>;
  answered: boolean;
  submission?: ChallengeSubmissionResult;
}

const uploadedDatasets = new Map<string, AnalyzedDataset>();
const challenges = new Map<string, StoredChallenge>();
const challengeProgress: ChallengeProgress = {completed: 0, correct: 0};

// Curated real NASA POWER historical windows spanning both regions and variables
const CHALLENGE_WINDOWS: Array<{
  region: 'lagos' | 'edo';
  variable: 'temperature' | 'rainfall';
  startYear: number;
  endYear: number;
}> = [
  {region: 'lagos', variable: 'temperature', startYear: 2002, endYear: 2023},
  {region: 'edo', variable: 'temperature', startYear: 2000, endYear: 2022},
  {region: 'lagos', variable: 'rainfall', startYear: 2012, endYear: 2022},
  {region: 'edo', variable: 'rainfall', startYear: 2010, endYear: 2021},
  {region: 'lagos', variable: 'temperature', startYear: 2014, endYear: 2023},
  {region: 'edo', variable: 'temperature', startYear: 2013, endYear: 2023},
  {region: 'lagos', variable: 'rainfall', startYear: 2004, endYear: 2015},
  {region: 'edo', variable: 'rainfall', startYear: 2005, endYear: 2018},
];

let lastWindowIdx = -1;

export function saveUploadedDataset(dataset: AnalyzedDataset): void {
  uploadedDatasets.set(dataset.metadata.id, dataset);
}

export function listAllDatasets(): AnalyzedDataset[] {
  return [...uploadedDatasets.values()].sort((a, b) =>
    b.metadata.createdAt.localeCompare(a.metadata.createdAt),
  );
}

export function getDatasetById(id: string): AnalyzedDataset | undefined {
  return uploadedDatasets.get(id);
}

export function getChallengeProgress(): ChallengeProgress {
  return {...challengeProgress};
}

export async function createTrendChallenge(options?: {
  region?: 'lagos' | 'edo';
  variable?: 'temperature' | 'rainfall';
  datasetId?: string;
}): Promise<ChallengePromptPayload> {
  let sourceDataset: AnalyzedDataset;

  if (options?.datasetId) {
    const found = uploadedDatasets.get(options.datasetId);
    if (!found) {
      throw new Error(`Uploaded dataset "${options.datasetId}" was not found.`);
    }
    if (found.analysis.validObservations < 18) {
      throw new Error(
        `Dataset "${found.metadata.name}" only has ${found.analysis.validObservations} observations. At least 18 observations are required to split visible and hidden portions for a Trend Detective Challenge.`,
      );
    }
    sourceDataset = found;
  } else {
    const candidates = CHALLENGE_WINDOWS.filter((w) => {
      if (options?.region && w.region !== options.region) return false;
      if (options?.variable && w.variable !== options.variable) return false;
      return true;
    });
    const pool = candidates.length > 0 ? candidates : CHALLENGE_WINDOWS;
    let idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === lastWindowIdx) {
      idx = (idx + 1) % pool.length;
    }
    lastWindowIdx = idx;
    const chosen = pool[idx];
    sourceDataset = await fetchNasaPowerSeries(chosen);
  }

  const fullSeries = sourceDataset.analysis.series;
  const totalCount = fullSeries.length;
  // Show first ~55% of observations (at least 10), hiding the remaining ~45% until submission
  const visibleCount = Math.max(10, Math.min(totalCount - 6, Math.floor(totalCount * 0.55)));
  const visibleSeries = fullSeries.slice(0, visibleCount);

  // Re-run deterministic statistical analysis on the complete challenge dataset
  const fullAnalysis = runStatisticalAnalysis(fullSeries, {
    totalRows: sourceDataset.analysis.totalRows,
    missingOrInvalidRows: sourceDataset.analysis.missingOrInvalidRows,
    unit: sourceDataset.metadata.unit,
    variable: sourceDataset.metadata.variable,
    alpha: 0.05,
  });

  const challengeId = `chl_${crypto.randomUUID().slice(0, 8)}`;
  const regionKey: 'lagos' | 'edo' = sourceDataset.metadata.region === 'edo' ? 'edo' : 'lagos';
  const regionMeta = STUDY_REGIONS[regionKey];

  const stored: StoredChallenge = {
    challengeId,
    region: regionKey,
    regionLabel: sourceDataset.metadata.regionLabel || regionMeta.label,
    coordinates: sourceDataset.metadata.coordinates || regionMeta.coordinates,
    variable: sourceDataset.metadata.variable === 'rainfall' ? 'rainfall' : 'temperature',
    unit: sourceDataset.metadata.unit,
    source: sourceDataset.metadata.source,
    sourceType: sourceDataset.metadata.sourceType,
    datasetName: sourceDataset.metadata.name,
    visibleCount,
    fullSeries,
    fullAnalysis,
    answered: false,
  };

  challenges.set(challengeId, stored);

  return {
    challengeId,
    region: stored.region,
    regionLabel: stored.regionLabel,
    coordinates: stored.coordinates,
    variable: stored.variable,
    unit: stored.unit,
    source: stored.source,
    sourceType: stored.sourceType,
    datasetName: stored.datasetName,
    visiblePeriod: {
      start: visibleSeries[0].date,
      end: visibleSeries[visibleSeries.length - 1].date,
    },
    visibleCount,
    totalCount,
    hiddenCount: totalCount - visibleCount,
    visibleSeries,
    answered: false,
  };
}

export function submitTrendChallengeAnswer(
  challengeId: string,
  selectedAnswer: TrendClassification,
): ChallengeSubmissionResult {
  const stored = challenges.get(challengeId);
  if (!stored) {
    throw new Error('Challenge session not found. Please start a new Trend Detective Challenge.');
  }

  if (stored.answered && stored.submission) {
    return stored.submission;
  }

  const validChoices: TrendClassification[] = [
    'Increasing',
    'Decreasing',
    'Stable',
    'Seasonal or fluctuating',
  ];
  if (!validChoices.includes(selectedAnswer)) {
    throw new Error(`Invalid trend classification "${selectedAnswer}".`);
  }

  const correctAnswer = stored.fullAnalysis.trendDirection;
  const isCorrect = selectedAnswer === correctAnswer;

  stored.answered = true;
  challengeProgress.completed += 1;
  if (isCorrect) {
    challengeProgress.correct += 1;
  }

  const mk = stored.fullAnalysis.mannKendall;
  const slopeStr = `${stored.fullAnalysis.sensSlopePerYear >= 0 ? '+' : ''}${stored.fullAnalysis.sensSlopePerYear.toFixed(4)} ${stored.unit}/yr`;

  const answerFeedback = isCorrect
    ? `Correct — you identified "${correctAnswer}". Over the complete ${stored.fullSeries.length}-observation window (${stored.fullAnalysis.dateRange.start} to ${stored.fullAnalysis.dateRange.end}), the statistical classification matches your visual interpretation.`
    : `Not quite — you selected "${selectedAnswer}", whereas statistical analysis of the complete ${stored.fullSeries.length}-observation record classifies this series as "${correctAnswer}".`;

  const educationalExplanation = buildEducationalExplanation(stored, slopeStr, mk.pValue, mk.significant);

  const submission: ChallengeSubmissionResult = {
    challengeId,
    selectedAnswer,
    correctAnswer,
    isCorrect,
    hiddenStartIndex: stored.visibleCount,
    fullSeries: stored.fullSeries,
    fullPeriod: stored.fullAnalysis.dateRange,
    totalCount: stored.fullSeries.length,
    analysis: stored.fullAnalysis,
    educationalExplanation,
    answerFeedback,
  };

  stored.submission = submission;
  return submission;
}

function buildEducationalExplanation(
  stored: StoredChallenge,
  slopeStr: string,
  pValue: number,
  significant: boolean,
): string {
  const dir = stored.fullAnalysis.trendDirection;
  const seasonalShare = Math.round(stored.fullAnalysis.seasonality.strength * 100);

  if (dir === 'Increasing') {
    return `In ${stored.regionLabel}, the complete ${stored.variable} series exhibits a statistically significant upward trend (Sen's slope ${slopeStr}, Mann-Kendall p = ${pValue.toFixed(4)} < 0.05). Even with month-to-month variation, the long-term baseline shifts persistently upward once the full observation window is revealed.`;
  }
  if (dir === 'Decreasing') {
    return `Once the hidden observations in ${stored.regionLabel} are revealed, the complete ${stored.variable} record shows a statistically significant downward trend (Sen's slope ${slopeStr}, Mann-Kendall p = ${pValue.toFixed(4)} < 0.05) across ${stored.fullSeries.length} observations.`;
  }
  if (dir === 'Seasonal or fluctuating') {
    return `Although short visual windows can appear to rise or fall, the complete ${stored.regionLabel} ${stored.variable} series does not exhibit a statistically significant long-term monotonic trend (Mann-Kendall p = ${pValue.toFixed(4)} >= 0.05). Instead, ${seasonalShare}% of total variance is driven by recurring seasonal or monsoon cycles.`;
  }
  return `Across the full ${stored.regionLabel} ${stored.variable} period, the Mann-Kendall test found no statistically significant drift (p = ${pValue.toFixed(4)}${significant ? '' : ' >= 0.05'}) and seasonal oscillation remained modest, leaving the series relatively stable around ${stored.fullAnalysis.mean.toFixed(2)} ${stored.unit}.`;
}
