/**
 * Centralized Supabase Client & Connection Diagnostics
 * K99 POS System - Kopi 99 Warungboto
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim().length > 0 &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseKey &&
  supabaseKey.trim().length > 0 &&
  !supabaseKey.includes('...')
);

export let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[K99 POS] Gagal inisialisasi Supabase client:', err);
    supabase = null;
  }
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
export async function checkSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const now = new Date().toISOString();

  if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl: supabaseUrl || 'Belum diatur',
      hasKey: Boolean(supabaseKey),
      errorCode: 'MISSING_URL',
      message: 'VITE_SUPABASE_URL belum dikonfigurasi di file .env',
      details: 'Silakan isi VITE_SUPABASE_URL dengan URL project Supabase Anda (contoh: https://xyz.supabase.co).',
      checkedAt: now,
    };
  }

  if (!supabaseKey || supabaseKey.includes('...')) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl,
      hasKey: false,
      errorCode: 'MISSING_KEY',
      message: 'VITE_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi di file .env',
      details: 'Silakan masukkan anon/publishable key dari dashboard Supabase Anda.',
      checkedAt: now,
    };
  }

  if (!supabase) {
    return {
      isConfigured: false,
      isConnected: false,
      supabaseUrl,
      hasKey: true,
      errorCode: 'NETWORK_ERROR',
      message: 'Client Supabase gagal dibuat',
      checkedAt: now,
    };
  }

  try {
    // Attempt actual query on business_settings
    const { data, error } = await supabase
      .from('business_settings')
      .select('business_name')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        // relation does not exist
        return {
          isConfigured: true,
          isConnected: false,
          supabaseUrl,
          hasKey: true,
          errorCode: 'TABLES_MISSING',
          message: 'Tabel database K99 belum dimigrasikan ke Supabase',
          details: 'Koneksi ke Supabase aktif, tetapi tabel "business_settings" belum ada. Jalankan SQL migration di tab Pengaturan / Setup.',
          checkedAt: now,
        };
      }
      return {
        isConfigured: true,
        isConnected: false,
        supabaseUrl,
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
      supabaseUrl,
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
      supabaseUrl,
      hasKey: true,
      errorCode: 'NETWORK_ERROR',
      message: 'Gagal menghubungi server Supabase',
      details: err?.message || 'Pastikan jaringan internet aktif dan URL Supabase benar.',
      checkedAt: now,
    };
  }
}
