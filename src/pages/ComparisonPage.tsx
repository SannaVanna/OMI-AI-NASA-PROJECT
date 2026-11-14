import React, {useState} from 'react';
import {AlertCircle, AlertTriangle, CheckCircle2, GitCompareArrows, Loader2, MessageSquareText} from 'lucide-react';
import {TimeSeriesChart} from '../components/charts/TimeSeriesChart';
import type {AppRoute} from '../components/layout/WorkspaceShell';
import type {AnalyzedDataset, ComparisonResult} from '../types/omi';

interface ComparisonPageProps {
  datasets: AnalyzedDataset[];
  activeComparison: ComparisonResult | null;
  onComparisonComputed: (comparison: ComparisonResult, addedDatasets?: AnalyzedDataset[]) => void;
  onNavigate: (route: AppRoute) => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  datasets,
  activeComparison,
  onComparisonComputed,
  onNavigate,
}) => {
  const [mode, setMode] = useState<'nasa' | 'datasets'>('nasa');
  const [variable, setVariable] = useState<'temperature' | 'rainfall'>('temperature');
  const [startYear, setStartYear] = useState(2005);
  const [endYear, setEndYear] = useState(2023);

  const lagosOptions = datasets.filter((d) => d.metadata.region === 'lagos' || d.metadata.region === 'custom');
  const edoOptions = datasets.filter((d) => d.metadata.region === 'edo' || d.metadata.region === 'custom');

  const [lagosDatasetId, setLagosDatasetId] = useState<string>(lagosOptions[0]?.metadata.id || '');
  const [edoDatasetId, setEdoDatasetId] = useState<string>(edoOptions[0]?.metadata.id || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body =
        mode === 'nasa'
          ? {mode: 'nasa', variable, startYear, endYear}
          : {
              mode: 'datasets',
              lagosDatasetId: lagosDatasetId || lagosOptions[0]?.metadata.id,
              edoDatasetId: edoDatasetId || edoOptions[0]?.metadata.id,
            };

      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      const added: AnalyzedDataset[] = [];
      if (data.lagosDataset) added.push(data.lagosDataset);
      if (data.edoDataset) added.push(data.edoDataset);

      onComparisonComputed(data.comparison as ComparisonResult, added);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run regional comparison.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#102A43]">Lagos State vs. Edo State Comparison</h2>
            <p className="text-sm text-[#486581]">
              Compare coastal urban Lagos with inland forest-transition Edo using compatible variables, units, granularity, and overlapping periods.
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-[#F0F4F8] p-1 border border-[#DCE5EE] shrink-0">
            <button
              type="button"
              onClick={() => setMode('nasa')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'nasa' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#486581] hover:text-[#102A43]'
              }`}
            >
              NASA POWER Aligned
            </button>
            <button
              type="button"
              onClick={() => setMode('datasets')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'datasets' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#486581] hover:text-[#102A43]'
              }`}
            >
              Session / Uploaded Datasets ({datasets.length})
            </button>
          </div>
        </div>

        <form onSubmit={runComparison} className="space-y-4">
          {mode === 'nasa' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="comp-var" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Environmental Variable
                </label>
                <select
                  id="comp-var"
                  value={variable}
                  onChange={(e) => setVariable(e.target.value as 'temperature' | 'rainfall')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  <option value="temperature">Temperature (T2M · °C)</option>
                  <option value="rainfall">Rainfall (PRECTOTCORR · mm/day)</option>
                </select>
              </div>
              <div>
                <label htmlFor="comp-start" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Start Year
                </label>
                <input
                  id="comp-start"
                  type="number"
                  min={1985}
                  max={2023}
                  value={startYear}
                  onChange={(e) => setStartYear(Math.min(endYear, Math.max(1985, Number(e.target.value) || 2005)))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm font-mono-tabular text-[#102A43]"
                />
              </div>
              <div>
                <label htmlFor="comp-end" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  End Year
                </label>
                <input
                  id="comp-end"
                  type="number"
                  min={1985}
                  max={2024}
                  value={endYear}
                  onChange={(e) => setEndYear(Math.max(startYear, Math.min(2024, Number(e.target.value) || 2023)))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm font-mono-tabular text-[#102A43]"
                />
              </div>
            </div>
          ) : datasets.length < 2 ? (
            <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-5 text-sm text-[#486581]">
              Upload or load at least two datasets (for example, one Lagos dataset and one Edo dataset) to compare custom files, or switch to <strong>NASA POWER Aligned</strong> above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="comp-lagos-ds" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Lagos (or First) Dataset
                </label>
                <select
                  id="comp-lagos-ds"
                  value={lagosDatasetId || lagosOptions[0]?.metadata.id || ''}
                  onChange={(e) => setLagosDatasetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  {datasets.map((d) => (
                    <option key={d.metadata.id} value={d.metadata.id}>
                      {d.metadata.name} · {d.metadata.regionLabel} · {d.metadata.variable} ({d.metadata.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="comp-edo-ds" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Edo (or Second) Dataset
                </label>
                <select
                  id="comp-edo-ds"
                  value={edoDatasetId || edoOptions[0]?.metadata.id || ''}
                  onChange={(e) => setEdoDatasetId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  {datasets.map((d) => (
                    <option key={d.metadata.id} value={d.metadata.id}>
                      {d.metadata.name} · {d.metadata.regionLabel} · {d.metadata.variable} ({d.metadata.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900" role="alert">
              <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || (mode === 'datasets' && datasets.length < 2)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#168C83] hover:bg-[#10766F] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompareArrows className="h-4 w-4" />}
              <span>{loading ? 'Aligning & Comparing...' : 'Run Regional Comparison'}</span>
            </button>
          </div>
        </form>
      </section>

      {!activeComparison ? (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-10 text-center space-y-3">
          <p className="text-sm text-[#486581]">
            No regional comparison has been computed yet. Choose Temperature or Rainfall above and click <strong>Run Regional Comparison</strong>.
          </p>
        </section>
      ) : !activeComparison.compatible ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-3" role="status">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-base font-bold text-amber-950">Datasets Cannot Support a Valid Comparison</h3>
              <ul className="list-disc pl-5 text-sm text-amber-900 space-y-1">
                {activeComparison.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Compatibility Confirmed Banner */}
          <section className="rounded-xl border border-[#A8DFD6] bg-[#DDF3EF]/50 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 text-sm text-[#102A43]">
              <CheckCircle2 className="h-5 w-5 text-[#10766F] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  Compatible Comparison · {activeComparison.aggregationMethod}
                </div>
                <p className="text-xs text-[#486581] mt-0.5">
                  Overlap: {activeComparison.overlapPeriod?.start} to {activeComparison.overlapPeriod?.end} (
                  {activeComparison.overlapPeriod?.count} matched periods)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assistant')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#102A43] hover:bg-[#173B56] text-white text-xs font-semibold cursor-pointer"
            >
              <MessageSquareText className="h-3.5 w-3.5" />
              <span>Ask Gemini About Comparison</span>
            </button>
          </section>

          {/* Dual Series Chart */}
          <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#102A43]">
              Overlapping {activeComparison.variable} Series ({activeComparison.unit})
            </h3>
            <TimeSeriesChart
              mode="comparison"
              pairedSeries={activeComparison.pairedSeries}
              unit={activeComparison.unit}
            />
            <p className="text-sm text-[#486581] bg-[#F7FAFC] border border-[#DCE5EE] rounded-xl p-4">
              {activeComparison.interpretationSummary}
            </p>
          </section>

          {/* Side-by-Side Comparison Metrics */}
          {activeComparison.lagosSummary && activeComparison.edoSummary && (
            <section className="rounded-2xl border border-[#DCE5EE] bg-white overflow-hidden">
              <div className="px-6 py-4 border-b border-[#DCE5EE]">
                <h3 className="text-base font-bold text-[#102A43]">Side-by-Side Statistical Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F0F4F8] text-[#102A43]">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Metric</th>
                      <th className="px-6 py-3 text-right font-semibold">Lagos State</th>
                      <th className="px-6 py-3 text-right font-semibold">Edo State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5EE]">
                    <tr>
                      <td className="px-6 py-3 text-[#486581]">Dataset Source</td>
                      <td className="px-6 py-3 text-right text-xs text-[#102A43]">{activeComparison.lagosSummary.source}</td>
                      <td className="px-6 py-3 text-right text-xs text-[#102A43]">{activeComparison.edoSummary.source}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-[#486581]">Overlap Mean</td>
                      <td className="px-6 py-3 text-right font-mono-tabular font-semibold">
                        {activeComparison.lagosSummary.mean.toFixed(2)} {activeComparison.unit}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular font-semibold">
                        {activeComparison.edoSummary.mean.toFixed(2)} {activeComparison.unit}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-[#486581]">Overlap Min / Max</td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.lagosSummary.min.toFixed(2)} / {activeComparison.lagosSummary.max.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.edoSummary.min.toFixed(2)} / {activeComparison.edoSummary.max.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-[#486581]">Sen&apos;s Slope ({activeComparison.unit}/yr)</td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.lagosSummary.sensSlopePerYear >= 0 ? '+' : ''}
                        {activeComparison.lagosSummary.sensSlopePerYear.toFixed(4)}
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.edoSummary.sensSlopePerYear >= 0 ? '+' : ''}
                        {activeComparison.edoSummary.sensSlopePerYear.toFixed(4)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3 text-[#486581]">Trend Classification &amp; MK p-value</td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.lagosSummary.trendDirection} (p = {activeComparison.lagosSummary.pValue.toFixed(4)})
                      </td>
                      <td className="px-6 py-3 text-right font-mono-tabular">
                        {activeComparison.edoSummary.trendDirection} (p = {activeComparison.edoSummary.pValue.toFixed(4)})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
