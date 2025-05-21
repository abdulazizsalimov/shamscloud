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
      
      // Безопасно получаем parentId, убедившись, что он является числом или null
      let parentId: number | null = null;
      
      if (req.query.parentId !== undefined && req.query.parentId !== 'null') {
        try {
          const parsedId = parseInt(req.query.parentId as string);
          if (!isNaN(parsedId)) {
            // Проверяем, имеет ли пользователь доступ к этой папке
            const folder = await storageService.getFile(parsedId);
            
            if (!folder) {
              return res.status(404).json({ message: "Folder not found" });
            }
            
            if (folder.userId !== userId) {
              console.error(`Security issue: User ${userId} tried to access folder ${parsedId} owned by ${folder.userId}`);
              return res.status(403).json({ message: "You don't have permission to access this folder" });
            }
            
            parentId = parsedId;
          } else {
            return res.status(400).json({ message: "Invalid parent folder ID format" });
          }
        } catch (e) {
          return res.status(400).json({ message: "Invalid parent folder ID" });
        }
      }
      
      const search = req.query.search as string;
      
      let files;
      
      try {
        if (search) {
          files = await storageService.searchFiles(userId, search, parentId);
        } else {
          files = await storageService.getFilesByParentId(parentId, userId);
        }
        
        // Дополнительная проверка безопасности - проверка, что все возвращаемые файлы принадлежат пользователю
        const safeFiles = files.filter(file => file.userId === userId);
        
        if (safeFiles.length !== files.length) {
          console.error(`Security issue: Filtered out ${files.length - safeFiles.length} files not belonging to user ${userId}`);
        }
        
        res.json(safeFiles);
      } catch (error) {
        // Если ошибка связана с отсутствием прав доступа
        if (error instanceof Error && error.message.includes("permission")) {
          return res.status(403).json({ message: error.message });
        }
        throw error; // Пробрасываем ошибку дальше
      }
    } catch (error) {
      console.error("Get files error:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message || "An error occurred while fetching files" });
      } else {
        res.status(500).json({ message: "An error occurred while fetching files" });
      }
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
        console.error(`Security issue: User ${userId} tried to access file ${fileId} owned by ${file.userId}`);
        return res.status(403).json({ message: "You don't have permission to access this file" });
      }
      
      res.json(file);
    } catch (error) {
      console.error("Get file error:", error);
      
      if (error instanceof Error && error.message.includes("permission")) {
        return res.status(403).json({ message: error.message });
      }
      
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
      
      // Безопасно получаем parentId, убедившись, что он является числом или null
      let parentId: number | null = null;
      
      if (req.body.parentId) {
        try {
          parentId = parseInt(req.body.parentId);
          if (isNaN(parentId)) {
            return res.status(400).json({ message: "Invalid parent folder ID format" });
          }
        } catch (e) {
          return res.status(400).json({ message: "Invalid parent folder ID" });
        }
      }
      
      // Если parentId предоставлен, проверяем, существует ли он и принадлежит пользователю
      if (parentId !== null) {
        const parentFolder = await storageService.getFile(parentId);
        
        if (!parentFolder) {
          return res.status(404).json({ message: "Parent folder not found" });
        }
        
        if (parentFolder.userId !== userId) {
          console.error(`Security issue: User ${userId} tried to upload to folder ${parentId} owned by user ${parentFolder.userId}`);
          return res.status(403).json({ message: "You don't have permission to access this folder" });
        }
        
        if (!parentFolder.isFolder) {
          return res.status(400).json({ message: "Parent must be a folder" });
        }
      }
      
      // Вычисляем общий размер загруженных файлов
      const files = req.files as Express.Multer.File[];
      const totalUploadSize = files.reduce((acc, file) => acc + file.size, 0);
      
      // Проверяем, достаточно ли у пользователя места
      const userQuota = parseInt(user.quota);
      const userUsedSpace = parseInt(user.usedSpace);
      
      if (userUsedSpace + totalUploadSize > userQuota) {
        // Удаляем загруженные файлы
        for (const file of files) {
          await fs.unlink(file.path).catch(console.error);
        }
        
        return res.status(400).json({ 
          message: "Not enough storage space",
          details: {
            available: userQuota - userUsedSpace,
            required: totalUploadSize,
            used: userUsedSpace,
            total: userQuota
          }
        });
      }
      
      // Сохраняем файлы в базе данных
      const uploadedFiles = [];
      
      for (const file of files) {
        try {
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
        } catch (error) {
          console.error(`Failed to save file ${file.originalname}:`, error);
          // Удаляем файл с диска, если его не удалось сохранить в БД
          await fs.unlink(file.path).catch(console.error);
        }
      }
      
      if (uploadedFiles.length === 0) {
        return res.status(500).json({ message: "Failed to save all uploaded files" });
      }
      
      res.status(201).json(uploadedFiles);
    } catch (error) {
      console.error("Upload files error:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message || "An error occurred while uploading files" });
      } else {
        res.status(500).json({ message: "An error occurred while uploading files" });
      }
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
