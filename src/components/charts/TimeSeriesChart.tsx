import React, {useMemo, useState} from 'react';
import type {ComparisonPairedPoint, ObservationPoint} from '../../types/omi';

interface SingleSeriesProps {
  mode?: 'single' | 'challenge';
  series: ObservationPoint[];
  unit: string;
  variableLabel?: string;
  hiddenStartIndex?: number; // For Trend Detective Challenge reveal
  totalExpectedPoints?: number; // When challenge is unrevealed, reserves right-side horizon
  slopePerYear?: number;
  interceptAtStart?: number;
  showTrendline?: boolean;
}

interface ComparisonSeriesProps {
  mode: 'comparison';
  pairedSeries: ComparisonPairedPoint[];
  unit: string;
  lagosLabel?: string;
  edoLabel?: string;
}

type TimeSeriesChartProps = SingleSeriesProps | ComparisonSeriesProps;

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = (props) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (props.mode === 'comparison') {
    const {pairedSeries, unit, lagosLabel = 'Lagos State', edoLabel = 'Edo State'} = props;
    if (!pairedSeries || pairedSeries.length === 0) {
      return (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#BCCCDC] bg-[#F7FAFC] text-sm text-[#486581]">
          No overlapping observations available to plot.
        </div>
      );
    }

    const width = 820;
    const height = 300;
    const pad = {top: 24, right: 24, bottom: 42, left: 60};
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const allVals = pairedSeries.flatMap((p) => [p.lagosValue, p.edoValue]);
    let minV = Math.min(...allVals);
    let maxV = Math.max(...allVals);
    if (minV === maxV) {
      minV -= 1;
      maxV += 1;
    }
    const margin = (maxV - minV) * 0.1;
    const yMin = minV - margin;
    const yMax = maxV + margin;

    const xFor = (i: number) =>
      pairedSeries.length === 1 ? pad.left + plotW / 2 : pad.left + (i / (pairedSeries.length - 1)) * plotW;
    const yFor = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    const lagosPath = pairedSeries
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)} ${yFor(p.lagosValue).toFixed(2)}`)
      .join(' ');
    const edoPath = pairedSeries
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)} ${yFor(p.edoValue).toFixed(2)}`)
      .join(' ');

    const hovered = hoverIdx !== null ? pairedSeries[hoverIdx] : null;

    return (
      <div className="relative w-full">
        <div className="mb-3 flex flex-wrap items-center gap-5 text-xs font-medium text-[#486581]">
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 bg-[#102A43]" />
            <span>{lagosLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-0.5 w-5 bg-[#168C83]" />
            <span>{edoLabel}</span>
          </span>
        </div>

        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full select-none">
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const gy = pad.top + frac * plotH;
              const val = yMax - frac * (yMax - yMin);
              return (
                <g key={frac}>
                  <line x1={pad.left} y1={gy} x2={width - pad.right} y2={gy} stroke="#DCE5EE" strokeWidth="1" />
                  <text
                    x={pad.left - 10}
                    y={gy + 4}
                    textAnchor="end"
                    fill="#627D98"
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="11"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            <path d={lagosPath} fill="none" stroke="#102A43" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d={edoPath} fill="none" stroke="#168C83" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

            {hovered && hoverIdx !== null && (
              <g>
                <line
                  x1={xFor(hoverIdx)}
                  y1={pad.top}
                  x2={xFor(hoverIdx)}
                  y2={pad.top + plotH}
                  stroke="#829AB1"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle cx={xFor(hoverIdx)} cy={yFor(hovered.lagosValue)} r="4.5" fill="#102A43" stroke="#FFFFFF" strokeWidth="1.5" />
                <circle cx={xFor(hoverIdx)} cy={yFor(hovered.edoValue)} r="4.5" fill="#168C83" stroke="#FFFFFF" strokeWidth="1.5" />
              </g>
            )}

            {/* Invisible hover hit columns */}
            {pairedSeries.map((_, idx) => {
              const colW = Math.max(4, plotW / pairedSeries.length);
              return (
                <rect
                  key={idx}
                  x={xFor(idx) - colW / 2}
                  y={pad.top}
                  width={colW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              );
            })}

            <text x={pad.left} y={height - 12} textAnchor="start" fill="#627D98" fontFamily="JetBrains Mono, monospace" fontSize="11">
              {pairedSeries[0].period}
            </text>
            <text
              x={pad.left + plotW / 2}
              y={height - 12}
              textAnchor="middle"
              fill="#627D98"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
            >
              {pairedSeries[Math.floor(pairedSeries.length / 2)].period}
            </text>
            <text
              x={width - pad.right}
              y={height - 12}
              textAnchor="end"
              fill="#627D98"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
            >
              {pairedSeries[pairedSeries.length - 1].period}
            </text>
          </svg>

          {hovered && (
            <div className="pointer-events-none mt-2 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#DCE5EE] bg-[#102A43] px-3.5 py-2 text-xs text-white font-mono-tabular">
              <span>Period: {hovered.period}</span>
              <span>
                {lagosLabel}: {hovered.lagosValue.toFixed(2)} {unit}
              </span>
              <span>
                {edoLabel}: {hovered.edoValue.toFixed(2)} {unit}
              </span>
              <span>
                Delta: {hovered.difference >= 0 ? '+' : ''}
                {hovered.difference.toFixed(2)} {unit}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single series or Trend Detective Challenge mode
  const {
    series,
    unit,
    hiddenStartIndex,
    totalExpectedPoints,
    slopePerYear,
    interceptAtStart,
    showTrendline = true,
  } = props;

  const chartMath = useMemo(() => {
    if (!series || series.length === 0) return null;
    const width = 820;
    const height = 300;
    const pad = {top: 24, right: 24, bottom: 42, left: 60};
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const totalSlots = Math.max(series.length, totalExpectedPoints || series.length);
    const values = series.map((p) => p.value);
    let minV = Math.min(...values);
    let maxV = Math.max(...values);
    if (minV === maxV) {
      minV -= 1;
      maxV += 1;
    }
    const margin = (maxV - minV) * 0.12;
    const yMin = minV - margin;
    const yMax = maxV + margin;

    const xFor = (i: number) =>
      totalSlots <= 1 ? pad.left + plotW / 2 : pad.left + (i / (totalSlots - 1)) * plotW;
    const yFor = (v: number) => pad.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    return {width, height, pad, plotW, plotH, totalSlots, yMin, yMax, xFor, yFor};
  }, [series, totalExpectedPoints]);

  if (!chartMath || series.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-[#BCCCDC] bg-[#F7FAFC] text-sm text-[#486581]">
        No valid observations available to chart.
      </div>
    );
  }

  const {width, height, pad, plotW, plotH, totalSlots, yMin, yMax, xFor, yFor} = chartMath;

  const splitIdx =
    typeof hiddenStartIndex === 'number' && hiddenStartIndex > 0 && hiddenStartIndex < series.length
      ? hiddenStartIndex
      : null;

  const firstSegment = splitIdx ? series.slice(0, splitIdx) : series;
  const revealedSegment = splitIdx ? series.slice(splitIdx - 1) : [];

  const primaryPath = firstSegment
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(2)} ${yFor(p.value).toFixed(2)}`)
    .join(' ');

  const revealedPath =
    splitIdx && revealedSegment.length > 0
      ? revealedSegment
          .map((p, idx) => {
            const globalIdx = splitIdx - 1 + idx;
            return `${idx === 0 ? 'M' : 'L'}${xFor(globalIdx).toFixed(2)} ${yFor(p.value).toFixed(2)}`;
          })
          .join(' ')
      : '';

  // Optional OLS / Sen's linear overlay
  let trendPath = '';
  if (showTrendline && typeof slopePerYear === 'number' && typeof interceptAtStart === 'number' && series.length >= 2) {
    const t0 = series[0].timestamp;
    const tLast = series[series.length - 1].timestamp;
    const spanYears = (tLast - t0) / MS_PER_YEAR;
    const yStart = interceptAtStart;
    const yEnd = interceptAtStart + slopePerYear * spanYears;
    trendPath = `M${xFor(0).toFixed(2)} ${yFor(yStart).toFixed(2)} L${xFor(series.length - 1).toFixed(2)} ${yFor(yEnd).toFixed(2)}`;
  }

  const isMaskedChallenge = typeof totalExpectedPoints === 'number' && totalExpectedPoints > series.length;
  const maskStartX = isMaskedChallenge ? xFor(series.length - 1) : null;
  const hovered = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full select-none" role="img" aria-label="Environmental time-series chart">
        {/* Horizontal Y gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const gy = pad.top + frac * plotH;
          const val = yMax - frac * (yMax - yMin);
          return (
            <g key={frac}>
              <line x1={pad.left} y1={gy} x2={width - pad.right} y2={gy} stroke="#DCE5EE" strokeWidth="1" />
              <text
                x={pad.left - 10}
                y={gy + 4}
                textAnchor="end"
                fill="#627D98"
                fontFamily="JetBrains Mono, monospace"
                fontSize="11"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Masked future horizon for unrevealed Trend Detective Challenge */}
        {isMaskedChallenge && maskStartX !== null && (
          <g>
            <rect
              x={maskStartX}
              y={pad.top}
              width={width - pad.right - maskStartX}
              height={plotH}
              fill="#E8F3FA"
              opacity="0.7"
            />
            <line
              x1={maskStartX}
              y1={pad.top}
              x2={maskStartX}
              y2={pad.top + plotH}
              stroke="#173B56"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={maskStartX + (width - pad.right - maskStartX) / 2}
              y={pad.top + plotH / 2 - 6}
              textAnchor="middle"
              fill="#173B56"
              fontFamily="Manrope, sans-serif"
              fontSize="12"
              fontWeight="700"
            >
              {totalSlots - series.length} Hidden Observations
            </text>
            <text
              x={maskStartX + (width - pad.right - maskStartX) / 2}
              y={pad.top + plotH / 2 + 12}
              textAnchor="middle"
              fill="#486581"
              fontFamily="DM Sans, sans-serif"
              fontSize="11"
            >
              Submit your answer to reveal
            </text>
          </g>
        )}

        {/* Highlight background for newly revealed observations */}
        {splitIdx !== null && (
          <g>
            <rect
              x={xFor(splitIdx - 1)}
              y={pad.top}
              width={width - pad.right - xFor(splitIdx - 1)}
              height={plotH}
              fill="#DDF3EF"
              opacity="0.5"
            />
            <line
              x1={xFor(splitIdx - 1)}
              y1={pad.top}
              x2={xFor(splitIdx - 1)}
              y2={pad.top + plotH}
              stroke="#168C83"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={xFor(splitIdx - 1) + 8}
              y={pad.top + 16}
              fill="#10766F"
              fontFamily="Manrope, sans-serif"
              fontSize="11"
              fontWeight="700"
            >
              Previously hidden observations
            </text>
          </g>
        )}

        {/* Primary series */}
        <path
          d={primaryPath}
          fill="none"
          stroke="#102A43"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Revealed tail in distinct teal */}
        {revealedPath && (
          <path
            d={revealedPath}
            fill="none"
            stroke="#168C83"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Fitted linear trendline */}
        {trendPath && (
          <path
            d={trendPath}
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
        )}

        {/* Data markers when series is moderately sized */}
        {series.length <= 75 &&
          series.map((pt, idx) => (
            <circle
              key={pt.date + idx}
              cx={xFor(idx)}
              cy={yFor(pt.value)}
              r={hoverIdx === idx ? 5 : 2.8}
              fill={splitIdx !== null && idx >= splitIdx ? '#168C83' : '#102A43'}
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
          ))}

        {/* Hover crosshair */}
        {hovered && hoverIdx !== null && (
          <g>
            <line
              x1={xFor(hoverIdx)}
              y1={pad.top}
              x2={xFor(hoverIdx)}
              y2={pad.top + plotH}
              stroke="#829AB1"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={xFor(hoverIdx)}
              cy={yFor(hovered.value)}
              r="5"
              fill={splitIdx !== null && hoverIdx >= splitIdx ? '#168C83' : '#102A43'}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Hover hit targets */}
        {series.map((_, idx) => {
          const colW = Math.max(4, plotW / totalSlots);
          return (
            <rect
              key={idx}
              x={xFor(idx) - colW / 2}
              y={pad.top}
              width={colW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}

        {/* X Axis Labels */}
        <text x={pad.left} y={height - 12} textAnchor="start" fill="#627D98" fontFamily="JetBrains Mono, monospace" fontSize="11">
          {series[0].date.slice(0, 7)}
        </text>
        <text
          x={xFor(Math.floor((series.length - 1) / 2))}
          y={height - 12}
          textAnchor="middle"
          fill="#627D98"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
        >
          {series[Math.floor((series.length - 1) / 2)].date.slice(0, 7)}
        </text>
        <text
          x={xFor(series.length - 1)}
          y={height - 12}
          textAnchor={isMaskedChallenge ? 'middle' : 'end'}
          fill="#627D98"
          fontFamily="JetBrains Mono, monospace"
          fontSize="11"
        >
          {series[series.length - 1].date.slice(0, 7)}
        </text>
      </svg>

      {hovered && (
        <div className="pointer-events-none mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#102A43] px-3.5 py-2 text-xs text-white font-mono-tabular">
          <span>Observation Date: {hovered.date}</span>
          <span>
            Value: {hovered.value.toFixed(2)} {unit}
          </span>
          {splitIdx !== null && hoverIdx !== null && (
            <span>{hoverIdx >= splitIdx ? 'Revealed Segment' : 'Initial Segment'}</span>
          )}
        </div>
      )}
    </div>
  );
};
