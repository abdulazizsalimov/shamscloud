import { Express, Request, Response } from "express";
import { z } from "zod";
import { IStorage } from "./storage";
import fs from "fs";
import path from "path";
import { db } from "./db";
import * as os from "os";
import { files } from "@shared/schema";
import { sum } from "drizzle-orm";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Schema for system settings
const systemSettingsSchema = z.object({
  totalQuota: z.string(),
  defaultQuota: z.string(),
});

// Settings file path
const SETTINGS_FILE = path.join(process.cwd(), "data/settings.json");

// Default settings
const DEFAULT_SETTINGS = {
  totalQuota: "107374182400", // 100GB in bytes
  defaultQuota: "10737418240", // 10GB in bytes
  lastUpdated: new Date().toISOString(),
};

// Make sure the settings directory exists
function ensureSettingsDirectory() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load settings from file or return defaults
export function loadSettings() {
  try {
    ensureSettingsDirectory();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(data);
    }
    
    // If file doesn't exist, create it with defaults
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to file
export function saveSettings(settings: any) {
  try {
    ensureSettingsDirectory();
    settings.lastUpdated = new Date().toISOString();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

// Calculate total used space in the system
export async function calculateUsedSpace() {
  try {
    // Более безопасный способ подсчета суммы размера файлов
    const result = await db.execute(`
      SELECT COALESCE(SUM(CAST(size AS NUMERIC)), 0) as total_size 
      FROM files
    `);
    
    const totalSizeStr = result.rows[0]?.total_size || "0";
    return parseInt(totalSizeStr);
  } catch (error) {
    console.error("Error calculating used space:", error);
    return 0;
  }
}

// Get available system disk space
export function getAvailableDiskSpace() {
  try {
    // Get available disk space where uploads are stored
    const stats = fs.statfsSync(path.join(process.cwd(), "uploads"));
    const availableBytes = stats.bavail * stats.bsize;
    return availableBytes;
  } catch (error) {
    // Fallback to OS free space if we can't get specific folder info
    console.error("Error getting disk space:", error);
    const freeMem = os.freemem();
    return freeMem;
  }
}

export function setupSettings(app: Express, storage: IStorage) {
  // Route to handle admin authentication
  const adminGuard = async (req: Request, res: Response, next: Function) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    next();
  };

  // Get system settings
  app.get("/api/admin/settings", adminGuard, async (req: Request, res: Response) => {
    try {
      const settings = loadSettings();
      const usedSpace = await calculateUsedSpace();
      const availableSpace = getAvailableDiskSpace();
      
      return res.status(200).json({
        ...settings,
        usedSpace: usedSpace.toString(),
        availableSpace: availableSpace.toString(),
      });
    } catch (error) {
      console.error("Error getting settings:", error);
      return res.status(500).json({ message: "Failed to get settings" });
    }
  });

  // Update system settings
  app.post("/api/admin/settings", adminGuard, async (req: Request, res: Response) => {
    try {
      console.log("Received settings data:", req.body);
      
      // Validate the incoming data
      const validatedData = systemSettingsSchema.parse(req.body);
      console.log("Validated settings data:", validatedData);
      
      const currentSettings = loadSettings();
      console.log("Current settings:", currentSettings);
      
      const newSettings = {
        ...currentSettings,
        totalQuota: validatedData.totalQuota,
        defaultQuota: validatedData.defaultQuota,
        lastUpdated: new Date().toISOString()
      };
      console.log("New settings to save:", newSettings);
      
      // Make sure settings directory exists
      ensureSettingsDirectory();
      
      // Save the settings directly to avoid any issues
      try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(newSettings, null, 2));
        console.log("Settings saved successfully");
        return res.status(200).json({ message: "Settings updated successfully" });
      } catch (writeError) {
        console.error("Error writing settings file:", writeError);
        return res.status(500).json({ message: "Failed to save settings file" });
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      return res.status(400).json({ message: "Invalid settings data", error: String(error) });
    }
  });
}