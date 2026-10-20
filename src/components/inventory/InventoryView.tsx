import React, { useState } from 'react';
import { Ingredient, InventoryMovement } from '../../types/database';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  History,
  Plus,
  Trash2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>(dataService.getIngredients());
  const [movements, setMovements] = useState<InventoryMovement[]>(dataService.getInventoryMovements());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [targetIng, setTargetIng] = useState<Ingredient | null>(null);
  const [adjustType, setAdjustType] = useState<'purchase_receive' | 'spoilage_waste' | 'stock_opname' | 'adjustment'>('purchase_receive');
  const [adjustQty, setAdjustQty] = useState<number>(100);
  const [adjustNotes, setAdjustNotes] = useState('');

  const refresh = () => {
    setIngredients(dataService.getIngredients());
    setMovements(dataService.getInventoryMovements());
  };

  const handleOpenAdjust = (ing: Ingredient, type: typeof adjustType = 'purchase_receive') => {
    setTargetIng(ing);
    setAdjustType(type);
    setAdjustQty(ing.base_unit === 'pcs' ? 10 : 500);
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = () => {
    if (!targetIng) return;
    const delta = adjustType === 'spoilage_waste' ? -Math.abs(adjustQty) : Math.abs(adjustQty);

    dataService.adjustStock(
      targetIng.id,
      delta,
      adjustType,
      currentUser.full_name,
      adjustNotes.trim() || undefined
    );

    refresh();
    setShowAdjustModal(false);
  };

  // Metrics
  const lowStockItems = ingredients.filter((i) => i.current_stock <= i.minimum_stock);
  const totalValuation = ingredients.reduce((sum, i) => sum + i.current_stock * i.cost_per_base_unit, 0);

  const filtered = ingredients.filter((i) => {
    const matchCat = selectedCategory === 'all' || i.category === selectedCategory;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <span>Inventaris & Kartu Stok Bahan Baku</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau stok kopi, susu, sirup, kemasan cup, barang masuk, dan pencatatan basi/waste
          </p>
        </div>
      </div>

      {/* Low stock warning banner */}
      {lowStockItems.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">{lowStockItems.length} Bahan Baku Menipis di Bawah Batas Minimum!</span>
              <p className="text-amber-700 mt-0.5">
                {lowStockItems.map((i) => `${i.name} (Sisa ${i.current_stock} ${i.base_unit})`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Bahan Terdaftar</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{ingredients.length} SKU</div>
          <span className="text-[11px] text-slate-400">Termasuk packaging & bahan kering</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Bahan Perlu Restock</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems.length} SKU</div>
          <span className="text-[11px] text-amber-500">Mencapai batas minimum gudang</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Valuasi Total Aset Bahan</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{formatRupiah(totalValuation)}</div>
          <span className="text-[11px] text-slate-400">Nilai modal barang di gudang K99</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama bahan, kopi, cup, sirup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
          >
            <option value="all">Semua Kategori</option>
            <option value="coffee">Kopi (Beans)</option>
            <option value="dairy">Susu & Dairy</option>
            <option value="syrup">Sirup & Gula Aren</option>
            <option value="powder">Bubuk (Matcha/Cokelat)</option>
            <option value="packaging">Kemasan (Cup/Sedotan)</option>
            <option value="other">Lain-lain</option>
          </select>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Daftar Stok Fisik Bahan</h2>
          <span className="text-xs text-slate-400">Pembaruan real-time saat POS transaksi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Bahan Baku & SKU</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Stok Saat Ini</th>
                <th className="py-3 px-4 text-right">Batas Min</th>
                <th className="py-3 px-4 text-right">Biaya Satuan</th>
                <th className="py-3 px-4 text-right">Nilai Total</th>
                <th className="py-3 px-4 text-center">Tindakan Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ing) => {
                const isLow = ing.current_stock <= ing.minimum_stock;
                const value = ing.current_stock * ing.cost_per_base_unit;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ing.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ing.sku}</div>
                    </td>

                    <td className="py-3 px-4 capitalize text-slate-600 font-medium">
                      {ing.category}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className={`font-extrabold text-sm ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {ing.current_stock.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">{ing.base_unit}</span>
                      {isLow && (
                        <span className="block text-[9px] font-bold text-amber-600 uppercase">
                          Perlu Restock!
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-500">
                      {ing.minimum_stock.toLocaleString()} {ing.base_unit}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-700 font-mono">
                      {formatRupiah(ing.cost_per_base_unit)}/{ing.base_unit}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {formatRupiah(value)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenAdjust(ing, 'purchase_receive')}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-semibold transition"
                          title="Barang Masuk"
                        >
                          + Masuk
                        </button>
                        <button
                          onClick={() => handleOpenAdjust(ing, 'spoilage_waste')}
                          className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-[10px] font-semibold transition"
                          title="Basi / Rusak (Waste)"
                        >
                          - Waste
                        </button>
                        <button
                          onClick={() => handleOpenAdjust(ing, 'stock_opname')}
                          className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-[10px] font-semibold transition"
                          title="Stock Opname"
                        >
                          Opname
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movement History / Kartu Stok */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">Riwayat Mutasi & Kartu Stok Terakhir</h3>
          </div>
          <span className="text-xs text-slate-500">{movements.length} mutasi tercatat</span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100">
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-4">Bahan Baku</th>
                <th className="py-2.5 px-4">Tipe Mutasi</th>
                <th className="py-2.5 px-4 text-right">Perubahan</th>
                <th className="py-2.5 px-4 text-right">Sisa Stok</th>
                <th className="py-2.5 px-4">Pencatat / Kasir</th>
                <th className="py-2.5 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.slice(0, 20).map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="py-2 px-4 text-slate-400 text-[10px]">
                    {formatDateIndonesian(m.created_at, true)}
                  </td>
                  <td className="py-2 px-4 font-semibold text-slate-900">{m.ingredient_name}</td>
                  <td className="py-2 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.quantity_change > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {m.movement_type}
                    </span>
                  </td>
                  <td className={`py-2 px-4 text-right font-bold ${
                    m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change} {m.unit}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-slate-700">
                    {m.resulting_stock} {m.unit}
                  </td>
                  <td className="py-2 px-4 text-slate-600">{m.user_name}</td>
                  <td className="py-2 px-4 text-slate-400 text-[11px] truncate max-w-xs">
                    {m.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {showAdjustModal && targetIng && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Penyesuaian Stok: {targetIng.name}</h3>
                <p className="text-xs text-slate-500">Stok saat ini: {targetIng.current_stock} {targetIng.base_unit}</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipe Mutasi</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="purchase_receive">Barang Masuk (+ Tambah Stok)</option>
                  <option value="spoilage_waste">Barang Rusak / Basi / Tumpah (- Waste)</option>
                  <option value="stock_opname">Penyesuaian Stock Opname (Koreksi Fisik)</option>
                  <option value="adjustment">Penyesuaian Manual Lainnya</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Jumlah ({targetIng.base_unit})
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alasan / Catatan Penyesuaian</label>
                <textarea
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Contoh: Susu tumpah di bar, restock darurat, hitung fisik bulanan..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Penyesuaian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
