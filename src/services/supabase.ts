/**
 * Centralized Supabase Client & Connection Diagnostics
 * K99 POS System - Kopi 99 Warungboto
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment check for both Vite browser and Node test runner
const env = (typeof import.meta !== 'undefined' && import.meta.env)
  ? import.meta.env
  : (typeof process !== 'undefined' && process.env ? process.env : {});

export function getSupabaseCredentials(): { url: string; key: string } {
  let localUrl = '';
  let localKey = '';
  try {
    if (typeof localStorage !== 'undefined') {
      localUrl = localStorage.getItem('k99_supabase_url') || '';
      localKey = localStorage.getItem('k99_supabase_key') || '';
    }
  } catch {
    // ignore storage access errors
  }

  const url = (localUrl || env.VITE_SUPABASE_URL || '').trim();
  const key = (localKey || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();

  return { url, key };
}

export function isSupabaseValid(url: string, key: string): boolean {
  return Boolean(
    url &&
    url.length > 10 &&
    !url.includes('your-project-id') &&
    key &&
    key.length > 20 &&
    !key.includes('...')
  );
}

const initialCreds = getSupabaseCredentials();

export let isSupabaseConfigured = isSupabaseValid(initialCreds.url, initialCreds.key);

export let supabase: SupabaseClient | null = null;

export function initSupabaseClient(url: string, key: string): SupabaseClient | null {
  if (!isSupabaseValid(url, key)) {
    supabase = null;
    isSupabaseConfigured = false;
    return null;
  }

  try {
    supabase = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    isSupabaseConfigured = true;
    return supabase;
  } catch (err) {
    console.warn('[K99 POS] Gagal inisialisasi Supabase client:', err);
    supabase = null;
    isSupabaseConfigured = false;
    return null;
  }
}

// Initial client creation
initSupabaseClient(initialCreds.url, initialCreds.key);

export function saveSupabaseCredentials(url: string, key: string): { success: boolean; error?: string } {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  if (!cleanUrl) {
    return { success: false, error: 'URL Supabase wajib diisi (contoh: https://xyz.supabase.co).' };
  }
  if (!cleanKey) {
    return { success: false, error: 'Anon / Publishable API Key wajib diisi.' };
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('k99_supabase_url', cleanUrl);
      localStorage.setItem('k99_supabase_key', cleanKey);
    }
    const client = initSupabaseClient(cleanUrl, cleanKey);
    if (!client) {
      return { success: false, error: 'Format URL atau Key tidak valid untuk Supabase.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan pengaturan Supabase.' };
  }
}

export function clearSupabaseCredentials(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('k99_supabase_url');
      localStorage.removeItem('k99_supabase_key');
    }
  } catch {
    // ignore
  }
  const fallbackCreds = {
    url: (env.VITE_SUPABASE_URL || '').trim(),
    key: (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim(),
  };
  initSupabaseClient(fallbackCreds.url, fallbackCreds.key);
}

export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  isConnected: boolean;
  supabaseUrl: string;
  hasKey: boolean;
  message: string;
  errorCode?: 'MISSING_URL' | 'MISSING_KEY' | 'TABLES_MISSING' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'READY';
  details?: string;
  checkedAt: string;
}

/**
 * Real diagnostic ping to PostgreSQL table.
 * Never reports success until a real query succeeds.
 */
export async function checkSupabaseConnection(customUrl?: string, customKey?: string): Promise<SupabaseDiagnosticResult> {
  const now = new Date().toISOString();
  const creds = customUrl && customKey ? { url: customUrl.trim(), key: customKey.trim() } : getSupabaseCredentials();

  if (!creds.url || creds.url.includes('your-project-id')) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl: creds.url || 'Belum diatur',
      hasKey: Boolean(creds.key),
      errorCode: 'MISSING_URL',
      message: 'VITE_SUPABASE_URL belum dikonfigurasi',
      details: 'Silakan isi VITE_SUPABASE_URL dengan URL project Supabase Anda (contoh: https://xyz.supabase.co).',
      checkedAt: now,
    };
  }

  if (!creds.key || creds.key.includes('...')) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl: creds.url,
      hasKey: false,
      errorCode: 'MISSING_KEY',
      message: 'VITE_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi',
      details: 'Silakan masukkan anon/publishable key dari dashboard Supabase Anda.',
      checkedAt: now,
    };
  }

  // Use either custom temporary client or active client
  let clientToTest = supabase;
  if (customUrl && customKey) {
    try {
      clientToTest = createClient(creds.url, creds.key);
    } catch {
      return {
        isConfigured: false,
        isConnected: false,
        supabaseUrl: creds.url,
        hasKey: true,
        errorCode: 'NETWORK_ERROR',
        message: 'Client Supabase gagal dibuat dengan URL ini',
        checkedAt: now,
      };
    }
  }

  if (!clientToTest) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl: creds.url,
      hasKey: true,
      errorCode: 'NETWORK_ERROR',
      message: 'Client Supabase belum siap',
      checkedAt: now,
    };
  }

  try {
    // Attempt actual query on business_settings
    const { data, error } = await clientToTest
      .from('business_settings')
      .select('business_name')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        // relation does not exist
        return {
          isConfigured: true,
          isConnected: false,
          supabaseUrl: creds.url,
          hasKey: true,
          errorCode: 'TABLES_MISSING',
          message: 'Tabel database K99 belum dimigrasikan ke Supabase',
          details: 'Koneksi ke server Supabase aktif, tetapi tabel "business_settings" belum ada. Jalankan 3 file SQL migration di menu SQL Editor Supabase Anda.',
          checkedAt: now,
        };
      }
      return {
        isConfigured: true,
        isConnected: false,
        supabaseUrl: creds.url,
        hasKey: true,
        errorCode: 'AUTH_ERROR',
        message: `Koneksi Supabase ditolak: ${error.message}`,
        details: error.details || error.hint || 'Periksa API Key atau hak akses RLS Supabase.',
        checkedAt: now,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      supabaseUrl: creds.url,
      hasKey: true,
      errorCode: 'READY',
      message: 'Koneksi database PostgreSQL Supabase terhubung & aktif!',
      details: data && data.length > 0 ? `Database K99 siap: ${data[0].business_name}` : 'Tabel siap dan menunggu data.',
      checkedAt: now,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      supabaseUrl: creds.url,
      hasKey: true,
      errorCode: 'NETWORK_ERROR',
      message: 'Gagal menghubungi server Supabase',
      details: err?.message || 'Pastikan jaringan internet aktif dan URL Supabase benar.',
      checkedAt: now,
    };
  }
}
