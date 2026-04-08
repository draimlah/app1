import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardList, 
  BarChart3, 
  Plus, 
  Play, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  BrainCircuit,
  UserPlus,
  Monitor,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Persona, generatePersona, analyzePage } from './lib/gemini';

// --- Components ---

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

const PersonaCard = ({ persona, onSelect }: any) => {
  const [url, setUrl] = useState('');

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
          {persona.name[0]}
        </div>
        <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {persona.gender} • {persona.age}
        </div>
      </div>
      <h3 className="font-bold text-slate-900 mb-1">{persona.name}</h3>
      <p className="text-xs text-slate-500 mb-1">{persona.education} • {persona.income}</p>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-tight">
          📍 {persona.location?.city}, {persona.location?.country}
        </p>
        {persona.proxy && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">PROXY</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {persona.interests.slice(0, 3).map((interest, i) => (
          <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] rounded-full font-medium">
            {interest}
          </span>
        ))}
      </div>
      
      <div className="space-y-2">
        <input 
          type="text" 
          placeholder="Survey URL..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        <button 
          onClick={() => onSelect(url)}
          disabled={!url}
          className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-3 h-3" /> Start Survey
        </button>
      </div>
    </div>
  );
};

const LivePreview = ({ surveyId, onClose }: { surveyId: string, onClose: () => void }) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchScreenshot = async () => {
      try {
        const res = await fetch(`/api/surveys/${surveyId}/screenshot`);
        if (res.ok) {
          const data = await res.json();
          setScreenshot(data.screenshot);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      }
    };

    fetchScreenshot();
    const interval = setInterval(fetchScreenshot, 3000);
    return () => clearInterval(interval);
  }, [surveyId]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Live Automation Preview</h3>
              <p className="text-xs text-slate-500">Real-time view of the automated browser</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center min-h-[400px]">
          {screenshot ? (
            <div className="relative border-8 border-slate-800 rounded-xl shadow-2xl overflow-hidden bg-white">
              <img 
                src={`data:image/jpeg;base64,${screenshot}`} 
                alt="Live Preview" 
                className="max-w-full h-auto"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                LIVE
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
              <p className="text-slate-500 font-medium">{error ? 'Waiting for first screenshot...' : 'Connecting to browser...'}</p>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Browser Active</span>
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <p className="text-xs text-slate-500">ID: {surveyId}</p>
          </div>
          <p className="text-xs text-slate-400 italic">This view updates every 3 seconds</p>
        </div>
      </motion.div>
    </div>
  );
};

