import React, { useState } from 'react';
import { dataService } from '../../services/dataService';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  CreditCard,
  Bike,
  Coffee,
  CheckCircle,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<'pnl' | 'sales' | 'channels' | 'payments'>('pnl');
  const [period, setPeriod] = useState<'today' | '7days' | 'month' | 'all'>('month');

  const orders = dataService.getOrders();
  const expenses = dataService.getExpenses();

  // Filter orders
  const validOrders = orders.filter((o) => o.status !== 'dibatalkan');

  // Overall Financial Calculations
  const grossRevenue = validOrders.reduce((sum, o) => sum + o.gross_total, 0);
  const totalDiscounts = validOrders.reduce((sum, o) => sum + o.discount_amount, 0);
  const netSales = grossRevenue - totalDiscounts;
  const totalHpp = validOrders.reduce((sum, o) => sum + o.total_hpp, 0);
  const grossProfit = netSales - totalHpp;
  const grossMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netMarginPercent = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0;

  // Channel Breakdown
  const channelData: Record<string, { count: number; gross: number; payout: number; hpp: number; profit: number }> = {};
  validOrders.forEach((o) => {
    if (!channelData[o.channel]) {
      channelData[o.channel] = { count: 0, gross: 0, payout: 0, hpp: 0, profit: 0 };
    }
    channelData[o.channel].count += 1;
    channelData[o.channel].gross += o.gross_total;
    channelData[o.channel].payout += o.actual_payout;
    channelData[o.channel].hpp += o.total_hpp;
    channelData[o.channel].profit += o.gross_profit;
  });

  // Payment Method Breakdown
  const paymentData: Record<string, { count: number; total: number }> = {};
  validOrders.forEach((o) => {
    const method = o.payment_method || 'tunai';
    if (!paymentData[method]) {
      paymentData[method] = { count: 0, total: 0 };
    }
    paymentData[method].count += 1;
    paymentData[method].total += o.gross_total;
  });

  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (reportType === 'pnl') {
      headers = ['Komponen Laporan Laba Rugi', 'Nominal (Rp)', 'Persentase terhadap Penjualan Bersih'];
      rows = [
        ['Omzet Penjualan Kotor (Gross Revenue)', grossRevenue, '100%'],
        ['Potongan Diskon & Promo', -totalDiscounts, `${((totalDiscounts / grossRevenue) * 100).toFixed(1)}%`],
        ['Penjualan Bersih (Net Sales)', netSales, '100%'],
        ['Harga Pokok Penjualan (HPP / COGS Resep)', -totalHpp, `${((totalHpp / netSales) * 100).toFixed(1)}%`],
        ['Laba Kotor (Gross Profit)', grossProfit, `${grossMarginPercent.toFixed(1)}%`],
        ['Total Biaya Operasional (Listrik, Sewa, Gaji, dll)', -totalOperatingExpenses, `${((totalOperatingExpenses / netSales) * 100).toFixed(1)}%`],
        ['Estimasi Laba Bersih Operasional (Net Profit)', netOperatingProfit, `${netMarginPercent.toFixed(1)}%`],
      ];
    } else if (reportType === 'channels') {
      headers = ['Kanal Penjualan', 'Jumlah Transaksi', 'Omzet Kotor', 'Pencairan Bersih (Payout)', 'HPP Resep', 'Laba Kontribusi'];
      rows = Object.entries(channelData).map(([ch, d]) => [
        ch.toUpperCase(),
        d.count,
        d.gross,
        d.payout,
        d.hpp,
        d.profit,
      ]);
    } else {
      headers = ['Metode Pembayaran', 'Jumlah Transaksi', 'Total Nilai (Rp)'];
      rows = Object.entries(paymentData).map(([m, d]) => [
        m.toUpperCase(),
        d.count,
        d.total,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `laporan_k99_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Laporan Keuangan & Rekonsiliasi Bisnis</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Laporan laba rugi (P&L), HPP terperinci, performa kanal offline vs online, dan metode bayar
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Export Laporan ke CSV</span>
        </button>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs">
        {[
          { id: 'pnl', label: 'Laba Rugi (P&L)', icon: TrendingUp },
          { id: 'channels', label: 'Perbandingan Kanal (POS vs Online)', icon: Bike },
          { id: 'payments', label: 'Metode Pembayaran', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: P&L Statement */}
      {reportType === 'pnl' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/60 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm text-slate-900">Laporan Laba Rugi Komprehensif</h2>
                <p className="text-xs text-slate-400">Kopi 99 Warungboto • Mata Uang: Rupiah (IDR)</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Margin Bersih: {netMarginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="p-3.5 flex justify-between font-semibold text-slate-700 bg-slate-50/30">
                <span>1. Omzet Penjualan Kotor (Gross Revenue)</span>
                <span className="font-bold text-slate-900">{formatRupiah(grossRevenue)}</span>
              </div>
              <div className="p-3.5 flex justify-between pl-8 text-red-600">
                <span>- Diskon Promo Toko</span>
                <span>-{formatRupiah(totalDiscounts)}</span>
              </div>
              <div className="p-3.5 flex justify-between font-bold text-sm text-blue-900 bg-blue-50/40">
                <span>= Penjualan Bersih (Net Sales)</span>
                <span>{formatRupiah(netSales)}</span>
              </div>

              <div className="p-3.5 flex justify-between pl-8 text-amber-700">
                <span>- Harga Pokok Penjualan (HPP Bahan & Packaging Resep)</span>
                <span className="font-semibold">-{formatRupiah(totalHpp)}</span>
              </div>

              <div className="p-3.5 flex justify-between font-bold text-sm text-emerald-900 bg-emerald-50/40">
                <span>= LABA KOTOR (GROSS PROFIT)</span>
                <span>{formatRupiah(grossProfit)} ({grossMarginPercent.toFixed(1)}%)</span>
              </div>

              <div className="p-3.5 flex justify-between pl-8 text-slate-600">
                <span>- Beban Operasional (Sewa, Listrik, WiFi, Servis Mesin, dll)</span>
                <span className="font-semibold text-red-600">-{formatRupiah(totalOperatingExpenses)}</span>
              </div>

              <div className="p-4 flex justify-between font-black text-base bg-slate-900 text-white">
                <span>= ESTIMASI LABA OPERASIONAL BERSIH</span>
                <span className={netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatRupiah(netOperatingProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Channels Comparison */}
      {reportType === 'channels' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-sm text-slate-900">Performa Penjualan Berdasarkan Kanal</h2>
            <p className="text-xs text-slate-400">Analisis margin kontribusi offline kasir vs online delivery</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Kanal Penjualan</th>
                  <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-right">Omzet Kotor</th>
                  <th className="py-3 px-4 text-right">Pencairan Bersih (Payout)</th>
                  <th className="py-3 px-4 text-right">HPP Bahan Baku</th>
                  <th className="py-3 px-4 text-right">Laba Kontribusi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(channelData).map(([ch, d]) => (
                  <tr key={ch} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                      {ch.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {d.count} pesanan
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatRupiah(d.gross)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatRupiah(d.payout)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 font-mono">
                      {formatRupiah(d.hpp)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-blue-700">
                      {formatRupiah(d.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Payment Methods */}
      {reportType === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-sm text-slate-900">Distribusi Metode Pembayaran</h2>
            <p className="text-xs text-slate-400">Pemisahan kas fisik tunai vs non-tunai (QRIS & Transfer)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4 text-center">Jumlah Transaksi</th>
                  <th className="py-3 px-4 text-right">Total Nilai Diterima</th>
                  <th className="py-3 px-4 text-right">Porsi Omzet (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(paymentData).map(([m, d]) => (
                  <tr key={m} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                      {m.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {d.count} transaksi
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {formatRupiah(d.total)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {grossRevenue > 0 ? ((d.total / grossRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
