import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, BusinessSettings } from '../../types/database';
import {
  Coffee,
  Database,
  ExternalLink,
  ShieldCheck,
  Clock,
  Menu,
  Store,
  Power,
  LogOut,
  User,
} from 'lucide-react';
import { dataService } from '../../services/dataService';

interface NavbarProps {
  onToggleSidebar: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isPublicMode: boolean;
  setIsPublicMode: (isPublic: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  setActiveTab,
  isPublicMode,
  setIsPublicMode,
}) => {
  const { currentRole, currentUser, setRole, isSupabaseLive, logout } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>(dataService.getSettings());
  const activeShift = dataService.getActiveShift();

  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setSettings(dataService.getSettings());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleStoreOpen = () => {
    const nextState = !settings.is_store_open;
    dataService.updateSettings({ is_store_open: nextState });
  };

  const handleLogout = async () => {
    await logout();
    setIsPublicMode(true);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-3 sm:px-4 sticky top-0 z-40 select-none">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar Menu"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('pos')}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-600/20 font-bold text-white text-base sm:text-lg tracking-wider">
            99
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-sm sm:text-base tracking-tight flex items-center gap-1.5">
              <span>{settings.business_name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium">
                Admin POS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>Warungboto, Umbulharjo, Yogyakarta</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Store Open/Closed Switch for Public Website */}
        <button
          onClick={handleToggleStoreOpen}
          aria-label="Toggle Status Kedai Buka atau Tutup"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
            settings.is_store_open
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
              : 'bg-rose-950/70 text-rose-300 border-rose-600 hover:bg-rose-900'
          }`}
          title={
            settings.is_store_open
              ? 'Kedai sedang BUKA di website publik. Klik untuk TUTUP kedai.'
              : 'Kedai sedang TUTUP di website publik. Klik untuk BUKA kedai.'
          }
        >
          <span className={`w-2 h-2 rounded-full ${settings.is_store_open ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="hidden md:inline">Status Kedai:</span>
          <span>{settings.is_store_open ? 'BUKA' : 'TUTUP'}</span>
        </button>

        {/* Supabase Status Indicator */}
        <button
          onClick={() => setActiveTab('settings')}
          aria-label="Status Database Supabase"
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
            isSupabaseLive
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700 hover:bg-emerald-900/80'
              : 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900/80'
          }`}
          title={isSupabaseLive ? 'Supabase PostgreSQL Terhubung' : 'Supabase offline/belum setup'}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{isSupabaseLive ? 'Supabase Live' : 'Setup DB'}</span>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isSupabaseLive ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </button>

        {/* Shift Status */}
        {activeShift ? (
          <button
            onClick={() => setActiveTab('shifts')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
            title="Shift Kasir Sedang Buka"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shift Buka</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('shifts')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-950/50 text-red-300 border border-red-800 hover:bg-red-900 transition"
            title="Shift Ditutup"
          >
            <Clock className="w-3.5 h-3.5 text-red-400" />
            <span>Shift Tutup</span>
          </button>
        )}

        {/* View Public Website */}
        <button
          onClick={() => setIsPublicMode(true)}
          aria-label="Lihat Website Pemesanan Publik"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-xs transition cursor-pointer"
          title="Buka Website Landing Page Pelanggan"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Lihat</span>
          <span>Web Publik</span>
        </button>

        {/* Active Staff Info & Role Switcher */}
        <div className="relative flex items-center gap-1.5 pl-2 border-l border-slate-700">
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
              {currentUser?.full_name?.split(' ')[0] || 'Staf'}
            </span>
            <span className="text-[10px] text-amber-400 capitalize">{currentRole}</span>
          </div>

          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <select
            value={currentRole}
            onChange={(e) => setRole(e.target.value as UserRole)}
            aria-label="Pilih Role Pengguna"
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Kasir</option>
            <option value="inventory_staff">Gudang</option>
          </select>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          aria-label="Keluar / Logout dari POS"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition cursor-pointer"
          title="Keluar dari Panel Admin POS"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
