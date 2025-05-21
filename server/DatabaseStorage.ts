import { db } from './db';
import { users, files, type User, type InsertUser, type File, type InsertFile } from '@shared/schema';
import { eq, like, sql, isNull, and, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { IStorage } from './storage';
import bcrypt from 'bcryptjs';

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
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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
    const offset = (page - 1) * limit;
    
    let queryParams = '';
    const values: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      queryParams = `WHERE name ILIKE $${paramIndex} OR email ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
    }
    
    // Получаем пользователей
    const result = await db.execute(sql`
      SELECT * FROM users
      ${sql.raw(queryParams ? queryParams : '')}
      ORDER BY id
      LIMIT ${limit} OFFSET ${offset}
    `);
    
    // Получаем общее количество для пагинации
    const countResult = await db.execute(sql`
      SELECT COUNT(*) FROM users
      ${sql.raw(queryParams ? queryParams : '')}
    `);
    
    return {
      users: result.rows as User[],
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFilesByParentId(parentId: number | null, userId: number): Promise<File[]> {
    let result;
    
    if (parentId === null) {
      // Для корневой директории
      result = await db.execute(sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND parent_id IS NULL
      `);
    } else {
      // Для заданной директории
      result = await db.execute(sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND parent_id = ${parentId}
      `);
    }
    
    return result.rows as File[];
  }

  async searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]> {
    let sqlQuery;
    
    if (parentId === undefined) {
      // Поиск по всем файлам пользователя
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`}
      `;
    } else if (parentId === null) {
      // Поиск только в корневой директории
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`} AND parent_id IS NULL
      `;
    } else {
      // Поиск в конкретной директории
      sqlQuery = sql`
        SELECT * FROM files
        WHERE user_id = ${userId} AND name ILIKE ${`%${query}%`} AND parent_id = ${parentId}
      `;
    }
    
    const result = await db.execute(sqlQuery);
    return result.rows as File[];
  }

  async createFile(fileData: InsertFile): Promise<File> {
    // Преобразуем размер в строку
    const size = fileData.size !== undefined ? fileData.size.toString() : '0';
    
    // Создаем файл через SQL для обхода проблем с типами
    const result = await db.execute(sql`
      INSERT INTO files (name, path, type, size, is_folder, parent_id, user_id)
      VALUES (
        ${fileData.name},
        ${fileData.path},
        ${fileData.type},
        ${size},
        ${fileData.isFolder || false},
        ${fileData.parentId === null ? sql`NULL` : fileData.parentId},
        ${fileData.userId}
      )
      RETURNING *
    `);
    
    const file = result.rows[0] as File;
    
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
    // Проверяем, что файл существует
    const file = await this.getFile(id);
    if (!file) {
      return false;
    }
    
    // Если это папка, удаляем все вложенные файлы и папки
    if (file.isFolder) {
      const children = await db.execute(sql`
        SELECT * FROM files WHERE parent_id = ${id}
      `);
      
      for (const child of children.rows) {
        await this.deleteFile(child.id);
      }
    }
    
    // Обновляем использованное пространство пользователя
    if (!file.isFolder) {
      const user = await this.getUser(file.userId);
      if (user) {
        const newUsedSpace = Math.max(0, parseInt(user.usedSpace, 10) - parseInt(file.size, 10)).toString();
        await this.updateUser(user.id, { usedSpace: newUsedSpace });
      }
    }
    
    // Удаляем физический файл, если это не папка
    if (!file.isFolder && file.path) {
      const fullPath = path.join(process.cwd(), file.path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    // Удаляем запись из базы данных
    await db.delete(files).where(eq(files.id, id));
    
    return true;
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
}

export const storage = new DatabaseStorage();