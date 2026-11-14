import React, {useRef, useState} from 'react';
import {AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, MessageSquareText, Trash2, Upload} from 'lucide-react';
import {TimeSeriesChart} from '../components/charts/TimeSeriesChart';
import type {AppRoute} from '../components/layout/WorkspaceShell';
import type {AnalyzedDataset, RegionId, VariableId} from '../types/omi';

interface UploadPageProps {
  onDatasetAnalyzed: (dataset: AnalyzedDataset) => void;
  onNavigate: (route: AppRoute) => void;
}

interface UploadResponse extends AnalyzedDataset {
  warnings?: string[];
}

function parsePreviewCsv(text: string, maxRows = 6): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
      i++;
      if (rows.length >= maxRows) break;
    } else if (ch === '\n' || ch === '\r') {
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
      if (rows.length >= maxRows) break;
    } else {
      field += ch;
    }
  }
  if (rows.length < maxRows && (field.length > 0 || row.length > 0)) {
    row.push(field.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

export const UploadPage: React.FC<UploadPageProps> = ({onDatasetAnalyzed, onNavigate}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  const [dateColumn, setDateColumn] = useState('');
  const [valueColumn, setValueColumn] = useState('');
  const [variable, setVariable] = useState<VariableId>('temperature');
  const [unit, setUnit] = useState('°C');
  const [region, setRegion] = useState<RegionId>('lagos');
  const [customRegion, setCustomRegion] = useState('');
  const [sourceLabel, setSourceLabel] = useState('');
  const [description, setDescription] = useState('');

  const [fileError, setFileError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleFilePick = (selected: File | null) => {
    setFileError(null);
    setAnalysisError(null);
    setResult(null);

    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv') && selected.type !== 'text/csv') {
      setFileError(`"${selected.name}" is not a CSV file. Please upload a .csv file.`);
      return;
    }
    if (selected.size === 0) {
      setFileError('The selected CSV file is empty (0 bytes).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || '');
      const parsed = parsePreviewCsv(content, 6);
      if (parsed.length < 2) {
        setFileError('Could not detect both column headers and observation rows in this CSV.');
        return;
      }
      const cols = parsed[0].filter(Boolean);
      if (cols.length < 2) {
        setFileError('CSV must have at least 2 columns (date/time and measurement).');
        return;
      }

      const samples = parsed.slice(1);
      setFile(selected);
      setHeaders(cols);
      setPreviewRows(samples);

      // Smart column suggestion
      const guessedDate =
        cols.find((h) => /(date|time|timestamp|year|month|period)/i.test(h)) || cols[0];
      const guessedVal =
        cols.find(
          (h, idx) =>
            h !== guessedDate &&
            samples.some((r) => r[idx] !== undefined && r[idx] !== '' && !Number.isNaN(Number(r[idx]))),
        ) ||
        cols.find((h) => h !== guessedDate) ||
        cols[1];

      setDateColumn(guessedDate);
      setValueColumn(guessedVal);

      if (/rain|precip|prcp/i.test(guessedVal)) {
        setVariable('rainfall');
        setUnit('mm');
      } else if (/temp|t2m|tas/i.test(guessedVal)) {
        setVariable('temperature');
        setUnit('°C');
      }
    };
    reader.onerror = () => setFileError('Failed to read the selected CSV file.');
    reader.readAsText(selected.slice(0, 262144));
  };

  const resetFile = () => {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setFileError(null);
    setAnalysisError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyzeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnalysisError(null);

    if (!file) {
      setAnalysisError('Please select a CSV file first.');
      return;
    }
    if (!dateColumn || !valueColumn) {
      setAnalysisError('Please select both a Date/Time column and a Measurement column.');
      return;
    }
    if (dateColumn === valueColumn) {
      setAnalysisError('Date/Time column and Measurement column cannot be the same.');
      return;
    }
    if (!unit.trim()) {
      setAnalysisError('Please specify a measurement unit (e.g., °C, mm, mm/day).');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dateColumn', dateColumn);
      formData.append('valueColumn', valueColumn);
      formData.append('variable', variable);
      formData.append('unit', unit.trim());
      formData.append('region', region);
      if (customRegion.trim()) formData.append('customRegion', customRegion.trim());
      if (sourceLabel.trim()) formData.append('sourceLabel', sourceLabel.trim());
      if (description.trim()) formData.append('description', description.trim());

      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      const analyzed = data as UploadResponse;
      setResult(analyzed);
      onDatasetAnalyzed({metadata: analyzed.metadata, analysis: analyzed.analysis});
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unable to process uploaded CSV file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step 1: File Selection */}
      <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#102A43]">1. Upload Environmental CSV Dataset</h2>
          <p className="text-sm text-[#486581]">
            Upload a comma-separated (.csv) time-series file. Missing values and invalid rows are audited transparently on the server without imputation.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
        />

        {!file ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilePick(e.dataTransfer.files?.[0] || null);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className="rounded-xl border-2 border-dashed border-[#BCCCDC] bg-[#F7FAFC] hover:border-[#168C83] hover:bg-[#DDF3EF]/25 p-10 text-center cursor-pointer transition-colors space-y-3"
          >
            <div className="mx-auto h-11 w-11 rounded-xl bg-[#E8F3FA] text-[#173B56] inline-flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[#102A43]">Drag and drop a CSV file here, or click to browse</p>
              <p className="text-xs text-[#627D98] mt-1">Supports YYYY-MM-DD, YYYY-MM, YYYYMM, or YYYY date formats</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-[#168C83]" />
              <div>
                <div className="font-semibold text-sm text-[#102A43]">{file.name}</div>
                <div className="text-xs text-[#627D98] font-mono-tabular">
                  {(file.size / 1024).toFixed(1)} KB · {headers.length} columns detected
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#102A43] cursor-pointer"
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={resetFile}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-xs font-semibold text-red-700 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        )}

        {fileError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900" role="alert">
            <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
            <span>{fileError}</span>
          </div>
        )}
      </section>

      {/* Step 2: Configure Columns & Metadata */}
      {file && headers.length > 0 && (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#102A43]">2. Configure Columns &amp; Dataset Metadata</h2>
            <p className="text-sm text-[#486581]">
              Browser-side preview below (first {previewRows.length} rows only — not a completed analysis). Verify column mapping before submitting.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#DCE5EE]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0F4F8] text-[#102A43]">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3.5 py-2.5 font-semibold border-b border-[#DCE5EE] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EE] font-mono-tabular text-[#486581]">
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx} className="px-3.5 py-2 whitespace-nowrap">
                        {row[colIdx] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAnalyzeSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="csv-date-col" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Date / Time Column
                </label>
                <select
                  id="csv-date-col"
                  value={dateColumn}
                  onChange={(e) => setDateColumn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="csv-val-col" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Measurement Column
                </label>
                <select
                  id="csv-val-col"
                  value={valueColumn}
                  onChange={(e) => setValueColumn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="csv-variable" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Environmental Variable
                </label>
                <select
                  id="csv-variable"
                  value={variable}
                  onChange={(e) => {
                    const nextVar = e.target.value as VariableId;
                    setVariable(nextVar);
                    if (nextVar === 'temperature') setUnit('°C');
                    else if (nextVar === 'rainfall') setUnit('mm');
                    else if (nextVar === 'humidity') setUnit('%');
                    else if (nextVar === 'solar_radiation') setUnit('W/m²');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  <option value="temperature">Temperature</option>
                  <option value="rainfall">Rainfall</option>
                  <option value="humidity">Relative Humidity</option>
                  <option value="solar_radiation">Solar Radiation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="csv-unit" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Measurement Unit
                </label>
                <input
                  id="csv-unit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. °C, mm, mm/day"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                />
              </div>

              <div>
                <label htmlFor="csv-region" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Study Region
                </label>
                <select
                  id="csv-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionId)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                >
                  <option value="lagos">Lagos State (South-West Nigeria)</option>
                  <option value="edo">Edo State (South-South Nigeria)</option>
                  <option value="custom">Custom Study Region</option>
                </select>
              </div>

              <div>
                <label htmlFor="csv-source" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Data Source Attribution (Optional)
                </label>
                <input
                  id="csv-source"
                  type="text"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  placeholder="e.g. NiMet Station Record or Uploaded CSV"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                />
              </div>

              {region === 'custom' && (
                <div className="md:col-span-2">
                  <label htmlFor="csv-custom-reg" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                    Custom Region Name
                  </label>
                  <input
                    id="csv-custom-reg"
                    type="text"
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                    placeholder="e.g. Ikeja Weather Station"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label htmlFor="csv-desc" className="block text-xs font-semibold text-[#102A43] mb-1.5">
                  Dataset Description (Optional)
                </label>
                <textarea
                  id="csv-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes on station metadata, collection method, or coverage..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-white text-sm text-[#102A43]"
                />
              </div>
            </div>

            {analysisError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-900" role="alert">
                <AlertCircle className="h-5 w-5 text-red-700 shrink-0 mt-0.5" />
                <span>{analysisError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#168C83] hover:bg-[#10766F] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{loading ? 'Processing CSV on Server...' : 'Analyse Dataset →'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Step 3: Server-Calculated Results */}
      {result && (
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DCE5EE] pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10766F]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Server Statistical Analysis Complete</span>
              </div>
              <h2 className="text-xl font-bold text-[#102A43]">{result.metadata.name}</h2>
              <p className="text-xs text-[#627D98]">
                Source: {result.metadata.source} · Region: {result.metadata.regionLabel} · Granularity:{' '}
                {result.metadata.granularity}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3.5 py-2 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-xs font-semibold text-[#102A43] cursor-pointer"
              >
                View on Dashboard
              </button>
              <button
                type="button"
                onClick={() => onNavigate('assistant')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#102A43] hover:bg-[#173B56] text-white text-xs font-semibold cursor-pointer"
              >
                <MessageSquareText className="h-3.5 w-3.5" />
                <span>Ask Gemini Assistant</span>
              </button>
            </div>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1 text-xs text-amber-900">
              <div className="font-semibold">Data Quality Notes</div>
              {result.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
              <div className="text-xs text-[#627D98]">Valid Observations</div>
              <div className="text-xl font-bold font-mono-tabular text-[#102A43] mt-1">
                {result.analysis.validObservations} / {result.analysis.totalRows}
              </div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                {result.analysis.completenessPercent}% complete ({result.analysis.missingOrInvalidRows} excluded)
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
              <div className="text-xs text-[#627D98]">Mean (Min / Max)</div>
              <div className="text-xl font-bold font-mono-tabular text-[#102A43] mt-1">
                {result.analysis.mean.toFixed(2)} {result.metadata.unit}
              </div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                {result.analysis.min.toFixed(2)} – {result.analysis.max.toFixed(2)} {result.metadata.unit}
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
              <div className="text-xs text-[#627D98]">Sen&apos;s Slope</div>
              <div className="text-xl font-bold font-mono-tabular text-[#102A43] mt-1">
                {result.analysis.sensSlopePerYear >= 0 ? '+' : ''}
                {result.analysis.sensSlopePerYear.toFixed(4)}
              </div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                {result.metadata.unit}/yr · OLS: {result.analysis.linearSlopePerYear.toFixed(4)}
              </div>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4">
              <div className="text-xs text-[#627D98]">Trend &amp; Mann-Kendall p</div>
              <div className="text-lg font-bold text-[#102A43] mt-1">{result.analysis.trendDirection}</div>
              <div className="text-xs text-[#486581] mt-1 font-mono-tabular">
                p = {result.analysis.mannKendall.pValue.toFixed(4)} (tau = {result.analysis.mannKendall.tau.toFixed(3)})
              </div>
            </div>
          </div>

          <TimeSeriesChart
            series={result.analysis.series}
            unit={result.metadata.unit}
            slopePerYear={result.analysis.linearSlopePerYear}
            interceptAtStart={result.analysis.linearIntercept}
            showTrendline
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-[#DCE5EE] overflow-hidden">
              <div className="bg-[#F0F4F8] px-4 py-2.5 text-xs font-bold text-[#102A43]">Statistical Metrics</div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#DCE5EE]">
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Date Coverage</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.dateRange.start} to {result.analysis.dateRange.end}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Median / Standard Deviation</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.median.toFixed(2)} / {result.analysis.stdDev.toFixed(2)} {result.metadata.unit}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Mann-Kendall Z / S</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      Z = {result.analysis.mannKendall.z.toFixed(3)} · S = {result.analysis.mannKendall.s}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Significant at &alpha; = 0.05?</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.mannKendall.significant ? 'Yes (p < 0.05)' : 'No (p >= 0.05)'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-[#DCE5EE] overflow-hidden">
              <div className="bg-[#F0F4F8] px-4 py-2.5 text-xs font-bold text-[#102A43]">Data Quality &amp; Seasonality</div>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#DCE5EE]">
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Valid Rows Used</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.validObservations}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Missing / Invalid Excluded</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.missingOrInvalidRows}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Duplicate Dates</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {result.analysis.duplicateDatesCount}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-[#486581]">Seasonal Variance Share</td>
                    <td className="px-4 py-2.5 font-mono-tabular text-right text-[#102A43]">
                      {(result.analysis.seasonality.strength * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
