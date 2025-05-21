import { users, type User, type InsertUser, files, type File, type InsertFile } from "@shared/schema";
import path from "path";
import bcrypt from "bcryptjs";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(page?: number, limit?: number, search?: string): Promise<{ users: User[], total: number }>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByParentId(parentId: number | null, userId: number): Promise<File[]>;
  searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  createFolder(name: string, parentId: number | null, userId: number): Promise<File>;
  updateFile(id: number, data: Partial<File>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  getFileHierarchy(fileId: number): Promise<File[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private userId: number;
  private fileId: number;
  private filesDir: string;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.userId = 1;
    this.fileId = 1;
    this.filesDir = path.join(process.cwd(), "uploads");
    
    // Add admin user by default
    this.initializeWithDefaultData();
  }

  private async initializeWithDefaultData() {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin: User = {
      id: this.userId++,
      email: "admin@shamscloud.com",
      name: "Admin",
      password: adminPassword,
      role: "admin",
      quota: 1073741824 * 10, // 10GB
      usedSpace: 0,
      isBlocked: false,
      createdAt: new Date()
    };
    this.users.set(admin.id, admin);
    
    // Create demo user
    const demoPassword = await bcrypt.hash("demo123", 10);
    const demoUser: User = {
      id: this.userId++,
      email: "demo@shamscloud.com",
      name: "Demo User",
      password: demoPassword,
      role: "user",
      quota: 1073741824 * 5, // 5GB
      usedSpace: 0,
      isBlocked: false,
      createdAt: new Date()
    };
    this.users.set(demoUser.id, demoUser);
    
    // Create some demo folders and files
    const documents = this.createFolderInternal("Documents", null, demoUser.id);
    const photos = this.createFolderInternal("Photos", null, demoUser.id);
    const work = this.createFolderInternal("Work", documents.id, demoUser.id);
    
    // Create some demo files
    this.createFileInternal("Presentation.pptx", "presentation.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", 2500000, false, documents.id, demoUser.id);
    this.createFileInternal("Budget.xlsx", "budget.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 1500000, false, work.id, demoUser.id);
    this.createFileInternal("Report.pdf", "report.pdf", "application/pdf", 3000000, false, work.id, demoUser.id);
    this.createFileInternal("Vacation.jpg", "vacation.jpg", "image/jpeg", 5000000, false, photos.id, demoUser.id);
    this.createFileInternal("Notes.txt", "notes.txt", "text/plain", 500000, false, null, demoUser.id);
    
    // Update used space
    demoUser.usedSpace = 12500000; // Sum of all file sizes
    this.users.set(demoUser.id, demoUser);
  }
  
  private createFolderInternal(name: string, parentId: number | null, userId: number): File {
    const folder: File = {
      id: this.fileId++,
      name,
      path: '',
      type: 'folder',
      size: 0,
      isFolder: true,
      parentId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.files.set(folder.id, folder);
    return folder;
  }
  
  private createFileInternal(name: string, path: string, type: string, size: number, isFolder: boolean, parentId: number | null, userId: number): File {
    const file: File = {
      id: this.fileId++,
      name,
      path,
      type,
      size,
      isFolder,
      parentId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.files.set(file.id, file);
    return file;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userId++;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const user: User = { 
      ...userData, 
      id,
      password: hashedPassword,
      usedSpace: 0,
      isBlocked: false,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // If updating password, hash it
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    if (!this.users.has(id)) return false;
    
    // Delete all user's files
    for (const [fileId, file] of this.files.entries()) {
      if (file.userId === id) {
        this.files.delete(fileId);
      }
    }
    
    return this.users.delete(id);
  }
  
  async getAllUsers(page: number = 1, limit: number = 10, search: string = ""): Promise<{ users: User[], total: number }> {
    let filteredUsers = Array.from(this.users.values());
    
    // Apply search if provided
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.email.toLowerCase().includes(lowerSearch) || 
        user.name.toLowerCase().includes(lowerSearch)
      );
    }
    
    const total = filteredUsers.length;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    return { users: paginatedUsers, total };
  }
  
  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  
  async getFilesByParentId(parentId: number | null, userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => {
      if (parentId === null) {
        return file.parentId === null && file.userId === userId;
      }
      return file.parentId === parentId && file.userId === userId;
    });
  }
  
  async searchFiles(userId: number, query: string, parentId?: number | null): Promise<File[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.files.values()).filter(file => {
      const nameMatch = file.name.toLowerCase().includes(lowerQuery);
      const userMatch = file.userId === userId;
      
      if (parentId !== undefined) {
        return nameMatch && userMatch && file.parentId === parentId;
      }
      
      return nameMatch && userMatch;
    });
  }
  
  async createFile(fileData: InsertFile): Promise<File> {
    const id = this.fileId++;
    const file: File = {
      ...fileData,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.files.set(id, file);
    
    // Update user's used space
    const user = this.users.get(file.userId);
    if (user && !file.isFolder) {
      user.usedSpace += file.size;
      this.users.set(user.id, user);
    }
    
    return file;
  }
  
  async createFolder(name: string, parentId: number | null, userId: number): Promise<File> {
    // Check if parent folder exists if parentId is provided
    if (parentId !== null) {
      const parentFolder = this.files.get(parentId);
      if (!parentFolder || !parentFolder.isFolder) {
        throw new Error("Parent folder not found");
      }
      
      // Check if folder belongs to user
      if (parentFolder.userId !== userId) {
        throw new Error("You don't have permission to access this folder");
      }
    }
    
    // Check if folder with same name already exists in the same parent
    const existingFolder = Array.from(this.files.values()).find(
      file => file.name === name && file.parentId === parentId && file.userId === userId && file.isFolder
    );
    
    if (existingFolder) {
      throw new Error(`A folder with the name "${name}" already exists`);
    }
    
    const id = this.fileId++;
    const folder: File = {
      id,
      name,
      path: '',
      type: 'folder',
      size: 0,
      isFolder: true,
      parentId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.files.set(id, folder);
    return folder;
  }
  
  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    // Don't allow changing userId or isFolder
    const { userId, isFolder, ...allowedUpdates } = data;
    
    const updatedFile = { 
      ...file, 
      ...allowedUpdates,
      updatedAt: new Date()
    };
    
    this.files.set(id, updatedFile);
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;
    
    // If it's a folder, delete all its contents recursively
    if (file.isFolder) {
      const childFiles = Array.from(this.files.values()).filter(f => f.parentId === id);
      
      for (const childFile of childFiles) {
        await this.deleteFile(childFile.id);
      }
    }
    
    // Update user's used space
    if (!file.isFolder) {
      const user = this.users.get(file.userId);
      if (user) {
        user.usedSpace = Math.max(0, user.usedSpace - file.size);
        this.users.set(user.id, user);
      }
    }
    
    return this.files.delete(id);
  }
  
  async getFileHierarchy(fileId: number): Promise<File[]> {
    const result: File[] = [];
    let currentFile = this.files.get(fileId);
    
    while (currentFile) {
      result.unshift(currentFile);
      
      if (currentFile.parentId === null) {
        break;
      }
      
      currentFile = this.files.get(currentFile.parentId);
    }
    
    return result;
  }
}

import { DatabaseStorage } from './DatabaseStorage';

// Используем базу данных PostgreSQL вместо хранения в памяти
export const storage = new DatabaseStorage();
