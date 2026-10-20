import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../../types/database';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  Receipt,
  Plus,
  Download,
  Filter,
  DollarSign,
  Calendar,
  X,
} from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>(dataService.getExpenses());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [amount, setAmount] = useState<number>(150000);
  const [category, setCategory] = useState<ExpenseCategory>('listrik');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer_bank');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const refresh = () => setExpenses(dataService.getExpenses());

  const categoriesMap: Record<ExpenseCategory, string> = {
    sewa: 'Sewa Tempat & Bangunan',
    listrik: 'Listrik & Token PLN',
    air: 'Air PDAM / Sumur',
    internet: 'Internet & WiFi',
    gaji: 'Gaji & Upah Karyawan',
    perawatan: 'Perawatan Mesin & Alat',
    pemasaran: 'Pemasaran & Promosi',
    transportasi: 'Transportasi & Logistik',
    peralatan: 'Peralatan & Perkakas Bar',
    lainnya: 'Biaya Operasional Lainnya',
  };

  const handleSave = () => {
    if (!description.trim() || amount <= 0) return;
    dataService.addExpense({
      expense_date: expenseDate,
      category,
      category_label: categoriesMap[category],
      description: description.trim(),
      amount,
      payment_method: paymentMethod,
      recorded_by: currentUser.full_name,
    });
    refresh();
    setShowAddModal(false);
    setDescription('');
  };

  const handleExportCsv = () => {
    const headers = ['Tanggal', 'Kategori', 'Keterangan', 'Nominal (Rp)', 'Metode Bayar', 'Dicatat Oleh'];
    const rows = expenses.map((e) => [
      e.expense_date,
      `"${e.category_label}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method,
      `"${e.recorded_by}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `k99_pengeluaran_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = expenses.filter((e) => categoryFilter === 'all' || e.category === categoryFilter);
  const totalExpenseAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            <span>Biaya Operasional (Pengeluaran Kafe)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan beban non-HPP: listrik, air, internet, gaji, sewa, dan servis mesin
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Beban Operasional</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatRupiah(totalExpenseAmount)}</div>
          <span className="text-[11px] text-slate-400">Pada filter terpilih</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Jumlah Transaksi Beban</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{filtered.length} catatan</div>
          <span className="text-[11px] text-slate-400">Tercatat di pembukuan K99</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Kategori Terbesar</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">Listrik & WiFi</div>
          <span className="text-[11px] text-slate-400">Beban utilitas bulanan kafe</span>
        </div>
      </div>

      {/* Filter by Category */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 text-xs overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-slate-500 font-semibold shrink-0">Kategori:</span>
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1 rounded-lg font-medium shrink-0 transition ${
            categoryFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Semua
        </button>
        {Object.entries(categoriesMap).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`px-3 py-1 rounded-lg font-medium shrink-0 transition ${
              categoryFilter === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {val}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kategori Beban</th>
                <th className="py-3 px-4">Deskripsi Keperluan</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Dicatat Oleh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {formatDateIndonesian(exp.expense_date)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {exp.category_label}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{exp.description}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">
                    {formatRupiah(exp.amount)}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-600">{exp.payment_method.replace('_', ' ')}</td>
                  <td className="py-3 px-4 text-slate-500">{exp.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Catat Beban Operasional Baru</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {Object.entries(categoriesMap).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Biaya (Rp)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Rincian</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Beli token listrik bar 200rb, descaling mesin espresso..."
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="transfer_bank">Transfer Bank</option>
                  <option value="tunai">Tunai Kas Kecil</option>
                  <option value="debit">Kartu Debit</option>
                  <option value="qris">QRIS Toko</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!description.trim() || amount <= 0}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
