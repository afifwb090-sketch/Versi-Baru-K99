import React, { useState } from 'react';
import { useAuth, STAFF_ACCOUNTS } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import {
  Lock,
  KeyRound,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Coffee,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Database,
  UserCheck,
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
  const { loginWithPin, loginWithEmail, quickLogin, isSupabaseLive } = useAuth();

  const [activeTab, setActiveTab] = useState<'pin' | 'email'>('pin');

  // PIN State
  const [pin, setPin] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('cashier');

  // Email State
  const [email, setEmail] = useState<string>(STAFF_ACCOUNTS.cashier.email);
  const [password, setPassword] = useState<string>(STAFF_ACCOUNTS.cashier.defaultPassword);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & Error
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleKeypadPress = (digit: string) => {
    setErrorMsg(null);
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      // Auto submit if 4 digits entered for selected role
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

  const handlePinSubmit = async (pinToVerify?: string) => {
    const code = pinToVerify || pin;
    if (!code) {
      setErrorMsg('Masukkan PIN kasir terlebih dahulu.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    const res = await loginWithPin(code, selectedRole);
    setIsLoading(false);

    if (res.success) {
      setPin('');
      onLoginSuccess();
    } else {
      setErrorMsg(res.error || 'PIN tidak valid.');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const res = await loginWithEmail(email, password);
    setIsLoading(false);

    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMsg(res.error || 'Login gagal.');
    }
  };

  const handleQuickSelectStaff = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(STAFF_ACCOUNTS[role].email);
    setPassword(STAFF_ACCOUNTS[role].defaultPassword);
    setPin(STAFF_ACCOUNTS[role].pin);
    setErrorMsg(null);
  };

  const handleOneClickInstantLogin = (role: UserRole) => {
    quickLogin(role);
    onLoginSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-600/30 text-white font-black text-xl">
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
            aria-label="Tutup dan kembali ke website"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DATABASE CONNECTION STATUS BADGE */}
        <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Mode Autentikasi:</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              isSupabaseLive ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {isSupabaseLive ? 'Supabase Database Online' : 'Lokal Demo Staff POS'}
          </span>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
          {/* TAB BUTTONS */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('pin');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'pin'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>PIN Cepat Kasir</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('email');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                activeTab === 'email'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email & Password</span>
            </button>
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: PIN CEPAT KASIR */}
          {activeTab === 'pin' && (
            <div className="space-y-4">
              {/* STAFF ROLE SELECTOR CHIPS */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Pilih Staf Bertugas:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(STAFF_ACCOUNTS) as UserRole[]).map((r) => {
                    const acc = STAFF_ACCOUNTS[r];
                    const isSelected = selectedRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleQuickSelectStaff(r)}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold">{acc.label.split(' ')[0]}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-mono">
                          PIN: {acc.pin}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PIN DISPLAY */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
                <span className="text-xs text-slate-400 block mb-1.5">
                  Masukkan PIN untuk <span className="font-bold text-white">{STAFF_ACCOUNTS[selectedRole].label}</span>
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
                  {pin ? `${pin.length} digit dimasukkan` : 'Ketik angka pada keypad di bawah'}
                </div>
              </div>

              {/* NUMERIC KEYPAD */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadPress(digit)}
                    className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 active:text-white font-bold text-base text-slate-100 border border-slate-700 transition flex items-center justify-center shadow-xs"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-slate-400 border border-slate-800 transition flex items-center justify-center"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-blue-600 active:text-white font-bold text-base text-slate-100 border border-slate-700 transition flex items-center justify-center shadow-xs"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadDelete}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-xs font-semibold text-rose-400 border border-slate-800 transition flex items-center justify-center"
                >
                  Hapus
                </button>
              </div>

              {/* PIN SUBMIT BUTTON */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => handlePinSubmit()}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Buka Panel POS'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL & PASSWORD */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Email Staf / Pemilik
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="nama@kopi99warungboto.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Masukkan password"
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

              {/* QUICK FILL DEMO PILLS */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1.5">
                  Pilih Cepat Akun Demo Staf:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(STAFF_ACCOUNTS) as UserRole[]).map((r) => {
                    const acc = STAFF_ACCOUNTS[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setEmail(acc.email);
                          setPassword(acc.defaultPassword);
                          setErrorMsg(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 font-medium transition"
                      >
                        {acc.label.split(' ')[0]} ({acc.email.split('@')[0]})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Masuk...' : 'Masuk ke POS Admin'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 1-CLICK INSTANT DEMO SWITCHER */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Masuk Langsung 1-Klik (Mode Demo / Uji Coba):</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOneClickInstantLogin('owner')}
                className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 text-xs font-semibold flex items-center gap-2 transition text-left"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold">Masuk sbg Owner</div>
                  <div className="text-[10px] text-amber-300/70 font-normal">Akses penuh laporan & HPP</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleOneClickInstantLogin('cashier')}
                className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center gap-2 transition text-left"
              >
                <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold">Masuk sbg Kasir</div>
                  <div className="text-[10px] text-emerald-300/70 font-normal">Fokus kasir POS offline</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Pelanggan umum?</span>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition"
          >
            <span>Kembali ke Website Pesan Online</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
