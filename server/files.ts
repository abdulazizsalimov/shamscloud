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
      
      // Отладочная информация о пользователе
      console.log('User data for upload:', {
        id: user.id,
        email: user.email,
        quota: user.quota,
        usedSpace: user.usedSpace,
        quotaType: typeof user.quota,
        usedSpaceType: typeof user.usedSpace
      });
      
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
      
      // Преобразуем квоту из строки в байты (например, "100GB" -> число байт)
      const parseQuota = (quota: string): number => {
        if (quota.endsWith('GB')) {
          return parseInt(quota.replace('GB', '')) * 1024 * 1024 * 1024;
        } else if (quota.endsWith('MB')) {
          return parseInt(quota.replace('MB', '')) * 1024 * 1024;
        } else if (quota.endsWith('KB')) {
          return parseInt(quota.replace('KB', '')) * 1024;
        }
        return parseInt(quota) || 0;
      };
      
      const userQuota = parseQuota(user.quota);
      const userUsedSpace = parseQuota(user.usedSpace);
      
      // Отладочная информация
      console.log('Upload quota check:', {
        userQuota,
        userUsedSpace,
        totalUploadSize,
        quotaString: user.quota,
        usedSpaceString: user.usedSpace,
        available: userQuota - userUsedSpace
      });
      
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
      // Безопасно получаем fileId
      let fileId: number;
      try {
        fileId = parseInt(req.params.id);
        if (isNaN(fileId)) {
          return res.status(400).json({ message: "Invalid file ID format" });
        }
      } catch (e) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      const userId = (req as any).user.id;
      
      // Получаем информацию о файле
      const file = await storageService.getFile(fileId);
      
      // Логируем попытку для отладки
      console.log(`User ${userId} is trying to delete file/folder ${fileId}:`, file);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Проверяем, принадлежит ли файл пользователю
      if (file.userId !== userId) {
        console.error(`Security issue: User ${userId} tried to delete file ${fileId} owned by ${file.userId}`);
        return res.status(403).json({ message: "You don't have permission to delete this file" });
      }
      
      // Удаляем физический файл, если это не папка
      if (!file.isFolder && file.path) {
        try {
          const filePath = path.join(uploadsDir, file.path);
          console.log(`Attempting to delete physical file at: ${filePath}`);
          
          if (fs.existsSync(filePath)) {
            await fs.unlink(filePath);
            console.log(`Successfully deleted physical file at: ${filePath}`);
          } else {
            console.log(`Physical file not found at: ${filePath}`);
          }
        } catch (error) {
          console.error(`Error deleting physical file: ${error}`);
          // Продолжаем выполнение, даже если физический файл не удалось удалить
        }
      }
      
      // Удаляем запись из базы данных
      let success = false;
      try {
        success = await storageService.deleteFile(fileId);
        console.log(`Database delete result for file ${fileId}: ${success}`);
      } catch (error) {
        console.error(`Error deleting file from database: ${error}`);
        throw error;
      }
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete file from database" });
      }
      
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Delete file error:", error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message || "An error occurred while deleting file" });
      } else {
        res.status(500).json({ message: "An error occurred while deleting file" });
      }
    }
  });

  // API для публичного доступа к файлам
  
  // Настройка публичного доступа к файлу
  app.post("/api/files/:id/share", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      const { shareType, isPasswordProtected, password } = req.body;
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Генерируем уникальный токен
      const publicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const updatedFile = await storageService.updateFile(fileId, {
        isPublic: true,
        publicToken,
        shareType,
        isPasswordProtected: isPasswordProtected || false,
        sharePassword: isPasswordProtected ? password : null
      });
      
      res.json({ 
        file: updatedFile, 
        shareUrl: shareType === 'direct' 
          ? `${req.protocol}://${req.get('host')}/api/public/download/${publicToken}`
          : `${req.protocol}://${req.get('host')}/shared/${publicToken}`
      });
    } catch (error) {
      console.error("Share file error:", error);
      res.status(500).json({ message: "An error occurred while sharing file" });
    }
  });

  // Отключение публичного доступа
  app.delete("/api/files/:id/share", authGuard, async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = (req as any).user.id;
      
      const file = await storageService.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedFile = await storageService.updateFile(fileId, {
        isPublic: false,
        publicToken: null,
        shareType: null,
        isPasswordProtected: false,
        sharePassword: null
      });
      
      res.json(updatedFile);
    } catch (error) {
      console.error("Unshare file error:", error);
      res.status(500).json({ message: "An error occurred while unsharing file" });
    }
  });

  // Публичное скачивание файла (прямая ссылка)
  app.get("/api/public/download/:token", async (req: Request, res: Response) => {
    try {
      const token = req.params.token;
      
      // Найти файл по токену
      const files = await storageService.searchFiles(0, token, null);
      const file = files.find(f => f.publicToken === token && f.isPublic);
      
      if (!file) {
        return res.status(404).json({ message: "File not found or not public" });
      }
      
      if (file.shareType !== 'direct') {
        return res.status(403).json({ message: "Direct download not allowed" });
      }
      
      const filePath = path.join(uploadsDir, file.path);
      
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      res.download(filePath, file.name);
    } catch (error) {
      console.error("Public download error:", error);
      res.status(500).json({ message: "An error occurred while downloading file" });
    }
  });
}
