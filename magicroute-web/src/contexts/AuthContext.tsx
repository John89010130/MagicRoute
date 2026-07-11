import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserData {
  idEmpresa: string;
  nomeEmpresa: string;
  cnpj: string;
  urlApi: string;
  tipoPessoa: string;
  tipoPessoaAtivo?: string;
  codigo: string;
  nomeUsuario: string;
  bd?: string;
}

interface AuthContextType {
  user: UserData | null;
  isAuthenticated: boolean;
  login: (data: UserData) => void;
  logout: () => void;
  updateUser: (data: Partial<UserData>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem('magicroute_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('magicroute_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('magicroute_user');
    }
  }, [user]);

  const login = (data: UserData) => setUser(data);
  const logout = () => setUser(null);
  const updateUser = (data: Partial<UserData>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
