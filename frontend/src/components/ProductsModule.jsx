import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Plus, Search, Edit3, Trash2, ShieldAlert, CheckCircle, XCircle, RefreshCw, AlertCircle, X } from 'lucide-react';

export function ProductsModule() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [catalogMetrics, setCatalogMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    unit_of_measure: 'unidades',
    min_stock: 5,
    default_location_code: 'ALM-01',
    initial_quantity: 0
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (statusFilter !== '') params.is_active = statusFilter === 'true';

      const [prods, cats, locs, metrics] = await Promise.all([
        apiService.getProducts(params),
        apiService.getCategories(),
        apiService.getLocations(),
        apiService.getCatalogMetrics()
      ]);

      setProducts(prods);
      setCategories(cats);
      setLocations(locs);
      setCatalogMetrics(metrics);
    } catch (err) {
      setError(err.message || 'Error cargando catálogo de productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryId, statusFilter]);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: categories[0]?.id || '',
      unit_of_measure: 'unidades',
      min_stock: 5,
      default_location_code: locations[0]?.code || 'ALM-01',
      initial_quantity: 0
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      description: prod.description || '',
      category_id: prod.category_id || '',
      unit_of_measure: prod.unit_of_measure || 'unidades',
      min_stock: prod.min_stock,
      default_location_code: prod.default_location_code || 'ALM-01',
      initial_quantity: prod.total_quantity
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      if (editingProduct) {
        await apiService.updateProduct(editingProduct.id, {
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id ? Number(formData.category_id) : null,
          unit_of_measure: formData.unit_of_measure,
          min_stock: Number(formData.min_stock),
          default_location_code: formData.default_location_code
        });
      } else {
        await apiService.createProduct({
          sku: formData.sku,
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id ? Number(formData.category_id) : null,
          unit_of_measure: formData.unit_of_measure,
          min_stock: Number(formData.min_stock),
          default_location_code: formData.default_location_code,
          initial_quantity: Number(formData.initial_quantity)
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error guardando producto');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeactivate = async (product) => {
    if (!window.confirm(`¿Estás seguro de desactivar el producto '${product.name}'? El historial de movimientos se conservará intacto.`)) {
      return;
    }
    try {
      await apiService.deactivateProduct(product.id);
      loadData();
    } catch (err) {
      alert(`Error al desactivar producto: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Catalog Indicator Banner */}
      {catalogMetrics && (
        <div className="bg-slate-900/80 border border-emerald-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Verificación del Catálogo Base</div>
              <div className="text-sm font-extrabold text-white mt-0.5">
                Referencias únicas cargadas: <span className="font-mono text-emerald-300">{catalogMetrics.total_existing_in_db} / 600</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-right">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold rounded-xl inline-block">
              Faltan {catalogMetrics.total_missing_for_600} referencias para completar las 600
            </span>
          </div>
        </div>
      )}

      {/* Search, Filter & Action Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todos los Estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        {/* Add Product Button */}
        <button
          onClick={handleOpenCreateModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
            <span>Cargando productos...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron productos con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Cant. Total</th>
                  <th className="py-3 px-4 text-center">Reservado</th>
                  <th className="py-3 px-4 text-center">Disponible</th>
                  <th className="py-3 px-4 text-center">Min. Stock</th>
                  <th className="py-3 px-4">Ubicación</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((p) => {
                  const isLowStock = p.available_quantity <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-mono">{p.sku}</div>
                        <div className="text-slate-300 font-medium">{p.name}</div>
                        {p.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{p.description}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {p.category?.name || 'Sin categoría'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-white">{p.total_quantity}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-semibold">{p.reserved_quantity}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-md font-bold ${
                          isLowStock ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {p.available_quantity} {p.unit_of_measure}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-mono">{p.min_stock}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{p.default_location_code}</td>
                      <td className="py-3 px-4 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                            <XCircle className="w-3 h-3" /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {p.is_active && (
                          <button
                            onClick={() => handleDeactivate(p)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Desactivar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Create / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">
                {editingProduct ? `Editar Producto: ${editingProduct.sku}` : 'Crear Nuevo Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">SKU / Código Único *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingProduct)}
                    placeholder="Ej. PROD-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sensor ULN2003"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Descripción Opcional</label>
                <textarea
                  rows="2"
                  placeholder="Detalles técnicos o especificaciones..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Categoría</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Unidad de Medida</label>
                  <input
                    type="text"
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ubicación Defecto</label>
                  <select
                    value={formData.default_location_code}
                    onChange={(e) => setFormData({ ...formData, default_location_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>{loc.code} - {loc.name}</option>
                    ))}
                  </select>
                </div>

                {!editingProduct && (
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Cantidad Inicial</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.initial_quantity}
                      onChange={(e) => setFormData({ ...formData, initial_quantity: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {formSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
