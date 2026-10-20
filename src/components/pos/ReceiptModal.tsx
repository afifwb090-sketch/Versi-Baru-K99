import React from 'react';
import { Order, BusinessSettings } from '../../types/database';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  order: Order;
  settings: BusinessSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Transaksi Berhasil</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Struk"
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-100 flex justify-center">
          <div
            id="k99-receipt-print"
            className="bg-white p-6 shadow-sm border border-slate-200 rounded-sm w-[76mm] text-slate-900 font-mono text-xs leading-relaxed"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="font-bold text-sm uppercase tracking-wider">{settings.business_name}</h2>
              <p className="text-[10px] text-slate-600 mt-0.5 whitespace-pre-line">{settings.address}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">Telp/WA: {settings.phone}</p>
            </div>

            {/* Transaction Info */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>No: {order.order_number}</span>
                <span className="uppercase">{order.order_type}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu: {formatDateIndonesian(order.created_at, true)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir: {order.cashier_name || 'Kasir K99'}</span>
                <span>Plggn: {order.customer_name}</span>
              </div>
            </div>

            {/* Items */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-medium">
                    <span className="truncate pr-2">{item.product_name}</span>
                    <span>{formatRupiah(item.subtotal_price)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 pl-1">
                    {item.quantity} x {formatRupiah(item.unit_price)}
                    {item.variant_name && ` (${item.variant_name})`}
                  </div>
                  {item.addons_summary && (
                    <div className="text-[9px] text-slate-500 pl-1 italic">
                      +{item.addons_summary}
                    </div>
                  )}
                  {item.notes && (
                    <div className="text-[9px] text-slate-400 pl-1 italic">
                      *{item.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatRupiah(order.subtotal_amount)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(order.discount_amount)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>Pajak Resto:</span>
                  <span>{formatRupiah(order.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatRupiah(order.gross_total)}</span>
              </div>
              <div className="flex justify-between pt-1 text-[10px]">
                <span className="uppercase">Metode: {order.payment_method}</span>
                {order.payment_method === 'tunai' && (
                  <span>Bayar: {formatRupiah(order.cash_received || order.gross_total)}</span>
                )}
              </div>
              {order.payment_method === 'tunai' && order.cash_change !== undefined && (
                <div className="flex justify-between font-semibold text-[10px]">
                  <span>Kembali:</span>
                  <span>{formatRupiah(order.cash_change)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <p className="whitespace-pre-line">{settings.receipt_footer}</p>
              <p className="text-[8px] text-slate-400 tracking-wider">K99 POS CLOUD SYSTEM</p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
          >
            Selesai / Transaksi Baru
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
