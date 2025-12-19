import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  Save, 
  FileText, 
  Link as LinkIcon,
  Search,
  Copy,
  Check,
  Settings,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeContent } from './services/gemini';
import { Insight } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add'>('dashboard');
  const [insights, setInsights] = useState<Insight[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSending, setIsSending] = useState<number | null>(null); // ID of insight being sent
  
  // Add Form State
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
    const savedSheetUrl = localStorage.getItem('recruitIntel_sheetUrl');
    const savedWebhookUrl = localStorage.getItem('recruitIntel_webhookUrl');
    if (savedSheetUrl) setSheetUrl(savedSheetUrl);
    if (savedWebhookUrl) setWebhookUrl(savedWebhookUrl);
  }, []);

  const saveSettings = (sUrl: string, wUrl: string) => {
    setSheetUrl(sUrl);
    setWebhookUrl(wUrl);
    localStorage.setItem('recruitIntel_sheetUrl', sUrl);
    localStorage.setItem('recruitIntel_webhookUrl', wUrl);
    setShowSettings(false);
  };

  // Hidden Form Ref
  const formRef = React.useRef<HTMLFormElement>(null);
  const [payload, setPayload] = useState('');

  const handleSendToSheet = async (insight: Insight) => {
    if (!webhookUrl) {
      setShowSettings(true);
      alert("Please configure the Automation Webhook URL first.");
      return;
    }

    setIsSending(insight.id || 999);
    
    // Set payload and submit form
    // We use a timeout to ensure state updates before submission
    setPayload(JSON.stringify(insight));
    
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.submit();
        // Since we can't detect success from an iframe submission easily, 
        // we just assume success after a short delay and notify the user.
        setTimeout(() => {
          setIsSending(null);
          alert('Sent to Google Sheet!');
        }, 1000);
      }
    }, 100);
  };

  const fetchInsights = async () => {
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setInsights(data);
    } catch (e) {
      console.error("Failed to fetch insights", e);
    }
  };

  const handleAnalyze = async () => {
    if (!inputValue.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      let textToAnalyze = inputValue;
      let sourceUrl = '';

      if (inputMode === 'url') {
        sourceUrl = inputValue;
        const scrapeRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputValue })
        });
        
        if (!scrapeRes.ok) {
          const errText = await scrapeRes.text();
          let errMsg = 'Failed to fetch URL';
          try {
             const errData = JSON.parse(errText);
             errMsg = errData.error || errMsg;
          } catch (e) {
             errMsg = `Server Error (${scrapeRes.status}): ${errText.slice(0, 100)}`;
          }
          throw new Error(errMsg);
        }
        
        const data = await scrapeRes.json();
        textToAnalyze = data.content;
        if (!textToAnalyze) throw new Error("Could not extract text from this URL. Please try pasting the text directly.");
      }

      const result = await analyzeContent(textToAnalyze);
      
