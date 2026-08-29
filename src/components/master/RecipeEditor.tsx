// ═══════════════════════════════════════════════
// Triwara POS — Recipe & Menu Builder (Clean Form & Category Modal)
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IProduct, ICategory, IRecipeItem, IIngredient, IProductAdditional } from '../../types';
import { productService } from '../../services/product.service';
import { ingredientService } from '../../services/ingredient.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { CategoryModal } from './CategoryModal';

interface RecipeEditorProps {
  product: IProduct | null;
  categories: ICategory[];
  onClose: () => void;
  onSaved: () => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ product, categories, onClose, onSaved }) => {
  const isEditing = Boolean(product);

  const [localCategories, setLocalCategories] = useState<ICategory[]>(categories);
  const [name, setName] = useState<string>(product?.name || '');
  const [categoryId, setCategoryId] = useState<number>(
    product?.categoryId || (categories.length > 0 ? categories[0].id! : 1)
  );
  const [price, setPrice] = useState<number | ''>(product ? product.price : '');
  const [description, setDescription] = useState<string>(product?.description || '');
  const [recipe, setRecipe] = useState<IRecipeItem[]>(product?.recipe || []);
  const [takeawayPackaging, setTakeawayPackaging] = useState<IRecipeItem[]>(product?.takeawayPackaging || []);
  const [availableAdditionals, setAvailableAdditionals] = useState<IProductAdditional[]>(
    product?.availableAdditionals || []
  );

  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    ingredientService.getAll().then((data) => {
      setIngredients(data);
    });
  }, []);

  // Quick Add Category via Modal
  const handleSaveNewCategory = async (catName: string) => {
    const newCatId = await productService.addCategory(catName);
    const updatedCats = await productService.getCategories();
    setLocalCategories(updatedCats);
    setCategoryId(newCatId);
    await notificationService.addNotification(
      'Kategori Baru Ditambahkan',
      `Kategori "${catName}" siap digunakan.`,
      'product',
      'products'
    );
  };

  // Recipe row actions
  const handleAddRecipeRow = () => {
    const defaultIng = ingredients.find((i) => i.category === 'raw') || ingredients[0];
    if (!defaultIng) {
      alert('Tambahkan bahan baku di tab Inventaris terlebih dahulu');
      return;
    }
    setRecipe([...recipe, { ingredientId: defaultIng.id!, amount: 10, unit: defaultIng.unit }]);
  };

  const handleRemoveRecipeRow = (idx: number) => {
    setRecipe(recipe.filter((_, i) => i !== idx));
  };

  const handleRecipeIngChange = (idx: number, ingId: number) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    const updated = [...recipe];
    updated[idx] = { ...updated[idx], ingredientId: ingId, unit: ing.unit };
    setRecipe(updated);
  };

  const handleRecipeAmountChange = (idx: number, amount: number) => {
    const updated = [...recipe];
    updated[idx] = { ...updated[idx], amount: Math.max(0, amount) };
    setRecipe(updated);
  };

  // Packaging row actions
  const handleAddPackagingRow = () => {
    const defaultPkg = ingredients.find((i) => i.category === 'packaging') || ingredients[0];
    if (!defaultPkg) {
      alert('Tambahkan bahan kemasan di tab Inventaris terlebih dahulu');
      return;
    }
    setTakeawayPackaging([...takeawayPackaging, { ingredientId: defaultPkg.id!, amount: 1, unit: defaultPkg.unit }]);
  };

  const handleRemovePackagingRow = (idx: number) => {
    setTakeawayPackaging(takeawayPackaging.filter((_, i) => i !== idx));
  };

  const handlePackagingIngChange = (idx: number, ingId: number) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    const updated = [...takeawayPackaging];
    updated[idx] = { ...updated[idx], ingredientId: ingId, unit: ing.unit };
    setTakeawayPackaging(updated);
  };

  const handlePackagingAmountChange = (idx: number, amount: number) => {
    const updated = [...takeawayPackaging];
    updated[idx] = { ...updated[idx], amount: Math.max(0, amount) };
    setTakeawayPackaging(updated);
  };

  // Additional options actions
  const handleAddAdditionalRow = () => {
    const defaultIng = ingredients.find((i) => i.category === 'raw');
    setAvailableAdditionals([
      ...availableAdditionals,
      {
        name: '',
        price: 5000,
        ingredientId: defaultIng?.id,
        amount: 15,
      },
    ]);
  };

  const handleRemoveAdditionalRow = (idx: number) => {
    setAvailableAdditionals(availableAdditionals.filter((_, i) => i !== idx));
  };

  const handleAdditionalChange = (
    idx: number,
    field: keyof IProductAdditional,
    val: string | number | undefined
  ) => {
    const updated = [...availableAdditionals];
    updated[idx] = { ...updated[idx], [field]: val };
    setAvailableAdditionals(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama menu tidak boleh kosong');
      return;
    }
    if (price === '' || Number(price) < 0) {
      setErrorMsg('Harga jual harus diisi (minimal 0)');
      return;
    }

    // Clean valid additionals
    const cleanedAdditionals = availableAdditionals
      .filter((a) => a.name.trim().length > 0)
      .map((a) => ({
        name: a.name.trim(),
        price: Math.max(0, a.price || 0),
        ingredientId: a.ingredientId || undefined,
        amount: a.ingredientId && a.amount ? Math.max(0, a.amount) : undefined,
      }));

    try {
      if (isEditing && product?.id) {
        await productService.updateProduct(product.id, {
          categoryId,
          name: name.trim(),
          price: Number(price),
          description: description.trim(),
          recipe,
          takeawayPackaging,
          availableAdditionals: cleanedAdditionals,
        });
        await notificationService.addNotification(
          'Menu Resep Diperbarui',
          `Menu "${name.trim()}" berhasil diperbarui.`,
          'product',
          'products'
        );
      } else {
        await productService.addProduct({
          categoryId,
          name: name.trim(),
          price: Number(price),
          description: description.trim(),
          recipe,
          takeawayPackaging,
          availableAdditionals: cleanedAdditionals,
          isActive: true,
        });
        await notificationService.addNotification(
          'Menu Baru Ditambahkan',
          `Menu "${name.trim()}" (${formatRupiah(Number(price))}) siap dijual di katalog kasir.`,
          'product',
          'products'
        );
      }
      onSaved();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!product?.id) return;
    if (confirm(`Hapus menu "${product.name}"?`)) {
      try {
        await productService.deleteProduct(product.id);
        await notificationService.addNotification(
          'Menu Dihapus',
          `Menu "${product.name}" telah dihapus dari katalog kasir.`,
          'product',
          'products'
        );
        onSaved();
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-card recipe-editor-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h3 className="modal-title">{isEditing ? `Edit Menu: ${product?.name}` : 'Tambah Menu Baru'}</h3>
              <span className="modal-subtitle">Atur detail produk, resep bahan baku, &amp; kemasan takeaway</span>
            </div>
            <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body">
            {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

            <div className="form-group">
              <label className="form-label">Nama Menu Produk</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: Kopi Susu Aren, Caffe Latte, Matcha Ice..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row two-cols">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Kategori Menu</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    style={{ color: '#a1a1aa', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    + Kategori Baru
                  </button>
                </div>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(parseInt(e.target.value))}
                >
                  {localCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Harga Jual (Rp)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="contoh: 22000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deskripsi Singkat Menu</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: Espresso dengan susu segar dan sirup gula aren asli"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Recipe Builder Section */}
            <div className="recipe-builder-section">
              <div className="recipe-builder-header">
                <div>
                  <h4 className="recipe-builder-title">1. Resep Bahan Baku Utama</h4>
                  <small className="recipe-builder-subtitle">Bahan yang digunakan untuk penyajian Dine In &amp; Takeaway</small>
                </div>
                <button type="button" className="btn-secondary" onClick={handleAddRecipeRow}>
                  + Tambah Bahan
                </button>
              </div>

              {recipe.length === 0 ? (
                <p className="empty-hint" style={{ padding: '12px 0' }}>Belum ada bahan resep. Klik "+ Tambah Bahan" di atas.</p>
              ) : (
                <div className="recipe-items-table">
                  {recipe.map((item, idx) => (
                    <div key={idx} className="recipe-item-row">
                      <select
                        className="form-select"
                        value={item.ingredientId}
                        onChange={(e) => handleRecipeIngChange(idx, parseInt(e.target.value))}
                      >
                        {ingredients
                          .filter((i) => i.category === 'raw')
                          .map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatRupiah(ing.costPerUnit)}/{ing.unit})
                            </option>
                          ))}
                      </select>

                      <div className="amount-input-box">
                        <input
                          type="number"
                          className="form-input amount"
                          value={item.amount}
                          onChange={(e) => handleRecipeAmountChange(idx, parseFloat(e.target.value) || 0)}
                        />
                        <span className="unit-label">{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        className="btn-danger-icon"
                        onClick={() => handleRemoveRecipeRow(idx)}
                        title="Hapus Bahan"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Takeaway Packaging Section */}
            <div className="recipe-builder-section">
              <div className="recipe-builder-header">
                <div>
                  <h4 className="recipe-builder-title">2. Kemasan Sekali Pakai (Takeaway)</h4>
                  <small className="recipe-builder-subtitle">Hanya dipotong saat pesanan disajikan sebagai Takeaway</small>
                </div>
                <button type="button" className="btn-secondary" onClick={handleAddPackagingRow}>
                  + Tambah Kemasan
                </button>
              </div>

              {takeawayPackaging.length === 0 ? (
                <p className="empty-hint" style={{ padding: '12px 0' }}>Belum ada kemasan takeaway. Klik "+ Tambah Kemasan" di atas.</p>
              ) : (
                <div className="recipe-items-table">
                  {takeawayPackaging.map((item, idx) => (
                    <div key={idx} className="recipe-item-row">
                      <select
                        className="form-select"
                        value={item.ingredientId}
                        onChange={(e) => handlePackagingIngChange(idx, parseInt(e.target.value))}
                      >
                        {ingredients
                          .filter((i) => i.category === 'packaging')
                          .map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({formatRupiah(ing.costPerUnit)}/{ing.unit})
                            </option>
                          ))}
                      </select>

                      <div className="amount-input-box">
                        <input
                          type="number"
                          className="form-input amount"
                          value={item.amount}
                          onChange={(e) => handlePackagingAmountChange(idx, parseFloat(e.target.value) || 0)}
                        />
                        <span className="unit-label">{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        className="btn-danger-icon"
                        onClick={() => handleRemovePackagingRow(idx)}
                        title="Hapus Kemasan"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Additional / Topping Options Section */}
            <div className="recipe-builder-section">
              <div className="recipe-builder-header">
                <div>
                  <h4 className="recipe-builder-title">3. Pilihan Additional / Topping Menu</h4>
                  <small className="recipe-builder-subtitle">
                    Kustomisasi yang dapat dipilih kasir khusus menu ini (cth: Extra Shot, Syrup, dll)
                  </small>
                </div>
                <button type="button" className="btn-secondary" onClick={handleAddAdditionalRow}>
                  + Tambah Additional
                </button>
              </div>

              {availableAdditionals.length === 0 ? (
                <p className="empty-hint" style={{ padding: '12px 0' }}>
                  Belum ada additional khusus untuk menu ini. Klik "+ Tambah Additional" jika ingin menyediakan opsi tambahan.
                </p>
              ) : (
                <div className="recipe-items-table">
                  {availableAdditionals.map((add, idx) => (
                    <div
                      key={idx}
                      className="recipe-item-row"
                      style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                    >
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 2 }}
                        placeholder="Nama additional (cth: Extra Shot)"
                        value={add.name}
                        onChange={(e) => handleAdditionalChange(idx, 'name', e.target.value)}
                        required
                      />

                      <div className="amount-input-box" style={{ flex: 1.2 }}>
                        <span style={{ fontSize: '11px', color: '#a1a1aa' }}>+Rp</span>
                        <input
                          type="number"
                          className="form-input amount"
                          placeholder="Harga"
                          value={add.price}
                          onChange={(e) => handleAdditionalChange(idx, 'price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>

                      <select
                        className="form-select"
                        style={{ flex: 2 }}
                        value={add.ingredientId || ''}
                        onChange={(e) => {
                          const val = e.target.value ? parseInt(e.target.value) : undefined;
                          handleAdditionalChange(idx, 'ingredientId', val);
                        }}
                      >
                        <option value="">(Tanpa potong stok)</option>
                        {ingredients
                          .filter((i) => i.category === 'raw')
                          .map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              Potong: {ing.name}
                            </option>
                          ))}
                      </select>

                      {add.ingredientId && (
                        <div className="amount-input-box" style={{ width: '90px' }}>
                          <input
                            type="number"
                            className="form-input amount"
                            placeholder="Qty"
                            value={add.amount || ''}
                            onChange={(e) => handleAdditionalChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                          />
                          <span className="unit-label">
                            {ingredients.find((i) => i.id === add.ingredientId)?.unit || 'gr'}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn-danger-icon"
                        onClick={() => handleRemoveAdditionalRow(idx)}
                        title="Hapus Additional"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ margin: '20px -20px -20px -20px' }}>
              {isEditing && (
                <button type="button" className="btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
                  Hapus Menu
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={onClose}>
                Batal
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? 'Simpan Perubahan' : 'Tambah Menu'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {isCategoryModalOpen && (
        <CategoryModal
          title="Tambah Kategori Menu Baru"
          subtitle="Kategori akan langsung tersedia untuk menu produk"
          placeholder="contoh: Pastry & Croissant, Jus Buah Segar..."
          onClose={() => setIsCategoryModalOpen(false)}
          onSave={handleSaveNewCategory}
        />
      )}
    </>
  );
};
