import React, { useState } from 'react';
import { CashShift, CashMovement } from '../../types/database';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import { calculateShiftCash } from '../../utils/calculations';
import {
  Clock,
  PlayCircle,
  StopCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  AlertCircle,
  Printer,
  History,
  X,
} from 'lucide-react';

export const ShiftsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [shifts, setShifts] = useState<CashShift[]>(dataService.getShifts());
  const activeShift = dataService.getActiveShift();

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState<number>(200000);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [actualCashCount, setActualCashCount] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [movType, setMovType] = useState<'cash_in' | 'cash_out'>('cash_in');
  const [movAmount, setMovAmount] = useState<number>(50000);
  const [movReason, setMovReason] = useState('');

  const refresh = () => {
    setShifts(dataService.getShifts());
  };

  const handleOpenShift = () => {
    dataService.openShift(currentUser.id, currentUser.full_name, openingCashInput);
    refresh();
    setShowOpenModal(false);
  };

  const handleCloseShift = () => {
    if (!activeShift) return;
    dataService.closeShift(activeShift.id, actualCashCount, closeNotes.trim() || undefined);
    refresh();
    setShowCloseModal(false);
  };

  const handleAddMovement = () => {
    if (!activeShift || !movReason.trim()) return;
    dataService.addCashMovement(activeShift.id, movType, movAmount, movReason.trim(), currentUser.full_name);
    refresh();
    setShowCashMovementModal(false);
    setMovReason('');
  };

  const closeCalc = activeShift
    ? calculateShiftCash({
        openingCash: activeShift.opening_cash,
        cashSales: activeShift.cash_sales,
        cashRefunds: activeShift.cash_refunds,
        cashInflows: activeShift.cash_inflows,
        cashOutflows: activeShift.cash_outflows,
        actualClosingCash: actualCashCount,
      })
    : null;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span>Shift Kasir & Rekonsiliasi Uang Fisik</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Buka/tutup shift laci kasir, catat kas masuk/keluar, dan verifikasi selisih uang tunai fisik
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeShift ? (
            <>
              <button
                onClick={() => {
                  setMovType('cash_in');
                  setShowCashMovementModal(true);
                }}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-300 transition"
              >
                + Kas Masuk
              </button>
              <button
                onClick={() => {
                  setMovType('cash_out');
                  setShowCashMovementModal(true);
                }}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-300 transition"
              >
                - Kas Keluar
              </button>
              <button
                onClick={() => {
                  setActualCashCount(activeShift.expected_closing_cash);
                  setShowCloseModal(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-xs transition"
              >
                Tutup Shift Sekarang
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Buka Shift Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Shift Dashboard Card */}
      {activeShift ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/40 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-bold text-base text-slate-900">Shift Kasir Sedang Aktif</h2>
              <span className="text-xs text-slate-500">
                (Dibuka {formatDateIndonesian(activeShift.opened_at, true)} oleh <strong>{activeShift.cashier_name}</strong>)
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold self-start">
              {activeShift.total_transactions_count} Transaksi
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-400 block text-[10px]">Modal Awal Laci</span>
              <span className="font-extrabold text-sm text-slate-900">{formatRupiah(activeShift.opening_cash)}</span>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block text-[10px] font-semibold">Penjualan Tunai POS</span>
              <span className="font-extrabold text-sm text-emerald-700">+{formatRupiah(activeShift.cash_sales)}</span>
            </div>

            <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200">
              <span className="text-blue-700 block text-[10px] font-semibold">Kas Masuk (Tambah Modal)</span>
              <span className="font-extrabold text-sm text-blue-700">+{formatRupiah(activeShift.cash_inflows)}</span>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
              <span className="text-amber-700 block text-[10px] font-semibold">Kas Keluar (Operasional)</span>
              <span className="font-extrabold text-sm text-amber-700">-{formatRupiah(activeShift.cash_outflows)}</span>
            </div>

            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xs col-span-2 md:col-span-1">
              <span className="text-slate-400 block text-[10px]">Ekspektasi Uang Fisik</span>
              <span className="font-extrabold text-base text-amber-400">{formatRupiah(activeShift.expected_closing_cash)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Shift Kasir yang Sedang Buka</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Buka shift terlebih dahulu dengan memasukkan modal uang kembalian sebelum memulai transaksi di kasir.
          </p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Buka Shift Sekarang
          </button>
        </div>
      )}

      {/* Shift History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-sm text-slate-900">Riwayat Shift Kasir</h2>
          </div>
          <span className="text-xs text-slate-400">{shifts.length} shift tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Kasir & Waktu</th>
                <th className="py-3 px-4 text-right">Modal Awal</th>
                <th className="py-3 px-4 text-right">Penjualan Tunai</th>
                <th className="py-3 px-4 text-right">Ekspektasi Kas</th>
                <th className="py-3 px-4 text-right">Kas Fisik Aktual</th>
                <th className="py-3 px-4 text-right">Selisih Kas</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shifts.map((sh) => (
                <tr key={sh.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{sh.cashier_name}</div>
                    <div className="text-[10px] text-slate-400">
                      Buka: {formatDateIndonesian(sh.opened_at, true)}
                    </div>
                    {sh.closed_at && (
                      <div className="text-[10px] text-slate-400">
                        Tutup: {formatDateIndonesian(sh.closed_at, true)}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-medium text-slate-600">
                    {formatRupiah(sh.opening_cash)}
                  </td>

                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                    {formatRupiah(sh.cash_sales)}
                  </td>

                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatRupiah(sh.expected_closing_cash)}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {sh.actual_closing_cash !== undefined ? formatRupiah(sh.actual_closing_cash) : '-'}
                  </td>

                  <td className="py-3 px-4 text-right font-extrabold">
                    {sh.discrepancy !== undefined ? (
                      <span className={sh.discrepancy === 0 ? 'text-emerald-600' : sh.discrepancy > 0 ? 'text-blue-600' : 'text-red-500'}>
                        {sh.discrepancy === 0 ? 'Pas (Rp 0)' : `${sh.discrepancy > 0 ? '+' : ''}${formatRupiah(sh.discrepancy)}`}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sh.status === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sh.status === 'open' ? 'AKTIF' : 'DITUTUP'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN SHIFT MODAL */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Buka Shift Kasir Kopi 99</h3>
              <button onClick={() => setShowOpenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">Kasir Bertugas</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.full_name}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Modal Awal Laci Kasir (Rp)</label>
                <input
                  type="number"
                  value={openingCashInput}
                  onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Uang pecahan kecil untuk modal kembalian pelanggan.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleOpenShift}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Konfirmasi Buka Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {showCloseModal && activeShift && closeCalc && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tutup Shift & Rekonsiliasi Kas</h3>
                <p className="text-xs text-slate-500">Kasir: {activeShift.cashier_name}</p>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span>Modal Awal:</span>
                <span>{formatRupiah(activeShift.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Penjualan Tunai:</span>
                <span>+{formatRupiah(activeShift.cash_sales)}</span>
              </div>
              {activeShift.cash_inflows > 0 && (
                <div className="flex justify-between text-blue-700">
                  <span>Kas Masuk:</span>
                  <span>+{formatRupiah(activeShift.cash_inflows)}</span>
                </div>
              )}
              {activeShift.cash_outflows > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Kas Keluar:</span>
                  <span>-{formatRupiah(activeShift.cash_outflows)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>Ekspektasi Uang di Laci:</span>
                <span className="text-blue-700">{formatRupiah(closeCalc.expectedClosingCash)}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-900 block mb-1">
                  Hitung Uang Fisik Aktual di Laci Kasir (Rp):
                </label>
                <input
                  type="number"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-base text-slate-900"
                />
              </div>

              {/* Live discrepancy notification */}
              <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                closeCalc.discrepancy === 0
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : closeCalc.discrepancy > 0
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                <span>Selisih Uang Fisik:</span>
                <span>
                  {closeCalc.discrepancy === 0
                    ? 'PAS (Tidak Ada Selisih)'
                    : `${closeCalc.discrepancy > 0 ? 'LEBIH +' : 'KURANG -'}${formatRupiah(Math.abs(closeCalc.discrepancy))}`}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Penutupan Shift</label>
                <input
                  type="text"
                  placeholder="Catatan bila ada selisih atau catatan untuk shift berikutnya..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleCloseShift}
                className="px-5 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-xs"
              >
                Konfirmasi Tutup Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASH IN / CASH OUT MODAL */}
      {showCashMovementModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {movType === 'cash_in' ? '+ Catat Kas Masuk (Inflow)' : '- Catat Kas Keluar (Outflow)'}
              </h3>
              <button onClick={() => setShowCashMovementModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={movAmount}
                  onChange={(e) => setMovAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keperluan / Alasan</label>
                <input
                  type="text"
                  placeholder={movType === 'cash_in' ? 'Tambah uang kembalian pecahan 2rb...' : 'Beli es batu kristal darurat, galon...'}
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCashMovementModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleAddMovement}
                disabled={!movReason.trim() || movAmount <= 0}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Transaksi Kas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
