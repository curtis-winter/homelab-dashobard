import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Activity, 
  ExternalLink, 
  RefreshCw, 
  Server, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  X,
  Info
} from "lucide-react";
import { DEFAULT_APPS, DEFAULT_IP, type HomeLabApp } from "./constants";

interface AppStatus extends HomeLabApp {
  isActive: boolean;
  isChecking: boolean;
}

export default function App() {
  // Load initial state from localStorage or defaults
  const [apps, setApps] = useState<HomeLabApp[]>(DEFAULT_APPS);
  const [ip, setIp] = useState<string>(DEFAULT_IP);
  const [isLoading, setIsLoading] = useState(true);

  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Settings form state
  const [editingApps, setEditingApps] = useState<HomeLabApp[]>([]);
  const [editingIp, setEditingIp] = useState("");
  const [currentlyEditingId, setCurrentlyEditingId] = useState<string | null>(null);

  // Fetch config from backend on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setApps(data.apps);
          setIp(data.ip);
        }
      } catch (error) {
        console.error("Failed to fetch config from backend, using defaults", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Initialize statuses when apps change
  useEffect(() => {
    if (!isLoading) {
      setAppStatuses(apps.map(app => ({ ...app, isActive: false, isChecking: true })));
      refreshAll();
    }
  }, [apps, ip, isLoading]);

  const checkStatus = async (app: HomeLabApp, targetIp: string): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const protocol = app.useHttps ? "https" : "http";

    try {
      await fetch(`${protocol}://${targetIp}:${app.port}`, {
        mode: "no-cors",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  };

  const refreshAll = async () => {
    setAppStatuses(prev => prev.map(app => ({ ...app, isChecking: true })));
    
    const results = await Promise.all(
      apps.map(async (app) => {
        const isActive = await checkStatus(app, ip);
        return { ...app, isActive, isChecking: false };
      })
    );
    
    setAppStatuses(results);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    const interval = setInterval(refreshAll, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [apps, ip]);

  const sortedApps = useMemo(() => {
    return [...appStatuses].sort((a, b) => {
      if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
      return a.isActive ? -1 : 1;
    });
  }, [appStatuses]);

  // Settings Handlers
  const openSettings = () => {
    const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
    setEditingApps(sorted);
    setEditingIp(ip);
    setIsSettingsOpen(true);
  };

  const addApp = () => {
    const newApp: HomeLabApp = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
      name: "",
      port: 80,
      description: "",
      useHttps: false,
      iconUrl: ""
    };
    setEditingApps(prev => [newApp, ...prev]);
    setCurrentlyEditingId(newApp.id);
  };

  const removeApp = (id: string) => {
    setEditingApps(prev => prev.filter(a => a.id !== id));
    if (currentlyEditingId === id) setCurrentlyEditingId(null);
  };

  const discardAppEdit = (id: string) => {
    const originalApp = apps.find(a => a.id === id);
    if (originalApp) {
      setEditingApps(prev => prev.map(a => a.id === id ? { ...originalApp } : a));
    } else {
      // It was a new app, remove it
      setEditingApps(prev => prev.filter(a => a.id !== id));
    }
    setCurrentlyEditingId(null);
  };

  const updateEditingApp = (id: string, field: keyof HomeLabApp, value: string | number | boolean) => {
    setEditingApps(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const saveSettings = async () => {
    try {
      const newConfig = { apps: editingApps, ip: editingIp };
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      
      if (response.ok) {
        setApps(editingApps);
        setIp(editingIp);
        setIsSettingsOpen(false);
      }
    } catch (error) {
      console.error("Failed to save config to backend", error);
      alert("Failed to save settings to the server.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <header className="sticky top-0 z-30 pt-12 pb-8 bg-[#f8f9fa]/90 backdrop-blur-md flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 text-gray-400 mb-4 group cursor-default">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:border-black transition-colors">
                <Server size={18} className="group-hover:text-black transition-colors" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Home Lab Infrastructure</span>
            </div>
            <h1 className="text-6xl font-light tracking-tighter mb-4">
              {ip}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-500 flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                <Activity size={14} className="text-green-500" />
                {appStatuses.filter(a => a.isActive).length} / {apps.length} Online
              </p>
              <span className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={refreshAll}
              className="p-3 bg-white border border-gray-200 rounded-2xl hover:border-black transition-all shadow-sm active:scale-95"
              title="Refresh Status"
            >
              <RefreshCw size={20} className={appStatuses.some(a => a.isChecking) ? "animate-spin" : ""} />
            </button>
            <button
              onClick={openSettings}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-medium hover:bg-gray-800 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              <Settings size={18} />
              <span>Configure</span>
            </button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedApps.map((app) => (
              <motion.a
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                href={`${app.useHttps ? "https" : "http"}://${ip}:${app.port}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  group relative flex flex-col p-8 rounded-[2.5rem] transition-all duration-500
                  ${app.isActive 
                    ? "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-gray-100" 
                    : "bg-gray-100/40 border border-dashed border-gray-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"}
                `}
              >
                <div className="flex justify-between items-start mb-8">
                  <div className={`
                    p-4 rounded-3xl transition-all duration-500 flex items-center justify-center overflow-hidden
                    ${app.isActive ? "bg-gray-50 text-black group-hover:bg-black group-hover:text-white" : "bg-gray-200/50 text-gray-400"}
                  `}>
                    {app.iconUrl ? (
                      <img 
                        src={app.iconUrl} 
                        alt={app.name} 
                        className={`w-8 h-8 object-contain transition-all duration-500 ${app.isActive ? "group-hover:invert group-hover:brightness-0 group-hover:contrast-100" : "opacity-50"}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={app.iconUrl ? "hidden" : ""}>
                      <ExternalLink size={24} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {app.isChecking ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Checking</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
                      </div>
                    ) : app.isActive ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600">Active</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Offline</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  <h2 className={`
                    text-2xl font-semibold mb-2 tracking-tight transition-colors
                    ${app.isActive ? "text-gray-900" : "text-gray-400"}
                  `}>
                    {app.name}
                  </h2>
                  <div className="flex items-center justify-between gap-4">
                    <p className={`
                      text-xs font-mono px-2 py-1 rounded-lg transition-colors
                      ${app.isActive ? "bg-gray-100 text-gray-500" : "bg-gray-200/30 text-gray-400"}
                    `}>
                      :{app.port}
                    </p>
                    {app.description && (
                      <span className={`
                        text-[10px] uppercase tracking-widest font-bold truncate
                        ${app.isActive ? "text-gray-300" : "text-gray-200"}
                      `}>
                        {app.description}
                      </span>
                    )}
                  </div>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
          
          {apps.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-[2.5rem]">
              <Info className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="text-gray-400 font-medium">No applications configured.</p>
              <button onClick={openSettings} className="mt-4 text-black underline font-bold text-sm">Open Configuration</button>
            </div>
          )}
        </div>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-light tracking-tight">Configuration</h2>
                  <p className="text-sm text-gray-400 mt-1">Manage your home lab endpoints</p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Server Settings</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Node IP Address</label>
                      <input 
                        type="text" 
                        value={editingIp}
                        onChange={(e) => setEditingIp(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-lg font-mono"
                        placeholder="e.g. 10.0.0.134"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Applications</h3>
                    <button 
                      onClick={addApp}
                      className="flex items-center gap-2 text-xs font-bold bg-gray-100 hover:bg-black hover:text-white px-4 py-2 rounded-xl transition-all"
                    >
                      <Plus size={14} />
                      Add App
                    </button>
                  </div>

                  <div className="space-y-4">
                    {editingApps.map((app) => {
                      const isEditing = currentlyEditingId === app.id;
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => !isEditing && setCurrentlyEditingId(app.id)}
                          className={`
                            p-6 rounded-3xl border transition-all duration-300 group relative
                            ${isEditing 
                              ? "bg-white border-black shadow-xl scale-[1.02] z-10" 
                              : "bg-gray-50 border-gray-100 hover:border-gray-300 cursor-pointer"}
                          `}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Name</label>
                              <input 
                                type="text" 
                                value={app.name}
                                autoFocus={isEditing && app.name === ""}
                                onChange={(e) => updateEditingApp(app.id, "name", e.target.value)}
                                placeholder="Application Name"
                                className="w-full bg-transparent border-b border-gray-200 focus:border-black focus:outline-none py-1 font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Port</label>
                              <input 
                                type="number" 
                                value={app.port}
                                onChange={(e) => updateEditingApp(app.id, "port", parseInt(e.target.value) || 0)}
                                className="w-full bg-transparent border-b border-gray-200 focus:border-black focus:outline-none py-1 font-mono"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Icon URL</label>
                            <input 
                              type="text" 
                              value={app.iconUrl || ""}
                              onChange={(e) => updateEditingApp(app.id, "iconUrl", e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className="w-full bg-transparent border-b border-gray-200 focus:border-black focus:outline-none py-1 text-sm font-mono text-gray-500"
                            />
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                              <input 
                                type="text" 
                                value={app.description || ""}
                                onChange={(e) => updateEditingApp(app.id, "description", e.target.value)}
                                placeholder="Description"
                                className="w-full bg-transparent border-b border-gray-200 focus:border-black focus:outline-none py-1 text-sm text-gray-500"
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                              <input 
                                type="checkbox" 
                                id={`https-${app.id}`}
                                checked={app.useHttps || false}
                                onChange={(e) => updateEditingApp(app.id, "useHttps", e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                              />
                              <label htmlFor={`https-${app.id}`} className="text-[10px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer">HTTPS</label>
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <div className="absolute -top-3 -right-3 flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentlyEditingId(null);
                                }}
                                className="p-2 bg-black text-white rounded-full shadow-lg hover:bg-gray-800 transition-all"
                                title="Confirm Edit"
                              >
                                <Save size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  discardAppEdit(app.id);
                                }}
                                className="p-2 bg-white text-gray-400 rounded-full shadow-lg border border-gray-200 hover:text-red-500 hover:border-red-200 transition-all"
                                title="Discard Changes"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                removeApp(app.id);
                              }}
                              className="absolute -top-2 -right-2 p-2 bg-white text-red-500 rounded-full shadow-md border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                <button 
                  onClick={saveSettings}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
