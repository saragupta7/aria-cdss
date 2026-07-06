import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../../api/auth';
import { useNavigate, useLocation } from 'react-router';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'senior' | 'junior';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('aria_token');
        if (!token) {
          if (location.pathname !== '/login' && location.pathname !== '/') {
             navigate('/login');
          }
          setLoading(false);
          return;
        }

        const data = await authApi.me();
        setUser(data.user);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        localStorage.removeItem('aria_token');
        if (location.pathname !== '/login' && location.pathname !== '/') {
           navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate, location.pathname]);

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const updateUser = (updated: User) => setUser(updated);

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
