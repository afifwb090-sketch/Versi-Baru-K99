import React, { useState, useEffect } from 'react';
import { BusinessSettings } from '../../types/database';
import { dataService } from '../../services/dataService';
import { checkSupabaseConnection, SupabaseDiagnosticResult } from '../../services/supabase';
import { formatDateIndonesian } from '../../utils/formatters';
import {
  Settings,
  Database,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Code2,
  Store,
  Printer,
  ShieldCheck,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<BusinessSettings>(dataService.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Supabase Diagnostics
  const [diagnostic, setDiagnostic] = useState<SupabaseDiagnosticResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedMigration, setCopiedMigration] = useState(false);

  useEffect(() => {
    runDiagnostic();
  }, []);

  const runDiagnostic = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseConnection();
      setDiagnostic(res);
    } finally {
      setIsChecking(false);
    }
  };

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    dataService.updateSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCopyMigrationScript = () => {
    const script = `-- Jalankan SQL ini di Supabase Dashboard -> SQL Editor
create extension if not exists "uuid-ossp";

-- Buat semua tabel K99 POS
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Kopi 99 Warungboto',
  tagline text default 'Kopi & Matcha Kekinian',
  address text not null default 'Jl. Veteran No. 99, Warungboto, Umbulharjo, Yogyakarta 55164',
  whatsapp_number text not null default '6281299990099',
  phone text default '081299990099',
  tax_enabled boolean default false,
  tax_percentage numeric(5, 2) default 10.00,
  updated_at timestamptz default now() not null
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  price_offline numeric(12, 2) not null,
  price_online numeric(12, 2) not null,
  estimated_hpp numeric(12, 2) default 0,
  is_active boolean default true,
  is_online_available boolean default true,
  is_offline_available boolean default true,
  created_at timestamptz default now() not null
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  channel text not null,
  customer_name text not null,
  status text not null,
  payment_status text not null,
  gross_total numeric(12, 2) not null,
  created_at timestamptz default now() not null
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  current_stock numeric(10, 3) not null default 0,
  cost_per_base_unit numeric(12, 4) not null default 0
);
`;
    navigator.clipboard.writeText(script);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Pengaturan Bisnis & Integrasi Database Supabase</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Atur profil kedai Kopi 99 Warungboto, nomor WhatsApp pemesanan, dan hubungi database cloud Supabase
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan berhasil disimpan dan diperbarui!</span>
        </div>
      )}

      {/* SECTION 1: SUPABASE INTEGRATION & DIAGNOSTICS HUB */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Supabase PostgreSQL Hub & Diagnostik</h2>
              <p className="text-xs text-slate-400">Pusat pemantauan koneksi cloud database & migrasi SQL</p>
            </div>
          </div>

          <button
            onClick={runDiagnostic}
            disabled={isChecking}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Mengecek...' : 'Uji Koneksi'}</span>
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Status Banner */}
          {diagnostic && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                diagnostic.isConnected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              {diagnostic.isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm">{diagnostic.message}</div>
                {diagnostic.details && <p className="text-xs opacity-90">{diagnostic.details}</p>}
                <div className="text-[11px] font-mono opacity-80 pt-1">
                  URL: {diagnostic.supabaseUrl} • Diuji: {formatDateIndonesian(diagnostic.checkedAt, true)}
                </div>
              </div>
            </div>
          )}

          {/* Setup Guide Steps */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Langkah Menghubungkan Supabase Cloud Database:
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed">
              <li>
                Buka akun gratis di{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Supabase.com <ExternalLink className="w-3 h-3" />
                </a>{' '}
                dan buat project baru bernama <strong>kopi99-pos</strong>.
              </li>
              <li>
                Salin file SQL migration yang telah dibuat di folder <code>/supabase/migrations/</code> dan jalankan di menu <strong>SQL Editor</strong> Supabase.
              </li>
              <li>
                Di Supabase Dashboard, buka <strong>Project Settings → API</strong>. Salin <strong>Project URL</strong> dan <strong>anon/public Key</strong>.
              </li>
              <li>
                Buka panel Secrets atau file <code>.env</code> Anda, dan masukkan:
                <pre className="p-2 mt-1 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
                  VITE_SUPABASE_URL="https://[PROJECT-ID].supabase.co"&#10;VITE_SUPABASE_PUBLISHABLE_KEY="[ANON-PUBLIC-KEY]"
                </pre>
              </li>
            </ol>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={handleCopyMigrationScript}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedMigration ? '✓ Tersalin ke Clipboard!' : 'Salin Script SQL Migration'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BUSINESS PROFILE SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Store className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-sm text-slate-900">Profil Usaha & WhatsApp Pemesanan</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Nama Kedai / Usaha</label>
            <input
              type="text"
              value={settings.business_name}
              onChange={(e) => handleChange('business_name', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Slogan / Tagline</label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap Kedai</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nomor WhatsApp Penerima Pesanan Online (Wajib Valid)
            </label>
            <input
              type="text"
              value={settings.whatsapp_number}
              onChange={(e) => handleChange('whatsapp_number', e.target.value)}
              placeholder="e.g. 6281299990099 atau 0812..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-700"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Digunakan untuk menerima chat pesan otomatis saat checkout publik.
            </span>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Jam Operasional Toko</label>
            <input
              type="text"
              value={settings.opening_hours}
              onChange={(e) => handleChange('opening_hours', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        {/* Store Open / Closed Switch for Public Ordering Website */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${settings.is_store_open ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="font-bold text-slate-900 text-xs">
                  Status Buka / Tutup Kedai untuk Website Publik
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings.is_store_open ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {settings.is_store_open ? 'SEDANG BUKA' : 'SEDANG TUTUP'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Bila ditutup, website publik akan menampilkan status tutup dan menonaktifkan pemesanan WhatsApp agar tidak mengganggu barista saat toko tutup.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.is_store_open}
                onChange={(e) => handleChange('is_store_open', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {!settings.is_store_open && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Pesan Khusus Saat Kedai Tutup (Ditampilkan ke Pelanggan):
              </label>
              <textarea
                rows={2}
                value={settings.store_closed_message || ''}
                onChange={(e) => handleChange('store_closed_message', e.target.value)}
                placeholder="Contoh: Mohon maaf, Kopi 99 Warungboto saat ini sedang TUTUP. Kami buka kembali pukul 08:00 WIB."
                className="w-full p-2.5 bg-slate-50 border border-amber-300 rounded-xl text-xs text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: RECEIPT & TAX SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Printer className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-sm text-slate-900">Format Struk Kasir & Pajak Restoran</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Catatan Kaki Struk (Footer)</label>
            <textarea
              rows={2}
              value={settings.receipt_footer}
              onChange={(e) => handleChange('receipt_footer', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-semibold text-slate-800 block">Pajak Restoran PB1</span>
                <span className="text-[10px] text-slate-400">Aktifkan jika ingin menambahkan tarif pajak di kasir</span>
              </div>
              <input
                type="checkbox"
                checked={settings.tax_enabled}
                onChange={(e) => handleChange('tax_enabled', e.target.checked)}
                className="w-5 h-5 rounded text-blue-600"
              />
            </div>

            {settings.tax_enabled && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tarif Pajak PB1 (%)</label>
                <input
                  type="number"
                  value={settings.tax_percentage}
                  onChange={(e) => handleChange('tax_percentage', Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 text-xs transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
