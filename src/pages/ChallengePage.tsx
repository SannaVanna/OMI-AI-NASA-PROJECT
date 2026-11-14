import React, {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {TimeSeriesChart} from '../components/charts/TimeSeriesChart';
import type {
  AnalyzedDataset,
  ChallengeProgress,
  ChallengePromptPayload,
  ChallengeSubmissionResult,
  TrendClassification,
} from '../types/omi';

interface ChallengePageProps {
  datasets: AnalyzedDataset[];
}

const CHOICES: Array<{value: TrendClassification; hint: string}> = [
  {value: 'Increasing', hint: 'Persistent statistically significant upward drift over time'},
  {value: 'Decreasing', hint: 'Persistent statistically significant downward drift over time'},
  {value: 'Stable', hint: 'No significant long-term trend and low seasonal amplitude'},
  {value: 'Seasonal or fluctuating', hint: 'Recurring seasonal cycles or swings without significant monotonic drift'},
];

export const ChallengePage: React.FC<ChallengePageProps> = ({datasets}) => {
  const [regionFilter, setRegionFilter] = useState<'any' | 'lagos' | 'edo'>('any');
  const [variableFilter, setVariableFilter] = useState<'any' | 'temperature' | 'rainfall'>('any');
  const [customDatasetId, setCustomDatasetId] = useState<string>('');

  const [challenge, setChallenge] = useState<ChallengePromptPayload | null>(null);
  const [submission, setSubmission] = useState<ChallengeSubmissionResult | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<TrendClassification | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress>({completed: 0, correct: 0});

  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleUploaded = datasets.filter(
    (d) => d.metadata.sourceType === 'uploaded_csv' && d.analysis.validObservations >= 18,
  );

  const loadNewChallenge = async (overrides?: {datasetId?: string}) => {
    setLoadingChallenge(true);
    setError(null);
    setSubmission(null);
    setSelectedChoice(null);

    try {
      const dsId = overrides?.datasetId !== undefined ? overrides.datasetId : customDatasetId;
      const body: Record<string, unknown> = {};
      if (dsId) {
        body.datasetId = dsId;
      } else {
        if (regionFilter !== 'any') body.region = regionFilter;
        if (variableFilter !== 'any') body.variable = variableFilter;
      }

      const res = await fetch('/api/challenge/new', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      setChallenge(data.challenge as ChallengePromptPayload);
      if (data.progress) setProgress(data.progress as ChallengeProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate a Trend Detective Challenge.');
    } finally {
      setLoadingChallenge(false);
    }
  };

  useEffect(() => {
    loadNewChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitAnswer = async () => {
    if (!challenge || !selectedChoice || submission) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/challenge/${encodeURIComponent(challenge.challengeId)}/submit`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({answer: selectedChoice}),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      setSubmission(data.submission as ChallengeSubmissionResult);
      if (data.progress) setProgress(data.progress as ChallengeProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit challenge answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const accuracy = progress.completed > 0 ? Math.round((progress.correct / progress.completed) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Score Tracker */}
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#168C83]">
            <Compass className="h-4 w-4" />
            <span>Interactive Environmental Literacy</span>
          </div>
          <h2 className="text-2xl font-bold text-[#102A43]">Trend Detective Challenge</h2>
          <p className="text-sm text-[#486581]">
            Inspect the initial window of a real historical climate record, classify its long-term pattern, and then reveal the hidden observations alongside the complete Mann-Kendall statistical test.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 shrink-0">
          <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] px-4 py-3 text-center">
            <div className="text-[11px] text-[#627D98]">Completed</div>
            <div className="text-xl font-bold font-mono-tabular text-[#102A43]">{progress.completed}</div>
          </div>
          <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] px-4 py-3 text-center">
            <div className="text-[11px] text-[#627D98]">Correct</div>
            <div className="text-xl font-bold font-mono-tabular text-[#168C83]">{progress.correct}</div>
          </div>
          <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] px-4 py-3 text-center">
            <div className="text-[11px] text-[#627D98]">Accuracy</div>
            <div className="text-xl font-bold font-mono-tabular text-[#102A43]">
              {progress.completed > 0 ? `${accuracy}%` : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Filter Controls */}
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-5 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="chl-region" className="block text-xs font-semibold text-[#486581] mb-1">
              Study Region
            </label>
            <select
              id="chl-region"
              value={regionFilter}
              onChange={(e) => {
                setCustomDatasetId('');
                setRegionFilter(e.target.value as 'any' | 'lagos' | 'edo');
              }}
              className="px-3 py-2 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
            >
              <option value="any">Random (Lagos or Edo)</option>
              <option value="lagos">Lagos State</option>
              <option value="edo">Edo State</option>
            </select>
          </div>

          <div>
            <label htmlFor="chl-var" className="block text-xs font-semibold text-[#486581] mb-1">
              Variable
            </label>
            <select
              id="chl-var"
              value={variableFilter}
              onChange={(e) => {
                setCustomDatasetId('');
                setVariableFilter(e.target.value as 'any' | 'temperature' | 'rainfall');
              }}
              className="px-3 py-2 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
            >
              <option value="any">Temperature or Rainfall</option>
              <option value="temperature">Temperature (°C)</option>
              <option value="rainfall">Rainfall (mm/day)</option>
            </select>
          </div>

          {eligibleUploaded.length > 0 && (
            <div>
              <label htmlFor="chl-uploaded" className="block text-xs font-semibold text-[#486581] mb-1">
                Or Challenge From Uploaded CSV
              </label>
              <select
                id="chl-uploaded"
                value={customDatasetId}
                onChange={(e) => setCustomDatasetId(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
              >
                <option value="">NASA POWER Historical Pool</option>
                {eligibleUploaded.map((d) => (
                  <option key={d.metadata.id} value={d.metadata.id}>
                    {d.metadata.name} ({d.analysis.validObservations} obs)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={loadingChallenge}
          onClick={() => loadNewChallenge()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DCE5EE] bg-[#F7FAFC] hover:bg-[#E8F3FA] text-sm font-semibold text-[#102A43] cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loadingChallenge ? 'animate-spin' : ''}`} />
          <span>{submission ? 'Try Another Challenge' : 'Load New Challenge'}</span>
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900" role="alert">
          <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loadingChallenge ? (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-14 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#168C83]" />
          <p className="text-sm text-[#486581]">Loading real historical observations for challenge...</p>
        </section>
      ) : challenge ? (
        <div className="space-y-6">
          {/* Challenge Chart Stage */}
          <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE5EE] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#627D98] mb-1">
                  <span className="font-semibold text-[#168C83]">{challenge.regionLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">{challenge.coordinates}</span>
                  <span aria-hidden="true">·</span>
                  <span>{challenge.source}</span>
                </div>
                <h3 className="text-lg font-bold text-[#102A43]">
                  {challenge.variable === 'temperature' ? 'Temperature' : 'Rainfall'} Time-Series ({challenge.unit})
                </h3>
              </div>

              <div className="text-xs font-mono-tabular text-[#486581]">
                {submission ? (
                  <span>
                    Complete window: {submission.fullPeriod.start} to {submission.fullPeriod.end} ({submission.totalCount}{' '}
                    observations)
                  </span>
                ) : (
                  <span>
                    Showing {challenge.visibleCount} of {challenge.totalCount} observations ({challenge.hiddenCount} hidden)
                  </span>
                )}
              </div>
            </div>

            {submission ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-[#486581]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 bg-[#102A43]" />
                    <span>Initial visible segment</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 bg-[#168C83]" />
                    <span>Previously hidden observations (revealed)</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-5 border-t-2 border-dashed border-[#D97706]" />
                    <span>Fitted linear trendline</span>
                  </span>
                </div>

                <TimeSeriesChart
                  mode="challenge"
                  series={submission.fullSeries}
                  unit={challenge.unit}
                  hiddenStartIndex={submission.hiddenStartIndex}
                  slopePerYear={submission.analysis.linearSlopePerYear}
                  interceptAtStart={submission.analysis.linearIntercept}
                  showTrendline
                />
              </div>
            ) : (
              <TimeSeriesChart
                mode="challenge"
                series={challenge.visibleSeries}
                unit={challenge.unit}
                totalExpectedPoints={challenge.totalCount}
                showTrendline={false}
              />
            )}
          </section>

          {/* Interaction Prompt OR Full Statistical Reveal */}
          {!submission ? (
            <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold text-[#102A43]">Can you identify the environmental trend?</h3>
                <p className="text-sm text-[#486581] mt-1">
                  Select one classification for the full record based on the initial pattern. You may submit one answer per challenge.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5" role="radiogroup" aria-label="Trend classification choices">
                {CHOICES.map((choice) => {
                  const active = selectedChoice === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setSelectedChoice(choice.value)}
                      className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                        active
                          ? 'border-[#168C83] bg-[#DDF3EF]/40 ring-1 ring-[#168C83]'
                          : 'border-[#DCE5EE] bg-[#F7FAFC] hover:border-[#BCCCDC]'
                      }`}
                    >
                      <div className="font-bold text-sm text-[#102A43]">{choice.value}</div>
                      <div className="text-xs text-[#486581] mt-1">{choice.hint}</div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!selectedChoice || submitting}
                  onClick={handleSubmitAnswer}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#168C83] hover:bg-[#10766F] disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  <span>{submitting ? 'Validating Against Full Dataset...' : 'Submit Answer & Reveal Full Series'}</span>
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-6">
              {/* Verdict Banner */}
              <div
                className={`rounded-xl border p-5 flex items-start gap-3.5 ${
                  submission.isCorrect
                    ? 'border-[#A8DFD6] bg-[#DDF3EF]/60 text-[#102A43]'
                    : 'border-amber-300 bg-amber-50 text-amber-950'
                }`}
              >
                {submission.isCorrect ? (
                  <CheckCircle2 className="h-6 w-6 text-[#10766F] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="font-bold text-base">
                    {submission.isCorrect ? 'Correct Classification' : 'Incorrect Classification'} · Computed Trend:{' '}
                    {submission.correctAnswer}
                  </div>
                  <p className="text-sm opacity-90">{submission.answerFeedback}</p>
                </div>
              </div>

              {/* Statistical Reveal Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
                  <div className="text-xs text-[#627D98]">Actual Trend Direction</div>
                  <div className="text-lg font-bold text-[#102A43] mt-1">{submission.correctAnswer}</div>
                  <div className="text-xs text-[#486581] mt-1">Your answer: {submission.selectedAnswer}</div>
                </div>

                <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
                  <div className="text-xs text-[#627D98]">Calculated Sen&apos;s Slope</div>
                  <div className="text-lg font-bold font-mono-tabular text-[#102A43] mt-1">
                    {submission.analysis.sensSlopePerYear >= 0 ? '+' : ''}
                    {submission.analysis.sensSlopePerYear.toFixed(4)} {challenge.unit}/yr
                  </div>
                  <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                    OLS: {submission.analysis.linearSlopePerYear.toFixed(4)} {challenge.unit}/yr
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
                  <div className="text-xs text-[#627D98]">Mann-Kendall Significance</div>
                  <div className="text-lg font-bold font-mono-tabular text-[#102A43] mt-1">
                    p = {submission.analysis.mannKendall.pValue.toFixed(4)}
                  </div>
                  <div className="text-xs text-[#486581] mt-1">
                    {submission.analysis.mannKendall.significant
                      ? 'Statistically significant (p < 0.05)'
                      : 'Not significant (p >= 0.05)'}
                  </div>
                </div>

                <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
                  <div className="text-xs text-[#627D98]">Dataset Coverage</div>
                  <div className="text-lg font-bold font-mono-tabular text-[#102A43] mt-1">
                    {submission.totalCount} obs
                  </div>
                  <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                    {submission.fullPeriod.start} → {submission.fullPeriod.end}
                  </div>
                </div>
              </div>

              {/* Educational Explanation */}
              <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-5 space-y-2">
                <h4 className="text-sm font-bold text-[#102A43]">Scientific Pattern Breakdown</h4>
                <p className="text-sm text-[#486581] leading-relaxed">{submission.educationalExplanation}</p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => loadNewChallenge()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Another Challenge</span>
                </button>
              </div>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
};