const AutomationBrain = ({ onOpenPreview }: { onOpenPreview: (id: string) => void }) => {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isProcessing) return;
      
      try {
        const res = await fetch('/api/tasks/pending');
        if (res.ok) {
          const task = await res.json();
          setActiveTask(task);
          processTask(task);
        }
      } catch (err) {
        // No pending tasks or server down
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const processTask = async (task: any) => {
    setIsProcessing(true);
    try {
      const payload = JSON.parse(task.payload);
      const result = await analyzePage(payload.persona, payload);
      
      await fetch(`/api/tasks/${task.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result })
      });
      
      setActiveTask(null);
    } catch (err) {
      console.error('Brain processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!activeTask) return null;

  return (
    <div 
      onClick={() => onOpenPreview(activeTask.survey_id)}
      className="fixed bottom-6 right-6 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 z-50 cursor-pointer hover:bg-slate-800 transition-colors group"
    >
      <div className="relative">
        <BrainCircuit className="w-6 h-6 text-indigo-400 animate-pulse" />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-0.5">AI Brain Active</p>
        <p className="text-sm font-medium">Analyzing survey page...</p>
      </div>
      <div className="ml-2 p-1.5 bg-slate-800 rounded-lg group-hover:bg-indigo-600 transition-colors">
        <Monitor className="w-4 h-4" />
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profiles, setProfiles] = useState<Persona[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, completed: 0, failed: 0, avg_time: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSurveyId, setPreviewSurveyId] = useState<string | null>(null);
  const [globalProxy, setGlobalProxy] = useState(localStorage.getItem('global_proxy') || '');

  const saveGlobalProxy = (val: string) => {
    setGlobalProxy(val);
    localStorage.setItem('global_proxy', val);
  };

  const fetchData = async () => {
    try {
      const [pRes, sRes, stRes] = await Promise.all([
        fetch('/api/profiles'),
        fetch('/api/surveys'),
        fetch('/api/stats')
      ]);
      setProfiles(await pRes.json());
      setSurveys(await sRes.json());
      setStats(await stRes.json());
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreatePersona = async () => {
    setIsGenerating(true);
    try {
      const newPersona = await generatePersona();
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPersona, proxy: globalProxy })
      });
      fetchData();
    } catch (err) {
      console.error('Persona generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunSurvey = async (profileId: string, url: string) => {
    if (!url) return;

    try {
      await fetch('/api/surveys/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, url })
      });
      fetchData();
      setActiveTab('surveys');
    } catch (err) {
      console.error('Survey start failed:', err);
    }
  };

  const handleStopSurvey = async (id: string) => {
    try {
      await fetch(`/api/surveys/${id}/stop`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Stop failed:', err);
    }
  };

  const testAI = async () => {
    try {
      const res = await analyzePage(profiles[0] || {} as any, { title: 'Test', url: 'test', questions: [] });
      alert('AI Connection Successful: ' + res.summary);
    } catch (err) {
      alert('AI Connection Failed: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-900">SmartSurvey</h1>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'profiles', label: 'User Personas', icon: Users },
              { id: 'surveys', label: 'Survey History', icon: ClipboardList },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === item.id 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">System Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="text-sm font-medium">All Systems Operational</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">{activeTab}</h2>
            <p className="text-slate-500 font-medium">Manage your intelligent survey assistant</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCreatePersona}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Generate Persona
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Surveys" value={stats.total} icon={ClipboardList} color="bg-blue-500" />
                <StatCard title="Completed" value={stats.completed} icon={CheckCircle2} color="bg-emerald-500" />
                <StatCard title="Failed/Blocked" value={stats.failed} icon={XCircle} color="bg-rose-500" />
                <StatCard title="Avg. Time (s)" value={Math.round(stats.avg_time)} icon={BarChart3} color="bg-amber-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Recent Activity</h3>
                  <div className="space-y-4">
                    {surveys.slice(0, 5).map((survey) => (
                      <div key={survey.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${survey.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                            {survey.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{survey.url}</p>
                            <p className="text-xs text-slate-500">Persona: {survey.profile_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {survey.status === 'running' && (
                            <button 
                              onClick={() => setPreviewSurveyId(survey.id)}
                              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                              title="Live Preview"
                            >
                              <Monitor className="w-4 h-4" />
                            </button>
                          )}
                          <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{survey.status}</p>
                            <p className="text-[10px] text-slate-400">{new Date(survey.start_time).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {surveys.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No recent activity found</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Active Personas</h3>
                  <div className="space-y-4">
                    {profiles.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.age}y • {p.gender}</p>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setActiveTab('profiles')}
                      className="w-full py-3 text-indigo-600 font-bold text-sm hover:underline"
                    >
                      View All Personas
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profiles' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {profiles.map((p) => (
                <PersonaCard key={p.id} persona={p} onSelect={(url: string) => handleRunSurvey(p.id, url)} />
              ))}
              <button 
                onClick={handleCreatePersona}
                className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-all group"
              >
                <div className="p-3 bg-slate-100 rounded-full group-hover:bg-indigo-50 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm">Create New Persona</span>
              </button>
            </motion.div>
          )}

          {activeTab === 'surveys' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-bottom border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Survey URL</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Persona</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Started</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Duration</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900 truncate max-w-xs">{s.url}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {s.profile_name[0]}
                          </div>
                          <span className="text-sm text-slate-600">{s.profile_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                          s.status === 'failed' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(s.start_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {s.end_time ? `${Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000)}s` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setPreviewSurveyId(s.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Live Preview"
                          >
                            <Monitor className="w-5 h-5" />
                          </button>
                          {s.status === 'running' && (
                            <button 
                              onClick={() => handleStopSurvey(s.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Stop Survey"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl space-y-8"
            >
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Automation Settings
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Global Proxy Configuration</label>
                    <p className="text-xs text-slate-500 mb-4">
                      All new personas will be created with this proxy. Use format: <code className="bg-slate-100 px-1 rounded text-indigo-600">http://user:pass@host:port</code>
                    </p>
                    <input 
                      type="text" 
                      value={globalProxy}
                      onChange={(e) => saveGlobalProxy(e.target.value)}
                      placeholder="http://proxy-server.com:8080"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2">AI Connection Test</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed mb-4">
                      Verify your Gemini AI brain is ready to process surveys.
                    </p>
                    <button 
                      onClick={testAI}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Test AI Connection
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-2">USA-Only Mode Active</h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      The system is currently configured to only generate personas based in the United States. This ensures maximum compatibility with USA-locked survey sites.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6">System Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Engine</p>
                    <p className="text-sm font-bold text-slate-700">Playwright v1.41+</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Model</p>
                    <p className="text-sm font-bold text-slate-700">Gemini 3 Flash</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AutomationBrain onOpenPreview={setPreviewSurveyId} />
      
      <AnimatePresence>
        {previewSurveyId && (
          <LivePreview 
            surveyId={previewSurveyId} 
            onClose={() => setPreviewSurveyId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
