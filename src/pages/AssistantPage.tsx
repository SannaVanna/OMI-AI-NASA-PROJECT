import React, {useEffect, useRef, useState} from 'react';
import {AlertCircle, Loader2, MessageSquareText, Send, Trash2} from 'lucide-react';
import type {AppRoute} from '../components/layout/WorkspaceShell';
import type {AnalyzedDataset, ChatMessage, ComparisonResult} from '../types/omi';

interface AssistantPageProps {
  activeDataset: AnalyzedDataset | null;
  datasets: AnalyzedDataset[];
  activeComparison: ComparisonResult | null;
  onSelectDataset: (dataset: AnalyzedDataset) => void;
  onNavigate: (route: AppRoute) => void;
}

const SUGGESTED_QUESTIONS = [
  'What do the trend slope and Mann-Kendall p-value tell us about this dataset?',
  'Is this dataset showing a statistically significant trend or mostly seasonal variation?',
  'What are the environmental implications for Lagos State or Edo State based on these numbers?',
  'How complete is this dataset and what limitations should a researcher keep in mind?',
];

export const AssistantPage: React.FC<AssistantPageProps> = ({
  activeDataset,
  datasets,
  activeComparison,
  onSelectDataset,
  onNavigate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages, loading]);

  const hasContext = Boolean(activeDataset || activeComparison);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    if (!hasContext) {
      setError(
        'No analysed dataset or comparison is available yet. Load a regional dataset on the Dashboard, upload a CSV, or run a Comparison first.',
      );
      return;
    }

    setError(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          question: trimmed,
          datasetId: activeDataset?.metadata.id || null,
          comparison: activeComparison || null,
          history: messages.map((m) => ({role: m.role, content: m.content})),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: String(data.reply),
        timestamp: new Date().toISOString(),
        contextDatasetName: activeDataset?.metadata.name,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the Gemini AI Assistant endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Context & Suggested Questions Column */}
      <aside className="lg:col-span-4 space-y-5">
        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-5 space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#168C83]">
            <MessageSquareText className="h-4 w-4" />
            <span>Grounded Scientific Context</span>
          </div>
          <h2 className="text-lg font-bold text-[#102A43]">Gemini Environmental Assistant</h2>
          <p className="text-xs text-[#486581] leading-relaxed">
            Gemini receives only your server-calculated statistics (mean, slope, Mann-Kendall p-value, date range, and regional comparison metrics) and interprets them without inventing numbers.
          </p>

          {datasets.length > 0 && (
            <div className="pt-3 border-t border-[#DCE5EE] space-y-1.5">
              <label htmlFor="ai-ctx-ds" className="block text-xs font-semibold text-[#102A43]">
                Active Dataset Context
              </label>
              <select
                id="ai-ctx-ds"
                value={activeDataset?.metadata.id || ''}
                onChange={(e) => {
                  const found = datasets.find((d) => d.metadata.id === e.target.value);
                  if (found) onSelectDataset(found);
                }}
                className="w-full px-3 py-2 rounded-lg border border-[#DCE5EE] bg-white text-xs text-[#102A43]"
              >
                {datasets.map((d) => (
                  <option key={d.metadata.id} value={d.metadata.id}>
                    {d.metadata.name} ({d.metadata.unit})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeComparison && (
            <div className="rounded-lg bg-[#E8F3FA] px-3 py-2 text-xs text-[#173B56]">
              Regional Comparison ({activeComparison.variable}) is also attached as context.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#DCE5EE] bg-white p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#102A43]">Suggested Questions</h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={!hasContext || loading}
                onClick={() => sendQuestion(q)}
                className="w-full text-left px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-[#F7FAFC] hover:border-[#168C83] hover:bg-[#DDF3EF]/30 disabled:opacity-50 text-xs text-[#102A43] leading-relaxed transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      </aside>

      {/* Right Chat Panel */}
      <section className="lg:col-span-8 rounded-2xl border border-[#DCE5EE] bg-white flex flex-col min-h-[540px] max-h-[calc(100vh-140px)]">
        <div className="px-6 py-4 border-b border-[#DCE5EE] flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#102A43]">Research Interpretation Thread</h3>
            <p className="text-xs text-[#627D98]">
              {activeDataset
                ? `Interpreting: ${activeDataset.metadata.name} (${activeDataset.analysis.validObservations} obs)`
                : activeComparison
                  ? 'Interpreting Lagos vs. Edo comparison'
                  : 'Waiting for an analysed dataset'}
            </p>
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE5EE] text-xs font-semibold text-[#486581] hover:text-[#102A43] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Empty State if no dataset has been analysed yet */}
        {!hasContext ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-[#E8F3FA] text-[#173B56] flex items-center justify-center">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h4 className="text-base font-bold text-[#102A43]">No analysed dataset connected yet</h4>
              <p className="text-sm text-[#486581]">
                To prevent unsupported guesses, the Gemini Assistant requires real statistical results first. Load a Lagos or Edo dataset on the Dashboard, upload a CSV file, or run a Comparison.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 rounded-lg bg-[#168C83] hover:bg-[#10766F] text-white text-sm font-semibold cursor-pointer"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="px-4 py-2 rounded-lg border border-[#DCE5EE] bg-white hover:bg-[#F0F4F8] text-[#102A43] text-sm font-semibold cursor-pointer"
              >
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-[#DCE5EE] bg-[#F7FAFC] p-4 text-sm text-[#486581]">
                  Dataset statistics are loaded and ready. Ask a question below or pick a suggested prompt on the left to interpret the computed trends.
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[11px] text-[#627D98] mb-1">
                    {msg.role === 'user' ? 'Researcher' : 'Gemini Assistant'}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[#102A43] text-white rounded-br-xs'
                        : 'bg-[#F0F4F8] text-[#102A43] border border-[#DCE5EE] rounded-bl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2.5 text-xs text-[#486581]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#168C83]" />
                  <span>Gemini is interpreting the computed statistics...</span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && (
              <div className="mx-6 mb-3 rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-start gap-2.5 text-xs text-red-900" role="alert">
                <AlertCircle className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendQuestion(input);
              }}
              className="p-4 border-t border-[#DCE5EE] flex items-end gap-3"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendQuestion(input);
                  }
                }}
                placeholder="Ask about slope, Mann-Kendall significance, rainfall cycles, or Lagos vs. Edo implications..."
                className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#DCE5EE] bg-[#F7FAFC] text-sm text-[#102A43] resize-none focus:outline-none focus:border-[#168C83]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#168C83] hover:bg-[#10766F] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};
