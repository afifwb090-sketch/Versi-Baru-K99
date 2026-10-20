import React, { useState } from 'react';
import { Promotion } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  CheckCircle,
  X,
} from 'lucide-react';

export const PromotionsView: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>(dataService.getPromotions());
  const [showModal, setShowModal] = useState(false);

  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(5000);
  const [minOrder, setMinOrder] = useState<number>(30000);
  const [maxDiscount, setMaxDiscount] = useState<number>(10000);

  const refresh = () => setPromotions(dataService.getPromotions());

  const handleSave = () => {
    if (!code.trim() || !title.trim() || discountValue <= 0) return;
    dataService.savePromotion({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: desc.trim() || undefined,
      discount_type: discountType,
      discount_value: discountValue,
      minimum_order_amount: minOrder,
      maximum_discount: discountType === 'percentage' ? maxDiscount : undefined,
      channels: ['pos_offline', 'whatsapp'],
    });
    refresh();
    setShowModal(false);
    setCode('');
    setTitle('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tag className="w-6 h-6 text-blue-600" />
            <span>Kupon Diskon & Promosi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Atur kupon potongan nominal (Rp) atau persentase (%) untuk kasir offline dan WhatsApp checkout
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Kupon Promo Baru</span>
        </button>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map((promo) => (
          <div
            key={promo.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                    {promo.code}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-2">{promo.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  promo.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {promo.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {promo.description && (
                <p className="text-xs text-slate-500 mt-1">{promo.description}</p>
              )}

              <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Besaran Diskon:</span>
                  <span className="font-bold text-emerald-600">
                    {promo.discount_type === 'fixed'
                      ? formatRupiah(promo.discount_value)
                      : `${promo.discount_value}% (Maks ${formatRupiah(promo.maximum_discount || 0)})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Min. Belanja:</span>
                  <span className="font-semibold text-slate-700">
                    {formatRupiah(promo.minimum_order_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Dipakai:</span>
                  <span className="font-semibold text-slate-700">{promo.usage_count} kali</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Kanal: {promo.channels.join(', ')}</span>
              <span>Berlaku s/d {promo.end_date}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE PROMO MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Buat Kupon Promo Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Kupon (Huruf Besar)</label>
                <input
                  type="text"
                  placeholder="e.g. JOGJA99 / WARUNGBOTO"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Judul Promo</label>
                <input
                  type="text"
                  placeholder="e.g. Diskon Nongkrong Rp 5.000"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipe Diskon</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="fixed">Nominal Tetap (Rp)</option>
                    <option value="percentage">Persentase (%)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {discountType === 'fixed' ? 'Nominal (Rp)' : 'Persen (%)'}
                  </label>
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Minimal Nilai Belanja (Rp)</label>
                <input
                  type="number"
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!code.trim() || !title.trim() || discountValue <= 0}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Promo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
