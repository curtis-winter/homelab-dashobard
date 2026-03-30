export interface HomeLabApp {
  id: string;
  name: string;
  port: number;
  description?: string;
  useHttps?: boolean;
  iconUrl?: string;
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
  { id: "overseerr", name: "Overseerr", port: 5055, description: "Request Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/sclorg/overseerr/main/docs/logo.png" },
  { id: "sonarr", name: "Sonarr", port: 8989, description: "TV Series Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Sonarr/Sonarr/develop/src/Sonarr.GUI/Content/Images/logo.png" },
  { id: "radarr", name: "Radarr", port: 7878, description: "Movie Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Radarr/Radarr/develop/src/Radarr.GUI/Content/Images/logo.png" },
  { id: "lidarr", name: "Lidarr", port: 8686, description: "Music Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Lidarr/Lidarr/develop/src/Lidarr.GUI/Content/Images/logo.png" },
  { id: "readarr", name: "Readarr", port: 8787, description: "E-book Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Readarr/Readarr/develop/src/Readarr.GUI/Content/Images/logo.png" },
  { id: "prowlarr", name: "Prowlarr", port: 9696, description: "Indexer Manager", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Prowlarr/Prowlarr/develop/src/Prowlarr.GUI/Content/Images/logo.png" },
  { id: "tautulli", name: "Tautulli", port: 8181, description: "Plex Monitoring", useHttps: false, iconUrl: "https://raw.githubusercontent.com/Tautulli/Tautulli/master/data/interfaces/default/images/logo-circle.png" },
  { id: "agregarr", name: "Agregarr", port: 7171, description: "Plex Collection Manager", useHttps: false, iconUrl: "https://picsum.photos/seed/agregarr/128/128" },
  { id: "audiobookshelf", name: "Audiobookshelf", port: 13379, description: "Audiobook Management", useHttps: false, iconUrl: "https://raw.githubusercontent.com/advplyr/audiobookshelf/master/static/logo.png" },
];
