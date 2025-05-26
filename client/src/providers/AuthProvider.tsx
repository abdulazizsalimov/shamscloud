import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextType {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current user
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.status === 401) {
          return null; // Пользователь не авторизован
        }
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        return await response.json();
      } catch (error) {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Update status based on user data and loading state
  useEffect(() => {
    if (isLoading) {
      setStatus("loading");
    } else {
      setStatus(user ? "authenticated" : "unauthenticated");
    }
  }, [user, isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Login successful",
        description: "You have been logged in successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: { name: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return res.json();
    },
    onSuccess: (data: User) => {
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/auth/reset-password", { email });
    },
    onSuccess: () => {
      toast({
        title: "Password reset requested",
        description: "Check your email for further instructions",
      });
    },
    onError: (error) => {
      toast({
        title: "Password reset failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Helper function to handle login
  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  // Helper function to handle registration
  const register = async (name: string, email: string, password: string) => {
    await registerMutation.mutateAsync({ name, email, password });
  };

  // Helper function to handle logout
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // Helper function to handle password reset
  const resetPassword = async (email: string) => {
    await resetPasswordMutation.mutateAsync(email);
  };

  // Helper function to refresh user data
  const refreshUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  // Check if user is admin
  const isAdmin = !!user && user.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        status,
        login,
        register,
        logout,
        resetPassword,
        refreshUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function for auth queries
function getQueryFn<T>({ on401 }: { on401: "returnNull" | "throw" }): () => Promise<T | null> {
  return async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (on401 === "returnNull" && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      return res.json();
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  };
}
