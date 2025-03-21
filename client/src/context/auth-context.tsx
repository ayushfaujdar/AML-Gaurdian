import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string | number;
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is already authenticated
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    // This will return null on 401 instead of throwing an error
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        return res.json();
      } catch (error) {
        console.error("Auth check error:", error);
        return null;
      }
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Set user when data is loaded
  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      return apiRequest("POST", "/api/login", { username, password });
    },
    onSuccess: async (response) => {
      const userData = await response.json();
      setUser(userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.name}!`,
      });
      // Invalidate queries that depend on auth state
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/logout", {});
    },
    onSuccess: () => {
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      // Invalidate queries that depend on auth state
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // Login function
  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  // Logout function
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  // For development purposes, use a mock admin user if no user is authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      // Mock admin user
      setUser({
        id: 1,
        username: "admin",
        name: "Admin User",
        role: "admin"
      });
    }
  }, [isLoading, user]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
