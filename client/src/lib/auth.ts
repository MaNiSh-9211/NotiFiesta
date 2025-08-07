import { apiRequest } from "./queryClient";
import type { User, LoginRequest, RegisterRequest } from "@shared/schema";

export interface AuthResponse {
  user: User;
  token: string;
  vapidPublicKey: string;
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem("auth_token");
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/login", credentials);
    const data = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiRequest("POST", "/api/auth/register", userData);
    const data = await response.json();
    
    this.setAuth(data.token, data.user);
    return data;
  }

  async googleAuth(idToken: string): Promise<AuthResponse> {
    console.log("Auth Service: Starting Google auth with token length:", idToken.length);
    try {
      const response = await apiRequest("POST", "/api/auth/google", { idToken });
      console.log("Auth Service: Google auth response status:", response.status);
      
      const data = await response.json();
      console.log("Auth Service: Google auth data received:", {
        hasToken: !!data.token,
        hasUser: !!data.user,
        tokenLength: data.token?.length,
        userId: data.user?.id
      });
      
      this.setAuth(data.token, data.user);
      console.log("Auth Service: Auth data set successfully");
      return data;
    } catch (error) {
      console.error("Auth Service: Google auth error:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) return null;
    
    try {
      const response = await fetch("/api/user/me", {
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        this.logout();
        return null;
      }
      
      const user = await response.json();
      this.user = user;
      return user;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  private setAuth(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem("auth_token", token);
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("auth_token");
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const authService = new AuthService();

// Helper function to add Authorization header to requests
export const getAuthHeaders = () => {
  const token = authService.getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
};
