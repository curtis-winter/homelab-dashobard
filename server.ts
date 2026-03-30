import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

import { DEFAULT_APPS, DEFAULT_IP } from "./src/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initial default data
const DEFAULT_CONFIG = {
  ip: DEFAULT_IP,
  apps: DEFAULT_APPS
};

// Load config from file or use defaults
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      console.log(`Config loaded from ${CONFIG_FILE}`);
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading config file at ${CONFIG_FILE}, using defaults`, e);
      return DEFAULT_CONFIG;
    }
  }
  console.log("Config file not found, using defaults");
  return DEFAULT_CONFIG;
}

// Save config to file
function saveConfig(config: any) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`Config saved to ${CONFIG_FILE}`);
  } catch (e) {
    console.error(`Error saving config file at ${CONFIG_FILE}`, e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/config", (req, res) => {
    res.json(loadConfig());
  });

  app.post("/api/config", (req, res) => {
    const newConfig = req.body;
    saveConfig(newConfig);
    res.json({ status: "success", config: newConfig });
  });

  app.get("/api/scan", async (req, res) => {
    const ip = req.query.ip as string;
    const customPortsStr = req.query.ports as string;
    
    if (!ip) {
      return res.status(400).json({ error: "IP address is required" });
    }

    let portsToScan: number[] = [];
    
    if (customPortsStr) {
      // Handle ranges like 80-100 or comma separated lists like 80,443,3000
      const parts = customPortsStr.split(",");
      for (const part of parts) {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map(p => parseInt(p.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
              if (i > 0 && i < 65536) portsToScan.push(i);
            }
          }
        } else {
          const port = parseInt(part.trim());
          if (!isNaN(port) && port > 0 && port < 65536) {
            portsToScan.push(port);
          }
        }
      }
      // Deduplicate and limit to prevent abuse (max 100 ports per scan)
      portsToScan = [...new Set(portsToScan)].slice(0, 100);
    } else {
      portsToScan = [
        80, 443, 3000, 5000, 5001, 5055, 6789, 7878, 8000, 8006, 8080, 8081, 
        8082, 8083, 8085, 8096, 8112, 8123, 8181, 8282, 8384, 8443, 8581, 
        8787, 8888, 8989, 9000, 9090, 9091, 9117, 9443, 9696, 32400
      ];
    }

    const results = [];

    const scanPort = async (port: number) => {
      const protocols = ["http", "https"];
      for (const protocol of protocols) {
        const url = `${protocol}://${ip}:${port}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (response.ok || response.status === 401 || response.status === 403) {
            let title = `App on Port ${port}`;
            try {
              const text = await response.text();
              const titleMatch = text.match(/<title>(.*?)<\/title>/i);
              if (titleMatch && titleMatch[1]) {
                title = titleMatch[1].trim();
              }
            } catch (e) {
              // Ignore text parsing errors
            }
            
            return {
              port,
              name: title,
              useHttps: protocol === "https",
              url
            };
          }
        } catch (e) {
          clearTimeout(timeoutId);
        }
      }
      return null;
    };

    // Scan in parallel with limited concurrency
    const scanPromises = portsToScan.map(port => scanPort(port));
    const scanResults = await Promise.all(scanPromises);
    
    res.json(scanResults.filter(r => r !== null));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
