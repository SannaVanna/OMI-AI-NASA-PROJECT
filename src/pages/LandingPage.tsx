import React from 'react';
import {
  ArrowRight,
  Compass,
  GitCompareArrows,
  Globe,
  LayoutDashboard,
  MessageSquareText,
  TrendingUp,
  Upload,
} from 'lucide-react';
import type {AppRoute} from '../components/layout/WorkspaceShell';

interface LandingPageProps {
  onNavigate: (route: AppRoute, options?: {region?: 'lagos' | 'edo'}) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({onNavigate}) => {
  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#102A43]">
      {/* 3-Zone Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#DCE5EE]">
        <div className="max-w-[1200px] mx-auto px-6 h-[68px] flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-[#102A43] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#102A43] text-white">
              <Globe className="h-4.5 w-4.5" />
            </span>
            <span>Omi AI</span>
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#486581]" aria-label="Primary navigation">
            <a href="#how-it-works" className="hover:text-[#102A43] transition-colors whitespace-nowrap shrink-0">
              How it works
            </a>
            <a href="#features" className="hover:text-[#102A43] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#regions" className="hover:text-[#102A43] transition-colors whitespace-nowrap shrink-0">
              Study regions
            </a>
            <a href="#about" className="hover:text-[#102A43] transition-colors whitespace-nowrap shrink-0">
              About
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Split Section */}
        <section className="bg-white border-b border-[#DCE5EE] py-16 sm:py-20 px-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-sm font-semibold text-[#168C83]">
                NASA Space Apps Challenge · Earth System Trend Detective
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#102A43] leading-[1.08] [text-wrap:balance]">
                See the patterns. Understand the change.
              </h1>
              <p className="text-base sm:text-lg text-[#486581] leading-relaxed max-w-xl">
                Explore how temperature and rainfall have changed over time across Lagos and Edo, Nigeria. Upload real CSV records, compute non-parametric climate statistics, test your chart intuition, and interpret verified trends with Gemini.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <span>Explore the Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('challenge')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-[#102A43] text-sm font-semibold transition-colors cursor-pointer"
                >
                  <Compass className="h-4 w-4 text-[#168C83]" />
                  <span>Try Trend Detective</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#627D98] pt-1">
                <span>Live NASA POWER data</span>
                <span aria-hidden="true">·</span>
                <span>Mann-Kendall &amp; Sen&apos;s slope</span>
                <span aria-hidden="true">·</span>
                <span>Lagos &amp; Edo comparative diagnostics</span>
              </div>
            </div>

            {/* Scientific Earth System SVG Illustration */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-[#102A43] border border-[#243B53] p-6 text-white shadow-lg">
                <svg
                  viewBox="0 0 540 370"
                  className="w-full h-auto"
                  role="img"
                  aria-label="Stylised Earth system diagram showing Lagos and Edo coordinates alongside temperature and rainfall trajectories"
                >
                  <defs>
                    <linearGradient id="omiEarthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#173B56" />
                      <stop offset="100%" stopColor="#102A43" />
                    </linearGradient>
                    <linearGradient id="omiRainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#168C83" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#168C83" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <g stroke="rgba(232,243,250,0.08)" strokeWidth="1">
                    <line x1="20" y1="60" x2="520" y2="60" />
                    <line x1="20" y1="125" x2="520" y2="125" />
                    <line x1="20" y1="190" x2="520" y2="190" />
                    <line x1="20" y1="255" x2="520" y2="255" />
                    <line x1="20" y1="320" x2="520" y2="320" />
                  </g>

                  <g transform="translate(148, 168)">
                    <circle cx="0" cy="0" r="102" fill="url(#omiEarthGrad)" stroke="#244B6E" strokeWidth="1.5" />
                    <circle cx="0" cy="0" r="118" fill="none" stroke="rgba(22,140,131,0.35)" strokeWidth="1" strokeDasharray="4 5" />
                    <ellipse cx="0" cy="0" rx="50" ry="102" fill="none" stroke="rgba(232,243,250,0.16)" strokeWidth="1" />
                    <line x1="-102" y1="0" x2="102" y2="0" stroke="rgba(232,243,250,0.16)" strokeWidth="1" />
                    <path
                      d="M-24,-64 C-2,-70 28,-60 40,-40 C54,-20 50,2 38,22 C26,42 18,72 4,80 C-8,72 -12,46 -18,30 C-26,12 -46,10 -52,-12 C-58,-34 -42,-56 -24,-64 Z"
                      fill="#1E4B6D"
                      stroke="#2D6A96"
                      strokeWidth="1.2"
                    />
                    <circle cx="-18" cy="-4" r="5" fill="#168C83" stroke="#DDF3EF" strokeWidth="2" />
                    <circle cx="-4" cy="-6" r="5" fill="#E8F3FA" stroke="#168C83" strokeWidth="2" />
                    <line x1="-18" y1="-4" x2="132" y2="-46" stroke="rgba(221,243,239,0.45)" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="-4" y1="-6" x2="132" y2="48" stroke="rgba(232,243,250,0.45)" strokeWidth="1" strokeDasharray="3 3" />
                  </g>

                  <g transform="translate(288, 36)">
                    <rect x="0" y="0" width="228" height="122" rx="12" fill="#173B56" stroke="#2D5678" strokeWidth="1" />
                    <text x="16" y="25" fill="#9FB3C8" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="600">
                      Temperature Trajectory (°C)
                    </text>
                    <text x="16" y="46" fill="#FFFFFF" fontFamily="JetBrains Mono, monospace" fontSize="14" fontWeight="600">
                      NASA POWER · T2M
                    </text>
                    <path
                      d="M16 94 C46 90, 68 78, 96 82 C124 86, 146 64, 174 60 C190 58, 200 52, 210 46"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <text x="16" y="110" fill="#829AB1" fontFamily="JetBrains Mono, monospace" fontSize="10">
                      Mann-Kendall + Sen&apos;s Slope
                    </text>
                  </g>

                  <g transform="translate(288, 176)">
                    <rect x="0" y="0" width="228" height="142" rx="12" fill="#173B56" stroke="#2D5678" strokeWidth="1" />
                    <text x="16" y="25" fill="#9FB3C8" fontFamily="Manrope, sans-serif" fontSize="11" fontWeight="600">
                      Rainfall Pattern (mm/day)
                    </text>
                    <text x="16" y="46" fill="#DDF3EF" fontFamily="JetBrains Mono, monospace" fontSize="14" fontWeight="600">
                      PRECTOTCORR
                    </text>
                    <path
                      d="M16 116 L16 98 C44 90, 66 72, 94 80 C122 88, 144 62, 172 68 C190 72, 200 86, 210 80 L210 116 Z"
                      fill="url(#omiRainGrad)"
                    />
                    <path
                      d="M16 98 C44 90, 66 72, 94 80 C122 88, 144 62, 172 68 C190 72, 200 86, 210 80"
                      fill="none"
                      stroke="#2CB1A5"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <text x="16" y="132" fill="#829AB1" fontFamily="JetBrains Mono, monospace" fontSize="10">
                      Seasonal Monsoon Detection
                    </text>
                  </g>

                  <text x="20" y="346" fill="#829AB1" fontFamily="JetBrains Mono, monospace" fontSize="11">
                    LAGOS (6.52°N, 3.38°E) · EDO (6.54°N, 5.90°E)
                  </text>
                </svg>
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap justify-between gap-2 text-xs text-[#BCCCDC]">
                  <span>Earth System Telemetry Framework</span>
                  <span className="font-mono-tabular">Variables: T2M (°C) · PRECTOTCORR (mm/day)</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Omi AI Does */}
        <section id="about" className="py-16 sm:py-20 px-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-sm font-semibold text-[#168C83]">What Omi AI does</p>
              <h2 className="text-3xl font-bold text-[#102A43] [text-wrap:balance]">
                Statistical transparency for historical climate records
              </h2>
              <p className="text-[#486581] leading-relaxed">
                Raw meteorological spreadsheets and satellite archives rarely translate easily into clear regional insight. Omi AI separates deterministic statistical calculation from AI interpretation so every chart, slope, and p-value is computed directly from verifiable observations.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-[#DCE5EE] bg-white p-5">
                <h3 className="font-bold text-base text-[#102A43] mb-1">Real observations, never invented metrics</h3>
                <p className="text-sm text-[#486581]">
                  Retrieve live NASA POWER monthly records for Lagos and Edo or upload your own CSV time-series. Missing values and sentinel codes are excluded cleanly without fabricating data.
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE5EE] bg-white p-5">
                <h3 className="font-bold text-base text-[#102A43] mb-1">Server-side JavaScript statistical pipeline</h3>
                <p className="text-sm text-[#486581]">
                  Computes descriptive bounds, Theil-Sen median slope, OLS regression, tie-corrected Mann-Kendall Z and p-values, and seasonal variance share before Gemini ever sees the summary.
                </p>
              </div>
              <div className="rounded-xl border border-[#DCE5EE] bg-white p-5">
                <h3 className="font-bold text-base text-[#102A43] mb-1">Interactive trend literacy</h3>
                <p className="text-sm text-[#486581]">
                  The Trend Detective Challenge trains researchers and students to distinguish genuine long-term shifts from short-window fluctuations and seasonal rainfall cycles.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-16 sm:py-20 px-6 bg-white border-y border-[#DCE5EE]">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-sm font-semibold text-[#168C83] mb-2">How it works</p>
              <h2 className="text-3xl font-bold text-[#102A43]">Four structured steps from raw observations to insight</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  num: '01',
                  title: 'Select a region',
                  desc: 'Choose coastal Lagos State, inland forest-transition Edo State, or upload a custom regional CSV file.',
                },
                {
                  num: '02',
                  title: 'Validate time-series',
                  desc: 'Inspect date coverage, missing rows, measurement units, and observation counts transparently.',
                },
                {
                  num: '03',
                  title: 'Compute real trends',
                  desc: 'Calculate Sen’s slope, Mann-Kendall significance, seasonality share, and Lagos vs. Edo overlap.',
                },
                {
                  num: '04',
                  title: 'Interpret with Gemini',
                  desc: 'Ask Gemini to explain the computed statistical findings and regional implications in clear language.',
                },
              ].map((step) => (
                <article key={step.num} className="rounded-2xl border border-[#DCE5EE] bg-[#F7FAFC] p-6 space-y-3">
                  <span className="font-mono-tabular text-sm font-semibold text-[#168C83]">{step.num}</span>
                  <h3 className="text-lg font-bold text-[#102A43]">{step.title}</h3>
                  <p className="text-sm text-[#486581] leading-relaxed">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="py-16 sm:py-20 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-sm font-semibold text-[#168C83] mb-2">Core capabilities</p>
              <h2 className="text-3xl font-bold text-[#102A43]">Built for rigorous environmental exploration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="md:col-span-3 text-left rounded-2xl border border-[#DCE5EE] bg-white p-7 hover:border-[#168C83] transition-colors cursor-pointer space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DDF3EF] text-[#168C83] inline-flex items-center justify-center">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-[#102A43]">Environmental Dashboard</h3>
                <p className="text-sm text-[#486581]">
                  Query live NASA POWER monthly temperature and rainfall records by year range for Lagos and Edo with interactive trendlines and climatology summaries.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('challenge')}
                className="md:col-span-3 text-left rounded-2xl border border-[#DCE5EE] bg-white p-7 hover:border-[#168C83] transition-colors cursor-pointer space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#E8F3FA] text-[#173B56] inline-flex items-center justify-center">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-[#102A43]">Trend Detective Challenge</h3>
                <p className="text-sm text-[#486581]">
                  Interpret partially hidden historical time series before revealing the full observations, Sen&apos;s slope, Mann-Kendall p-value, and scientific verdict.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="md:col-span-2 text-left rounded-2xl border border-[#DCE5EE] bg-white p-6 hover:border-[#168C83] transition-colors cursor-pointer space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DDF3EF] text-[#168C83] inline-flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#102A43]">CSV Dataset Upload</h3>
                <p className="text-sm text-[#486581]">
                  Map custom columns, audit missing rows without imputation, and run server-side statistical trend analysis.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('comparison')}
                className="md:col-span-2 text-left rounded-2xl border border-[#DCE5EE] bg-white p-6 hover:border-[#168C83] transition-colors cursor-pointer space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#DDF3EF] text-[#168C83] inline-flex items-center justify-center">
                  <GitCompareArrows className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#102A43]">Lagos vs. Edo Comparison</h3>
                <p className="text-sm text-[#486581]">
                  Strict compatibility validation across variable, units, granularity, and overlapping date windows.
                </p>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('assistant')}
                className="md:col-span-2 text-left rounded-2xl border border-[#DCE5EE] bg-white p-6 hover:border-[#168C83] transition-colors cursor-pointer space-y-3"
              >
                <div className="h-10 w-10 rounded-lg bg-[#E8F3FA] text-[#173B56] inline-flex items-center justify-center">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-[#102A43]">Gemini AI Assistant</h3>
                <p className="text-sm text-[#486581]">
                  Grounded in your actual computed statistics to explain trends, significance, and regional meaning.
                </p>
              </button>
            </div>
          </div>
        </section>

        {/* Study Regions */}
        <section id="regions" className="py-16 sm:py-20 px-6 bg-white border-y border-[#DCE5EE]">
          <div className="max-w-[1200px] mx-auto">
            <div className="max-w-2xl mb-10">
              <p className="text-sm font-semibold text-[#168C83] mb-2">Study regions</p>
              <h2 className="text-3xl font-bold text-[#102A43]">Coastal urban vs. inland forest transition</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <article className="rounded-2xl border border-[#DCE5EE] bg-[#F7FAFC] p-7 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#627D98]">
                    <span>South-West Nigeria</span>
                    <span aria-hidden="true">·</span>
                    <span>Coastal urban environment</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#102A43]">Lagos State</h3>
                  <p className="text-sm text-[#486581] leading-relaxed">
                    Atlantic coastal metropolis shaped by maritime humidity, dense urban land cover, heat retention, and intense coastal wet-season precipitation.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#DCE5EE]">
                  <div>
                    <div className="text-xs text-[#627D98]">Coordinates</div>
                    <div className="text-sm font-semibold font-mono-tabular text-[#102A43]">6.5244° N, 3.3792° E</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#627D98]">Key Signal</div>
                    <div className="text-sm font-semibold text-[#102A43]">Coastal heat &amp; rainfall</div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard', {region: 'lagos'})}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-sm font-semibold text-[#102A43] cursor-pointer"
                  >
                    <TrendingUp className="h-4 w-4 text-[#168C83]" />
                    <span>Inspect Lagos Data</span>
                  </button>
                </div>
              </article>

              <article className="rounded-2xl border border-[#DCE5EE] bg-[#F7FAFC] p-7 flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-[#627D98]">
                    <span>South-South Nigeria</span>
                    <span aria-hidden="true">·</span>
                    <span>Inland and forest transition zone</span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#102A43]">Edo State</h3>
                  <p className="text-sm text-[#486581] leading-relaxed">
                    Inland humid forest-to-savanna transition corridor governed by West African monsoon seasonality, evapotranspiration, and canopy dynamics.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#DCE5EE]">
                  <div>
                    <div className="text-xs text-[#627D98]">Coordinates</div>
                    <div className="text-sm font-semibold font-mono-tabular text-[#102A43]">6.5438° N, 5.8987° E</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#627D98]">Key Signal</div>
                    <div className="text-sm font-semibold text-[#102A43]">Inland forest hydrology</div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => onNavigate('dashboard', {region: 'edo'})}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-sm font-semibold text-[#102A43] cursor-pointer"
                  >
                    <TrendingUp className="h-4 w-4 text-[#168C83]" />
                    <span>Inspect Edo Data</span>
                  </button>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-16 px-6">
          <div className="max-w-[1200px] mx-auto rounded-2xl bg-[#102A43] text-white p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Start investigating real environmental trends</h2>
              <p className="text-sm sm:text-base text-[#BCCCDC]">
                Query live NASA POWER observations, upload your own time-series CSV, or test your analytical eye in the Trend Detective Challenge.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-5 py-3 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Open Workspace
              </button>
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="px-5 py-3 rounded-lg bg-white text-[#102A43] hover:bg-[#E8F3FA] text-sm font-semibold transition-colors cursor-pointer"
              >
                Upload CSV
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-[#DCE5EE] py-8 px-6">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-[#486581]">
          <div>
            <span className="font-bold text-[#102A43]">Omi AI</span> · Earth System Trend Detective · NASA Space Apps Challenge
          </div>
          <div className="flex flex-wrap gap-6">
            <button type="button" onClick={() => onNavigate('dashboard')} className="hover:text-[#102A43] cursor-pointer">
              Dashboard
            </button>
            <button type="button" onClick={() => onNavigate('upload')} className="hover:text-[#102A43] cursor-pointer">
              Upload CSV
            </button>
            <button type="button" onClick={() => onNavigate('comparison')} className="hover:text-[#102A43] cursor-pointer">
              Comparison
            </button>
            <button type="button" onClick={() => onNavigate('challenge')} className="hover:text-[#102A43] cursor-pointer">
              Trend Detective
            </button>
            <button type="button" onClick={() => onNavigate('assistant')} className="hover:text-[#102A43] cursor-pointer">
              AI Assistant
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
