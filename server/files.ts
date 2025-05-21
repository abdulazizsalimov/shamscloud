import type { Express, Request, Response } from "express";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import multer from "multer";
import { IStorage } from "./storage";
import { createFolderSchema, updateFileSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!existsSync(uploadsDir)) {
  fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Configure multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

export function setupFiles(app: Express, storageService: IStorage) {
  // Middleware to check if user is authenticated
  const authGuard = async (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storageService.getUserById(req.session.userId);
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Please contact an administrator." });
    }
    
    // Add user to request object
    (req as any).user = user;
    next();
  };

  // Get files by parent ID
  app.get("/api/files", authGuard, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const parentId = req.query.parentId !== undefined 
        ? (req.query.parentId === 'null' ? null : parseInt(req.query.parentId as string)) 
        : null;
      const search = req.query.search as string;
      
      let files;
      
      if (search) {
        files = await storageService.searchFiles(userId, search, parentId);
      } else {
        files = await storageService.getFilesByParentId(parentId, userId);
      }
      
      res.json(files);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ message: "An error occurred while fetching files" });
    }
  });

  // Get file by ID
  app.get("/api/files/:id", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file belongs to user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this file" });
      }
      
      res.json(file);
    } catch (error) {
      console.error("Get file error:", error);
      res.status(500).json({ message: "An error occurred while fetching file" });
    }
  });

  // Create folder
  app.post("/api/files/folder", authGuard, async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = createFolderSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      const folder = await storageService.createFolder(
        validatedData.name,
        validatedData.parentId ?? null,
        userId
      );
      
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Create folder error:", error);
      res.status(500).json({ message: (error as Error).message || "An error occurred while creating folder" });
    }
  });

  // Upload files
  app.post("/api/files/upload", authGuard, upload.array("files"), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      const userId = (req as any).user.id;
      const user = await storageService.getUserById(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const parentId = req.body.parentId ? parseInt(req.body.parentId) : null;
      
      // If parentId is provided, check if it exists and belongs to user
      if (parentId !== null) {
        const parentFolder = await storageService.getFile(parentId);
        
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.userId !== userId) {
          return res.status(403).json({ message: "You don't have permission to access this folder" });
        }
        
        if (!parentFolder.isFolder) {
          return res.status(400).json({ message: "Parent must be a folder" });
        }
      }
      
      // Calculate total size of uploaded files
      const totalUploadSize = (req.files as Express.Multer.File[]).reduce((acc, file) => acc + file.size, 0);
      
      // Check if user has enough space
      if (user.usedSpace + totalUploadSize > user.quota) {
        // Delete uploaded files
        for (const file of req.files as Express.Multer.File[]) {
          await fs.unlink(file.path).catch(console.error);
        }
        
        return res.status(400).json({ message: "Not enough storage space" });
      }
      
      // Save files to database
      const uploadedFiles = [];
      
      for (const file of req.files as Express.Multer.File[]) {
        const newFile = await storageService.createFile({
          name: file.originalname,
          path: file.filename,
          type: file.mimetype,
          size: file.size,
          isFolder: false,
          parentId,
          userId
        });
        
        uploadedFiles.push(newFile);
      }
      
      res.status(201).json(uploadedFiles);
    } catch (error) {
      console.error("Upload files error:", error);
      res.status(500).json({ message: "An error occurred while uploading files" });
    }
  });

  // Download file
  app.get("/api/files/:id/download", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file belongs to user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this file" });
      }
      
      // Check if it's a folder
      if (file.isFolder) {
        return res.status(400).json({ message: "Cannot download a folder" });
      }
      
      const filePath = path.join(uploadsDir, file.path);
      
      // Check if file exists on disk
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      res.download(filePath, file.name);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ message: "An error occurred while downloading file" });
    }
  });

  // Rename file
  app.patch("/api/files/:id/rename", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      // Validate request body
      const validatedData = updateFileSchema.parse(req.body);
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file belongs to user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this file" });
      }
      
      // Update file
      const updatedFile = await storageService.updateFile(fileId, {
        name: validatedData.name
      });
      
      res.json(updatedFile);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Rename file error:", error);
      res.status(500).json({ message: "An error occurred while renaming file" });
    }
  });

  // Delete file
  app.delete("/api/files/:id", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if file belongs to user
      if (file.userId !== userId) {
        return res.status(403).json({ message: "You don't have permission to access this file" });
      }
      
      // Delete the file from storage
      if (!file.isFolder) {
        const filePath = path.join(uploadsDir, file.path);
        await fs.unlink(filePath).catch(console.error);
      }
      
      // Delete file from database
      const success = await storageService.deleteFile(fileId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete file" });
      }
      
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ message: "An error occurred while deleting file" });
    }
  });
}
