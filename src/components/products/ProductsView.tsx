import React, { useState } from 'react';
import { Product, ProductCategory, ProductVariant, ProductAddon } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah } from '../../utils/formatters';
import {
  Coffee,
  Plus,
  Edit2,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  X,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(dataService.getProducts());
  const [categories, setCategories] = useState<ProductCategory[]>(dataService.getCategories());
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priceOffline, setPriceOffline] = useState(18000);
  const [priceOnline, setPriceOnline] = useState(22000);
  const [prepTime, setPrepTime] = useState(4);
  const [isActive, setIsActive] = useState(true);
  const [isOnlineAvailable, setIsOnlineAvailable] = useState(true);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(true);

  // Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const refresh = () => {
    setProducts(dataService.getProducts());
    setCategories(dataService.getCategories());
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setSku(`K99-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80');
    setPriceOffline(18000);
    setPriceOnline(22000);
    setPrepTime(4);
    setIsActive(true);
    setIsOnlineAvailable(true);
    setIsOfflineAvailable(true);
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.category_id);
    setDescription(p.description || '');
    setImageUrl(p.image_url);
    setPriceOffline(p.price_offline);
    setPriceOnline(p.price_online);
    setPrepTime(p.preparation_time_minutes);
    setIsActive(p.is_active);
    setIsOnlineAvailable(p.is_online_available);
    setIsOfflineAvailable(p.is_offline_available);
    setShowModal(true);
  };

  const handleSaveProduct = () => {
    if (!name.trim()) return;
    dataService.saveProduct({
      id: editingId || undefined,
      name: name.trim(),
      sku: sku.trim(),
      category_id: categoryId,
      description: description.trim(),
      image_url: imageUrl.trim(),
      price_offline: priceOffline,
      price_online: priceOnline,
      preparation_time_minutes: prepTime,
      is_active: isActive,
      is_online_available: isOnlineAvailable,
      is_offline_available: isOfflineAvailable,
    });
    refresh();
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus produk ini dari katalog?')) {
      dataService.deleteProduct(id);
      refresh();
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    dataService.addCategory({
      name: newCatName.trim(),
      slug: newCatName.toLowerCase().replace(/\s+/g, '-'),
      description: newCatDesc.trim(),
      sort_order: categories.length + 1,
      is_active: true,
    });
    refresh();
    setShowCategoryModal(false);
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleExportCsv = () => {
    const headers = ['SKU', 'Nama Menu', 'Kategori', 'Harga Offline', 'Harga Online', 'HPP', 'Status', 'Online'];
    const rows = products.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category_name || ''}"`,
      p.price_offline,
      p.price_online,
      p.estimated_hpp,
      p.is_active ? 'Aktif' : 'Nonaktif',
      p.is_online_available ? 'Ya' : 'Tidak',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `k99_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Coffee className="w-6 h-6 text-blue-600" />
            <span>Manajemen Menu & Produk</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar harga offline kasir vs online pemesanan, ketersediaan stok, dan kategori
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition"
          >
            <Layers className="w-4 h-4 text-slate-600" />
            <span>+ Kategori</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Menu Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari SKU atau nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Menu & Foto</th>
                <th className="py-3 px-4">Kategori & SKU</th>
                <th className="py-3 px-4 text-right">Harga Offline</th>
                <th className="py-3 px-4 text-right">Harga Online</th>
                <th className="py-3 px-4 text-right">HPP Resep</th>
                <th className="py-3 px-4 text-center">Status Jual</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{prod.description}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-700">{prod.category_name}</span>
                    <div className="text-[10px] text-slate-400 font-mono">{prod.sku}</div>
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-blue-700">
                    {formatRupiah(prod.price_offline)}
                  </td>

                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatRupiah(prod.price_online)}
                  </td>

                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatRupiah(prod.estimated_hpp)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        prod.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {prod.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {prod.is_online_available ? 'Online: Aktif' : 'Online: Mati'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Produk"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                {editingId ? 'Edit Data Menu' : 'Tambah Menu Baru Kopi 99'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Menu</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                    placeholder="Contoh: Kopi Susu Aren"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Jual Kasir (Offline)</label>
                  <input
                    type="number"
                    value={priceOffline}
                    onChange={(e) => setPriceOffline(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Jual Online (WA/Ojol)</label>
                  <input
                    type="number"
                    value={priceOnline}
                    onChange={(e) => setPriceOnline(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">URL Gambar Foto Menu</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi Menu</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  placeholder="Bahan dasar, cita rasa..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-blue-600 border-slate-300"
                  />
                  <span>Produk Aktif</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOfflineAvailable}
                    onChange={(e) => setIsOfflineAvailable(e.target.checked)}
                    className="rounded text-blue-600 border-slate-300"
                  />
                  <span>Buka Kasir</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOnlineAvailable}
                    onChange={(e) => setIsOnlineAvailable(e.target.checked)}
                    className="rounded text-blue-600 border-slate-300"
                  />
                  <span>Buka Online</span>
                </label>
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
                onClick={handleSaveProduct}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Tambah Kategori Menu Baru</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="e.g. Mocktail & Soda, Dessert"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan</label>
                <input
                  type="text"
                  placeholder="Deskripsi singkat..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleAddCategory}
                disabled={!newCatName.trim()}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Kategori
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
