import type {DatasetMetadata, ObservationPoint} from '../../src/types/omi.ts';

export interface ParsedCsvData {
  headers: string[];
  rows: string[][];
}

export interface CsvExtractionResult {
  observations: ObservationPoint[];
  totalRows: number;
  missingOrInvalidRows: number;
  duplicateDatesCount: number;
  granularity: DatasetMetadata['granularity'];
  warnings: string[];
}

/**
 * RFC-4180 compliant CSV parser handling quoted fields, escaped quotes, and CRLF/LF.
 */
export function parseCsvText(csvText: string): ParsedCsvData {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error('The CSV file must contain a header row and at least one observation row.');
  }

  const headers = rows[0].map((h) => h.trim()).filter(Boolean);
  if (headers.length < 2) {
    throw new Error('The CSV file must include at least two columns (date/time and measurement).');
  }

  return {
    headers,
    rows: rows.slice(1),
  };
}

/**
 * Parses common environmental date representations without fabricating dates.
 * Supports: YYYY-MM-DD, YYYY-MM, YYYYMM (e.g. NASA POWER 202001), YYYY, DD/MM/YYYY or MM/DD/YYYY, ISO 8601.
 */
export function parseEnvironmentalDate(raw: string): {
  isoDate: string;
  timestamp: number;
  year: number;
  month: number;
  granularityHint: 'daily' | 'monthly' | 'annual';
} | null {
  const s = raw.trim();
  if (!s) return null;

  // YYYY (year only)
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    if (year < 1800 || year > 2100) return null;
    const ts = Date.UTC(year, 0, 1);
    return {isoDate: `${year}-01-01`, timestamp: ts, year, month: 1, granularityHint: 'annual'};
  }

  // NASA POWER YYYYMM (reject YYYY13 annual summary row so monthly series stay clean)
  const yyyymm = s.match(/^(\d{4})(\d{2})$/);
  if (yyyymm) {
    const year = Number(yyyymm[1]);
    const month = Number(yyyymm[2]);
    if (year < 1800 || year > 2100 || month < 1 || month > 12) return null;
    const ts = Date.UTC(year, month - 1, 1);
    const mm = String(month).padStart(2, '0');
    return {isoDate: `${year}-${mm}-01`, timestamp: ts, year, month, granularityHint: 'monthly'};
  }

  // YYYY-MM or YYYY/MM
  const ym = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (year < 1800 || year > 2100 || month < 1 || month > 12) return null;
    const ts = Date.UTC(year, month - 1, 1);
    const mm = String(month).padStart(2, '0');
    return {isoDate: `${year}-${mm}-01`, timestamp: ts, year, month, granularityHint: 'monthly'};
  }

  // YYYY-MM-DD (optionally with time)
  const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (year < 1800 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return {isoDate: `${year}-${mm}-${dd}`, timestamp: d.getTime(), year, month, granularityHint: 'daily'};
  }

  // Fallback standard Date.parse for textual dates like "Jan 2020" or "2020-05-14T00:00:00Z"
  const parsedTs = Date.parse(s);
  if (!Number.isNaN(parsedTs)) {
    const d = new Date(parsedTs);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    if (year < 1800 || year > 2100) return null;
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return {isoDate: `${year}-${mm}-${dd}`, timestamp: Date.UTC(year, month - 1, day), year, month, granularityHint: 'daily'};
  }

  return null;
}

const MISSING_SENTINELS = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '-', '--', '-999', '-999.0', '-9999']);

export function extractObservationsFromCsv(
  parsed: ParsedCsvData,
  dateColumn: string,
  valueColumn: string,
): CsvExtractionResult {
  const dateIdx = parsed.headers.indexOf(dateColumn);
  const valueIdx = parsed.headers.indexOf(valueColumn);

  if (dateIdx === -1) {
    throw new Error(`Date column "${dateColumn}" was not found in CSV headers.`);
  }
  if (valueIdx === -1) {
    throw new Error(`Measurement column "${valueColumn}" was not found in CSV headers.`);
  }
  if (dateIdx === valueIdx) {
    throw new Error('Date column and measurement column must be different columns.');
  }

  const totalRows = parsed.rows.length;
  let missingOrInvalidRows = 0;
  const rawPoints: Array<{
    isoDate: string;
    timestamp: number;
    value: number;
    year: number;
    month: number;
    granularityHint: 'daily' | 'monthly' | 'annual';
  }> = [];

  for (const row of parsed.rows) {
    const rawDate = row[dateIdx] ?? '';
    const rawVal = row[valueIdx] ?? '';

    const normalizedVal = rawVal.trim().toLowerCase();
    if (MISSING_SENTINELS.has(normalizedVal)) {
      missingOrInvalidRows++;
      continue;
    }

    const numericVal = Number(rawVal.replace(/,/g, ''));
    if (!Number.isFinite(numericVal) || numericVal <= -990) {
      missingOrInvalidRows++;
      continue;
    }

    const parsedDate = parseEnvironmentalDate(rawDate);
    if (!parsedDate) {
      missingOrInvalidRows++;
      continue;
    }

    rawPoints.push({
      ...parsedDate,
      value: numericVal,
    });
  }

  if (rawPoints.length < 6) {
    throw new Error(
      `Only ${rawPoints.length} valid observation(s) were found out of ${totalRows} rows. At least 6 valid date-and-measurement rows are required for trend analysis.`,
    );
  }

  // Sort chronologically
  rawPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Detect duplicate timestamps; preserve chronological observations cleanly while reporting duplicate count
  const seenDates = new Set<string>();
  let duplicateDatesCount = 0;
  const deduped: ObservationPoint[] = [];

  for (const pt of rawPoints) {
    if (seenDates.has(pt.isoDate)) {
      duplicateDatesCount++;
    } else {
      seenDates.add(pt.isoDate);
    }
    deduped.push({
      date: pt.isoDate,
      timestamp: pt.timestamp,
      value: pt.value,
      year: pt.year,
      month: pt.month,
    });
  }

  // Infer granularity from consecutive timestamp spacing
  let granularity: DatasetMetadata['granularity'] = 'irregular';
  if (deduped.length >= 3) {
    const diffsDays: number[] = [];
    for (let i = 1; i < deduped.length; i++) {
      const diff = (deduped[i].timestamp - deduped[i - 1].timestamp) / 86400000;
      if (diff > 0) diffsDays.push(diff);
    }
    if (diffsDays.length > 0) {
      const sortedDiffs = [...diffsDays].sort((a, b) => a - b);
      const medianDays = sortedDiffs[Math.floor(sortedDiffs.length / 2)];
      if (medianDays <= 2) granularity = 'daily';
      else if (medianDays >= 25 && medianDays <= 35) granularity = 'monthly';
      else if (medianDays >= 350 && medianDays <= 380) granularity = 'annual';
    }
  }

  const warnings: string[] = [];
  if (missingOrInvalidRows > 0) {
    warnings.push(
      `${missingOrInvalidRows} row(s) had missing, sentinel (-999), or non-numeric/unparseable values and were excluded without imputation.`,
    );
  }
  if (duplicateDatesCount > 0) {
    warnings.push(`${duplicateDatesCount} duplicate date entry/entries were detected in the uploaded series.`);
  }
  if (deduped.length < 12) {
    warnings.push(
      'Short series (< 12 valid observations): statistical significance tests have low power and should be interpreted cautiously.',
    );
  }

  return {
    observations: deduped,
    totalRows,
    missingOrInvalidRows,
    duplicateDatesCount,
    granularity,
    warnings,
  };
}
