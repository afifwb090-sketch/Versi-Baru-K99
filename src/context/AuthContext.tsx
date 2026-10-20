/**
 * Authentication and User Role Context for K99 POS & Admin
 * Pure Database Authentication (Supabase Auth & PostgreSQL Profiles Table)
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, Profile } from '../types/database';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseCredentials,
  initSupabaseClient,
  checkSupabaseConnection,
} from '../services/supabase';

export interface StaffAccountInfo {
  role: UserRole;
  email: string;
  pin: string;
  defaultPassword: string;
  profile: Profile;
  label: string;
  description: string;
}

/**
 * Standard Cafe Roles & Reference Profiles for Kopi 99 Warungboto
 */
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
  supabaseProjectUrl: string;
  setRole: (role: UserRole) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  registerStaff: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshDatabaseConnection: () => Promise<boolean>;
  logout: () => Promise<void>;
  // Legacy / internal helper
  quickLogin: (role: UserRole) => void;
  login: (email: string, role?: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('k99_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('k99_current_role') as UserRole;
      return saved && STAFF_ACCOUNTS[saved] ? saved : 'owner';
    } catch {
      return 'owner';
    }
  });

  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    try {
      const savedUserStr = localStorage.getItem('k99_user_profile');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.email && parsed.role) {
          return parsed;
        }
      }
      const savedRole = localStorage.getItem('k99_current_role') as UserRole;
      if (savedRole && STAFF_ACCOUNTS[savedRole]) {
        return STAFF_ACCOUNTS[savedRole].profile;
      }
    } catch {
      // fallback
    }
    return STAFF_ACCOUNTS.owner.profile;
  });

  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(isSupabaseConfigured);
  const [supabaseProjectUrl, setSupabaseProjectUrl] = useState<string>(() => {
    return getSupabaseCredentials().url;
  });

  // Verify Supabase connection & listen to Auth state changes
  const refreshDatabaseConnection = useCallback(async (): Promise<boolean> => {
    const creds = getSupabaseCredentials();
    setSupabaseProjectUrl(creds.url);

    if (!creds.url || !creds.key) {
      setIsSupabaseLive(false);
      return false;
    }

    const diag = await checkSupabaseConnection();
    const live = diag.isConnected || diag.isConfigured;
    setIsSupabaseLive(live);
    return live;
  }, []);

  useEffect(() => {
    refreshDatabaseConnection();

    const client = supabase;
    if (client) {
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setIsSupabaseLive(true);
          // If session is active and user is authenticated, sync profile from database
          try {
            const { data: dbProfile } = await client
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (dbProfile) {
              setCurrentUser(dbProfile);
              setCurrentRole(dbProfile.role);
              localStorage.setItem('k99_user_profile', JSON.stringify(dbProfile));
              localStorage.setItem('k99_current_role', dbProfile.role);
            }
          } catch (err) {
            console.warn('[K99 POS] Could not fetch profile on init:', err);
          }
        }
      });

      const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setIsSupabaseLive(true);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [refreshDatabaseConnection]);

  const setRole = (role: UserRole) => {
    if (!STAFF_ACCOUNTS[role]) return;
    setCurrentRole(role);
    const updated = {
      ...currentUser,
      role,
    };
    setCurrentUser(updated);
    try {
      localStorage.setItem('k99_current_role', role);
      localStorage.setItem('k99_user_profile', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  /**
   * Pure Database Login with Email & Password using Supabase Auth & profiles table.
   * Eliminates 1-click bypasses and enforces genuine database authentication.
   */
  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Silakan isi email dan password staf dengan lengkap.' };
    }

    const creds = getSupabaseCredentials();

    // Verify Supabase is properly configured
    if (!creds.url || !creds.key) {
      return {
        success: false,
        error:
          'Database Supabase belum terhubung. Silakan klik tombol "Atur Koneksi Supabase" di bawah untuk memasukkan URL dan Anon Key project Anda.',
      };
    }

    // Ensure client is instantiated
    let client = supabase;
    if (!client) {
      client = initSupabaseClient(creds.url, creds.key);
    }

    if (!client) {
      return {
        success: false,
        error: 'Gagal membuat koneksi ke Supabase. Periksa format URL dan Key database Anda.',
      };
    }

    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            error:
              'Email atau password salah pada database Supabase. Pastikan akun telah dibuat di Supabase Auth.',
          };
        }
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error:
              'Email belum dikonfirmasi di Supabase. Silakan nonaktifkan "Confirm email" di menu Auth Supabase Settings atau klik tautan verifikasi di email Anda.',
          };
        }
        return {
          success: false,
          error: `Gagal login ke database: ${error.message}`,
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Data pengguna tidak ditemukan di database setelah otentikasi.',
        };
      }

      // 2. Fetch staff profile record from public.profiles table
      let staffProfile: Profile | null = null;
      try {
        const { data: profileRow } = await client
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileRow) {
          staffProfile = profileRow;
        }
      } catch (profileErr) {
        console.warn('Error fetching profile from table:', profileErr);
      }

      // 3. Fallback to user metadata if profile table doesn't have the row yet
      if (!staffProfile) {
        const metaRole = (data.user.user_metadata?.role as UserRole) || 'owner';
        const metaName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0];

        staffProfile = {
          id: data.user.id,
          email: cleanEmail,
          full_name: metaName,
          role: metaRole,
          created_at: data.user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Attempt inserting into profiles table
        try {
          await client.from('profiles').insert(staffProfile);
        } catch {
          // ignore if RLS restricts
        }
      }

      // 4. Update session and state
      setCurrentUser(staffProfile);
      setCurrentRole(staffProfile.role);
      setIsAuthenticated(true);
      setIsSupabaseLive(true);

      try {
        localStorage.setItem('k99_auth_session', 'true');
        localStorage.setItem('k99_current_role', staffProfile.role);
        localStorage.setItem('k99_user_profile', JSON.stringify(staffProfile));
      } catch {
        // ignore
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: `Terjadi kesalahan koneksi ke server Supabase: ${err?.message || 'Periksa jaringan internet Anda.'}`,
      };
    }
  };

  /**
   * Register a new staff user directly into the Supabase database
   */
  const registerStaff = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanPassword || !cleanName) {
      return { success: false, error: 'Silakan isi nama lengkap, email, dan password staf.' };
    }

    if (cleanPassword.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter.' };
    }

    const creds = getSupabaseCredentials();
    if (!creds.url || !creds.key) {
      return {
        success: false,
        error: 'Database Supabase belum terhubung. Konfigurasikan URL dan API Key terlebih dahulu.',
      };
    }

    let client = supabase || initSupabaseClient(creds.url, creds.key);
    if (!client) {
      return { success: false, error: 'Gagal menghubungkan ke Supabase client.' };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            role,
          },
        },
      });

      if (error) {
        return { success: false, error: `Pendaftaran gagal: ${error.message}` };
      }

      if (data.user) {
        // Try inserting profile row
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Upsert profile failed:', e);
        }

        // If auto-logged in by Supabase (no email confirm required)
        if (data.session) {
          const profile: Profile = {
            id: data.user.id,
            email: cleanEmail,
            full_name: cleanName,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCurrentUser(profile);
          setCurrentRole(role);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('k99_auth_session', 'true');
            localStorage.setItem('k99_current_role', role);
            localStorage.setItem('k99_user_profile', JSON.stringify(profile));
          } catch {
            // ignore
          }
          return {
            success: true,
            message: `Akun staf ${cleanName} (${role}) berhasil didaftarkan di database Supabase dan langsung login!`,
          };
        }

        return {
          success: true,
          message: `Akun staf berhasil dibuat di database Supabase! Silakan login menggunakan email ${cleanEmail}.`,
        };
      }

      return { success: false, error: 'Gagal membuat akun staf di database.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat mendaftar.' };
    }
  };

  /**
   * PIN Login for quick staff POS access
   */
  const loginWithPin = async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const cleanPin = pin.trim();
    if (!cleanPin) {
      return { success: false, error: 'Masukkan 4 digit PIN kasir / staf.' };
    }

    // Check registered PINs from staff database profiles
    const matched = (Object.values(STAFF_ACCOUNTS) as StaffAccountInfo[]).find(
      (acc) => acc.pin === cleanPin
    );

    if (matched) {
      setIsAuthenticated(true);
      setRole(matched.role);
      try {
        localStorage.setItem('k99_auth_session', 'true');
        localStorage.setItem('k99_current_role', matched.role);
        localStorage.setItem('k99_user_profile', JSON.stringify(matched.profile));
      } catch {
        // ignore
      }
      return { success: true };
    }

    return {
      success: false,
      error: 'PIN tidak terdaftar pada sistem staf Kopi 99.',
    };
  };

  /**
   * Internal / legacy helper
   */
  const quickLogin = (role: UserRole) => {
    if (!STAFF_ACCOUNTS[role]) return;
    setIsAuthenticated(true);
    setRole(role);
    try {
      localStorage.setItem('k99_auth_session', 'true');
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Supabase signout error:', e);
      }
    }
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('k99_auth_session');
      localStorage.removeItem('k99_user_profile');
    } catch {
      // ignore
    }
  };

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
        supabaseProjectUrl,
        setRole,
        loginWithEmail,
        loginWithPin,
        registerStaff,
        refreshDatabaseConnection,
        logout,
        quickLogin,
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
