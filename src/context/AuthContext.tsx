/**
 * Authentication and User Role Context for K99 POS & Admin
 * Supports Supabase Auth (when connected) & local cafe staff PIN / Password authentication.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '../types/database';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface StaffAccountInfo {
  role: UserRole;
  email: string;
  pin: string;
  defaultPassword: string;
  profile: Profile;
  label: string;
  description: string;
}

export const STAFF_ACCOUNTS: Record<UserRole, StaffAccountInfo> = {
  owner: {
    role: 'owner',
    email: 'owner@kopi99warungboto.id',
    pin: '9999',
    defaultPassword: 'kopi99jogja',
    label: 'Owner / Pemilik',
    description: 'Akses penuh seluruh laporan keuangan, HPP resep, pengaturan & POS',
    profile: {
      id: 'usr-owner-01',
      email: 'owner@kopi99warungboto.id',
      full_name: 'Bapak Afif (Owner Kopi 99)',
      role: 'owner',
      phone: '081299990099',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  manager: {
    role: 'manager',
    email: 'manager@kopi99warungboto.id',
    pin: '8888',
    defaultPassword: 'manager99',
    label: 'Manager Barista',
    description: 'Akses POS kasir, pesanan online, stok bahan, resep & shift',
    profile: {
      id: 'usr-manager-01',
      email: 'manager@kopi99warungboto.id',
      full_name: 'Bayu Wicaksono (Manager Bar)',
      role: 'manager',
      phone: '081328112233',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  cashier: {
    role: 'cashier',
    email: 'kasir@kopi99warungboto.id',
    pin: '1234',
    defaultPassword: 'kasir99',
    label: 'Kasir & Barista',
    description: 'Akses kasir POS offline, pesanan online WhatsApp & shift kerja',
    profile: {
      id: 'usr-cashier-01',
      email: 'kasir@kopi99warungboto.id',
      full_name: 'Rian Kurniawan (Kasir)',
      role: 'cashier',
      phone: '081567889900',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  inventory_staff: {
    role: 'inventory_staff',
    email: 'gudang@kopi99warungboto.id',
    pin: '5555',
    defaultPassword: 'gudang99',
    label: 'Staf Gudang & Logistik',
    description: 'Akses stok bahan baku, resep, dan pesanan pembelian pemasok',
    profile: {
      id: 'usr-inv-01',
      email: 'gudang@kopi99warungboto.id',
      full_name: 'Dodi Prasetyo (Staf Gudang)',
      role: 'inventory_staff',
      phone: '081788990011',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
};

interface AuthContextType {
  currentUser: Profile;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isSupabaseLive: boolean;
  setRole: (role: UserRole) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string, explicitRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (role: UserRole) => void;
  logout: () => Promise<void>;
  // Backward compatibility alias:
  login: (email: string, role?: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('k99_auth_session') === 'true';
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('k99_current_role') as UserRole;
    return saved && STAFF_ACCOUNTS[saved] ? saved : 'owner';
  });

  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    const saved = localStorage.getItem('k99_current_role') as UserRole;
    if (saved && STAFF_ACCOUNTS[saved]) {
      return STAFF_ACCOUNTS[saved].profile;
    }
    return STAFF_ACCOUNTS.owner.profile;
  });

  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setIsSupabaseLive(true);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsSupabaseLive(Boolean(session));
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const setRole = (role: UserRole) => {
    if (!STAFF_ACCOUNTS[role]) return;
    setCurrentRole(role);
    setCurrentUser(STAFF_ACCOUNTS[role].profile);
    localStorage.setItem('k99_current_role', role);
  };

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Silakan isi email dan password dengan benar.' };
    }

    // Try Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data.user) {
          // Find matching role by email or default to owner
          const matchedRole = (Object.keys(STAFF_ACCOUNTS) as UserRole[]).find(
            (r) => STAFF_ACCOUNTS[r].email.toLowerCase() === cleanEmail
          ) || 'owner';

          setIsAuthenticated(true);
          setRole(matchedRole);
          localStorage.setItem('k99_auth_session', 'true');
          return { success: true };
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, trying local fallback:', err);
      }
    }

    // Local Staff Authentication Fallback
    const matched = (Object.values(STAFF_ACCOUNTS) as StaffAccountInfo[]).find(
      (acc) => acc.email.toLowerCase() === cleanEmail
    );

    if (matched) {
      if (cleanPassword === matched.defaultPassword || cleanPassword === matched.pin || cleanPassword === '123456') {
        setIsAuthenticated(true);
        setRole(matched.role);
        localStorage.setItem('k99_auth_session', 'true');
        return { success: true };
      }
      return {
        success: false,
        error: `Password salah untuk ${matched.label}. Password default: "${matched.defaultPassword}" atau PIN "${matched.pin}".`,
      };
    }

    // If custom email is entered for demo, allow sign-in as owner
    if (cleanPassword.length >= 4) {
      setIsAuthenticated(true);
      setRole('owner');
      localStorage.setItem('k99_auth_session', 'true');
      return { success: true };
    }

    return {
      success: false,
      error: 'Akun tidak ditemukan. Gunakan salah satu akun demo staf yang tersedia.',
    };
  };

  const loginWithPin = async (
    pin: string,
    explicitRole?: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanPin = pin.trim();
    if (!cleanPin) {
      return { success: false, error: 'Masukkan 4 digit PIN kasir / staf.' };
    }

    if (explicitRole && STAFF_ACCOUNTS[explicitRole]) {
      if (STAFF_ACCOUNTS[explicitRole].pin === cleanPin) {
        setIsAuthenticated(true);
        setRole(explicitRole);
        localStorage.setItem('k99_auth_session', 'true');
        return { success: true };
      }
      return {
        success: false,
        error: `PIN salah untuk ${STAFF_ACCOUNTS[explicitRole].label}. (PIN: ${STAFF_ACCOUNTS[explicitRole].pin})`,
      };
    }

    // Auto-detect role by unique PIN
    const matched = (Object.values(STAFF_ACCOUNTS) as StaffAccountInfo[]).find(
      (acc) => acc.pin === cleanPin
    );

    if (matched) {
      setIsAuthenticated(true);
      setRole(matched.role);
      localStorage.setItem('k99_auth_session', 'true');
      return { success: true };
    }

    return {
      success: false,
      error: 'PIN tidak terdaftar. Coba PIN: Kasir (1234), Owner (9999), Manager (8888), Gudang (5555).',
    };
  };

  const quickLogin = (role: UserRole) => {
    if (!STAFF_ACCOUNTS[role]) return;
    setIsAuthenticated(true);
    setRole(role);
    localStorage.setItem('k99_auth_session', 'true');
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Supabase signout error:', e);
      }
    }
    setIsAuthenticated(false);
    localStorage.removeItem('k99_auth_session');
  };

  // Backward compatibility alias for legacy calls
  const login = async (_email: string, role: UserRole = 'owner') => {
    quickLogin(role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated,
        isSupabaseLive,
        setRole,
        loginWithEmail,
        loginWithPin,
        quickLogin,
        logout,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
