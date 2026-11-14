import React, {useState} from 'react';
import {
  AlertCircle,
  Calendar,
  CloudRain,
  Compass,
  GitCompareArrows,
  Loader2,
  MapPin,
  MessageSquareText,
  Thermometer,
  Upload,
} from 'lucide-react';
import {TimeSeriesChart} from '../components/charts/TimeSeriesChart';
import type {AppRoute} from '../components/layout/WorkspaceShell';
import type {AnalyzedDataset} from '../types/omi';

interface DashboardPageProps {
  activeDataset: AnalyzedDataset | null;
  datasets: AnalyzedDataset[];
  initialRegion?: 'lagos' | 'edo';
  onDatasetLoaded: (dataset: AnalyzedDataset) => void;
  onSelectDataset: (dataset: AnalyzedDataset) => void;
  onNavigate: (route: AppRoute) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  activeDataset,
  datasets,
  initialRegion,
  onDatasetLoaded,
  onSelectDataset,
  onNavigate,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<'lagos' | 'edo'>(initialRegion || 'lagos');
  const [variable, setVariable] = useState<'temperature' | 'rainfall'>('temperature');
  const [startYear, setStartYear] = useState<number>(2005);
  const [endYear, setEndYear] = useState<number>(2023);
  const [showTrendline, setShowTrendline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegionDataset = async (regionToLoad: 'lagos' | 'edo', varToLoad = variable) => {
    setSelectedRegion(regionToLoad);
    setLoading(true);
    setError(null);

    try {
      const url = `/api/regions/${regionToLoad}?variable=${varToLoad}&startYear=${startYear}&endYear=${endYear}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }
      onDatasetLoaded(data as AnalyzedDataset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve regional dataset from backend.');
    } finally {
      setLoading(false);
    }
  };

  const a = activeDataset?.analysis;
  const m = activeDataset?.metadata;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-semibold text-[#168C83]">Environmental Intelligence Workspace</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#102A43]">Good day, Researcher.</h2>
          <p className="text-sm sm:text-base text-[#486581]">
            Investigate real temperature and rainfall observations across Lagos State and Edo State via the NASA POWER API, or upload your own environmental CSV dataset for statistical trend detection.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Upload CSV Dataset</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('challenge')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-[#102A43] text-sm font-semibold transition-colors cursor-pointer"
          >
            <Compass className="h-4 w-4 text-[#168C83]" />
            <span>Trend Detective</span>
          </button>
        </div>
      </section>

      {/* Query Controls & Study Regions */}
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DCE5EE] pb-5">
          <div>
            <h3 className="text-lg font-bold text-[#102A43]">Study Regions &amp; Historical Range</h3>
            <p className="text-sm text-[#486581]">
              Select a variable and historical year window, then click Analyse Region to fetch verified NASA POWER monthly records.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="dash-var" className="block text-xs font-semibold text-[#486581] mb-1">
                Variable
              </label>
              <div className="inline-flex rounded-lg bg-[#F0F4F8] p-1 border border-[#DCE5EE]">
                <button
                  type="button"
                  onClick={() => setVariable('temperature')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    variable === 'temperature' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#486581] hover:text-[#102A43]'
                  }`}
                >
                  <Thermometer className="h-3.5 w-3.5 text-[#168C83]" />
                  <span>Temperature</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariable('rainfall')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    variable === 'rainfall' ? 'bg-white text-[#102A43] shadow-xs' : 'text-[#486581] hover:text-[#102A43]'
                  }`}
                >
                  <CloudRain className="h-3.5 w-3.5 text-[#168C83]" />
                  <span>Rainfall</span>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="dash-start-year" className="block text-xs font-semibold text-[#486581] mb-1">
                Start Year
              </label>
              <input
                id="dash-start-year"
                type="number"
                min={1985}
                max={2023}
                value={startYear}
                onChange={(e) => setStartYear(Math.min(endYear, Math.max(1985, Number(e.target.value) || 2005)))}
                className="w-24 px-3 py-1.5 rounded-lg border border-[#DCE5EE] bg-white text-sm font-mono-tabular text-[#102A43]"
              />
            </div>

            <div>
              <label htmlFor="dash-end-year" className="block text-xs font-semibold text-[#486581] mb-1">
                End Year
              </label>
              <input
                id="dash-end-year"
                type="number"
                min={1985}
                max={2024}
                value={endYear}
                onChange={(e) => setEndYear(Math.max(startYear, Math.min(2024, Number(e.target.value) || 2023)))}
                className="w-24 px-3 py-1.5 rounded-lg border border-[#DCE5EE] bg-white text-sm font-mono-tabular text-[#102A43]"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              id: 'lagos' as const,
              name: 'Lagos State',
              zone: 'South-West Nigeria · Coastal urban environment',
              coords: '6.5244° N, 3.3792° E',
              desc: 'Coastal metropolitan grid point reflecting Atlantic moisture, urban thermal retention, and bimodal rainfall.',
            },
            {
              id: 'edo' as const,
              name: 'Edo State',
              zone: 'South-South Nigeria · Inland and forest transition zone',
              coords: '6.5438° N, 5.8987° E',
              desc: 'Inland forest-transition grid point tracking monsoon rainfall variability and surface air warming.',
            },
          ].map((reg) => {
            const isCurrent = m?.region === reg.id && activeDataset !== null;
            return (
              <article
                key={reg.id}
                className={`rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isCurrent ? 'border-[#168C83] bg-[#DDF3EF]/25' : 'border-[#DCE5EE] bg-[#F7FAFC]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#627D98] mb-1">{reg.zone}</div>
                    <h4 className="text-lg font-bold text-[#102A43]">{reg.name}</h4>
                    <p className="text-sm text-[#486581] mt-1">{reg.desc}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-mono-tabular text-[#486581] shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-[#168C83]" />
                    <span>{reg.coords}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#DCE5EE]">
                  <span className="text-xs text-[#627D98]">
                    {loading && selectedRegion === reg.id
                      ? 'Fetching NASA POWER observations...'
                      : isCurrent
                        ? 'Currently active in overview'
                        : 'Ready to fetch live NASA POWER series'}
                  </span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => fetchRegionDataset(reg.id)}
                    className="px-4 py-2 rounded-lg bg-[#102A43] hover:bg-[#173B56] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {loading && selectedRegion === reg.id ? 'Loading...' : `Analyse ${reg.name}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Session Dataset Switcher if user has loaded/uploaded multiple datasets */}
        {datasets.length > 0 && (
          <div className="pt-3 border-t border-[#DCE5EE] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-[#486581]">
              Loaded session datasets ({datasets.length}):
            </span>
            <select
              aria-label="Switch active dataset"
              value={activeDataset?.metadata.id || ''}
              onChange={(e) => {
                const found = datasets.find((d) => d.metadata.id === e.target.value);
                if (found) onSelectDataset(found);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#DCE5EE] bg-white text-xs font-medium text-[#102A43] max-w-full"
            >
              {datasets.map((d) => (
                <option key={d.metadata.id} value={d.metadata.id}>
                  {d.metadata.name} ({d.metadata.regionLabel} · {d.metadata.unit})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900" role="alert">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Unable to load environmental dataset</div>
              <p className="text-red-800 mt-0.5">{error}</p>
            </div>
          </div>
        )}
      </section>

      {/* Environmental Overview (Real Data or Honest Empty State) */}
      {loading && !activeDataset ? (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#168C83]" />
          <p className="text-sm font-medium text-[#486581]">
            Retrieving historical observations and running Mann-Kendall &amp; Sen&apos;s slope analysis...
          </p>
        </section>
      ) : !activeDataset || !a || !m ? (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-10 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-[#E8F3FA] text-[#173B56] flex items-center justify-center">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-[#102A43]">No environmental dataset has been analysed yet</h3>
          <p className="text-sm text-[#486581] max-w-lg mx-auto">
            Select Lagos State or Edo State above to retrieve historical NASA POWER temperature or rainfall records, or upload your own CSV time-series dataset.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => fetchRegionDataset('lagos', 'temperature')}
              className="px-4 py-2 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold cursor-pointer"
            >
              Load Lagos Temperature (NASA POWER)
            </button>
            <button
              type="button"
              onClick={() => onNavigate('upload')}
              className="px-4 py-2 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-[#102A43] text-sm font-semibold cursor-pointer"
            >
              Upload Custom CSV
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* KPI Summary Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#DCE5EE] bg-white p-4">
              <div className="text-xs text-[#627D98] mb-1">Valid Observations</div>
              <div className="text-2xl font-bold font-mono-tabular text-[#102A43]">{a.validObservations}</div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                {a.dateRange.start} → {a.dateRange.end}
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-white p-4">
              <div className="text-xs text-[#627D98] mb-1">Mean (Min / Max)</div>
              <div className="text-2xl font-bold font-mono-tabular text-[#102A43]">
                {a.mean.toFixed(2)} <span className="text-sm font-normal text-[#627D98]">{m.unit}</span>
              </div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                {a.min.toFixed(2)} – {a.max.toFixed(2)} {m.unit}
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-white p-4">
              <div className="text-xs text-[#627D98] mb-1">Sen&apos;s Slope Rate</div>
              <div className="text-2xl font-bold font-mono-tabular text-[#102A43]">
                {a.sensSlopePerYear >= 0 ? '+' : ''}
                {a.sensSlopePerYear.toFixed(4)}
              </div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">{m.unit} / year</div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-white p-4">
              <div className="text-xs text-[#627D98] mb-1">Classification &amp; Significance</div>
              <div className="text-lg font-bold text-[#102A43]">{a.trendDirection}</div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                MK p = {a.mannKendall.pValue.toFixed(4)} ({a.mannKendall.significant ? 'Significant' : 'Not significant'})
              </div>
            </div>
          </section>

          {/* Main Trend Chart */}
          <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#102A43]">{m.name}</h3>
                <p className="text-xs text-[#627D98]">
                  Source: {m.source} · Region: {m.regionLabel}
                  {m.coordinates ? ` (${m.coordinates})` : ''} · Granularity: {m.granularity}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#486581] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrendline}
                  onChange={(e) => setShowTrendline(e.target.checked)}
                  className="accent-[#168C83] h-4 w-4"
                />
                <span>Show fitted linear trendline</span>
              </label>
            </div>

            <TimeSeriesChart
              series={a.series}
              unit={m.unit}
              slopePerYear={a.linearSlopePerYear}
              interceptAtStart={a.linearIntercept}
              showTrendline={showTrendline}
            />

            <p className="text-sm text-[#486581] bg-[#F7FAFC] border border-[#DCE5EE] rounded-xl p-4">
              {a.explanation}
            </p>
          </section>

          {/* Monthly Climatology & Quick Cross-Page Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#102A43]">Seasonal Cycle Breakdown</h3>
                <p className="text-xs text-[#627D98]">
                  Calendar month averages across the selected period (seasonal variance share:{' '}
                  <span className="font-mono-tabular font-semibold">{(a.seasonality.strength * 100).toFixed(1)}%</span>)
                </p>
              </div>

              {a.seasonality.monthlyAverages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {a.seasonality.monthlyAverages.map((mc) => (
                    <div key={mc.month} className="rounded-lg border border-[#DCE5EE] bg-[#F7FAFC] p-2.5 text-center">
                      <div className="text-xs font-semibold text-[#486581]">{mc.label}</div>
                      <div className="text-sm font-bold font-mono-tabular text-[#102A43] mt-0.5">
                        {mc.mean.toFixed(1)}
                      </div>
                      <div className="text-[11px] text-[#627D98]">{m.unit}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#486581]">
                  Insufficient monthly coverage to compute seasonal averages for this dataset.
                </p>
              )}
            </section>

            <section className="lg:col-span-5 rounded-2xl border border-[#DCE5EE] bg-white p-6 flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#102A43] mb-1">Next Research Actions</h3>
                <p className="text-xs text-[#627D98]">
                  Carry this computed dataset into comparative analysis or Gemini interpretation.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('comparison')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] hover:border-[#168C83] text-sm font-semibold text-[#102A43] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <GitCompareArrows className="h-4 w-4 text-[#168C83]" />
                    <span>Compare Lagos vs. Edo</span>
                  </span>
                  <span className="text-xs text-[#627D98]">Open →</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('assistant')}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] hover:border-[#168C83] text-sm font-semibold text-[#102A43] cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <MessageSquareText className="h-4 w-4 text-[#168C83]" />
                    <span>Ask Gemini About This Dataset</span>
                  </span>
                  <span className="text-xs text-[#627D98]">Open →</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
