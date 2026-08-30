// ═══════════════════════════════════════════════
// Triwara POS — Recipe & Menu Builder (Clean Form & Category Modal)
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import type { IProduct, ICategory, IRecipeItem, IIngredient, IProductAdditional } from '../../types';
import { productService } from '../../services/product.service';
import { ingredientService } from '../../services/ingredient.service';
import { notificationService } from '../../services/notification.service';
import { formatRupiah } from '../../utils/currency';
import { DialogModal } from '../common/DialogModal';

interface RecipeEditorProps {
  product: IProduct | null;
  categories: ICategory[];
  onClose: () => void;
  onSaved: () => void;
}

export const RecipeEditor: React.FC<RecipeEditorProps> = ({ product, categories, onClose, onSaved }) => {
  const isEditing = Boolean(product);

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
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    isDanger?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    ingredientService.getAll().then((data) => {
      setIngredients(data);
    });
  }, []);

  // Recipe row actions
  const handleAddRecipeRow = () => {
    const defaultIng = ingredients.find((i) => i.category === 'raw') || ingredients[0];
    if (!defaultIng) {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Bahan Baku Kosong',
        message: 'Tambahkan bahan baku di tab Inventaris terlebih dahulu sebelum membuat resep.',
        onConfirm: () => {},
      });
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
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Bahan Kemasan Kosong',
        message: 'Tambahkan bahan kemasan di tab Inventaris terlebih dahulu.',
        onConfirm: () => {},
      });
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

    // Clean and validate mandatory additionals
    for (const a of availableAdditionals) {
      if (!a.name.trim()) {
        setErrorMsg('Nama additional tidak boleh kosong');
        return;
      }
      if (!a.ingredientId) {
        setErrorMsg(`Additional "${a.name}" wajib memilih bahan baku yang dipotong.`);
        return;
      }
      if (!a.amount || a.amount <= 0) {
        setErrorMsg(`Additional "${a.name}" wajib mengisi jumlah bahan baku yang dipotong (> 0).`);
        return;
      }
    }

    const cleanedAdditionals = availableAdditionals.map((a) => ({
      name: a.name.trim(),
      price: Math.max(0, a.price || 0),
      ingredientId: a.ingredientId,
      amount: Math.max(0, a.amount || 0),
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

  const handleDelete = () => {
    if (!product?.id) return;
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Hapus Menu Produk?',
      message: `Apakah Anda yakin ingin menghapus menu "${product.name}" dari katalog kasir?`,
      isDanger: true,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await productService.deleteProduct(product.id!);
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
      },
    });
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="menu-modal-card recipe-editor-card" onClick={(e) => e.stopPropagation()}>
          <div className="menu-modal-header">
            <h3 className="menu-modal-title">{isEditing ? `Edit Menu: ${product?.name}` : 'Tambah Menu Baru'}</h3>
            <button type="button" className="modal-close-btn-red" onClick={onClose} title="Tutup">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="menu-modal-body">
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
                <label className="form-label">Kategori Menu</label>
                <select
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(parseInt(e.target.value))}
                >
                  {categories.map((c) => (
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
              <label className="form-label">Deskripsi</label>
              <input
                type="text"
                className="form-input"
                placeholder="contoh: Espresso dengan susu segar dan sirup gula aren asli"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Recipe Builder Section */}
            <div className="menu-builder-section">
              <div className="menu-builder-header">
                <div>
                  <h4 className="menu-builder-title">Bahan Baku Utama</h4>
                </div>
                <button type="button" className="menu-btn-add-item" onClick={handleAddRecipeRow}>
                  + Add
                </button>
              </div>

              {recipe.length === 0 ? (
                <p className="empty-hint" style={{ padding: '8px 0', fontSize: '13px', color: '#71717a' }}>
                  Belum ada bahan . Klik "+ Add" di atas.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recipe.map((item, idx) => (
                    <div key={idx} className="menu-packaging-row">
                      <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={item.ingredientId}
                        onChange={(e) => handleRecipeIngChange(idx, parseInt(e.target.value))}
                      >
                        {ingredients
                          .filter((i) => i.category === 'raw')
                          .map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                      </select>

                      <div className="menu-qty-box">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleRecipeAmountChange(idx, parseFloat(e.target.value) || 0)}
                        />
                        <span>{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        className="menu-btn-icon-danger"
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
            <div className="menu-builder-section">
              <div className="menu-builder-header">
                <div>
                  <h4 className="menu-builder-title">Kemasan Takeaway</h4>
                  </div>
                <button type="button" className="menu-btn-add-item" onClick={handleAddPackagingRow}>
                  + Add
                </button>
              </div>

              {takeawayPackaging.length === 0 ? (
                <p className="empty-hint" style={{ padding: '8px 0', fontSize: '13px', color: '#71717a' }}>
                  Belum ada kemasan takeaway. Klik "+ Add" di atas.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {takeawayPackaging.map((item, idx) => (
                    <div key={idx} className="menu-packaging-row">
                      <select
                        className="form-select"
                        style={{ flex: 1 }}
                        value={item.ingredientId}
                        onChange={(e) => handlePackagingIngChange(idx, parseInt(e.target.value))}
                      >
                        {ingredients
                          .filter((i) => i.category === 'packaging')
                          .map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                      </select>

                      <div className="menu-qty-box">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handlePackagingAmountChange(idx, parseFloat(e.target.value) || 0)}
                        />
                        <span>{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        className="menu-btn-icon-danger"
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
            <div className="menu-builder-section">
              <div className="menu-builder-header">
                <div>
                  <h4 className="menu-builder-title">Additional</h4>
                </div>
                <button type="button" className="menu-btn-add-item" onClick={handleAddAdditionalRow}>
                  + Add
                </button>
              </div>

              {availableAdditionals.length === 0 ? (
                <p className="empty-hint" style={{ padding: '8px 0', fontSize: '13px', color: '#71717a' }}>
                  Belum ada additional untuk menu ini. Klik "+ Add" jika ingin menyediakan opsi tambahan.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableAdditionals.map((add, idx) => (
                    <div key={idx} className="menu-additional-card">
                      {/* Baris 1: Nama Additional + Input Harga + Tombol Hapus */}
                      <div className="menu-additional-top-row">
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          placeholder="Nama additional (cth: Extra Shot)"
                          value={add.name}
                          onChange={(e) => handleAdditionalChange(idx, 'name', e.target.value)}
                          required
                        />

                        <div className="menu-price-box">
                          <span>+Rp</span>
                          <input
                            type="number"
                            placeholder="Harga"
                            value={add.price || ''}
                            onChange={(e) => handleAdditionalChange(idx, 'price', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>

                        <button
                          type="button"
                          className="menu-btn-icon-danger"
                          onClick={() => handleRemoveAdditionalRow(idx)}
                          title="Hapus Additional"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Baris 2: Dropdown Potong Bahan Stok + Qty */}
                      <div className="menu-additional-bottom-row">
                        <select
                          className="form-select"
                          style={{ flex: 1 }}
                          value={add.ingredientId || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            handleAdditionalChange(idx, 'ingredientId', val);
                          }}
                          required
                        >
                          <option value="" disabled>-- Pilih Bahan Baku --</option>
                          {ingredients
                            .filter((i) => i.category === 'raw')
                            .map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit})
                              </option>
                            ))}
                        </select>

                        <div className="menu-qty-box">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={add.amount || ''}
                            onChange={(e) => handleAdditionalChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                            required
                          />
                          <span>
                            {ingredients.find((i) => i.id === add.ingredientId)?.unit || 'satuan'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="menu-modal-footer">
            {isEditing && (
              <button type="button" className="menu-btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }}>
                Hapus Menu
              </button>
            )}
            <button type="button" className="menu-btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="menu-btn-primary">
              {isEditing ? 'Simpan Perubahan' : 'Tambah Menu'}
            </button>
          </div>
        </form>
        </div>
      </div>

      <DialogModal
        isOpen={dialogConfig.isOpen}
        type={dialogConfig.type}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        isDanger={dialogConfig.isDanger}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};
