import { pgTable, text, serial, integer, boolean, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  quota: text("quota").notNull().default("10737418240"), // 10GB in bytes as string
  used_space: text("used_space").notNull().default("0"), // Used space as string
  is_blocked: boolean("is_blocked").notNull().default(false),
  is_email_verified: boolean("is_email_verified").notNull().default(false), // Флаг верификации email
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// Токены подтверждения
export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  type: text("type").notNull().default("email"), // тип токена: email, reset-password и т.д.
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

// File schema
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(),
  size: text("size").notNull().default("0"), // Size as string
  is_folder: boolean("is_folder").notNull().default(false),
  parent_id: integer("parent_id"),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Поля для публичного доступа
  is_public: boolean("is_public").notNull().default(false),
  public_token: text("public_token"),
  share_type: text("share_type"), // 'direct' или 'page'
  is_password_protected: boolean("is_password_protected").notNull().default(false),
  share_password: text("share_password"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  password: true,
  role: true,
  quota: true,
  is_blocked: true,
  is_email_verified: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  name: true,
  path: true,
  type: true,
  size: true,
  is_folder: true,
  parent_id: true,
  user_id: true,
  is_public: true,
  public_token: true,
  share_type: true,
  is_password_protected: true,
  share_password: true,
});

// Types - с ручной настройкой для совместимости с базой данных
export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  quota: string;
  usedSpace: string;
  isBlocked: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
}

export interface VerificationToken {
  id: number;
  userId: number;
  token: string;
  type: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface File {
  id: number;
  name: string;
  path: string;
  type: string;
  size: string;
  isFolder: boolean;
  parentId: number | null;
  userId: number;
  // Поля для публичного доступа
  isPublic: boolean;
  publicToken: string | null;
  shareType: string | null;
  isPasswordProtected: boolean;
  sharePassword: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;

// Extended schemas for validation
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const resetPasswordSchema = z.object({
  email: z.string().email()
});

export const createFolderSchema = z.object({
  name: z.string().min(1),
  parentId: z.number().optional().nullable(),
});

export const updateFileSchema = z.object({
  name: z.string().min(1),
});
