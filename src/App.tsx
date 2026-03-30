import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, ExternalLink, RefreshCw, Server, AlertCircle, CheckCircle2 } from "lucide-react";
import { APPS, HOME_LAB_IP, type HomeLabApp } from "./constants";

interface AppStatus extends HomeLabApp {
  isActive: boolean;
  isChecking: boolean;
}

export default function App() {
  const [appStatuses, setAppStatuses] = useState<AppStatus[]>(
    APPS.map((app) => ({ ...app, isActive: false, isChecking: true }))
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const checkStatus = async (app: HomeLabApp): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      // Using no-cors mode. If the port is closed, it usually throws a TypeError.
      // If it's open but CORS fails, it still "resolves" in a way that indicates connectivity.
      // Note: Modern browsers might block this due to Private Network Access rules.
      await fetch(`http://${HOME_LAB_IP}:${app.port}`, {
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
    setAppStatuses((prev) => prev.map((app) => ({ ...app, isChecking: true })));
    
    const results = await Promise.all(
      APPS.map(async (app) => {
        const isActive = await checkStatus(app);
        return { ...app, isActive, isChecking: false };
      })
    );
    
    setAppStatuses(results);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const sortedApps = useMemo(() => {
    return [...appStatuses].sort((a, b) => {
      if (a.isActive === b.isActive) return a.name.localeCompare(b.name);
      return a.isActive ? -1 : 1;
    });
  }, [appStatuses]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Server size={18} />
              <span className="text-sm font-medium tracking-wider uppercase">Home Lab Node</span>
            </div>
            <h1 className="text-5xl font-light tracking-tight mb-2">
              {HOME_LAB_IP}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Activity size={14} className="text-green-500" />
              Monitoring {APPS.length} applications
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={14} className={appStatuses.some(a => a.isChecking) ? "animate-spin" : ""} />
              Refresh Status
            </button>
            <span className="text-[10px] uppercase tracking-widest text-gray-400">
              Last check: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {sortedApps.map((app) => (
              <motion.a
                key={app.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                href={`http://${HOME_LAB_IP}:${app.port}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  group relative flex flex-col p-6 rounded-3xl transition-all duration-300
                  ${app.isActive 
                    ? "bg-white shadow-sm hover:shadow-md border border-transparent" 
                    : "bg-gray-100/50 border border-gray-200/50 opacity-80"}
                `}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`
                    p-3 rounded-2xl transition-colors
                    ${app.isActive ? "bg-gray-50 text-gray-900" : "bg-gray-200/50 text-gray-400"}
                  `}>
                    <ExternalLink size={20} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {app.isChecking ? (
                      <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
                    ) : app.isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Online</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Offline</span>
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto">
                  <h2 className={`
                    text-xl font-medium mb-1 transition-colors
                    ${app.isActive ? "text-gray-900" : "text-gray-400"}
                  `}>
                    {app.name}
                  </h2>
                  <div className="flex items-center justify-between">
                    <p className={`
                      text-xs transition-colors
                      ${app.isActive ? "text-gray-500" : "text-gray-400"}
                    `}>
                      Port {app.port}
                    </p>
                    {app.description && (
                      <span className={`
                        text-[10px] uppercase tracking-wider font-semibold
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
        </div>

        <footer className="mt-24 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between gap-8 text-gray-400 text-xs">
            <div className="max-w-md">
              <h3 className="font-semibold text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Network Note</h3>
              <p className="leading-relaxed">
                This dashboard attempts to verify connectivity to your local network. 
                If applications appear offline, ensure you are connected to the same network as 10.0.0.134 
                and that your browser allows Private Network Access.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Statistics</h3>
                <p>Active: {appStatuses.filter(a => a.isActive).length}</p>
                <p>Total: {APPS.length}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Environment</h3>
                <p>Node: 10.0.0.134</p>
                <p>Status: Monitoring</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
