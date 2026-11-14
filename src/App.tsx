import {useState} from 'react';
import {WorkspaceShell, type AppRoute} from './components/layout/WorkspaceShell';
import {AssistantPage} from './pages/AssistantPage';
import {ChallengePage} from './pages/ChallengePage';
import {ComparisonPage} from './pages/ComparisonPage';
import {DashboardPage} from './pages/DashboardPage';
import {LandingPage} from './pages/LandingPage';
import {UploadPage} from './pages/UploadPage';
import type {AnalyzedDataset, ComparisonResult} from './types/omi';

const PAGE_TITLES: Record<Exclude<AppRoute, 'landing'>, string> = {
  dashboard: 'Environmental Dashboard',
  upload: 'Historical Dataset Upload & Analysis',
  comparison: 'Lagos & Edo Regional Comparison',
  challenge: 'Trend Detective Challenge',
  assistant: 'Gemini AI Environmental Assistant',
};

export default function App() {
  const [route, setRoute] = useState<AppRoute>('landing');
  const [dashboardInitialRegion, setDashboardInitialRegion] = useState<'lagos' | 'edo' | undefined>(undefined);
  const [datasets, setDatasets] = useState<AnalyzedDataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<AnalyzedDataset | null>(null);
  const [activeComparison, setActiveComparison] = useState<ComparisonResult | null>(null);

  const handleNavigate = (nextRoute: AppRoute, options?: {region?: 'lagos' | 'edo'}) => {
    if (options?.region) {
      setDashboardInitialRegion(options.region);
    }
    setRoute(nextRoute);
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const registerDataset = (dataset: AnalyzedDataset) => {
    setDatasets((prev) => {
      const filtered = prev.filter((d) => d.metadata.id !== dataset.metadata.id);
      return [dataset, ...filtered];
    });
    setActiveDataset(dataset);
  };

  const handleComparisonComputed = (comparison: ComparisonResult, addedDatasets?: AnalyzedDataset[]) => {
    setActiveComparison(comparison);
    if (addedDatasets && addedDatasets.length > 0) {
      setDatasets((prev) => {
        const next = [...prev];
        for (const ds of addedDatasets) {
          const idx = next.findIndex((existing) => existing.metadata.id === ds.metadata.id);
          if (idx >= 0) next[idx] = ds;
          else next.unshift(ds);
        }
        return next;
      });
    }
  };

  if (route === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  return (
    <WorkspaceShell
      activeRoute={route}
      onNavigate={handleNavigate}
      pageTitle={PAGE_TITLES[route]}
      topAction={
        route !== 'upload' ? (
          <button
            type="button"
            onClick={() => handleNavigate('upload')}
            className="px-3.5 py-2 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Analyse CSV
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="px-3.5 py-2 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-[#102A43] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            Back to Dashboard
          </button>
        )
      }
    >
      {route === 'dashboard' && (
        <DashboardPage
          activeDataset={activeDataset}
          datasets={datasets}
          initialRegion={dashboardInitialRegion}
          onDatasetLoaded={registerDataset}
          onSelectDataset={setActiveDataset}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'upload' && (
        <UploadPage onDatasetAnalyzed={registerDataset} onNavigate={handleNavigate} />
      )}

      {route === 'comparison' && (
        <ComparisonPage
          datasets={datasets}
          activeComparison={activeComparison}
          onComparisonComputed={handleComparisonComputed}
          onNavigate={handleNavigate}
        />
      )}

      {route === 'challenge' && <ChallengePage datasets={datasets} />}

      {route === 'assistant' && (
        <AssistantPage
          activeDataset={activeDataset}
          datasets={datasets}
          activeComparison={activeComparison}
          onSelectDataset={setActiveDataset}
          onNavigate={handleNavigate}
        />
      )}
    </WorkspaceShell>
  );
}
