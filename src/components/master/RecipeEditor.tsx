// ═══════════════════════════════════════════════
// Triwara POS — Recipe Builder & Product Editor Modal
// ═══════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import type { IProduct, IIngredient, IRecipeItem, ICategory } from '../../types';
import { productService } from '../../services/product.service';
import { ingredientService } from '../../services/ingredient.service';
import { hppService, type IHppBreakdown } from '../../services/hpp.service';
import { formatRupiah, generateCodeBadge } from '../../utils/currency';

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
  const [price, setPrice] = useState<number>(product?.price || 25000);
  const [description, setDescription] = useState<string>(product?.description || '');
  const [recipe, setRecipe] = useState<IRecipeItem[]>(product?.recipe || []);
  const [takeawayPackaging, setTakeawayPackaging] = useState<IRecipeItem[]>(product?.takeawayPackaging || []);

  const [ingredients, setIngredients] = useState<IIngredient[]>([]);
  const [previewDineInHpp, setPreviewDineInHpp] = useState<IHppBreakdown | null>(null);
  const [previewTakeawayHpp, setPreviewTakeawayHpp] = useState<IHppBreakdown | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    ingredientService.getAll().then((data) => {
      setIngredients(data);
    });
  }, []);

  // Update HPP live preview whenever recipe or price changes
  const updateHppPreview = useCallback(async () => {
    const tempProduct: IProduct = {
      id: product?.id || 0,
      categoryId,
      name: name || 'Preview Menu',
      codeBadge: generateCodeBadge(name || 'Preview'),
      price,
      description,
      recipe,
      takeawayPackaging,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dineHpp = await hppService.calculateProductHpp(tempProduct, 'dine_in');
    const takeHpp = await hppService.calculateProductHpp(tempProduct, 'takeaway');

    setPreviewDineInHpp(dineHpp);
    setPreviewTakeawayHpp(takeHpp);
  }, [product, categoryId, name, price, description, recipe, takeawayPackaging]);

  useEffect(() => {
    updateHppPreview();
  }, [updateHppPreview]);

  // Recipe row actions
  const handleAddRecipeRow = () => {
    const defaultIng = ingredients.find((i) => i.category === 'raw') || ingredients[0];
    if (!defaultIng) return;
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
    if (!defaultPkg) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama menu tidak boleh kosong');
      return;
    }

    try {
      if (isEditing && product?.id) {
        await productService.updateProduct(product.id, {
          categoryId,
          name: name.trim(),
          price,
          description: description.trim(),
          recipe,
          takeawayPackaging,
        });
      } else {
        await productService.addProduct({
          categoryId,
          name: name.trim(),
          price,
          description: description.trim(),
          recipe,
          takeawayPackaging,
          isActive: true,
        });
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
        onSaved();
      } catch (err) {
        setErrorMsg((err as Error).message);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card recipe-editor-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{isEditing ? `Edit Menu: ${product?.name}` : 'Tambah Menu Baru'}</h3>
            <span className="modal-subtitle">Atur detail produk, resep bahan baku, &amp; kemasan takeaway</span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            [✕]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && <div className="form-error-alert">{errorMsg}</div>}

          <div className="form-group">
            <label className="form-label">Nama Menu Produk</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cth: Iced Americano, Caffe Latte, Butter Croissant..."
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
                onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Harga Jual Pelanggan (Rp)</label>
              <input
                type="number"
                className="form-input price-input-lg"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Deskripsi Singkat Menu</label>
            <input
              type="text"
              className="form-input"
              placeholder="Cth: Ekstraksi 100% Arabica blend 18g espresso pekat..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Main Recipe Section */}
          <div className="recipe-section-box">
            <div className="recipe-section-header">
              <h4>1. Resep Bahan Baku Utama (Minuman/Makanan)</h4>
              <button type="button" className="btn-small-add" onClick={handleAddRecipeRow}>
                + Tambah Bahan
              </button>
            </div>

            <div className="recipe-rows">
              {recipe.length === 0 ? (
                <p className="empty-hint">Belum ada bahan baku. Klik "+ Tambah Bahan".</p>
              ) : (
                recipe.map((row, idx) => {
                  const ing = ingredients.find((i) => i.id === row.ingredientId);
                  const totalCost = row.amount * (ing ? ing.costPerUnit : 0);

                  return (
                    <div key={idx} className="recipe-row-item">
                      <select
                        className="form-select"
                        value={row.ingredientId}
                        onChange={(e) => handleRecipeIngChange(idx, parseInt(e.target.value, 10))}
                      >
                        {ingredients.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({formatRupiah(i.costPerUnit)}/{i.unit})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        className="form-input amount-input"
                        value={row.amount}
                        onChange={(e) => handleRecipeAmountChange(idx, parseFloat(e.target.value) || 0)}
                      />

                      <span className="row-unit">{row.unit}</span>
                      <span className="row-cost">{formatRupiah(totalCost)}</span>
                      <button type="button" className="btn-row-del" onClick={() => handleRemoveRecipeRow(idx)}>
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Takeaway Packaging Section */}
          <div className="recipe-section-box">
            <div className="recipe-section-header">
              <h4>2. Kemasan Sekali Pakai (Khusus Takeaway)</h4>
              <button type="button" className="btn-small-add" onClick={handleAddPackagingRow}>
                + Tambah Kemasan
              </button>
            </div>

            <div className="recipe-rows">
              {takeawayPackaging.length === 0 ? (
                <p className="empty-hint">Belum ada kemasan. Klik "+ Tambah Kemasan".</p>
              ) : (
                takeawayPackaging.map((row, idx) => {
                  const ing = ingredients.find((i) => i.id === row.ingredientId);
                  const totalCost = row.amount * (ing ? ing.costPerUnit : 0);

                  return (
                    <div key={idx} className="recipe-row-item">
                      <select
                        className="form-select"
                        value={row.ingredientId}
                        onChange={(e) => handlePackagingIngChange(idx, parseInt(e.target.value, 10))}
                      >
                        {ingredients
                          .filter((i) => i.category === 'packaging')
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({formatRupiah(i.costPerUnit)}/{i.unit})
                            </option>
                          ))}
                      </select>

                      <input
                        type="number"
                        className="form-input amount-input"
                        value={row.amount}
                        onChange={(e) => handlePackagingAmountChange(idx, parseFloat(e.target.value) || 0)}
                      />

                      <span className="row-unit">{row.unit}</span>
                      <span className="row-cost">{formatRupiah(totalCost)}</span>
                      <button type="button" className="btn-row-del" onClick={() => handleRemovePackagingRow(idx)}>
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Live HPP Preview Cards */}
          {previewDineInHpp && previewTakeawayHpp && (
            <div className="hpp-preview-container">
              <div className="hpp-card dine-in">
                <span className="card-label">Dine-In (Tanpa Kemasan)</span>
                <strong>HPP: {formatRupiah(previewDineInHpp.totalHpp)}</strong>
                <small>
                  Profit: +{formatRupiah(previewDineInHpp.grossProfit)} ({previewDineInHpp.marginPercent}%)
                </small>
              </div>

              <div className="hpp-card takeaway">
                <span className="card-label">Takeaway (+Kemasan Cup/Lid)</span>
                <strong>HPP: {formatRupiah(previewTakeawayHpp.totalHpp)}</strong>
                <small>
                  Profit: +{formatRupiah(previewTakeawayHpp.grossProfit)} ({previewTakeawayHpp.marginPercent}%)
                </small>
              </div>
            </div>
          )}

          <div className="modal-footer">
            {isEditing && (
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Hapus Menu
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
