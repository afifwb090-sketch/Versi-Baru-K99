/**
 * Authentication and User Role Context
 * Supports Supabase Auth when configured, with seamless role switcher for staff workflows.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Profile } from '../types/database';
import { supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  currentUser: Profile;
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  isSupabaseLive: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const defaultProfiles: Record<UserRole, Profile> = {
  owner: {
    id: 'usr-owner-01',
    email: 'owner@kopi99warungboto.id',
    full_name: 'Bapak Afif (Owner Kopi 99)',
    role: 'owner',
    phone: '081299990099',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  manager: {
    id: 'usr-manager-01',
    email: 'manager@kopi99warungboto.id',
    full_name: 'Bayu Wicaksono (Manager Bar)',
    role: 'manager',
    phone: '081328112233',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  cashier: {
    id: 'usr-cashier-01',
    email: 'kasir@kopi99warungboto.id',
    full_name: 'Rian Kurniawan (Kasir)',
    role: 'cashier',
    phone: '081567889900',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  inventory_staff: {
    id: 'usr-inv-01',
    email: 'gudang@kopi99warungboto.id',
    full_name: 'Dodi Prasetyo (Staf Gudang)',
    role: 'inventory_staff',
    phone: '081788990011',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [currentUser, setCurrentUser] = useState<Profile>(defaultProfiles.owner);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    // Check saved role in session
    const savedRole = localStorage.getItem('k99_current_role') as UserRole;
    if (savedRole && defaultProfiles[savedRole]) {
      setCurrentRole(savedRole);
      setCurrentUser(defaultProfiles[savedRole]);
    }

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
    setCurrentRole(role);
    setCurrentUser(defaultProfiles[role]);
    localStorage.setItem('k99_current_role', role);
  };

  const login = async (email: string, role: UserRole = 'owner') => {
    setRole(role);
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setRole('cashier');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        setRole,
        isAuthenticated: true,
        isSupabaseLive,
        login,
        logout,
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
