import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import {
  saveSupabaseCredentials,
  getSupabaseCredentials,
  checkSupabaseConnection,
} from '../../services/supabase';
import {
  Lock,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  ArrowRight,
  Database,
  UserPlus,
  RefreshCw,
  Settings2,
  ExternalLink,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const {
    loginWithEmail,
    loginWithPin,
    registerStaff,
    isSupabaseLive,
    refreshDatabaseConnection,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'pin'>('login');

  // Login Email & Password State (Clean, no prefilled demo values)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Register State (for initial setup of accounts in Supabase)
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('owner');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // PIN State
  const [pin, setPin] = useState<string>('');

  // Status & Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Supabase Connection Settings Accordion
  const [showDbSettings, setShowDbSettings] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(() => getSupabaseCredentials().url);
  const [inputKey, setInputKey] = useState<string>(() => getSupabaseCredentials().key);
  const [dbTestResult, setDbTestResult] = useState<{ isConnected: boolean; message: string } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Login with Email & Password against pure Database
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Silakan masukkan email dan password staf.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      if (!rememberMe) {
        // Will clear on window unload or handled per session
      }
      onLoginSuccess();
    } else {
      setErrorMsg(res.error || 'Autentikasi gagal. Periksa kembali email dan password Anda.');
    }
  };

  // Handle Registration directly into Supabase Database
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regFullName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Semua kolom pendaftaran wajib diisi.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    const res = await registerStaff(regEmail, regPassword, regFullName, regRole);
    setIsLoading(false);

    if (res.success) {
      setSuccessMsg(res.message || 'Akun staf berhasil didaftarkan di database!');
      // If user is auto logged in
      if (res.message?.includes('langsung login')) {
        setTimeout(() => {
          onLoginSuccess();
        }, 1200);
      } else {
        // Switch to login tab and prefill email
        setEmail(regEmail);
        setPassword('');
        setActiveTab('login');
      }
    } else {
      setErrorMsg(res.error || 'Pendaftaran ke database gagal.');
    }
  };

  // Handle PIN Keypad
  const handleKeypadPress = (digit: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        handlePinSubmit(nextPin);
      }
    }
  };

  const handleKeypadDelete = () => {
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    setErrorMsg(null);
    setPin('');
  };

  const handlePinSubmit = async (codeToVerify?: string) => {
    const code = codeToVerify || pin;
    if (!code) {
      setErrorMsg('Masukkan 4 digit PIN kasir.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    const res = await loginWithPin(code);
    setIsLoading(false);

    if (res.success) {
      setPin('');
      onLoginSuccess();
    } else {
      setErrorMsg(res.error || 'PIN tidak valid.');
    }
  };

  // Test & Save Database Connection
  const handleSaveAndTestDatabase = async () => {
    setIsTestingDb(true);
    setErrorMsg(null);
    setDbTestResult(null);

    const saveRes = saveSupabaseCredentials(inputUrl, inputKey);
    if (!saveRes.success) {
      setIsTestingDb(false);
      setDbTestResult({
        isConnected: false,
        message: saveRes.error || 'Format URL atau Key tidak valid',
      });
      return;
    }

    const diag = await checkSupabaseConnection(inputUrl, inputKey);
    setIsTestingDb(false);
    setDbTestResult({
      isConnected: diag.isConnected,
      message: diag.message + (diag.details ? ` (${diag.details})` : ''),
    });

    if (diag.isConnected || diag.isConfigured) {
      await refreshDatabaseConnection();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-600/30 text-white font-black text-xl tracking-tight">
              99
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight">Login Portal Admin POS</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Staff Only
                </span>
              </div>
              <p className="text-xs text-slate-400">Kedai Kopi 99 Warungboto Yogyakarta</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dan kembali ke website publik"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DATABASE CONNECTION STATUS BAR */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Database:</span>
            <span
              className={`inline-flex items-center gap-1.5 font-semibold ${
                isSupabaseLive ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isSupabaseLive ? 'Supabase Terhubung' : 'Belum Terhubung'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowDbSettings(!showDbSettings)}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-400 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showDbSettings ? 'Sembunyikan Setup' : 'Atur Supabase'}</span>
          </button>
        </div>

        {/* EXPANDABLE SUPABASE DATABASE SETUP PANEL */}
        {showDbSettings && (
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                Konfigurasi Koneksi Supabase PostgreSQL
              </span>
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline text-[10px] inline-flex items-center gap-0.5"
              >
                Dashboard Supabase <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Masukkan URL Project dan Anon Key Supabase Anda untuk menghubungkan database ke sistem POS Kopi 99:
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  VITE_SUPABASE_URL
                </label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  VITE_SUPABASE_PUBLISHABLE_KEY / ANON KEY
                </label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {dbTestResult && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                    dbTestResult.isConnected
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300'
                  }`}
                >
                  {dbTestResult.message}
                </div>
              )}

              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndTestDatabase}
                  disabled={isTestingDb}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingDb ? 'animate-spin' : ''}`} />
                  <span>{isTestingDb ? 'Menguji Koneksi...' : 'Uji & Simpan Koneksi'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
          {/* TAB SWITCHER */}
          <div className="grid grid-cols-3 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Login Staf</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Staf Baru</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('pin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN Cepat</span>
            </button>
          </div>

          {/* ALERTS */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PURE DATABASE LOGIN WITH EMAIL & PASSWORD */}
          {activeTab === 'login' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Email Akun Staf / Pemilik
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Masukkan email terdaftar..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Password Database
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password Anda..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span>Ingat sesi di perangkat ini</span>
                </label>

                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-blue-400 hover:text-blue-300 font-semibold"
                >
                  Belum punya akun staf?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi ke Database...' : 'Masuk Menggunakan Database'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Login ini memverifikasi langsung akun Anda ke database PostgreSQL Supabase dan tabel profil staf.
              </p>
            </form>
          )}

          {/* TAB 2: REGISTER NEW STAFF TO SUPABASE DATABASE */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-blue-200 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Daftarkan akun staf baru langsung ke tabel <code>profiles</code> dan Supabase Auth database Anda.
                </span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Nama Lengkap Staf
                </label>
                <input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                  placeholder="Contoh: Bapak Afif / Rian Kurniawan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Email Staf
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                  placeholder="nama@kopi99warungboto.id"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Password (Minimal 6 Karakter)
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                    placeholder="Buat password aman..."
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Peran & Hak Akses (Role)
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="owner">Owner / Pemilik (Akses Penuh Laporan & POS)</option>
                  <option value="manager">Manager Barista (Akses Stok, Resep & POS)</option>
                  <option value="cashier">Kasir & Barista (Fokus Transaksi POS & Shift)</option>
                  <option value="inventory_staff">Staf Gudang & Logistik (Akses Stok Bahan)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Mendaftarkan ke Database...' : 'Daftarkan Staf ke Database'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CLEAN PIN KEYPAD (NO EXPOSED DEMO SHORTCUTS) */}
          {activeTab === 'pin' && (
            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
                <span className="text-xs text-slate-400 block mb-2 font-medium">
                  Ketik 4 digit PIN staf pada keypad:
                </span>
                <div className="flex items-center justify-center gap-3 my-2">
                  {[0, 1, 2, 3].map((idx) => {
                    const hasDigit = pin.length > idx;
                    return (
                      <div
                        key={idx}
                        className={`w-4 h-4 rounded-full transition-all ${
                          hasDigit
                            ? 'bg-blue-500 ring-4 ring-blue-500/30 scale-110'
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {pin ? `${pin.length} digit dimasukkan` : 'Gunakan keypad angka di bawah'}
                </div>
              </div>

              {/* NUMERIC KEYPAD */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 active:text-white font-bold text-base text-slate-100 border border-slate-700 transition flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-400 border border-slate-800 transition flex items-center justify-center cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 active:text-white font-bold text-base text-slate-100 border border-slate-700 transition flex items-center justify-center shadow-xs cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadDelete}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-rose-400 border border-slate-800 transition flex items-center justify-center cursor-pointer"
                >
                  Hapus
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handlePinSubmit()}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Buka Panel POS dengan PIN'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Bukan staf kasir?</span>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <span>Kembali ke Website Pelanggan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
