import { db } from './db';
import { users, files, verificationTokens, type User, type InsertUser, type File, type InsertFile, type VerificationToken } from '@shared/schema';
import { eq, like, sql, isNull, and, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { IStorage } from './storage';
import bcrypt from 'bcryptjs';
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

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
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
    
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role || 'user',
        quota: userData.quota || '1GB',
        used_space: '0',
        is_blocked: false,
        is_email_verified: false,
        created_at: new Date()
      })
      .returning();

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

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const updateData: any = {};
    
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.role) updateData.role = data.role;
    if (data.quota) updateData.quota = data.quota;
    if (data.usedSpace) updateData.used_space = data.usedSpace;
    if (data.isBlocked !== undefined) updateData.is_blocked = data.isBlocked;
    if (data.isEmailVerified !== undefined) updateData.is_email_verified = data.isEmailVerified;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    if (!user) return undefined;

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

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getAllUsers(page: number = 1, limit: number = 10, search: string = ""): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    let query = db.select().from(users);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    
    if (search) {
      const searchCondition = or(
        like(users.email, `%${search}%`),
        like(users.name, `%${search}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }
    
    const [userResults, countResult] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery
    ]);

    return {
      users: userResults.map(user => ({
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
      })),
      total: countResult[0].count
    };
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) return undefined;
    
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    };
  }

  async getFilesByParentId(parentId: number | null, userId: number): Promise<File[]> {
    const condition = parentId === null 
      ? and(isNull(files.parent_id), eq(files.user_id, userId))
      : and(eq(files.parent_id, parentId), eq(files.user_id, userId));
    
    const fileResults = await db.select().from(files).where(condition);
    
    return fileResults.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }));
  }

  async searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]> {
    let searchCondition = and(
      eq(files.user_id, userId),
      like(files.name, `%${query}%`)
    );

    if (parentId !== undefined) {
      if (parentId === null) {
        searchCondition = and(searchCondition, isNull(files.parent_id));
      } else {
        searchCondition = and(searchCondition, eq(files.parent_id, parentId));
      }
    }

    const fileResults = await db.select().from(files).where(searchCondition);
    
    return fileResults.map(file => ({
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    }));
  }

  async createFile(fileData: InsertFile): Promise<File> {
    const [file] = await db
      .insert(files)
      .values({
        name: fileData.name,
        path: fileData.path,
        type: fileData.type,
        size: fileData.size || '0',
        is_folder: fileData.isFolder || false,
        parent_id: fileData.parentId,
        user_id: fileData.userId,
        is_public: false,
        public_token: null,
        share_type: null,
        is_password_protected: false,
        share_password: null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    };
  }

  async createFolder(name: string, parentId: number | null, userId: number): Promise<File> {
    const folderPath = path.join(this.filesDir, `folder_${Date.now()}`);
    
    return this.createFile({
      name,
      path: folderPath,
      type: 'folder',
      size: '0',
      isFolder: true,
      parentId,
      userId
    });
  }

  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    const updateData: any = {};
    
    if (data.name) updateData.name = data.name;
    if (data.path) updateData.path = data.path;
    if (data.type) updateData.type = data.type;
    if (data.size) updateData.size = data.size;
    if (data.isFolder !== undefined) updateData.is_folder = data.isFolder;
    if (data.parentId !== undefined) updateData.parent_id = data.parentId;
    if (data.userId) updateData.user_id = data.userId;
    if (data.isPublic !== undefined) updateData.is_public = data.isPublic;
    if (data.publicToken !== undefined) updateData.public_token = data.publicToken;
    if (data.shareType !== undefined) updateData.share_type = data.shareType;
    if (data.isPasswordProtected !== undefined) updateData.is_password_protected = data.isPasswordProtected;
    if (data.sharePassword !== undefined) updateData.share_password = data.sharePassword;
    
    updateData.updated_at = new Date();

    const [file] = await db
      .update(files)
      .set(updateData)
      .where(eq(files.id, id))
      .returning();

    if (!file) return undefined;

    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    };
  }

  async deleteFile(id: number): Promise<boolean> {
    const file = await this.getFile(id);
    if (!file) return false;

    // Удаляем физический файл, если он существует
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Error deleting physical file:', error);
      }
    }

    const result = await db.delete(files).where(eq(files.id, id));
    return result.rowCount > 0;
  }

  async getFileByPublicToken(token: string): Promise<File | undefined> {
    console.log('Searching for file by token:', token);
    
    const [file] = await db.select().from(files).where(
      and(
        eq(files.public_token, token),
        eq(files.is_public, true)
      )
    );
    
    console.log('File found:', file ? { id: file.id, name: file.name, isPublic: file.is_public, token: file.public_token } : 'Not found');
    
    if (!file) return undefined;
    
    return {
      id: file.id,
      name: file.name,
      path: file.path,
      type: file.type,
      size: file.size,
      isFolder: file.is_folder,
      parentId: file.parent_id,
      userId: file.user_id,
      isPublic: file.is_public,
      publicToken: file.public_token,
      shareType: file.share_type,
      isPasswordProtected: file.is_password_protected,
      sharePassword: file.share_password,
      createdAt: file.created_at,
      updatedAt: file.updated_at
    };
  }

  async getFileHierarchy(fileId: number): Promise<File[]> {
    const hierarchy: File[] = [];
    let currentFile = await this.getFile(fileId);
    
    while (currentFile && currentFile.parentId) {
      const parent = await this.getFile(currentFile.parentId);
      if (parent) {
        hierarchy.unshift(parent);
        currentFile = parent;
      } else {
        break;
      }
    }
    
    return hierarchy;
  }

  async createVerificationToken(userId: number, type: string, expiresInHours: number): Promise<VerificationToken> {
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const [verificationToken] = await db
      .insert(verificationTokens)
      .values({
        user_id: userId,
        token,
        type,
        expires_at: expiresAt,
        created_at: new Date()
      })
      .returning();

    return {
      id: verificationToken.id,
      userId: verificationToken.user_id,
      token: verificationToken.token,
      type: verificationToken.type,
      expiresAt: verificationToken.expires_at,
      createdAt: verificationToken.created_at
    };
  }

  async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const [verificationToken] = await db
      .select()
      .from(verificationTokens)
      .where(eq(verificationTokens.token, token));

    if (!verificationToken) return undefined;

    return {
      id: verificationToken.id,
      userId: verificationToken.user_id,
      token: verificationToken.token,
      type: verificationToken.type,
      expiresAt: verificationToken.expires_at,
      createdAt: verificationToken.created_at
    };
  }

  async verifyUser(userId: number): Promise<User | undefined> {
    return this.updateUser(userId, { isEmailVerified: true });
  }

  async deleteVerificationToken(id: number): Promise<boolean> {
    const result = await db.delete(verificationTokens).where(eq(verificationTokens.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();