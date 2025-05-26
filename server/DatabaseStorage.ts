import { db } from './db';
import { users, files, verificationTokens, type User, type InsertUser, type File, type InsertFile, type VerificationToken } from '@shared/schema';
import { eq, like, sql, isNull, and, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { IStorage } from './storage';
import bcrypt from 'bcryptjs';
import { adaptUserFromDb, adaptFileFromDb } from './db-adapter';
import { nanoid } from 'nanoid';

/**
 * Реализация хранилища на базе PostgreSQL
 */
export class DatabaseStorage implements IStorage {
  private filesDir: string;

  constructor() {
    this.filesDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.filesDir)) {
      fs.mkdirSync(this.filesDir, { recursive: true });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    // Используем адаптер из db-adapter.ts для преобразования полей
    const { adaptUserFromDb } = require('./db-adapter');
    return adaptUserFromDb(user);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
    // Простое преобразование полей из базы в объект User
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      role: user.role,
      quota: user.quota,
      usedSpace: user.used_space,
      isBlocked: user.is_blocked,
      isEmailVerified: user.is_email_verified,
      createdAt: user.created_at
    };
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Добавляем пользователя через SQL для обхода проблем с типами
    const result = await db.execute(sql`
      INSERT INTO users (email, name, password, role, quota, used_space, is_blocked)
      VALUES (
        ${userData.email}, 
        ${userData.name}, 
        ${hashedPassword}, 
        ${userData.role || 'user'}, 
        ${userData.quota?.toString() || '1073741824'}, 
        '0', 
        false
      )
      RETURNING *
    `);
    
    const user = result.rows[0] as User;
    
    // Создаем папку для пользователя
    const userDir = path.join(this.filesDir, user.id.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    // Проверяем, что пользователь существует
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      return undefined;
    }
    
    let updateFields = '';
    const values: any[] = [];
    let paramIndex = 1;
    
    // Формируем SQL запрос для обновления
    if (data.email) {
      updateFields += `email = $${paramIndex++}, `;
      values.push(data.email);
    }
    
    if (data.name) {
      updateFields += `name = $${paramIndex++}, `;
      values.push(data.name);
    }
    
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updateFields += `password = $${paramIndex++}, `;
      values.push(hashedPassword);
    }
    
    if (data.role) {
      updateFields += `role = $${paramIndex++}, `;
      values.push(data.role);
    }
    
    if (data.quota !== undefined) {
      updateFields += `quota = $${paramIndex++}, `;
      values.push(data.quota.toString());
    }
    
    if (data.usedSpace !== undefined) {
      updateFields += `used_space = $${paramIndex++}, `;
      values.push(data.usedSpace.toString());
    }
    
    if (data.isBlocked !== undefined) {
      updateFields += `is_blocked = $${paramIndex++}, `;
      values.push(data.isBlocked);
    }
    
    if (!updateFields) {
      return existingUser; // Нечего обновлять
    }
    
    // Удаляем последнюю запятую и пробел
    updateFields = updateFields.slice(0, -2);
    
    // Выполняем запрос
    const result = await db.execute(sql`
      UPDATE users SET ${sql.raw(updateFields)}
      WHERE id = ${id}
      RETURNING *
    `);
    
    return result.rows[0] as User;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Проверяем, что пользователь существует
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      return false;
    }
    
    // Удаляем все файлы пользователя (каскадное удаление в базе данных)
    await db.delete(files).where(eq(files.userId, id));
    
    // Удаляем пользователя
    await db.delete(users).where(eq(users.id, id));
    
    // Удаляем директорию пользователя
    const userDir = path.join(this.filesDir, id.toString());
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    
    return true;
  }

  async getAllUsers(page: number = 1, limit: number = 10, search: string = ""): Promise<{ users: User[], total: number }> {
    // Преобразуем числовые параметры для SQL, чтобы избежать ошибки типов
    const numLimit = Number(limit);
    const numOffset = (page - 1) * numLimit;
    
    let query;
    
    if (search && search.trim()) {
      // Поиск по имени или email
      query = db.select()
        .from(users)
        .where(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        )
        .orderBy(users.id)
        .limit(numLimit)
        .offset(numOffset);
    } else {
      // Без поиска
      query = db.select()
        .from(users)
        .orderBy(users.id)
        .limit(numLimit)
        .offset(numOffset);
    }
    
    const result = await query;
    
    // Получаем общее количество для пагинации
    let countQuery;
    
    if (search && search.trim()) {
      countQuery = db.select({ count: sql`count(*)`.mapWith(Number) })
        .from(users)
        .where(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
    } else {
      countQuery = db.select({ count: sql`count(*)`.mapWith(Number) })
        .from(users);
    }
    
    const [countResult] = await countQuery;
    
    // Используем адаптер из db-adapter.ts для преобразования полей
    const { adaptUserFromDb } = require('./db-adapter');
    const mappedUsers = result.map(user => adaptUserFromDb(user));
    
    return {
      users: mappedUsers,
      total: countResult.count || 0
    };
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    
    if (!file) return undefined;
    
    // Преобразуем поля из snake_case в camelCase для соответствия типу File
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    };
  }

  async getFilesByParentId(parentId: number | null, userId: number): Promise<File[]> {
    let result;
    
    if (parentId === null) {
      // Для корневой директории
      result = await db.execute(sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND parent_id IS NULL
        ORDER BY is_folder DESC, name ASC
      `);
    } else {
      // Для заданной директории
      // Сначала проверяем, принадлежит ли родительская папка текущему пользователю
      const parentFolder = await this.getFile(parentId);
      if (!parentFolder || parentFolder.userId !== userId) {
        throw new Error("You don't have permission to access this folder");
      }
      
      result = await db.execute(sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND parent_id = ${parentId}
        ORDER BY is_folder DESC, name ASC
      `);
    }
    
    // Преобразуем поля из snake_case в camelCase для соответствия типу File
    return (result.rows || []).map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }));
  }

  async searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]> {
    let sqlQuery;
    
    // Если задан конкретный parentId, проверяем, принадлежит ли папка пользователю
    if (parentId !== undefined && parentId !== null) {
      const parentFolder = await this.getFile(parentId);
      if (!parentFolder || parentFolder.userId !== userId) {
        throw new Error("You don't have permission to access this folder");
      }
    }
    
    if (parentId === undefined) {
      // Поиск по всем файлам пользователя
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`}
        ORDER BY is_folder DESC, name ASC
      `;
    } else if (parentId === null) {
      // Поиск только в корневой директории
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`} AND parent_id IS NULL
        ORDER BY is_folder DESC, name ASC
      `;
    } else {
      // Поиск в конкретной директории
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`} AND parent_id = ${parentId}
        ORDER BY is_folder DESC, name ASC
      `;
    }
    
    const result = await db.execute(sqlQuery);
    
    // Преобразуем поля из snake_case в camelCase для соответствия типу File
    return (result.rows || []).map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }));
  }

  async createFile(fileData: InsertFile): Promise<File> {
    // Преобразуем размер в строку
    const size = fileData.size !== undefined ? fileData.size.toString() : '0';
    
    // Преобразуем camelCase в snake_case для соответствия полям базы данных
    const insertData = {
      name: fileData.name,
      path: fileData.path,
      type: fileData.type,
      size: size,
      is_folder: fileData.isFolder || false,
      parent_id: fileData.parentId,
      user_id: fileData.userId
    };
    
    // Добавляем запись в базу данных
    const [newFile] = await db.insert(files)
      .values(insertData)
      .returning();
    
    // Преобразуем результат в правильный формат
    const file: File = {
      id: newFile.id,
      name: newFile.name,
      path: newFile.path,
      type: newFile.type,
      size: newFile.size,
      isFolder: newFile.is_folder,
      parentId: newFile.parent_id,
      userId: newFile.user_id,
      createdAt: newFile.created_at,
      updatedAt: newFile.updated_at
    };
    
    // Обновляем использованное пространство пользователя
    if (!file.isFolder && file.size) {
      const user = await this.getUser(file.userId);
      if (user) {
        const newUsedSpace = (parseInt(user.usedSpace, 10) + parseInt(file.size, 10)).toString();
        await this.updateUser(user.id, { usedSpace: newUsedSpace });
      }
    }
    
    return file;
  }

  async createFolder(name: string, parentId: number | null, userId: number): Promise<File> {
    // Проверяем, существует ли пользователь
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Проверяем, существует ли родительская папка, если она указана
    if (parentId !== null) {
      const parentFolder = await this.getFile(parentId);
      if (!parentFolder || !parentFolder.isFolder) {
        throw new Error(`Parent folder with id ${parentId} not found or not a folder`);
      }
      
      // Проверяем, принадлежит ли родительская папка пользователю
      if (parentFolder.userId !== userId) {
        throw new Error(`You don't have permission to create a folder in this location`);
      }
    }
    
    // Создаем путь к папке
    let folderPath = '';
    if (parentId === null) {
      folderPath = `/uploads/${userId}/${name}`;
    } else {
      const parentFolder = await this.getFile(parentId);
      if (parentFolder && parentFolder.path) {
        folderPath = `${parentFolder.path}/${name}`;
      } else {
        folderPath = `/uploads/${userId}/${name}`;
      }
    }
    
    // Создаем физическую папку
    const fullPath = path.join(process.cwd(), folderPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    // Создаем запись в базе данных
    const result = await db.execute(sql`
      INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
      VALUES (
        ${name},
        ${folderPath},
        'folder',
        '0',
        true,
        ${parentId === null ? sql`NULL` : parentId},
        ${userId}
      )
      RETURNING *
    `);
    
    return result.rows[0] as File;
  }

  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    // Проверяем, что файл существует
    const existingFile = await this.getFile(id);
    if (!existingFile) {
      return undefined;
    }
    
    let updateFields = '';
    const values: any[] = [];
    let paramIndex = 1;
    
    // Формируем SQL запрос для обновления
    if (data.name) {
      updateFields += `name = $${paramIndex++}, `;
      values.push(data.name);
    }
    
    if (data.path) {
      updateFields += `path = $${paramIndex++}, `;
      values.push(data.path);
    }
    
    if (data.type) {
      updateFields += `type = $${paramIndex++}, `;
      values.push(data.type);
    }
    
    if (data.size !== undefined) {
      updateFields += `size = $${paramIndex++}, `;
      values.push(data.size.toString());
      
      // Обновляем использованное пространство пользователя
      if (!existingFile.isFolder) {
        const user = await this.getUser(existingFile.userId);
        if (user) {
          const sizeDiff = parseInt(data.size.toString(), 10) - parseInt(existingFile.size, 10);
          const newUsedSpace = Math.max(0, parseInt(user.usedSpace, 10) + sizeDiff).toString();
          await this.updateUser(user.id, { usedSpace: newUsedSpace });
        }
      }
    }
    
    // updatedAt всегда обновляем
    updateFields += `updated_at = NOW()`;
    
    // Выполняем запрос
    const result = await db.execute(sql`
      UPDATE files SET ${sql.raw(updateFields)}
      WHERE id = ${id}
      RETURNING *
    `);
    
    return result.rows[0] as File;
  }

  async deleteFile(id: number): Promise<boolean> {
    try {
      console.log(`Starting delete operation for file ID: ${id}`);
      
      // Проверяем, что файл существует
      const file = await this.getFile(id);
      if (!file) {
        console.log(`File with ID ${id} not found`);
        return false;
      }
      
      console.log(`Found file for deletion:`, file);
      
      // Если это папка, удаляем все вложенные файлы и папки
      if (file.isFolder) {
        console.log(`File ${id} is a folder, recursively deleting children`);
        
        try {
          const children = await db.select().from(files).where(eq(files.parent_id, id));
          console.log(`Found ${children.length} child files/folders to delete`);
          
          for (const child of children) {
            await this.deleteFile(child.id);
          }
        } catch (error) {
          console.error(`Error fetching or deleting child files:`, error);
        }
      }
      
      // Обновляем использованное пространство пользователя
      if (!file.isFolder) {
        try {
          const user = await this.getUser(file.userId);
          if (user) {
            console.log(`Updating user ${user.id} used space (current: ${user.usedSpace}, file size: ${file.size})`);
            
            const fileSize = parseInt(file.size, 10) || 0;
            const currentUsed = parseInt(user.usedSpace, 10) || 0;
            const newUsedSpace = Math.max(0, currentUsed - fileSize).toString();
            
            console.log(`New used space will be: ${newUsedSpace}`);
            await this.updateUser(user.id, { usedSpace: newUsedSpace });
          }
        } catch (error) {
          console.error(`Error updating user's used space:`, error);
          // Продолжаем выполнение даже при ошибке обновления пространства
        }
      }
      
      // Удаляем физический файл, если это не папка
      if (!file.isFolder && file.path) {
        try {
          console.log(`Checking physical file at path: ${file.path}`);
          const fullPath = path.join(process.cwd(), file.path);
          
          if (fs.existsSync(fullPath)) {
            console.log(`Physical file found at ${fullPath}, deleting...`);
            fs.unlinkSync(fullPath);
            console.log(`Physical file deleted successfully`);
          } else {
            console.log(`Physical file not found at ${fullPath}, skipping deletion`);
          }
        } catch (error) {
          console.error(`Error deleting physical file:`, error);
          // Продолжаем выполнение даже при ошибке удаления физического файла
        }
      }
      
      // Удаляем запись из базы данных
      try {
        console.log(`Deleting file record from database, ID: ${id}`);
        await db.delete(files).where(eq(files.id, id));
        console.log(`File record deleted successfully from database`);
      } catch (error) {
        console.error(`Error deleting file record from database:`, error);
        throw error; // Бросаем ошибку, так как это критическая операция
      }
      
      console.log(`File deletion completed successfully for ID: ${id}`);
      return true;
    } catch (error) {
      console.error(`Unexpected error in deleteFile method:`, error);
      return false;
    }
  }

  async getFileByPublicToken(token: string): Promise<File | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM files 
        WHERE public_token = ${token} AND is_public = true
        LIMIT 1
      `);
      
      if (!result.rows || result.rows.length === 0) {
        return undefined;
      }
      
      const file = result.rows[0];
      return adaptFileFromDb(file);
    } catch (error) {
      console.error("Error finding file by public token:", error);
      return undefined;
    }
  }

  async getFileHierarchy(fileId: number): Promise<File[]> {
    const result: File[] = [];
    let currentId: number | null = fileId;
    
    while (currentId !== null) {
      const file = await this.getFile(currentId);
      if (!file) break;
      
      result.unshift(file);
      currentId = file.parentId;
    }
    
    return result;
  }

  // Методы для работы с токенами верификации
  async createVerificationToken(userId: number, type: string, expiresInHours: number): Promise<VerificationToken> {
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    const result = await db.execute(sql`
      INSERT INTO verification_tokens (user_id, token, type, expires_at)
      VALUES (${userId}, ${token}, ${type}, ${expiresAt})
      RETURNING *
    `);
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      type: row.type,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const result = await db.execute(sql`
      SELECT * FROM verification_tokens 
      WHERE token = ${token} AND expires_at > NOW()
      LIMIT 1
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      type: row.type,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async verifyUser(userId: number): Promise<User | undefined> {
    const result = await db.execute(sql`
      UPDATE users 
      SET is_email_verified = true 
      WHERE id = ${userId}
      RETURNING *
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return undefined;
    }
    
    return adaptUserFromDb(result.rows[0]);
  }

  async deleteVerificationToken(id: number): Promise<boolean> {
    try {
      await db.execute(sql`DELETE FROM verification_tokens WHERE id = ${id}`);
      return true;
    } catch (error) {
      console.error("Error deleting verification token:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();