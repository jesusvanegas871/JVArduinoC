import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { ArrowDownLeft, ArrowUpRight, Repeat, FileSpreadsheet, Plus, RefreshCw, AlertCircle, History, X } from 'lucide-react';

export function InventoryModule() {
  const [stockList, setStockList] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'

  // Modal State for Movement Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movementType, setMovementType] = useState('ENTRADA'); // ENTRADA, SALIDA, TRASLADO, AJUSTE
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 1,
    origin_location_code: '',
    destination_location_code: '',
    reason: '',
    user_id: 'operador_almacen'
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stock, moves, prods, locs] = await Promise.all([
        apiService.getInventoryStock(),
        apiService.getInventoryMovements(),
        apiService.getProducts(),
        apiService.getLocations()
      ]);

      setStockList(stock);
      setMovements(moves);
      setProducts(prods);
      setLocations(locs);
    } catch (err) {
      setError(err.message || 'Error al consultar inventarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (type) => {
    setMovementType(type);
    setFormData({
      product_id: products[0]?.id || '',
      quantity: 1,
      origin_location_code: locations[0]?.code || 'ALM-01',
      destination_location_code: locations[1]?.code || 'REC-01',
      reason: type === 'ENTRADA' ? 'Ingreso de mercancía por proveedor' :
              type === 'SALIDA' ? 'Salida por merma o retiro' :
              type === 'TRASLADO' ? 'Traslado interno de estación' : 'Ajuste autorizado de inventario',
      user_id: 'operador_almacen'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      await apiService.createMovement({
        product_id: Number(formData.product_id),
        movement_type: movementType,
        quantity: Number(formData.quantity),
        origin_location_code: movementType === 'ENTRADA' ? null : formData.origin_location_code,
        destination_location_code: movementType === 'SALIDA' ? null : formData.destination_location_code,
        reason: formData.reason,
        user_id: formData.user_id
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error registrando movimiento de inventario');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Existencias por Ubicación
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'movements'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial Auditable
          </button>
        </div>

        {/* Movement Operations Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleOpenModal('ENTRADA')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" /> Entrada
          </button>
          <button
            onClick={() => handleOpenModal('SALIDA')}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-xl transition-all"
          >
            <ArrowUpRight className="w-4 h-4" /> Salida
          </button>
          <button
            onClick={() => handleOpenModal('TRASLADO')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/40 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-xl transition-all"
          >
            <Repeat className="w-4 h-4" /> Traslado
          </button>
          <button
            onClick={() => handleOpenModal('AJUSTE')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Ajuste
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
            <span>Cargando datos de inventario...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : activeTab === 'stock' ? (
          /* Stock Balances Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Código / Nombre Ubicación</th>
                  <th className="py-3 px-4">SKU / Producto</th>
                  <th className="py-3 px-4 text-center">Cant. En Ubicación</th>
                  <th className="py-3 px-4 text-center">Cant. Reservada (Prod)</th>
                  <th className="py-3 px-4 text-center">Total Disp. Global</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stockList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">Sin existencias registradas</td>
                  </tr>
                ) : (
                  stockList.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mr-2">
                          {st.location?.code}
                        </span>
                        <span className="font-semibold text-white">{st.location?.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-mono">{st.product?.sku}</div>
                        <div className="text-slate-400">{st.product?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-white text-sm">{st.quantity}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-semibold">{st.product?.reserved_quantity || 0}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-400">
                        {st.product ? st.product.total_quantity - st.product.reserved_quantity : 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Movement History Log */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Tipo Movimiento</th>
                  <th className="py-3 px-4">Producto / SKU</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4">Origen &rarr; Destino</th>
                  <th className="py-3 px-4">Motivo</th>
                  <th className="py-3 px-4">Usuario Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">Sin historial de movimientos</td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono">
                        {new Date(m.created_at).toLocaleString('es-ES')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          m.movement_type === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          m.movement_type === 'SALIDA' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          m.movement_type === 'TRASLADO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white font-mono">{m.product?.sku}</span>
                        <div className="text-slate-400 text-[11px]">{m.product?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-white text-sm">{m.quantity}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {m.origin_location_code || 'N/A'} &rarr; {m.destination_location_code || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{m.reason}</td>
                      <td className="py-3 px-4 text-slate-400 font-medium">{m.user_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Registrar Operación:</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {movementType}
                </span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Producto *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Disp: {p.available_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {movementType === 'AJUSTE' ? 'Cantidad Total Resultante *' : 'Cantidad *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Usuario Responsable *</label>
                  <input
                    type="text"
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              {/* Location Selectors */}
              {(movementType === 'SALIDA' || movementType === 'TRASLADO') && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ubicación Origen *</label>
                  <select
                    value={formData.origin_location_code}
                    onChange={(e) => setFormData({ ...formData, origin_location_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>{loc.code} - {loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(movementType === 'ENTRADA' || movementType === 'TRASLADO' || movementType === 'AJUSTE') && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    {movementType === 'AJUSTE' ? 'Ubicación Afectada *' : 'Ubicación Destino *'}
                  </label>
                  <select
                    value={formData.destination_location_code}
                    onChange={(e) => setFormData({ ...formData, destination_location_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>{loc.code} - {loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Motivo u Observación *</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Explique el motivo del movimiento para fines de auditoría..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
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
                  {formSubmitting ? 'Procesando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
