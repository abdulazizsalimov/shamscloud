import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";

const shareSettingsSchema = z.object({
  fileId: z.number(),
  shareType: z.enum(["direct", "page"]),
  isPasswordProtected: z.boolean(),
  password: z.string().optional(),
});

export function setupPublicFiles(app: Express, storage: IStorage) {
  // Создание или обновление настроек публичного доступа
  app.post("/api/files/:id/share", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const body = shareSettingsSchema.parse(req.body);
      
      // Проверяем, что файл принадлежит пользователю
      const file = await storage.getFile(fileId);
      if (!file || file.userId !== userId) {
        return res.status(404).json({ message: "File not found" });
      }

      // Генерируем уникальный токен для публичной ссылки
      const publicToken = nanoid(32);
      
      // Хешируем пароль, если защита паролем включена
      let hashedPassword = null;
      if (body.isPasswordProtected && body.password) {
        console.log('Hashing password:', body.password);
        hashedPassword = await bcrypt.hash(body.password, 10);
        console.log('Password hashed successfully, length:', hashedPassword.length);
      }

      // Обновляем файл с настройками публичного доступа
      const updatedFile = await storage.updateFile(fileId, {
        isPublic: true,
        publicToken,
        shareType: body.shareType,
        isPasswordProtected: body.isPasswordProtected,
        sharePassword: hashedPassword,
      });

      if (!updatedFile) {
        return res.status(500).json({ message: "Failed to update file" });
      }

      // Формируем ссылку для пользователя
      const baseUrl = req.protocol + "://" + req.get("host");
      const shareLink = body.shareType === "direct" 
        ? `${baseUrl}/api/public/download/${publicToken}`
        : `${baseUrl}/shared/${publicToken}`;

      res.json({
        success: true,
        shareLink,
        publicToken,
        shareType: body.shareType,
        isPasswordProtected: body.isPasswordProtected,
      });
    } catch (error) {
      console.error("Share file error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Прямое скачивание файла по публичной ссылке
  app.get("/api/public/download/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      console.log('GET Direct download request for token:', token);
      
      // Находим файл по токену
      const file = await storage.getFileByPublicToken(token);
      console.log('GET File retrieved:', file ? `Found file: ${file.name}` : 'File not found');
      
      if (!file) {
        return res.status(404).json({ message: "File not found or not public" });
      }

      // Проверяем, что файл не защищен паролем для прямого скачивания
      if (file.isPasswordProtected) {
        return res.status(403).json({ message: "Password protected file" });
      }

      // Отправляем файл
      const filePath = path.join(process.cwd(), 'uploads', file.path);
      
      console.log('Public download attempt:', {
        token,
        fileId: file.id,
        fileName: file.name,
        filePath,
        filePathExists: fs.existsSync(filePath)
      });
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(filePath, file.name);
    } catch (error) {
      console.error("Public download error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Получение информации о публичном файле для страницы загрузки
  app.get("/api/public/info/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Находим файл по токену
      const file = await storage.getFileByPublicToken(token);
      
      if (!file) {
        return res.status(404).json({ message: "File not found or not public" });
      }

      // Возвращаем информацию о файле (без чувствительных данных)
      res.json({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        isPasswordProtected: file.isPasswordProtected,
        shareType: file.shareType,
        createdAt: file.createdAt,
      });
    } catch (error) {
      console.error("Public file info error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Скачивание файла со страницы загрузки (с проверкой пароля)
  app.post("/api/public/download/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      console.log('POST download request for token:', token);
      
      // Находим файл по токену
      const file = await storage.getFileByPublicToken(token);
      console.log('POST File retrieved:', file ? `Found file: ${file.name}` : 'File not found');
      
      if (!file) {
        return res.status(404).json({ message: "File not found or not public" });
      }

      // Проверяем пароль, если файл защищен
      if (file.isPasswordProtected && file.sharePassword) {
        if (!password) {
          return res.status(401).json({ message: "Password required" });
        }
        
        console.log('Password check:', {
          providedPassword: password,
          hasStoredPassword: !!file.sharePassword,
          storedPasswordLength: file.sharePassword?.length
        });
        
        const isPasswordValid = await bcrypt.compare(password, file.sharePassword);
        console.log('Password validation result:', isPasswordValid);
        
        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid password" });
        }
      }

      // Отправляем файл
      const filePath = path.join(process.cwd(), 'uploads', file.path);
      
      console.log('Protected download attempt:', {
        token,
        fileId: file.id,
        fileName: file.name,
        filePath,
        filePathExists: fs.existsSync(filePath)
      });
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.download(filePath, file.name);
    } catch (error) {
      console.error("Protected download error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Отключение публичного доступа к файлу
  app.delete("/api/files/:id/share", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Проверяем, что файл принадлежит пользователю
      const file = await storage.getFile(fileId);
      if (!file || file.userId !== userId) {
        return res.status(404).json({ message: "File not found" });
      }

      // Отключаем публичный доступ
      const updatedFile = await storage.updateFile(fileId, {
        isPublic: false,
        publicToken: null,
        shareType: null,
        isPasswordProtected: false,
        sharePassword: null,
      });

      if (!updatedFile) {
        return res.status(500).json({ message: "Failed to update file" });
      }

      res.json({ success: true, message: "Public access disabled" });
    } catch (error) {
      console.error("Disable sharing error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}