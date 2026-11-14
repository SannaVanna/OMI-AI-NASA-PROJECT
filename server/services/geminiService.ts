import {GoogleGenAI, ThinkingLevel} from '@google/genai';
import type {AnalyzedDataset, ChatMessage, ComparisonResult} from '../../src/types/omi.ts';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment. Configure it in Settings > Secrets to enable the AI Assistant.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildCompactStatisticalContext(
  dataset: AnalyzedDataset | null,
  comparison?: ComparisonResult | null,
): string {
  const payload: Record<string, unknown> = {};

  if (dataset) {
    payload.activeDataset = {
      name: dataset.metadata.name,
      source: dataset.metadata.source,
      sourceType: dataset.metadata.sourceType,
      region: dataset.metadata.regionLabel,
      coordinates: dataset.metadata.coordinates || 'Not specified',
      variable: dataset.metadata.variable,
      unit: dataset.metadata.unit,
      granularity: dataset.metadata.granularity,
      description: dataset.metadata.description || null,
      statistics: {
        validObservations: dataset.analysis.validObservations,
        totalRows: dataset.analysis.totalRows,
        missingOrInvalidRows: dataset.analysis.missingOrInvalidRows,
        completenessPercent: dataset.analysis.completenessPercent,
        dateRange: dataset.analysis.dateRange,
        mean: Number(dataset.analysis.mean.toFixed(4)),
        min: Number(dataset.analysis.min.toFixed(4)),
        max: Number(dataset.analysis.max.toFixed(4)),
        median: Number(dataset.analysis.median.toFixed(4)),
        stdDev: Number(dataset.analysis.stdDev.toFixed(4)),
        sensSlopePerYear: Number(dataset.analysis.sensSlopePerYear.toFixed(5)),
        linearSlopePerYear: Number(dataset.analysis.linearSlopePerYear.toFixed(5)),
        trendDirection: dataset.analysis.trendDirection,
        mannKendall: {
          s: dataset.analysis.mannKendall.s,
          z: Number(dataset.analysis.mannKendall.z.toFixed(4)),
          tau: Number(dataset.analysis.mannKendall.tau.toFixed(4)),
          pValue: Number(dataset.analysis.mannKendall.pValue.toFixed(5)),
          significant: dataset.analysis.mannKendall.significant,
          alpha: dataset.analysis.mannKendall.alpha,
        },
        seasonality: {
          detected: dataset.analysis.seasonality.detected,
          seasonalVarianceShare: Number(dataset.analysis.seasonality.strength.toFixed(3)),
          monthlyAverages: dataset.analysis.seasonality.monthlyAverages.map((m) => ({
            month: m.label,
            mean: Number(m.mean.toFixed(2)),
          })),
        },
      },
    };
  }

  if (comparison) {
    payload.regionalComparison = {
      compatible: comparison.compatible,
      reasons: comparison.reasons,
      variable: comparison.variable,
      unit: comparison.unit,
      aggregationMethod: comparison.aggregationMethod,
      overlapPeriod: comparison.overlapPeriod,
      lagosSummary: comparison.lagosSummary,
      edoSummary: comparison.edoSummary,
      meanDifference: comparison.meanDifference !== null ? Number(comparison.meanDifference.toFixed(4)) : null,
      pearsonCorrelation:
        comparison.pearsonCorrelation !== null ? Number(comparison.pearsonCorrelation.toFixed(4)) : null,
    };
  }

  return JSON.stringify(payload, null, 2);
}

export async function askGeminiAssistant(params: {
  question: string;
  history: Array<Pick<ChatMessage, 'role' | 'content'>>;
  activeDataset: AnalyzedDataset | null;
  comparison?: ComparisonResult | null;
}): Promise<string> {
  const {question, history, activeDataset, comparison} = params;

  if (!activeDataset && !comparison) {
    throw new Error(
      'No analysed dataset or comparison is available yet. Please load a regional dataset on the Dashboard or upload a CSV file first.',
    );
  }

  const ai = getGeminiClient();
  const contextJson = buildCompactStatisticalContext(activeDataset, comparison);

  const systemInstruction = [
    'You are the Omi AI Environmental Research Assistant for a NASA Space Apps Challenge platform studying Lagos State (South-West Nigeria, coastal urban) and Edo State (South-South Nigeria, inland forest transition).',
    'STRICT SCIENTIFIC INTEGRITY RULES:',
    '1. Base every numeric claim strictly on the COMPUTED STATISTICAL CONTEXT JSON provided below.',
    '2. NEVER invent measurements, NASA observations, dates, slopes, p-values, or sample sizes that are not in the JSON.',
    '3. If a metric is missing or the dataset is short/non-significant, state that transparently.',
    '4. Explain findings in clear, accessible language, distinguish statistical significance (Mann-Kendall p < 0.05) from seasonal fluctuations, and discuss plausible environmental implications for coastal Lagos vs. forest-transition Edo.',
    '5. Keep answers structured, concise (around 150-280 words unless asked for deeper detail), and grounded in the exact units and source attribution.',
    '',
    'COMPUTED STATISTICAL CONTEXT (FROM SERVER JS PROCESSING ENGINE):',
    contextJson,
  ].join('\n');

  const recentHistory = history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'Researcher' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  const prompt = recentHistory
    ? `Recent conversation:\n${recentHistory}\n\nCurrent question from researcher:\n${question}`
    : question;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error('Gemini returned an empty response.');
      }
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('429');
      if (!isTransient || attempt === 1) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  const rawMsg = lastError instanceof Error ? lastError.message : 'Gemini request failed.';
  try {
    const parsed = JSON.parse(rawMsg) as {error?: {message?: string}};
    if (parsed?.error?.message) {
      throw new Error(parsed.error.message);
    }
  } catch (parseErr) {
    if (parseErr instanceof Error && parseErr.message !== rawMsg && !rawMsg.trim().startsWith('{')) {
      throw parseErr;
    }
    if (parseErr instanceof Error && rawMsg.trim().startsWith('{') && !parseErr.message.includes('JSON')) {
      throw parseErr;
    }
  }
  throw new Error(rawMsg);
}
