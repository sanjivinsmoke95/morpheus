import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getToken, setToken } from "./api";

export type Role = "ADMIN" | "OFFICER" | "REVIEWER";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>(null as unknown as AuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(getToken());

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["me", token],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      try {
        return (await api.get<User>("/auth/me")).data;
      } catch {
        setToken(null);
        setTok(null);
        return null;
      }
    },
  });

  async function login(email: string, password: string) {
    const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
    setToken(data.access_token);
    setTok(data.access_token);
  }

  function logout() {
    setToken(null);
    setTok(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        loading: !!token && isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
