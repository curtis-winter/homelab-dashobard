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
  Info,
  Search,
  MoreVertical
} from "lucide-react";
import { DEFAULT_APPS, DEFAULT_IP, type HomeLabApp } from "./constants";

interface AppStatus extends HomeLabApp {
  isActive: boolean;
  isChecking: boolean;
  lastChecked?: Date;
}

export default function App() {
  // Load initial state from localStorage or defaults
  const [apps, setApps] = useState<HomeLabApp[]>(DEFAULT_APPS);
  const [ip, setIp] = useState<string>(DEFAULT_IP);
  const [isLoading, setIsLoading] = useState(true);

  const [appStatuses, setAppStatuses] = useState<AppStatus[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("home-lab-dark-mode");
      return saved === "true";
    }
    return false;
  });
  
  // Settings form state
  const [editingApps, setEditingApps] = useState<HomeLabApp[]>([]);
  const [editingIp, setEditingIp] = useState("");
  const [currentlyEditingId, setCurrentlyEditingId] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<{ port: number; name: string; useHttps: boolean; url: string }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLookingUpIcon, setIsLookingUpIcon] = useState<string | null>(null);
  const [customPorts, setCustomPorts] = useState("");
  const [isSingleEditOpen, setIsSingleEditOpen] = useState(false);
  const [singleEditApp, setSingleEditApp] = useState<HomeLabApp | null>(null);

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

    const pathSuffix = app.path ? (app.path.startsWith('/') ? app.path : `/${app.path}`) : "";
    try {
      await fetch(`${protocol}://${targetIp}:${app.port}${pathSuffix}`, {
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
    
    const now = new Date();
    const results = await Promise.all(
      apps.map(async (app) => {
        const isActive = await checkStatus(app, ip);
        return { ...app, isActive, isChecking: false, lastChecked: now };
      })
    );
    
    setAppStatuses(results);
    setLastUpdated(now);
  };

  useEffect(() => {
    const interval = setInterval(refreshAll, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [apps, ip]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("home-lab-dark-mode", darkMode.toString());
  }, [darkMode]);

  const onlineApps = useMemo(() => {
    return appStatuses.filter(a => a.isActive).sort((a, b) => a.name.localeCompare(b.name));
  }, [appStatuses]);

  const offlineApps = useMemo(() => {
    return appStatuses.filter(a => !a.isActive).sort((a, b) => a.name.localeCompare(b.name));
  }, [appStatuses]);

  // Settings Handlers
  const openSettings = () => {
    const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
    setEditingApps(sorted);
    setEditingIp(ip);
    setSettingsError(null);
    setScanResults([]);
    setCustomPorts("");
    setIsSettingsOpen(true);
  };

  const addApp = () => {
    const newApp: HomeLabApp = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
      name: "",
      port: 80,
      path: "",
      description: "",
      useHttps: false,
      iconUrl: ""
    };
    setEditingApps(prev => [newApp, ...prev]);
    setCurrentlyEditingId(newApp.id);
  };

  const handleScan = async () => {
    if (!editingIp) {
      setSettingsError("Please enter a Node IP Address first.");
      return;
    }
    
    setIsScanning(true);
    setScanResults([]);
    setSettingsError(null);
    
    try {
      const url = `/api/scan?ip=${editingIp}${customPorts ? `&ports=${encodeURIComponent(customPorts)}` : ""}`;
      const response = await fetch(url);
      if (response.ok) {
        const results = await response.json();
        // Filter out apps that are already in editingApps
        const filteredResults = results.filter((result: any) => 
          !editingApps.some(app => app.port === result.port)
        );
        setScanResults(filteredResults);
        if (filteredResults.length === 0) {
          setSettingsError("No new applications found on the specified ports.");
        }
      } else {
        setSettingsError("Failed to scan ports. Make sure the Node IP is reachable from the server.");
      }
    } catch (error) {
      console.error("Scan error:", error);
      setSettingsError("An error occurred while scanning ports.");
    } finally {
      setIsScanning(false);
    }
  };

  const quickAdd = (result: { port: number; name: string; useHttps: boolean }) => {
    const newApp: HomeLabApp = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString(),
      name: result.name,
      port: result.port,
      path: "",
      description: "Discovered via scan",
      useHttps: result.useHttps,
      iconUrl: ""
    };
    setEditingApps(prev => [newApp, ...prev]);
    setScanResults(prev => prev.filter(r => r.port !== result.port));
    setCurrentlyEditingId(newApp.id);
    lookupIcon(newApp.id, newApp.name);
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
    if (singleEditApp?.id === id) {
      setSingleEditApp(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const lookupIcon = async (id: string, name: string) => {
    if (!name) {
      setSettingsError("Please enter an application name first.");
      return;
    }
    
    setIsLookingUpIcon(id);
    setSettingsError(null);
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const variants = [
      slug,
      name.toLowerCase(),
      slug.replace(/-/g, ''),
    ];
    
    let found = false;
    for (const variant of variants) {
      const url = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${variant}.png`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          updateEditingApp(id, "iconUrl", url);
          found = true;
          break;
        }
      } catch (e) {
        // If fetch fails (e.g. CORS), we can't be sure, but jsdelivr usually works
      }
    }
    
    if (!found) {
      setSettingsError(`Could not find an icon for "${name}" on dashboardicons.com.`);
    }
    setIsLookingUpIcon(null);
  };

  const saveConfig = async (newApps: HomeLabApp[], newIp: string) => {
    try {
      setSettingsError(null);
      const newConfig = { apps: newApps, ip: newIp };
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      
      if (response.ok) {
        setApps(newApps);
        setIp(newIp);
        return true;
      } else {
        const data = await response.json();
        setSettingsError(data.message || "Failed to save settings to the server.");
        return false;
      }
    } catch (error) {
      console.error("Failed to save config to backend", error);
      setSettingsError("Failed to save settings to the server.");
      return false;
    }
  };

  const saveSettings = async () => {
    const success = await saveConfig(editingApps, editingIp);
    if (success) {
      setIsSettingsOpen(false);
    }
  };

  const openSingleEdit = (app: HomeLabApp) => {
    setSingleEditApp({ ...app });
    setIsSingleEditOpen(true);
  };

  const saveSingleApp = async () => {
    if (!singleEditApp) return;
    const updatedApps = apps.map(a => a.id === singleEditApp.id ? singleEditApp : a);
    const success = await saveConfig(updatedApps, ip);
    if (success) {
      setIsSingleEditOpen(false);
      setSingleEditApp(null);
    }
  };

  const deleteSingleApp = async () => {
    if (!singleEditApp) return;
    const updatedApps = apps.filter(a => a.id !== singleEditApp.id);
    const success = await saveConfig(updatedApps, ip);
    if (success) {
      setIsSingleEditOpen(false);
      setSingleEditApp(null);
    }
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-black selection:text-white transition-colors duration-500 ${darkMode ? "bg-[#0a0a0a] text-white" : "bg-[#f8f9fa] text-[#1a1a1a]"}`}>
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <header className={`sticky top-0 z-30 pt-12 pb-8 backdrop-blur-md flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 transition-colors duration-500 ${darkMode ? "bg-[#0a0a0a]/90" : "bg-[#f8f9fa]/90"}`}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex items-center gap-3 text-gray-400 mb-4 group cursor-default">
              <div className={`p-2 rounded-xl shadow-sm border transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 group-hover:border-white" : "bg-white border-gray-100 group-hover:border-black"}`}>
                <Server size={18} className={`transition-colors ${darkMode ? "group-hover:text-white" : "group-hover:text-black"}`} />
              </div>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase">Home Lab Infrastructure</span>
            </div>
            <h1 className="text-6xl font-light tracking-tighter mb-4">
              {ip}
            </h1>
            <div className="flex items-center gap-4">
              <p className={`text-sm flex items-center gap-2 px-3 py-1 rounded-full border shadow-sm transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800 text-gray-300" : "bg-white border-gray-100 text-gray-500"}`}>
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
              id="refresh-button"
              onClick={refreshAll}
              className={`p-3 border rounded-2xl transition-all shadow-sm active:scale-95 ${darkMode ? "bg-zinc-900 border-zinc-800 hover:border-white text-white" : "bg-white border-gray-200 hover:border-black text-black"}`}
              title="Refresh Status"
            >
              <RefreshCw size={20} className={appStatuses.some(a => a.isChecking) ? "animate-spin" : ""} />
            </button>
            <button
              id="configure-button"
              onClick={openSettings}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all shadow-lg active:scale-95 ${darkMode ? "bg-white text-black hover:bg-gray-200 shadow-white/5" : "bg-black text-white hover:bg-gray-800 shadow-black/10"}`}
            >
              <Settings size={18} />
              <span>Configure</span>
            </button>
          </motion.div>
        </header>

        {onlineApps.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
              <h2 className={`text-xs font-black uppercase tracking-[0.3em] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Online Applications</h2>
              <div className={`flex-1 h-[1px] ${darkMode ? "bg-zinc-900" : "bg-gray-100"}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {onlineApps.map((app) => (
                  <motion.a
                    key={app.id}
                    id={`app-card-${app.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    href={`${app.useHttps ? "https" : "http"}://${ip}:${app.port}${app.path ? (app.path.startsWith('/') ? app.path : `/${app.path}`) : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      group relative flex flex-col p-5 rounded-2xl transition-all duration-500
                      ${darkMode 
                        ? "bg-zinc-900 shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-[0_30px_60px_rgb(0,0,0,0.4)] border border-zinc-800 hover:ring-2 hover:ring-white hover:-translate-y-2"
                        : "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_30px_60px_rgb(0,0,0,0.12)] border border-gray-100 hover:ring-2 hover:ring-black hover:-translate-y-2"}
                    `}
                  >
                    <div className="flex items-center gap-5 mb-4">
                      <div className={`
                        p-3 rounded-2xl transition-all duration-500 flex items-center justify-center overflow-hidden shrink-0
                        ${darkMode ? "bg-zinc-800 text-white" : "bg-gray-50 text-black"}
                      `}>
                        {app.iconUrl ? (
                          <img 
                            src={app.iconUrl} 
                            alt={app.name} 
                            className="w-8 h-8 object-contain transition-all duration-500"
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
                      
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className={`
                          text-2xl font-semibold tracking-tight transition-colors truncate
                          ${darkMode ? "text-white" : "text-gray-900"}
                        `}>
                          {app.name}
                        </h2>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openSingleEdit(app);
                          }}
                          className={`p-1.5 rounded-full transition-colors shrink-0 ${darkMode ? "hover:bg-zinc-800 text-zinc-500 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}
                          title="Edit Application"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`
                          text-xs font-mono px-2 py-1 rounded-lg transition-colors
                          ${darkMode ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500"}
                        `}>
                          {app.port}{app.path ? (app.path.startsWith('/') ? app.path : `/${app.path}`) : ""}
                        </p>
                        {app.description && (
                          <span className={`
                            text-[10px] uppercase tracking-widest font-bold truncate
                            ${darkMode ? "text-zinc-500" : "text-gray-300"}
                          `}>
                            {app.description}
                          </span>
                        )}
                      </div>
                      {app.lastChecked && (
                        <div className={`mt-2 text-[8px] uppercase tracking-widest font-medium ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                          Last checked {app.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {offlineApps.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              <h2 className={`text-xs font-black uppercase tracking-[0.3em] ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Offline Applications</h2>
              <div className={`flex-1 h-[1px] ${darkMode ? "bg-zinc-900" : "bg-gray-100"}`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {offlineApps.map((app) => (
                  <motion.a
                    key={app.id}
                    id={`app-card-${app.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    href={`${app.useHttps ? "https" : "http"}://${ip}:${app.port}${app.path ? (app.path.startsWith('/') ? app.path : `/${app.path}`) : ""}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      group relative flex flex-col p-5 rounded-2xl transition-all duration-500
                      ${darkMode
                        ? "bg-zinc-900/40 border border-dashed border-zinc-800 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:-translate-y-1"
                        : "bg-gray-100/40 border border-dashed border-gray-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:-translate-y-1"}
                    `}
                  >
                    <div className="flex items-center gap-5 mb-4">
                      <div className={`
                        p-3 rounded-2xl transition-all duration-500 flex items-center justify-center overflow-hidden shrink-0
                        ${darkMode ? "bg-zinc-800/50 text-zinc-600" : "bg-gray-200/50 text-gray-400"}
                      `}>
                        {app.iconUrl ? (
                          <img 
                            src={app.iconUrl} 
                            alt={app.name} 
                            className="w-8 h-8 object-contain transition-all duration-500 opacity-50 group-hover:opacity-100"
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
                      
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className={`
                          text-2xl font-semibold tracking-tight transition-colors truncate
                          ${darkMode ? "text-zinc-600 group-hover:text-white" : "text-gray-400 group-hover:text-gray-900"}
                        `}>
                          {app.name}
                        </h2>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openSingleEdit(app);
                          }}
                          className={`p-1.5 rounded-full transition-colors shrink-0 ${darkMode ? "hover:bg-zinc-800 text-zinc-500 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}
                          title="Edit Application"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between gap-4">
                        <p className={`
                          text-xs font-mono px-2 py-1 rounded-lg transition-colors
                          ${darkMode ? "bg-zinc-800/30 text-zinc-700 group-hover:text-zinc-400" : "bg-gray-200/30 text-gray-400 group-hover:text-gray-500"}
                        `}>
                          {app.port}{app.path ? (app.path.startsWith('/') ? app.path : `/${app.path}`) : ""}
                        </p>
                        {app.description && (
                          <span className={`
                            text-[10px] uppercase tracking-widest font-bold truncate
                            ${darkMode ? "text-zinc-700 group-hover:text-zinc-500" : "text-gray-200 group-hover:text-gray-300"}
                          `}>
                            {app.description}
                          </span>
                        )}
                      </div>
                      {app.lastChecked && (
                        <div className={`mt-2 text-[8px] uppercase tracking-widest font-medium ${darkMode ? "text-zinc-800 group-hover:text-zinc-600" : "text-gray-300 group-hover:text-gray-400"}`}>
                          Last checked {app.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </motion.a>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
          
          {apps.length === 0 && (
            <div className={`col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] ${darkMode ? "border-zinc-800" : "border-gray-200"}`}>
              <Info className={`mx-auto mb-4 ${darkMode ? "text-zinc-700" : "text-gray-300"}`} size={48} />
              <p className={`${darkMode ? "text-zinc-500" : "text-gray-400"} font-medium`}>No applications configured.</p>
              <button onClick={openSettings} className={`mt-4 underline font-bold text-sm ${darkMode ? "text-white" : "text-black"}`}>Open Configuration</button>
            </div>
          )}
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
              className={`fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 shadow-2xl flex flex-col transition-colors duration-500 ${darkMode ? "bg-zinc-950 text-white" : "bg-white text-black"}`}
            >
              <div className={`p-8 border-b flex items-center justify-between ${darkMode ? "border-zinc-900" : "border-gray-100"}`}>
                <div>
                  <h2 className="text-3xl font-light tracking-tight">Configuration</h2>
                  <p className={`text-sm mt-1 ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Manage your home lab endpoints</p>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${darkMode ? "hover:bg-zinc-900" : "hover:bg-gray-100"}`}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {settingsError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border rounded-2xl flex items-center gap-3 text-sm ${darkMode ? "bg-red-950/20 border-red-900/50 text-red-400" : "bg-red-50 border-red-100 text-red-600"}`}
                  >
                    <Info size={18} />
                    <span>{settingsError}</span>
                  </motion.div>
                )}
                
                <section>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Server Settings</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="server-ip-input" className={`text-xs font-bold uppercase tracking-wider ${darkMode ? "text-zinc-500" : "text-gray-500"}`}>Node IP Address</label>
                      <input 
                        id="server-ip-input"
                        type="text" 
                        value={editingIp}
                        onChange={(e) => setEditingIp(e.target.value)}
                        className={`w-full p-4 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-lg font-mono ${darkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-white" : "bg-gray-50 border-gray-100 text-black"}`}
                        placeholder="e.g. 10.0.0.134"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>User Settings</h3>
                  <div className="space-y-6">
                    <div className={`p-6 rounded-3xl border flex items-center justify-between transition-colors ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-100"}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${darkMode ? "bg-zinc-800 text-white" : "bg-white text-black shadow-sm"}`}>
                          <Activity size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Dark Mode</p>
                          <p className={`text-[10px] uppercase tracking-widest font-medium ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Local appearance setting</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${darkMode ? "bg-white" : "bg-zinc-200"}`}
                      >
                        <motion.div 
                          animate={{ x: darkMode ? 26 : 4 }}
                          className={`absolute top-1 w-6 h-6 rounded-full shadow-md ${darkMode ? "bg-black" : "bg-white"}`}
                        />
                      </button>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Applications</h3>
                      <button 
                        id="add-app-button"
                        onClick={addApp}
                        className={`flex items-center justify-center gap-2 text-xs font-bold w-36 py-2 rounded-xl transition-all ${darkMode ? "bg-zinc-900 text-white hover:bg-white hover:text-black" : "bg-gray-100 text-black hover:bg-black hover:text-white"}`}
                      >
                        <Plus size={14} />
                        Add App
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="text"
                          value={customPorts}
                          onChange={(e) => setCustomPorts(e.target.value)}
                          placeholder="Custom ports (e.g. 80,443 or 8000-8100)"
                          className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-black/5 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white focus:border-white" : "bg-gray-50 border-gray-100 text-black focus:border-black"}`}
                        />
                        <Search size={14} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${darkMode ? "text-zinc-600" : "text-gray-400"}`} />
                      </div>
                      <button 
                        id="scan-ports-button"
                        onClick={handleScan}
                        disabled={isScanning}
                        className={`flex items-center justify-center gap-2 text-xs font-bold w-36 py-2 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap ${darkMode ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-gray-100 text-black hover:bg-gray-200"}`}
                      >
                        <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} />
                        {isScanning ? "Scanning..." : "Scan Ports"}
                      </button>
                    </div>
                    <p className={`text-[9px] font-medium ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
                      Leave empty to scan common ports. Max 100 ports per scan.
                    </p>
                  </div>

                  <AnimatePresence>
                    {scanResults.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-8 space-y-4"
                      >
                        <div className={`p-4 rounded-2xl border ${darkMode ? "bg-zinc-900/30 border-zinc-800" : "bg-blue-50/50 border-blue-100"}`}>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${darkMode ? "text-zinc-500" : "text-blue-400"}`}>Discovered Applications</p>
                          <div className="grid grid-cols-1 gap-2">
                            {scanResults.map((result) => (
                              <div key={result.port} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-gray-100 hover:border-gray-200"}`}>
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${darkMode ? "bg-zinc-800 text-white" : "bg-gray-50 text-black"}`}>
                                    <Activity size={14} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold">{result.name}</p>
                                      <a 
                                        href={result.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`p-1 rounded-md transition-colors ${darkMode ? "hover:bg-zinc-800 text-zinc-500 hover:text-white" : "hover:bg-gray-100 text-gray-400 hover:text-black"}`}
                                        title="Open landing page"
                                      >
                                        <ExternalLink size={10} />
                                      </a>
                                    </div>
                                    <p className={`text-[9px] font-mono ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Port {result.port} • {result.useHttps ? "HTTPS" : "HTTP"}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => quickAdd(result)}
                                  className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${darkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
                                >
                                  <Plus size={12} />
                                  Quick Add
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

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
                              ? darkMode ? "bg-zinc-900 border-white shadow-xl scale-[1.02] z-10" : "bg-white border-black shadow-xl scale-[1.02] z-10" 
                              : darkMode ? "bg-zinc-900/50 border-zinc-900 hover:border-zinc-700 cursor-pointer" : "bg-gray-50 border-gray-100 hover:border-gray-300 cursor-pointer"}
                          `}
                          id={`editing-app-${app.id}`}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 space-y-1">
                              <label htmlFor={`app-name-${app.id}`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Name</label>
                              <input 
                                id={`app-name-${app.id}`}
                                type="text" 
                                value={app.name}
                                autoFocus={isEditing && app.name === ""}
                                onChange={(e) => updateEditingApp(app.id, "name", e.target.value)}
                                placeholder="Application Name"
                                className={`w-full bg-transparent border-b focus:outline-none py-1 font-medium transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor={`app-port-${app.id}`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Port</label>
                              <input 
                                id={`app-port-${app.id}`}
                                type="number" 
                                value={app.port}
                                onChange={(e) => updateEditingApp(app.id, "port", parseInt(e.target.value) || 0)}
                                className={`w-full bg-transparent border-b focus:outline-none py-1 font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                              />
                            </div>
                            <div className="space-y-1">
                              <label htmlFor={`app-path-${app.id}`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Path Suffix</label>
                              <input 
                                id={`app-path-${app.id}`}
                                type="text" 
                                value={app.path || ""}
                                onChange={(e) => updateEditingApp(app.id, "path", e.target.value)}
                                className={`w-full bg-transparent border-b focus:outline-none py-1 font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label htmlFor={`app-icon-${app.id}`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Icon URL</label>
                            <input 
                              id={`app-icon-${app.id}`}
                              type="text" 
                              value={app.iconUrl || ""}
                              onChange={(e) => updateEditingApp(app.id, "iconUrl", e.target.value)}
                              placeholder="https://example.com/logo.png"
                              className={`w-full bg-transparent border-b focus:outline-none py-1 text-sm font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-zinc-500" : "border-gray-200 focus:border-black text-gray-500"}`}
                            />
                            <div className="flex justify-end">
                              <button 
                                id={`lookup-icon-${app.id}`}
                                disabled={isLookingUpIcon === app.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  lookupIcon(app.id, app.name);
                                }}
                                className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors mt-1 ${darkMode ? "text-zinc-600 hover:text-white" : "text-gray-400 hover:text-black"}`}
                              >
                                <RefreshCw size={10} className={isLookingUpIcon === app.id ? "animate-spin" : ""} />
                                {isLookingUpIcon === app.id ? "Searching..." : "Lookup on dashboardicons.com"}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex-1 space-y-1">
                              <label htmlFor={`app-desc-${app.id}`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Description</label>
                              <input 
                                id={`app-desc-${app.id}`}
                                type="text" 
                                value={app.description || ""}
                                onChange={(e) => updateEditingApp(app.id, "description", e.target.value)}
                                placeholder="Description"
                                className={`w-full bg-transparent border-b focus:outline-none py-1 text-sm transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-zinc-500" : "border-gray-200 focus:border-black text-gray-500"}`}
                              />
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                              <input 
                                type="checkbox" 
                                id={`https-${app.id}`}
                                checked={app.useHttps || false}
                                onChange={(e) => updateEditingApp(app.id, "useHttps", e.target.checked)}
                                className={`w-4 h-4 rounded focus:ring-black ${darkMode ? "bg-zinc-900 border-zinc-800" : "border-gray-300 text-black"}`}
                              />
                              <label htmlFor={`https-${app.id}`} className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer ${darkMode ? "text-zinc-500" : "text-gray-500"}`}>HTTPS</label>
                            </div>
                          </div>
                          
                          {isEditing ? (
                            <div className="absolute -top-3 -right-3 flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentlyEditingId(null);
                                }}
                                className={`p-2 rounded-full shadow-lg transition-all ${darkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
                                title="Confirm Edit"
                              >
                                <Save size={14} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  discardAppEdit(app.id);
                                }}
                                className={`p-2 rounded-full shadow-lg border transition-all ${darkMode ? "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-red-400 hover:border-red-900" : "bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-200"}`}
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
                              className={`absolute -top-2 -right-2 p-2 rounded-full shadow-md border opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? "bg-zinc-900 text-red-400 border-zinc-800 hover:bg-red-950/30" : "bg-white text-red-500 border-gray-100 hover:bg-red-50"}`}
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

              <div className={`p-8 border-t flex gap-4 ${darkMode ? "border-zinc-900 bg-zinc-950/50" : "border-gray-100 bg-gray-50/50"}`}>
                <button 
                  id="save-settings-button"
                  onClick={saveSettings}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 ${darkMode ? "bg-white text-black hover:bg-gray-200 shadow-white/5" : "bg-black text-white hover:bg-gray-800 shadow-black/10"}`}
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button 
                  id="cancel-settings-button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`px-8 py-4 border rounded-2xl font-bold transition-all active:scale-95 ${darkMode ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800" : "bg-white border-gray-200 text-black hover:bg-gray-100"}`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Single App Edit Modal */}
      <AnimatePresence>
        {isSingleEditOpen && singleEditApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSingleEditOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[70] p-8 rounded-[2.5rem] shadow-2xl transition-colors duration-500 ${darkMode ? "bg-zinc-950 text-white" : "bg-white text-black"}`}
            >
              <div className="mb-8">
                <h2 className="text-2xl font-light tracking-tight">Edit Application</h2>
                <p className={`text-xs mt-1 ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>Configure {singleEditApp.name || "New Application"}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label htmlFor={`single-app-name`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Name</label>
                    <input 
                      id={`single-app-name`}
                      type="text" 
                      value={singleEditApp.name}
                      onChange={(e) => updateEditingApp(singleEditApp.id, "name", e.target.value)}
                      placeholder="Application Name"
                      className={`w-full bg-transparent border-b focus:outline-none py-1 font-medium transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`single-app-port`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Port</label>
                    <input 
                      id={`single-app-port`}
                      type="number" 
                      value={singleEditApp.port}
                      onChange={(e) => updateEditingApp(singleEditApp.id, "port", parseInt(e.target.value) || 0)}
                      className={`w-full bg-transparent border-b focus:outline-none py-1 font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`single-app-path`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Path Suffix</label>
                    <input 
                      id={`single-app-path`}
                      type="text" 
                      value={singleEditApp.path || ""}
                      onChange={(e) => updateEditingApp(singleEditApp.id, "path", e.target.value)}
                      className={`w-full bg-transparent border-b focus:outline-none py-1 font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-white" : "border-gray-200 focus:border-black text-black"}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor={`single-app-icon`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Icon URL</label>
                  <input 
                    id={`single-app-icon`}
                    type="text" 
                    value={singleEditApp.iconUrl || ""}
                    onChange={(e) => updateEditingApp(singleEditApp.id, "iconUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className={`w-full bg-transparent border-b focus:outline-none py-1 text-sm font-mono transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-zinc-500" : "border-gray-200 focus:border-black text-gray-500"}`}
                  />
                  <div className="flex justify-end">
                    <button 
                      disabled={isLookingUpIcon === singleEditApp.id}
                      onClick={() => lookupIcon(singleEditApp.id, singleEditApp.name)}
                      className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors mt-1 disabled:opacity-50 ${darkMode ? "text-zinc-600 hover:text-white" : "text-gray-400 hover:text-black"}`}
                    >
                      <RefreshCw size={10} className={isLookingUpIcon === singleEditApp.id ? "animate-spin" : ""} />
                      {isLookingUpIcon === singleEditApp.id ? "Searching..." : "Lookup on dashboardicons.com"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-1">
                    <label htmlFor={`single-app-desc`} className={`text-[9px] font-bold uppercase tracking-widest ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>Description</label>
                    <input 
                      id={`single-app-desc`}
                      type="text" 
                      value={singleEditApp.description || ""}
                      onChange={(e) => updateEditingApp(singleEditApp.id, "description", e.target.value)}
                      placeholder="Description"
                      className={`w-full bg-transparent border-b focus:outline-none py-1 text-sm transition-colors ${darkMode ? "border-zinc-800 focus:border-white text-zinc-500" : "border-gray-200 focus:border-black text-gray-500"}`}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <input 
                      type="checkbox" 
                      id={`single-https`}
                      checked={singleEditApp.useHttps || false}
                      onChange={(e) => updateEditingApp(singleEditApp.id, "useHttps", e.target.checked)}
                      className={`w-4 h-4 rounded focus:ring-black ${darkMode ? "bg-zinc-900 border-zinc-800" : "border-gray-300 text-black"}`}
                    />
                    <label htmlFor={`single-https`} className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer ${darkMode ? "text-zinc-500" : "text-gray-500"}`}>HTTPS</label>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <div className="flex gap-3">
                    <button
                      onClick={saveSingleApp}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${darkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"}`}
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsSingleEditOpen(false)}
                      className={`flex-1 py-3 rounded-2xl font-bold border transition-all ${darkMode ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" : "bg-white border-gray-100 text-gray-400 hover:text-black"}`}
                    >
                      Cancel
                    </button>
                  </div>
                  <button
                    onClick={deleteSingleApp}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold border transition-all ${darkMode ? "bg-red-950/20 border-red-900/50 text-red-400 hover:bg-red-900/30" : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"}`}
                  >
                    <Trash2 size={18} />
                    Delete Application
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
