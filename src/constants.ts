export interface HomeLabApp {
  id: string;
  name: string;
  port: number;
  description?: string;
  useHttps?: boolean;
}

// Safely access environment variables in both Node.js and Vite environments
const getInitialIp = () => {
  try {
    // Check Node.js process.env
    if (typeof process !== "undefined" && process.env?.VITE_HOME_LAB_IP) {
      return process.env.VITE_HOME_LAB_IP;
    }
    // Check Vite import.meta.env
    // @ts-ignore
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_HOME_LAB_IP) {
      // @ts-ignore
      return import.meta.env.VITE_HOME_LAB_IP;
    }
  } catch (e) {
    // Fallback if access fails
  }
  return "10.0.0.134";
};

export const DEFAULT_IP = getInitialIp();

export const DEFAULT_APPS: HomeLabApp[] = [
  { id: "overseerr", name: "Overseerr", port: 5055, description: "Request Management", useHttps: false },
  { id: "sonarr", name: "Sonarr", port: 8989, description: "TV Series Management", useHttps: false },
  { id: "radarr", name: "Radarr", port: 7878, description: "Movie Management", useHttps: false },
  { id: "lidarr", name: "Lidarr", port: 8686, description: "Music Management", useHttps: false },
  { id: "readarr", name: "Readarr", port: 8787, description: "E-book Management", useHttps: false },
  { id: "prowlarr", name: "Prowlarr", port: 9696, description: "Indexer Manager", useHttps: false },
  { id: "tautulli", name: "Tautulli", port: 8181, description: "Plex Monitoring", useHttps: false },
  { id: "agregarr", name: "Agregarr", port: 7171, description: "Plex Collection Manager", useHttps: false },
  { id: "audiobookshelf", name: "Audiobookshelf", port: 13379, description: "Audiobook Management", useHttps: false },
];
