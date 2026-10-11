import React, { createContext, useContext, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
});

interface AuthContextType {
  user: any | null;
  memberships: any[];
  activeBusiness: any | null;
  activeBranch: any | null;
  activeRegister: any | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  setActiveBusiness: (biz: any) => void;
  setActiveBranch: (branch: any) => void;
  setActiveRegister: (register: any) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [activeBusiness, setActiveBusiness] = useState<any | null>(null);
  const [activeBranch, setActiveBranch] = useState<any | null>(null);
  const [activeRegister, setActiveRegister] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const setTokens = (token: string) => {
    localStorage.setItem('pos_token', token);
    sessionStorage.setItem('pos_token', token);
  };

  const clearTokens = () => {
    localStorage.removeItem('pos_token');
    sessionStorage.removeItem('pos_token');
  };

  const initAuth = async () => {
    try {
      const res = await api.me();
      if (res && res.user) {
        setUser(res.user);
        setMemberships(res.memberships || []);
        if (res.memberships && res.memberships.length > 0) {
          const firstBiz = res.memberships[0];
          setActiveBusiness(firstBiz);
          loadBranchesAndRegisters(firstBiz.businessId);
        }
      }
    } catch (err: any) {
      if (err?.status === 401 || err?.code === 'UNAUTHENTICATED') {
        clearTokens();
        setUser(null);
        setMemberships([]);
        setActiveBusiness(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBranchesAndRegisters = async (businessId: string) => {
    try {
      const branches = await api.getBranches(businessId);
      if (branches && branches.length > 0) {
        setActiveBranch(branches[0]);
        const registers = await api.getRegisters(businessId, branches[0].id);
        if (registers && registers.length > 0) {
          setActiveRegister(registers[0]);
        }
      }
    } catch (e) {
      console.error('Error loading branches/registers:', e);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.login(credentials);
    if (res.token) {
      setTokens(res.token);
    }
    setUser(res.user);
    setMemberships(res.memberships || []);
    if (res.memberships && res.memberships.length > 0) {
      const firstBiz = res.memberships[0];
      setActiveBusiness(firstBiz);
      await loadBranchesAndRegisters(firstBiz.businessId);
    }
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (res.token) {
      setTokens(res.token);
    }
    setUser(res.user);
    const mems = res.memberships || [];
    setMemberships(mems);
    if (mems.length > 0) {
      const firstBiz = mems[0];
      setActiveBusiness(firstBiz);
      await loadBranchesAndRegisters(firstBiz.businessId);
    } else if (res.business) {
      const fallbackBiz = {
        businessId: res.business.id,
        businessName: res.business.name,
        businessSlug: res.business.slug,
        businessType: res.business.business_type || 'general_retail',
        defaultCurrency: res.business.default_currency || 'PKR',
        roleName: 'Owner',
      };
      setActiveBusiness(fallbackBiz);
      await loadBranchesAndRegisters(res.business.id);
    }
    initAuth().catch(() => {});
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      clearTokens();
      setUser(null);
      setMemberships([]);
      setActiveBusiness(null);
      setActiveBranch(null);
      setActiveRegister(null);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          memberships,
          activeBusiness,
          activeBranch,
          activeRegister,
          loading,
          login,
          register,
          logout,
          setActiveBusiness: (biz) => {
            setActiveBusiness(biz);
            loadBranchesAndRegisters(biz.businessId);
          },
          setActiveBranch,
          setActiveRegister,
        }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};
