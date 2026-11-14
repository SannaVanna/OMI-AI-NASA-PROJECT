import React, {useState} from 'react';
import {
  Compass,
  GitCompareArrows,
  Globe,
  Home,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Upload,
  X,
} from 'lucide-react';

export type AppRoute = 'landing' | 'dashboard' | 'upload' | 'comparison' | 'challenge' | 'assistant';

interface WorkspaceShellProps {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  pageTitle: string;
  topAction?: React.ReactNode;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{id: AppRoute; label: string; icon: React.ComponentType<{className?: string}>}> = [
  {id: 'dashboard', label: 'Environmental Dashboard', icon: LayoutDashboard},
  {id: 'upload', label: 'Dataset Analysis', icon: Upload},
  {id: 'comparison', label: 'Regional Comparison', icon: GitCompareArrows},
  {id: 'challenge', label: 'Trend Detective Challenge', icon: Compass},
  {id: 'assistant', label: 'Gemini AI Assistant', icon: MessageSquareText},
];

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  activeRoute,
  onNavigate,
  pageTitle,
  topAction,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (route: AppRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] text-[#102A43] flex">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#102A43]/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Fixed Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#102A43] text-white flex flex-col justify-between border-r border-[#173B56] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Workspace navigation"
      >
        <div className="p-4">
          <div className="flex items-center justify-between px-2 pb-5 mb-4 border-b border-white/10">
            <button
              type="button"
              onClick={() => handleSelect('landing')}
              className="flex items-center gap-2.5 text-left font-bold text-lg tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#168C83] text-white">
                <Globe className="h-4.5 w-4.5" />
              </span>
              <span>Omi AI</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 lg:hidden"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeRoute === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-left transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#168C83] text-white font-semibold'
                      : 'text-[#BCCCDC] hover:bg-white/8 hover:text-white'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleSelect('landing')}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-[#BCCCDC] hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
          >
            <Home className="h-4.5 w-4.5 shrink-0" />
            <span>Landing Overview</span>
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#DCE5EE] px-4 sm:px-7 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg border border-[#DCE5EE] text-[#486581] hover:bg-[#F0F4F8] lg:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-[#102A43] truncate">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">{topAction}</div>
        </header>

        <main className="flex-1 w-full max-w-[1320px] mx-auto p-4 sm:p-7 space-y-6">{children}</main>
      </div>
    </div>
  );
};
