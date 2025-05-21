import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { IStorage } from "./storage";
import { loginSchema, registerSchema, resetPasswordSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export function setupAuth(app: Express, storage: IStorage) {
  // Middleware to extract user from session
  const getCurrentUser = async (req: Request): Promise<AuthUser | null> => {
    if (!req.session.userId) return null;
    
    const user = await storage.getUserById(req.session.userId);
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
  };

  // Guard middleware for authenticated routes
  const authGuard = async (req: Request, res: Response, next: Function) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Add user to request object
    (req as any).user = user;
    next();
  };

  // Guard middleware for admin routes
  const adminGuard = async (req: Request, res: Response, next: Function) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Add user to request object
    (req as any).user = user;
    next();
  };

  // Get current user
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get full user data including quota and used space
    const fullUser = await storage.getUserById(user.id);
    if (!fullUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't send password
    const { password, ...userData } = fullUser;
    
    res.json(userData);
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is blocked
      if (user.isBlocked) {
        return res.status(403).json({ message: "Your account has been blocked. Please contact an administrator." });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set user ID in session
      req.session.userId = user.id;
      
      // Don't send password
      const { password, ...userData } = user;
      
      res.json(userData);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create user
      const { confirmPassword, ...userData } = validatedData;
      const newUser = await storage.createUser({
        ...userData,
        role: "user",
        quota: 10737418240, // 10GB default
      });
      
      // Set user ID in session
      req.session.userId = newUser.id;
      
      // Don't send password
      const { password, ...newUserData } = newUser;
      
      res.status(201).json(newUserData);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "An error occurred during logout" });
      }
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = resetPasswordSchema.parse(req.body);
      
      // Check if email exists
      const user = await storage.getUserByEmail(validatedData.email);
      
      if (!user) {
        // Don't reveal that the email doesn't exist
        return res.status(200).json({ message: "If an account with this email exists, a password reset link has been sent" });
      }
      
      // In a real application, send an email with a reset link or token
      // For this demo, we'll just respond with success
      
      res.status(200).json({ message: "If an account with this email exists, a password reset link has been sent" });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error("Password reset error:", error);
      res.status(500).json({ message: "An error occurred during password reset" });
    }
  });

  // Admin routes
  
  // Get all users (admin only)
  app.get("/api/admin/users", adminGuard, async (req: Request, res: Response) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string || "";
      
      const { users, total } = await storage.getAllUsers(page, limit, search);
      
      // Don't send passwords
      const userData = users.map(user => {
        const { password, ...rest } = user;
        return rest;
      });
      
      res.json({ users: userData, total });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "An error occurred while fetching users" });
    }
  });

  // Create user (admin only)
  app.post("/api/admin/users", adminGuard, async (req: Request, res: Response) => {
    try {
      const { name, email, password, role, quota } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Create user
      const newUser = await storage.createUser({
        name,
        email,
        password,
        role: role || "user",
        quota: parseInt(quota) || 10737418240, // 10GB default
      });
      
      // Don't send password
      const { password: _, ...newUserData } = newUser;
      
      res.status(201).json(newUserData);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "An error occurred while creating user" });
    }
  });

  // Update user quota (admin only)
  app.patch("/api/admin/users/:id/quota", adminGuard, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { quota } = req.body;
      
      if (!quota || isNaN(parseInt(quota))) {
        return res.status(400).json({ message: "Invalid quota value" });
      }
      
      // Get user
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        quota: parseInt(quota),
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password
      const { password, ...userData } = updatedUser;
      
      res.json(userData);
    } catch (error) {
      console.error("Update quota error:", error);
      res.status(500).json({ message: "An error occurred while updating quota" });
    }
  });

  // Update user block status (admin only)
  app.patch("/api/admin/users/:id/block", adminGuard, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { isBlocked } = req.body;
      
      if (typeof isBlocked !== "boolean") {
        return res.status(400).json({ message: "Invalid block status" });
      }
      
      // Get user
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        isBlocked,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password
      const { password, ...userData } = updatedUser;
      
      res.json(userData);
    } catch (error) {
      console.error("Update block status error:", error);
      res.status(500).json({ message: "An error occurred while updating block status" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:id/role", adminGuard, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (role !== "user" && role !== "admin") {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Get user
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const updatedUser = await storage.updateUser(userId, {
        role,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send password
      const { password, ...userData } = updatedUser;
      
      res.json(userData);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "An error occurred while updating role" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", adminGuard, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get user
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow deleting the current user
      if (userId === (req as any).user.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      
      // Delete user
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "An error occurred while deleting user" });
    }
  });

  // Return middleware for other routes to use
  return { authGuard, adminGuard };
}
