import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./DatabaseStorage";
import { setupAuth } from "./auth";
import { setupFiles } from "./files";
import { setupSettings } from "./settings";
import { setupPublicFiles } from "./public-files";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: 'shams-cloud-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // set to true in production with HTTPS
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  // Setup authentication routes
  setupAuth(app, storage);
  
  // Setup public file sharing routes (must be before setupFiles to avoid conflicts)
  setupPublicFiles(app, storage);
  
  // Setup file management routes
  setupFiles(app, storage);
  
  // Setup system settings routes
  setupSettings(app, storage);
  
  // API health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const httpServer = createServer(app);

  return httpServer;
}
