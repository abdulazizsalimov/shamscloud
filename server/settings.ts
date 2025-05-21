import { Express, Request, Response } from "express";
import { z } from "zod";
import { IStorage } from "./storage";
import fs from "fs";
import path from "path";
import { db } from "./db";
import * as os from "os";
import { files } from "@shared/schema";
import { sum } from "drizzle-orm";

// Schema for system settings
const systemSettingsSchema = z.object({
  totalQuota: z.string(),
  defaultQuota: z.string(),
});

// Settings file path
const SETTINGS_FILE = path.join(__dirname, "../data/settings.json");

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
function loadSettings() {
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
function saveSettings(settings: any) {
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
async function calculateUsedSpace() {
  try {
    // Query the database to get sum of all file sizes
    const result = await db.select({ totalSize: sum(files.size) }).from(files);
    const totalSizeStr = result[0].totalSize || "0";
    return parseInt(totalSizeStr);
  } catch (error) {
    console.error("Error calculating used space:", error);
    return 0;
  }
}

// Get available system disk space
function getAvailableDiskSpace() {
  try {
    // Get available disk space where uploads are stored
    const stats = fs.statfsSync(path.join(__dirname, "../uploads"));
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
      const validatedData = systemSettingsSchema.parse(req.body);
      const currentSettings = loadSettings();
      
      const newSettings = {
        ...currentSettings,
        totalQuota: validatedData.totalQuota,
        defaultQuota: validatedData.defaultQuota,
      };
      
      const success = saveSettings(newSettings);
      
      if (success) {
        return res.status(200).json({ message: "Settings updated successfully" });
      } else {
        return res.status(500).json({ message: "Failed to save settings" });
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      return res.status(400).json({ message: "Invalid settings data" });
    }
  });
}