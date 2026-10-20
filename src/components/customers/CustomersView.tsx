import React, { useState } from 'react';
import { Customer } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah } from '../../utils/formatters';
import {
  Users,
  Search,
  Phone,
  ShoppingBag,
  DollarSign,
  Heart,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>(dataService.getCustomers());
  const [search, setSearch] = useState('');

  const filtered = customers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalSpending = customers.reduce((sum, c) => sum + c.total_spending, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          <span>Data Pelanggan (CRM Kopi 99)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Daftar pelanggan langganan, riwayat belanja, preferensi rasa, dan frekuensi pesanan
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Pelanggan Terdaftar</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{customers.length} Orang</div>
          <span className="text-[11px] text-slate-400">Tersimpan dari kasir & WhatsApp</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Akumulasi Belanja Pelanggan</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{formatRupiah(totalSpending)}</div>
          <span className="text-[11px] text-slate-400">Total belanja dari pelanggan tetap</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Privasi & Keamanan Data</span>
          <div className="text-base font-bold text-emerald-600 mt-1">Terlindungi RLS</div>
          <span className="text-[11px] text-slate-400">Tidak dapat diakses pengunjung publik</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau nomor WhatsApp pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">No. WhatsApp / HP</th>
                <th className="py-3 px-4 text-center">Total Order</th>
                <th className="py-3 px-4 text-right">Akumulasi Belanja</th>
                <th className="py-3 px-4">Catatan Selera / Preferensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{c.phone}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">
                    {c.total_orders_count}x
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                    {formatRupiah(c.total_spending)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    {c.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
