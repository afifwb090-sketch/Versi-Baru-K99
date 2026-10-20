import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  LayoutDashboard,
  Bike,
  Coffee,
  FlaskConical,
  Package,
  Truck,
  Receipt,
  BarChart3,
  Clock,
  Tag,
  Users,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentRole, currentUser } = useAuth();

  const navItems = [
    {
      id: 'pos',
      label: 'Kasir POS (Offline)',
      icon: ShoppingCart,
      roles: ['owner', 'manager', 'cashier'],
      badge: 'Kasir',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Bisnis',
      icon: LayoutDashboard,
      roles: ['owner', 'manager'],
    },
    {
      id: 'online-orders',
      label: 'Penjualan Online',
      icon: Bike,
      roles: ['owner', 'manager', 'cashier'],
    },
    {
      id: 'products',
      label: 'Produk & Menu',
      icon: Coffee,
      roles: ['owner', 'manager'],
    },
    {
      id: 'recipes',
      label: 'Resep & HPP',
      icon: FlaskConical,
      roles: ['owner', 'manager', 'inventory_staff'],
    },
    {
      id: 'inventory',
      label: 'Stok & Bahan Baku',
      icon: Package,
      roles: ['owner', 'manager', 'inventory_staff'],
    },
    {
      id: 'purchases',
      label: 'Pemasok & Pembelian',
      icon: Truck,
      roles: ['owner', 'manager', 'inventory_staff'],
    },
    {
      id: 'expenses',
      label: 'Biaya Operasional',
      icon: Receipt,
      roles: ['owner', 'manager'],
    },
    {
      id: 'reports',
      label: 'Laporan Keuangan',
      icon: BarChart3,
      roles: ['owner', 'manager'],
    },
    {
      id: 'shifts',
      label: 'Shift Kasir',
      icon: Clock,
      roles: ['owner', 'manager', 'cashier'],
    },
    {
      id: 'promotions',
      label: 'Promo & Diskon',
      icon: Tag,
      roles: ['owner', 'manager'],
    },
    {
      id: 'customers',
      label: 'Data Pelanggan',
      icon: Users,
      roles: ['owner', 'manager'],
    },
    {
      id: 'settings',
      label: 'Pengaturan & Supabase',
      icon: Settings,
      roles: ['owner', 'manager'],
    },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(currentRole));

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
          <span className="text-sm font-semibold text-white">Menu Navigasi</span>
          <button
            onClick={onCloseMobile}
            aria-label="Tutup Menu"
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700 text-slate-200'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shrink-0">
              {currentUser?.full_name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentUser?.full_name || 'Staf Kasir'}
              </div>
              <div className="text-[10px] text-amber-400 font-medium capitalize">
                Role: {currentRole}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
            <span>K99 POS v1.0.0</span>
            <span>Warungboto, DIY</span>
          </div>
        </div>
      </aside>
    </>
  );
};
