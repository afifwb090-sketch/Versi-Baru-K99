import React, { useState } from 'react';
import { Recipe, Ingredient, Product } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatRupiah } from '../../utils/formatters';
import { calculateProfitMargins, calculateRecipeTotals } from '../../utils/calculations';
import {
  FlaskConical,
  Plus,
  Trash2,
  Package,
  Layers,
  TrendingUp,
  Percent,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const RecipesView: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(dataService.getRecipes());
  const [ingredients, setIngredients] = useState<Ingredient[]>(dataService.getIngredients());
  const products = dataService.getProducts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Edit ingredient modal
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState<any>('coffee');
  const [ingPurchasePrice, setIngPurchasePrice] = useState(150000);
  const [ingPurchaseQty, setIngPurchaseQty] = useState(1000);
  const [ingBaseUnit, setIngBaseUnit] = useState<any>('gram');
  const [ingMinStock, setIngMinStock] = useState(1000);

  const refreshData = () => {
    setRecipes(dataService.getRecipes());
    setIngredients(dataService.getIngredients());
  };

  const handleOpenRecipeEditor = (product: Product) => {
    setSelectedProduct(product);
    const existing = dataService.getRecipeForProduct(product.id);
    if (existing) {
      setEditingRecipe(JSON.parse(JSON.stringify(existing)));
    } else {
      setEditingRecipe({
        id: `rec-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        notes: '',
        items: [],
        total_ingredient_cost: 0,
        total_packaging_cost: 0,
        total_hpp: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleAddRecipeItem = (ingId: string) => {
    if (!editingRecipe) return;
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;

    const newItem = {
      id: `ri-${Date.now()}`,
      recipe_id: editingRecipe.id,
      ingredient_id: ing.id,
      ingredient_name: ing.name,
      quantity: ing.base_unit === 'pcs' ? 1 : 10,
      unit: ing.base_unit,
      unit_cost: ing.cost_per_base_unit,
      subtotal_cost: Math.round((ing.base_unit === 'pcs' ? 1 : 10) * ing.cost_per_base_unit),
      is_packaging: ing.category === 'packaging',
    };

    const updatedItems = [...editingRecipe.items, newItem];
    const totals = calculateRecipeTotals(
      updatedItems.map((i) => ({
        quantity: i.quantity,
        unitCost: i.unit_cost,
        isPackaging: i.is_packaging,
      }))
    );

    setEditingRecipe({
      ...editingRecipe,
      items: updatedItems,
      total_ingredient_cost: totals.ingredientCost,
      total_packaging_cost: totals.packagingCost,
      total_hpp: totals.totalHpp,
    });
  };

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    if (!editingRecipe) return;
    const qty = Math.max(0.1, newQty);
    const updatedItems = editingRecipe.items.map((i) => {
      if (i.id === itemId) {
        return {
          ...i,
          quantity: qty,
          subtotal_cost: Math.round(qty * i.unit_cost),
        };
      }
      return i;
    });

    const totals = calculateRecipeTotals(
      updatedItems.map((i) => ({
        quantity: i.quantity,
        unitCost: i.unit_cost,
        isPackaging: i.is_packaging,
      }))
    );

    setEditingRecipe({
      ...editingRecipe,
      items: updatedItems,
      total_ingredient_cost: totals.ingredientCost,
      total_packaging_cost: totals.packagingCost,
      total_hpp: totals.totalHpp,
    });
  };

  const handleRemoveRecipeItem = (itemId: string) => {
    if (!editingRecipe) return;
    const updatedItems = editingRecipe.items.filter((i) => i.id !== itemId);
    const totals = calculateRecipeTotals(
      updatedItems.map((i) => ({
        quantity: i.quantity,
        unitCost: i.unit_cost,
        isPackaging: i.is_packaging,
      }))
    );
    setEditingRecipe({
      ...editingRecipe,
      items: updatedItems,
      total_ingredient_cost: totals.ingredientCost,
      total_packaging_cost: totals.packagingCost,
      total_hpp: totals.totalHpp,
    });
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe || !selectedProduct) return;
    dataService.saveRecipe(editingRecipe);
    refreshData();
    setEditingRecipe(null);
    setSelectedProduct(null);
  };

  const handleSaveNewIngredient = () => {
    if (!ingName.trim()) return;
    dataService.saveIngredient({
      name: ingName.trim(),
      category: ingCategory,
      purchase_price: ingPurchasePrice,
      purchase_quantity: ingPurchaseQty,
      base_unit: ingBaseUnit,
      minimum_stock: ingMinStock,
    });
    refreshData();
    setShowIngredientModal(false);
    setIngName('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            <span>Resep Minuman & Perhitungan HPP Otomatis</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Integrasikan takaran bahan baku & kemasan per porsi untuk menghitung COGS, margin laba kotor, dan markup akurat
          </p>
        </div>

        <button
          onClick={() => setShowIngredientModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Tambah Bahan Baku / Packaging</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-200">Total Menu Ber-Resep</span>
              <FlaskConical className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-extrabold mt-2">{recipes.length} / {products.length}</div>
          </div>
          <p className="text-[11px] text-blue-200/80 mt-2">
            Stok bahan otomatis terpotong setiap kali kasir menyelesaikan penjualan.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Bahan Baku Terdaftar</span>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2">{ingredients.length} item</div>
          </div>
          <span className="text-[11px] text-slate-400">
            Termasuk kopi, susu, sirup, bubuk, cup, dan packaging
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Rata-rata Margin Laba Kotor</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-600 mt-2">~64.5%</div>
          </div>
          <span className="text-[11px] text-slate-400">
            Perbandingan harga jual offline terhadap total HPP porsi
          </span>
        </div>
      </div>

      {/* Recipe List by Products */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-900">Daftar Menu & Komposisi HPP</h2>
          <span className="text-xs text-slate-500">Klik "Atur Resep" untuk mengubah gramasi & takaran</span>
        </div>

        <div className="divide-y divide-slate-100">
          {products.map((prod) => {
            const recipe = recipes.find((r) => r.product_id === prod.id);
            const marginCalc = calculateProfitMargins(prod.price_offline, prod.estimated_hpp);

            return (
              <div key={prod.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/80 transition">
                <div className="flex items-center gap-3">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-12 h-12 rounded-xl object-cover bg-slate-100"
                  />
                  <div>
                    <div className="font-bold text-sm text-slate-900">{prod.name}</div>
                    <div className="text-xs text-slate-500">
                      SKU: {prod.sku} • {prod.category_name}
                    </div>
                  </div>
                </div>

                {/* HPP breakdown pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Harga Offline</span>
                    <span className="font-bold text-slate-900">{formatRupiah(prod.price_offline)}</span>
                  </div>

                  <div className="bg-blue-50/60 p-2 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-600 font-semibold block">Total HPP (COGS)</span>
                    <span className="font-bold text-blue-800">{formatRupiah(prod.estimated_hpp)}</span>
                  </div>

                  <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-600 font-semibold block">Laba Kotor / Porsi</span>
                    <span className="font-bold text-emerald-800">{formatRupiah(marginCalc.grossProfit)}</span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Gross Margin %</span>
                    <span className="font-bold text-emerald-600">{marginCalc.marginPercent}%</span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleOpenRecipeEditor(prod)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    {recipe ? 'Edit Resep' : '+ Buat Resep Baru'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RECIPE BUILDER MODAL */}
      {editingRecipe && selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Resep: {selectedProduct.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Harga Jual Offline: <strong>{formatRupiah(selectedProduct.price_offline)}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingRecipe(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Items Table */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Komposisi Takaran Bahan & Packaging:
              </label>

              <div className="space-y-2">
                {editingRecipe.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">{item.ingredient_name}</div>
                      <div className="text-[10px] text-slate-400">
                        Biaya: {formatRupiah(item.unit_cost)} / {item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQty(item.id, Number(e.target.value))}
                        className="w-20 px-2 py-1 text-center bg-white border border-slate-300 rounded-lg font-bold"
                      />
                      <span className="text-slate-500 font-medium w-8">{item.unit}</span>
                    </div>

                    <div className="w-24 text-right font-bold text-slate-900">
                      {formatRupiah(item.subtotal_cost)}
                    </div>

                    <button
                      onClick={() => handleRemoveRecipeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {editingRecipe.items.length === 0 && (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    Belum ada bahan dalam resep ini. Pilih dari dropdown di bawah.
                  </div>
                )}
              </div>

              {/* Add item dropdown */}
              <div className="pt-3 flex gap-2">
                <select
                  id="select-add-ingredient"
                  className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddRecipeItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="" disabled>+ Pilih Bahan Baku / Cup / Sedotan untuk ditambahkan...</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({formatRupiah(ing.cost_per_base_unit)}/{ing.base_unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cost Summary Box */}
            <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Biaya Bahan (Ingredients):</span>
                <span>{formatRupiah(editingRecipe.total_ingredient_cost)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Biaya Kemasan (Packaging):</span>
                <span>{formatRupiah(editingRecipe.total_packaging_cost)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-amber-400 pt-1 border-t border-slate-800">
                <span>TOTAL HPP / PORSI:</span>
                <span>{formatRupiah(editingRecipe.total_hpp)}</span>
              </div>
              <div className="flex justify-between font-semibold text-xs text-emerald-400">
                <span>Estimasi Laba Kotor:</span>
                <span>{formatRupiah(selectedProduct.price_offline - editingRecipe.total_hpp)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingRecipe(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveRecipe}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Resep & Perbarui HPP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INGREDIENT MODAL */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">Tambah Bahan Baku / Packaging Baru</h3>
              <button onClick={() => setShowIngredientModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Bahan / Kemasan</label>
                <input
                  type="text"
                  placeholder="e.g. Biji Kopi Gayo, Sirup Karamel, Cup 16oz"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={ingCategory}
                    onChange={(e) => setIngCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="coffee">Kopi (Beans/Ground)</option>
                    <option value="dairy">Susu & Dairy</option>
                    <option value="syrup">Sirup & Gula</option>
                    <option value="powder">Bubuk (Matcha/Cokelat)</option>
                    <option value="tea">Teh</option>
                    <option value="packaging">Kemasan (Cup/Sedotan)</option>
                    <option value="other">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Satuan Dasar</label>
                  <select
                    value={ingBaseUnit}
                    onChange={(e) => setIngBaseUnit(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="gram">Gram (g)</option>
                    <option value="ml">Mililiter (ml)</option>
                    <option value="pcs">Pieces (Pcs)</option>
                    <option value="bottle">Botol</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Beli</label>
                  <input
                    type="number"
                    value={ingPurchaseQty}
                    onChange={(e) => setIngPurchaseQty(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Harga Beli Total (Rp)</label>
                  <input
                    type="number"
                    value={ingPurchasePrice}
                    onChange={(e) => setIngPurchasePrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl border border-blue-200">
                <span className="text-[11px] block">
                  Harga Pokok per Satuan: <strong>{formatRupiah(ingPurchaseQty > 0 ? ingPurchasePrice / ingPurchaseQty : 0)}</strong> / {ingBaseUnit}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowIngredientModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNewIngredient}
                disabled={!ingName.trim()}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-xs"
              >
                Simpan Bahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
