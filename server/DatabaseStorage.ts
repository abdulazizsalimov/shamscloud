import { 
  users, files, 
  type User, type InsertUser, 
  type File, type InsertFile 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, ilike, desc, asc, count, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { IStorage } from "./storage";

// Класс для работы с базой данных PostgreSQL
export class DatabaseStorage implements IStorage {
  private filesDir: string;

  constructor() {
    this.filesDir = path.join(process.cwd(), "uploads");
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }
  }

  // Методы для работы с пользователями
  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Вставляем пользователя
    const [user] = await db.insert(users)
      .values({
        ...userData,
        password: hashedPassword,
        usedSpace: 0
      })
      .returning();
    
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // Если обновляем пароль, хешируем его
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const [updatedUser] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Получаем файлы пользователя для удаления из файловой системы
    const userFiles = await db.select().from(files)
      .where(and(
        eq(files.userId, id),
        eq(files.isFolder, false)
      ));
    
    // Удаляем файлы из файловой системы
    for (const file of userFiles) {
      const filePath = path.join(this.filesDir, file.path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }
    
    // Удаляем пользователя (файлы будут удалены каскадно из-за внешнего ключа)
    const [deletedUser] = await db.delete(users)
      .where(eq(users.id, id))
      .returning();
    
    return !!deletedUser;
  }

  async getAllUsers(page: number = 1, limit: number = 10, search: string = ""): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    // Строим условие запроса
    let conditions = undefined;
    if (search) {
      conditions = or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`)
      );
    }
    
    // Получаем пользователей с пагинацией
    const usersList = await db.select().from(users)
      .where(conditions)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(users.id));
    
    // Считаем общее количество пользователей
    const [{ count: total }] = await db.select({ count: count() })
      .from(users)
      .where(conditions);
    
    return { users: usersList, total: Number(total) };
  }

  // Методы для работы с файлами
  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByParentId(parentId: number | null, userId: number): Promise<File[]> {
    // Получаем файлы по родительскому ID и ID пользователя
    const userFiles = await db.select().from(files)
      .where(and(
        eq(files.userId, userId),
        parentId === null ? isNull(files.parentId) : eq(files.parentId, parentId)
      ))
      .orderBy(
        desc(files.isFolder),
        asc(files.name)
      );
    
    return userFiles;
  }

  async searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]> {
    // Строим условие запроса
    let conditions = and(
      eq(files.userId, userId),
      ilike(files.name, `%${query}%`)
    );
    
    // Добавляем условие родительского ID если он предоставлен
    if (parentId !== undefined) {
      conditions = and(
        conditions,
        parentId === null ? isNull(files.parentId) : eq(files.parentId, parentId)
      );
    }
    
    // Получаем подходящие файлы
    const matchingFiles = await db.select().from(files)
      .where(conditions)
      .orderBy(
        desc(files.isFolder),
        asc(files.name)
      );
    
    return matchingFiles;
  }

  async createFile(fileData: InsertFile): Promise<File> {
    // Вставляем файл
    const [file] = await db.insert(files)
      .values(fileData)
      .returning();
    
    // Обновляем использованное пространство пользователя, если это не папка
    if (!fileData.isFolder) {
      await db.update(users)
        .set({
          usedSpace: sql`${users.usedSpace} + ${fileData.size}`
        })
        .where(eq(users.id, fileData.userId));
    }
    
    return file;
  }

  async createFolder(name: string, parentId: number | null, userId: number): Promise<File> {
    // Вставляем папку
    const [folder] = await db.insert(files)
      .values({
        name,
        path: "",
        type: "folder",
        size: 0,
        isFolder: true,
        parentId,
        userId
      })
      .returning();
    
    return folder;
  }

  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    // Получаем текущий файл
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    if (!file) {
      return undefined;
    }
    
    // Если переименовываем файл, обрабатываем операции файловой системы
    if (data.name && data.name !== file.name && !file.isFolder && file.path) {
      // Получаем новый путь к файлу
      const oldPath = path.join(this.filesDir, file.path);
      const directory = path.dirname(file.path);
      const extension = path.extname(file.name);
      const newFilename = `${data.name}${extension}`;
      const newPath = path.join(directory, newFilename);
      const newFullPath = path.join(this.filesDir, newPath);
      
      // Переименовываем файл в файловой системе
      try {
        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newFullPath);
        }
      } catch (error) {
        console.error(`Error renaming file ${oldPath} to ${newFullPath}:`, error);
        return undefined;
      }
      
      // Обновляем путь к файлу
      data.path = newPath;
    }
    
    // Обновляем файл
    const [updatedFile] = await db.update(files)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(files.id, id))
      .returning();
    
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    // Получаем текущий файл
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    if (!file) {
      return false;
    }
    
    // Если это папка, удаляем все ее содержимое рекурсивно
    if (file.isFolder) {
      // Получаем все дочерние элементы
      const childFiles = await db.select().from(files)
        .where(eq(files.parentId, id));
      
      // Удаляем каждый дочерний элемент
      for (const childFile of childFiles) {
        await this.deleteFile(childFile.id);
      }
    } else if (file.path) {
      // Удаляем файл из файловой системы
      const filePath = path.join(this.filesDir, file.path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
      
      // Обновляем использованное пространство пользователя
      await db.update(users)
        .set({
          usedSpace: sql`GREATEST(0, ${users.usedSpace} - ${file.size})`
        })
        .where(eq(users.id, file.userId));
    }
    
    // Удаляем файл
    const [deletedFile] = await db.delete(files)
      .where(eq(files.id, id))
      .returning();
    
    return !!deletedFile;
  }

  async getFileHierarchy(fileId: number): Promise<File[]> {
    const hierarchy: File[] = [];
    let currentId: number | null = fileId;
    
    while (currentId !== null) {
      const [file] = await db.select().from(files).where(eq(files.id, currentId));
      if (!file) break;
      
      hierarchy.unshift(file);
      currentId = file.parentId;
    }
    
    return hierarchy;
  }
}