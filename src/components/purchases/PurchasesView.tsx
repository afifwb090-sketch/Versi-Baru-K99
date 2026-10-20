import React, { useState } from 'react';
import { Supplier, Purchase, Ingredient } from '../../types/database';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatRupiah, formatDateIndonesian } from '../../utils/formatters';
import {
  Truck,
  Plus,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  X,
  Layers,
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>(dataService.getSuppliers());
  const [purchases, setPurchases] = useState<Purchase[]>(dataService.getPurchases());
  const ingredients = dataService.getIngredients();

  // New Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // New PO Modal
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [selectedIngredientId, setSelectedIngredientId] = useState(ingredients[0]?.id || '');
  const [poQty, setPoQty] = useState<number>(5000);
  const [poPrice, setPoPrice] = useState<number>(160000);
  const [isReceivedImmediately, setIsReceivedImmediately] = useState(true);

  const refresh = () => {
    setSuppliers(dataService.getSuppliers());
    setPurchases(dataService.getPurchases());
  };

  const handleSaveSupplier = () => {
    if (!supName.trim() || !supPhone.trim()) return;
    dataService.saveSupplier({
      name: supName.trim(),
      contact_person: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim() || undefined,
      address: supAddress.trim() || undefined,
    });
    refresh();
    setShowSupplierModal(false);
    setSupName('');
    setSupPhone('');
  };

  const handleCreatePo = () => {
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    const ing = ingredients.find((i) => i.id === selectedIngredientId);
    if (!sup || !ing) return;

    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const subtotal = poPrice;

    dataService.createPurchase({
      purchase_number: poNumber,
      supplier_id: sup.id,
      supplier_name: sup.name,
      purchase_date: new Date().toISOString().split('T')[0],
      status: isReceivedImmediately ? 'received' : 'ordered',
      payment_status: 'paid',
      total_amount: subtotal,
      paid_amount: subtotal,
      received_by: currentUser.full_name,
      items: [
        {
          id: `pi-${Date.now()}`,
          purchase_id: '',
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          quantity: poQty,
          unit: ing.base_unit,
          unit_price: poPrice / poQty,
          subtotal: poPrice,
        },
      ],
    });

    refresh();
    setShowPoModal(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <span>Pemasok & Pengadaan Bahan Baku (PO)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola suplier biji kopi roastery, kemasan cup, susu, dan penerimaan stok gudang
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            + Pemasok Baru
          </button>
          <button
            onClick={() => setShowPoModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Buat PO / Belanja Stok</span>
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3">Daftar Pemasok Utama Kopi 99</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suppliers.map((sup) => (
            <div key={sup.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{sup.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{sup.code}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700">
                  {sup.total_orders_count}x Order
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.phone}</span>
                </div>
                {sup.contact_person && (
                  <div className="text-[11px] text-slate-500 pl-5.5">
                    PIC: {sup.contact_person}
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.address}</span>
                  </div>
                )}
              </div>

              {sup.notes && (
                <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-500 italic">
                  {sup.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Purchases History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Riwayat Pembelian & Penerimaan Bahan (PO)</h2>
          <span className="text-xs text-slate-400">{purchases.length} PO tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">No. PO & Tanggal</th>
                <th className="py-3 px-4">Pemasok</th>
                <th className="py-3 px-4">Bahan Masuk</th>
                <th className="py-3 px-4 text-right">Total Pembelian</th>
                <th className="py-3 px-4 text-center">Status Barang</th>
                <th className="py-3 px-4 text-center">Status Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-slate-900">{po.purchase_number}</div>
                    <div className="text-[10px] text-slate-400">{formatDateIndonesian(po.purchase_date)}</div>
                  </td>

                  <td className="py-3 px-4 font-semibold text-slate-800">{po.supplier_name}</td>

                  <td className="py-3 px-4">
                    {po.items.map((i, idx) => (
                      <div key={idx} className="text-slate-700">
                        <strong>{i.quantity.toLocaleString()} {i.unit}</strong> {i.ingredient_name}
                      </div>
                    ))}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-blue-700">
                    {formatRupiah(po.total_amount)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Diterima Gudang
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      Lunas
                    </span>
                  </td>
                </tr>
              ))}

              {purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada pengadaan bahan baku yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW SUPPLIER MODAL */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Tambah Pemasok Baru</h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Perusahaan / Pemasok</label>
                <input
                  type="text"
                  placeholder="e.g. Roastery Kopi Jogja"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">PIC / Kontak Person</label>
                <input
                  type="text"
                  placeholder="Nama sales / pemilik..."
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / Telepon</label>
                <input
                  type="text"
                  placeholder="0812..."
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Gudang</label>
                <input
                  type="text"
                  placeholder="Kota / Alamat..."
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSupplier}
                disabled={!supName.trim() || !supPhone.trim()}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Pemasok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PO MODAL */}
      {showPoModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Buat Purchase Order & Tambah Stok</h3>
              <button onClick={() => setShowPoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Pemasok</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bahan Baku yang Dibeli</label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.base_unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah</label>
                  <input
                    type="number"
                    value={poQty}
                    onChange={(e) => setPoQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Biaya Beli (Rp)</label>
                  <input
                    type="number"
                    value={poPrice}
                    onChange={(e) => setPoPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isReceivedImmediately}
                  onChange={(e) => setIsReceivedImmediately(e.target.checked)}
                  className="rounded text-blue-600 border-slate-300"
                />
                <span>Barang langsung diterima & stok otomatis bertambah</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowPoModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleCreatePo}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Proses Pembelian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
