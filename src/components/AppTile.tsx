import React from "react";
import { motion } from "motion/react";
import { Clock, ExternalLink, Settings } from "lucide-react";
import { HomeLabApp } from "../constants";

interface AppTileProps {
  app: HomeLabApp;
  appUrl: string;
  lastChecked: string | null;
  isOnline: boolean;
  onEdit: (app: HomeLabApp) => void;
  darkMode: boolean;
}

export const AppTile: React.FC<AppTileProps> = ({ app, appUrl, lastChecked, isOnline, onEdit, darkMode }) => {
  const handleClick = () => {
    if (isOnline) {
      window.open(appUrl, '_blank');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={handleClick}
      className={`group relative p-5 rounded-2xl border transition-all flex flex-col h-full cursor-pointer ${
        isOnline 
          ? darkMode 
            ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/20" 
            : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-black/5"
          : darkMode
            ? "bg-zinc-900/40 border-zinc-800/50 opacity-60 grayscale"
            : "bg-gray-50/50 border-gray-100/50 opacity-60 grayscale"
      }`}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border shrink-0 transition-transform group-hover:scale-105 ${
          darkMode ? "bg-zinc-800 border-zinc-700" : "bg-gray-50 border-gray-100"
        }`}>
          <img 
            src={app.iconUrl || (app.id ? `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${app.id.toLowerCase()}.png` : "")}
            alt={app.name}
            className="w-10 h-10 object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${app.id || 'app'}/128/128`;
            }}
          />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h3 className={`font-bold truncate text-lg leading-tight ${darkMode ? "text-white" : "text-gray-900"}`}>
            {app.name}
          </h3>
          {app.description && (
            <p className={`text-xs truncate mt-0.5 font-medium ${darkMode ? "text-zinc-500" : "text-gray-400"}`}>
              {app.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-bold ${
            darkMode ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-gray-100 border-gray-200 text-gray-500"
          }`}>
            {app.port}
          </span>
          {lastChecked && (
            <span className={`flex items-center gap-1.5 text-[10px] font-medium ${darkMode ? "text-zinc-600" : "text-gray-400"}`}>
              <Clock size={12} />
              {lastChecked}
            </span>
          )}
        </div>
        {isOnline && (
          <div className={`p-2 rounded-xl transition-colors ${darkMode ? "bg-zinc-800/50 text-zinc-500" : "bg-gray-100/50 text-gray-400"}`}>
            <ExternalLink size={14} />
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(app);
        }}
        className={`absolute top-4 right-4 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 ${
          darkMode ? "bg-zinc-800 text-zinc-500 hover:text-white" : "bg-gray-100 text-gray-400 hover:text-black"
        }`}
      >
        <Settings size={16} />
      </button>
    </motion.div>
  );
};
