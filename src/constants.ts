export interface HomeLabApp {
  id: string;
  name: string;
  port: number;
  description?: string;
}

// Use environment variable if available, fallback to the provided IP
export const HOME_LAB_IP = import.meta.env.VITE_HOME_LAB_IP || "10.0.0.134";

export const APPS: HomeLabApp[] = [
  { id: "overseerr", name: "Overseerr", port: 5055, description: "Request Management" },
  { id: "sonarr", name: "Sonarr", port: 8989, description: "TV Series Management" },
  { id: "radarr", name: "Radarr", port: 7878, description: "Movie Management" },
  { id: "lidarr", name: "Lidarr", port: 8686, description: "Music Management" },
  { id: "readarr", name: "Readarr", port: 8787, description: "E-book Management" },
  { id: "prowlarr", name: "Prowlarr", port: 9696, description: "Indexer Manager" },
  { id: "tautulli", name: "Tautulli", port: 8181, description: "Plex Monitoring" },
  { id: "agregarr", name: "Agregarr", port: 7171, description: "Plex Collection Manager" },
  { id: "audiobookshelf", name: "Audiobookshelf", port: 13379, description: "Audiobook Management" },
];
