export type RegionId = 'lagos' | 'edo' | 'custom';

export type VariableId = 'temperature' | 'rainfall' | 'humidity' | 'solar_radiation' | 'other';

export type TrendClassification =
  | 'Increasing'
  | 'Decreasing'
  | 'Stable'
  | 'Seasonal or fluctuating';

export interface ObservationPoint {
  date: string;
  timestamp: number;
  value: number;
  year: number;
  month: number;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  source: string;
  sourceType: 'nasa_power' | 'uploaded_csv';
  region: RegionId;
  regionLabel: string;
  coordinates?: string;
  variable: VariableId;
  unit: string;
  description?: string;
  granularity: 'daily' | 'monthly' | 'annual' | 'irregular';
  createdAt: string;
}

export interface MannKendallResult {
  s: number;
  variance: number;
  z: number;
  tau: number;
  pValue: number;
  significant: boolean;
  alpha: number;
}

export interface MonthlyClimatology {
  month: number;
  label: string;
  mean: number;
  count: number;
}

export interface SeasonalityResult {
  detected: boolean;
  strength: number;
  monthlyAverages: MonthlyClimatology[];
}

export interface StatisticalAnalysisResult {
  validObservations: number;
  totalRows: number;
  missingOrInvalidRows: number;
  completenessPercent: number;
  duplicateDatesCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  mean: number;
  min: number;
  max: number;
  median: number;
  stdDev: number;
  linearSlopePerYear: number;
  linearIntercept: number;
  sensSlopePerYear: number;
  mannKendall: MannKendallResult;
  seasonality: SeasonalityResult;
  trendDirection: TrendClassification;
  statisticalConfidenceNote: string;
  explanation: string;
  series: ObservationPoint[];
}

export interface AnalyzedDataset {
  metadata: DatasetMetadata;
  analysis: StatisticalAnalysisResult;
}

export interface ComparisonPairedPoint {
  period: string;
  lagosValue: number;
  edoValue: number;
  difference: number;
}

export interface ComparisonResult {
  compatible: boolean;
  reasons: string[];
  variable: VariableId;
  unit: string;
  aggregationMethod: string;
  overlapPeriod: {
    start: string;
    end: string;
    count: number;
  } | null;
  lagosSummary: {
    datasetId: string;
    name: string;
    source: string;
    mean: number;
    min: number;
    max: number;
    sensSlopePerYear: number;
    trendDirection: TrendClassification;
    pValue: number;
    significant: boolean;
    observations: number;
  } | null;
  edoSummary: {
    datasetId: string;
    name: string;
    source: string;
    mean: number;
    min: number;
    max: number;
    sensSlopePerYear: number;
    trendDirection: TrendClassification;
    pValue: number;
    significant: boolean;
    observations: number;
  } | null;
  meanDifference: number | null;
  pearsonCorrelation: number | null;
  pairedSeries: ComparisonPairedPoint[];
  interpretationSummary: string;
}

export interface ChallengePromptPayload {
  challengeId: string;
  region: 'lagos' | 'edo';
  regionLabel: string;
  coordinates: string;
  variable: 'temperature' | 'rainfall';
  unit: string;
  source: string;
  sourceType: 'nasa_power' | 'uploaded_csv';
  datasetName: string;
  visiblePeriod: { start: string; end: string };
  visibleCount: number;
  totalCount: number;
  hiddenCount: number;
  visibleSeries: ObservationPoint[];
  answered: boolean;
  submission?: ChallengeSubmissionResult;
}

export interface ChallengeSubmissionResult {
  challengeId: string;
  selectedAnswer: TrendClassification;
  correctAnswer: TrendClassification;
  isCorrect: boolean;
  hiddenStartIndex: number;
  fullSeries: ObservationPoint[];
  fullPeriod: { start: string; end: string };
  totalCount: number;
  analysis: StatisticalAnalysisResult;
  educationalExplanation: string;
  answerFeedback: string;
}

export interface ChallengeProgress {
  completed: number;
  correct: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  contextDatasetName?: string;
}