setAnalysisResult({
  company: result.company,
  summary: result.summary,
  impact: result.impact,
  action: result.action,
  url: sourceUrl,
  date: new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'short', timeStyle: 'short' })
});


    } catch (err: any) {
      setError(err.message || "An error occurred during analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysisResult) return;

    try {
      await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisResult)
      });
      
      await fetchInsights();
      setActiveTab('dashboard');
      setAnalysisResult(null);
      setInputValue('');
    } catch (e) {
      console.error("Failed to save", e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/insights/${id}`, { method: 'DELETE' });
      fetchInsights();
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans relative selection:bg-[#00F0B5] selection:text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Official Waymo Logo */}
            <div className="flex items-center gap-4 select-none">
               <img 
                 src="https://cdn.brandfetch.io/waymo.com/w/400/h/120?c=1bxid64Mup7aczewSAYMX" 
                 alt="Waymo" 
                 className="h-14 w-auto object-contain"
               />
              <span className="text-lg font-medium text-slate-400 border-l-2 border-slate-200 pl-4 pt-0.5 tracking-tight">
                Always On Intelligence
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-1 bg-slate-50 p-1.5 rounded-full border border-slate-100">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === 'dashboard' 
                    ? 'bg-[#0056D2] text-white shadow-md shadow-blue-200' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === 'add' 
                    ? 'bg-[#0056D2] text-white shadow-md shadow-blue-200' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Add Intelligence
              </button>
            </nav>
            <div className="h-6 w-px bg-slate-200"></div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 text-slate-400 hover:text-[#0056D2] hover:bg-blue-50 rounded-full transition-all duration-300"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' ? (
            <DashboardView 
              key="dashboard" 
              insights={insights} 
              onDelete={handleDelete}
              sheetUrl={sheetUrl}
              onSend={handleSendToSheet}
              isSending={isSending}
            />
          ) : (
            <AddView 
              key="add"
              inputMode={inputMode}
              setInputMode={setInputMode}
              inputValue={inputValue}
              setInputValue={setInputValue}
              handleAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              setAnalysisResult={setAnalysisResult}
              handleSave={handleSave}
              error={error}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Form for Google Sheets Submission */}
      <form 
        ref={formRef}
        action={webhookUrl} 
        method="POST" 
        target="hidden_iframe"
        className="hidden"
      >
        <input type="hidden" name="payload" value={payload} />
      </form>
      <iframe name="hidden_iframe" className="hidden" />

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Settings</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Google Sheet URL (Optional)
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      For the "Open Sheet" button.
                    </p>
                    <input 
                      type="url" 
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Automation Webhook URL
                    </label>
                    <p className="text-xs text-slate-500 mb-2">
                      Required for "Send to Sheet" button. 
                      <button 
                        onClick={() => setShowGuide(!showGuide)}
                        className="ml-1 text-indigo-600 hover:underline font-medium"
                      >
                        {showGuide ? "Hide Setup Guide" : "How do I get this?"}
                      </button>
                    </p>
                    <input 
                      type="url" 
                      placeholder="https://script.google.com/macros/s/..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 outline-none"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>

                  {showGuide && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-3">
                      <h4 className="font-bold text-slate-700">How to set up the Webhook:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-slate-600">
                        <li>Open your Google Sheet.</li>
                        <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
                        <li>Paste the code below into the editor (replace everything).</li>
                        <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
                        <li>Select type: <strong>Web app</strong>.</li>
                        <li>Set <em>Who has access</em> to: <strong>Anyone with Google Account</strong> (or Anyone in your Org).</li>
                        <li>Click <strong>Deploy</strong> and copy the <strong>Web app URL</strong>.</li>
                        <li>Paste that URL above.</li>
                      </ol>
                      <div className="relative">
                        <pre className="bg-slate-800 text-slate-200 p-3 rounded-md overflow-x-auto text-xs font-mono">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data;
  
  // Handle both JSON fetch and Form submission
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    if (e.parameter && e.parameter.payload) {
      data = JSON.parse(e.parameter.payload);
    }
  }

  if (data) {
    // Order: Date, Company, Summary, Impact, Action, URL
    sheet.appendRow([data.date, data.company, data.summary, data.impact, data.action, data.url]);
  }
  
  return ContentService.createTextOutput("Success");
}`}
                        </pre>
                        <button 
                          onClick={() => navigator.clipboard.writeText(`function doPost(e) {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n  var data;\n  try {\n    data = JSON.parse(e.postData.contents);\n  } catch(err) {\n    if (e.parameter && e.parameter.payload) {\n      data = JSON.parse(e.parameter.payload);\n    }\n  }\n\n  if (data) {\n    sheet.appendRow([data.date, data.company, data.summary, data.impact, data.action, data.url]);\n  }\n  return ContentService.createTextOutput("Success");\n}`)}
                          className="absolute top-2 right-2 p-1 bg-white/10 hover:bg-white/20 rounded text-white"
                          title="Copy Code"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => saveSettings(sheetUrl, webhookUrl)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700"
                >
                  Save Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardView({ 
  insights, 
  onDelete, 
  sheetUrl, 
  onSend, 
  isSending 
}: { 
  insights: Insight[], 
  onDelete: (id: number) => void, 
  sheetUrl: string,
  onSend: (insight: Insight) => void,
  isSending: number | null
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Market Intelligence</h2>
          <p className="text-slate-500">Tracked news and recruiting impacts.</p>
        </div>
        <div className="flex gap-2">
          {sheetUrl && (
            <a 
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium text-sm"
            >
              <ExternalLink size={16} />
              Open Sheet
            </a>
          )}
          <button 
            onClick={() => {
              const tsv = [
                ['Date', 'Company', 'Summary', 'Impact', 'Action', 'URL'],
                ...insights.map(i => [i.date, i.company, i.summary, i.impact, i.action, i.url])
              ].map(row => row.map(cell => (cell || '').replace(/\t/g, ' ')).join('\t')).join('\n');
              
              navigator.clipboard.writeText(tsv);
              alert('Copied to clipboard!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors font-medium text-sm"
          >
            <Copy size={16} />
            Copy All
          </button>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <LayoutDashboard size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No insights yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2">
            Start by adding a news article URL or text to generate recruiting intelligence.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
              {/* Decorative accent */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#00F0B5] via-[#0056D2] to-[#00F0B5]"></div>
              
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5">
                  {/* Company Logo & Name */}
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-2">
                    <img 
                      src={`https://cdn.brandfetch.io/${insight.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/w/100/h/100?c=1bxid64Mup7aczewSAYMX`}
                      alt={insight.company}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <span className="hidden text-xl font-black text-slate-300 uppercase">{insight.company.charAt(0)}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                      {insight.company}
                    </h3>
                    <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      {insight.date}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onSend(insight)}
                    disabled={isSending === insight.id}
                    className="flex items-center gap-2 px-5 py-2 bg-[#0056D2] text-white hover:bg-[#0042A1] rounded-full text-sm font-bold transition-colors shadow-md shadow-blue-100"
                  >
                    {isSending === insight.id ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                    Send to Sheet
                  </button>
                  {insight.url && (
                    <a 
                      href={insight.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2.5 text-slate-400 hover:text-[#0056D2] hover:bg-blue-50 rounded-full transition-colors"
                      title="Open Source URL"
                    >
                      <LinkIcon size={20} />
                    </a>
                  )}
                  <button 
                    onClick={() => onDelete(insight.id!)}
                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">The News</h4>
                  <p className="text-slate-900 text-sm leading-relaxed font-medium">
                    {(insight.summary || '').replace(/^[\s\-\•]+/, '')}
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[#F0FDFA] p-6 rounded-[2rem] border border-[#CCFBF1]">
                    <h4 className="text-xs font-bold text-[#0F766E] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00F0B5]"></span>
                      Why it Matters
                    </h4>
                    <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-medium">
                      {insight.impact}
                    </div>
                  </div>
                  
                  <div className="bg-[#EFF6FF] p-6 rounded-[2rem] border border-[#DBEAFE]">
                    <h4 className="text-xs font-bold text-[#1D4ED8] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0056D2]"></span>
                      Recommended Action
                    </h4>
                    <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line font-medium">
                      {insight.action}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AddView({ 
  inputMode, 
  setInputMode, 
  inputValue, 
  setInputValue, 
  handleAnalyze, 
  isAnalyzing, 
  analysisResult, 
  setAnalysisResult,
  handleSave,
  error
}: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Add New Intelligence</h2>
          
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setInputMode('url')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                inputMode === 'url' 
                  ? 'bg-[#0056D2] text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <LinkIcon size={18} />
              From URL
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                inputMode === 'text' 
                  ? 'bg-[#0056D2] text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText size={18} />
              Paste Text
            </button>
          </div>

          <div className="relative">
            {inputMode === 'url' ? (
              <input
                type="url"
                placeholder="https://techcrunch.com/..."
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50 outline-none transition-all text-lg"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            ) : (
              <textarea
                placeholder="Paste the article content here..."
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-[#0056D2] focus:ring-4 focus:ring-blue-50 outline-none transition-all h-48 resize-none text-lg"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !inputValue.trim()}
                className="flex items-center gap-2 px-8 py-3 bg-[#0056D2] hover:bg-[#0042A1] disabled:bg-slate-300 text-white rounded-full font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-xl disabled:shadow-none text-base"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze with Gemini
                    <span className="ml-1 text-[#00F0B5]">✨</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 text-sm rounded-2xl border border-red-100 flex items-center gap-3">
              <span className="font-bold bg-red-100 px-2 py-0.5 rounded text-red-800">Error</span> {error}
            </div>
          )}
        </div>

        {analysisResult && (
          <div className="p-8 bg-white animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-[#00F0B5] rounded-full"></div>
                Analysis Result
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Company</label>
                <input 
                  type="text" 
                  value={analysisResult.company} 
                  onChange={(e) => setAnalysisResult({...analysisResult, company: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#0056D2] outline-none text-slate-900 font-bold text-lg"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What Happened (Summary)</label>
                <textarea 
                  value={analysisResult.summary} 
                  onChange={(e) => setAnalysisResult({...analysisResult, summary: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#0056D2] outline-none text-slate-700 h-32 resize-none text-base leading-relaxed"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#0F766E] uppercase tracking-widest mb-2">Why It Matters</label>
                  <textarea 
                    value={analysisResult.impact} 
                    onChange={(e) => setAnalysisResult({...analysisResult, impact: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[#CCFBF1] focus:border-[#00F0B5] outline-none text-slate-700 h-40 resize-none bg-[#F0FDFA] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1D4ED8] uppercase tracking-widest mb-2">Recommended Action</label>
                  <textarea 
                    value={analysisResult.action} 
                    onChange={(e) => setAnalysisResult({...analysisResult, action: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-[#DBEAFE] focus:border-[#0056D2] outline-none text-slate-700 h-40 resize-none bg-[#EFF6FF] leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-end gap-4">
              <button 
                onClick={() => setAnalysisResult(null)}
                className="px-6 py-3 text-slate-500 hover:text-slate-800 font-bold transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-8 py-3 bg-[#0056D2] hover:bg-[#0042A1] text-white rounded-full font-bold transition-all shadow-lg shadow-blue-200 hover:shadow-xl"
              >
                <Save size={20} />
                Save to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default App;
