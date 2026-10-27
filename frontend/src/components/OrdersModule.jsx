import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Plus, ShoppingBag, XCircle, CheckCircle2, Clock, AlertTriangle, RefreshCw, AlertCircle, X } from 'lucide-react';

export function OrdersModule() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  // Create Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    requested_quantity: 1,
    origin_location_code: 'ALM-01',
    destination_location_code: 'ENT-01',
    priority: 'Media',
    requester_user: 'operador_logistico',
    notes: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (statusFilter) params.status_filter = statusFilter;

      const [ords, prods, locs] = await Promise.all([
        apiService.getOrders(params),
        apiService.getProducts({ is_active: true }),
        apiService.getLocations()
      ]);

      setOrders(ords);
      setProducts(prods);
      setLocations(locs);

      if (prods.length > 0 && !formData.product_id) {
        setFormData((prev) => ({ ...prev, product_id: prods[0].id }));
      }
    } catch (err) {
      setError(err.message || 'Error cargando ordenes de transporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenModal = () => {
    setFormData({
      product_id: products[0]?.id || '',
      requested_quantity: 1,
      origin_location_code: locations[0]?.code || 'ALM-01',
      destination_location_code: locations[1]?.code || 'ENT-01',
      priority: 'Media',
      requester_user: 'operador_logistico',
      notes: ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      await apiService.createOrder({
        product_id: Number(formData.product_id),
        requested_quantity: Number(formData.requested_quantity),
        origin_location_code: formData.origin_location_code,
        destination_location_code: formData.destination_location_code,
        priority: formData.priority,
        requester_user: formData.requester_user,
        notes: formData.notes
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error creando orden de transporte');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCancelOrder = async (order) => {
    const reason = window.prompt(`¿Motivo de cancelación para la orden ${order.order_number}?`);
    if (reason === null) return; // User pressed cancel

    try {
      await apiService.cancelOrder(order.id, reason || 'Sin motivo especificado');
      loadData();
    } catch (err) {
      alert(`Error al cancelar la orden: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Reservada':
      case 'Pendiente':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Reservada</span>;
      case 'Asignada':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Asignada</span>;
      case 'En ejecución':
      case 'En transporte':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">En Ejecución</span>;
      case 'Completada':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Completada</span>;
      case 'Cancelada':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">Cancelada</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-400">Filtrar Estado:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todas las Órdenes</option>
            <option value="Reservada">Reservada</option>
            <option value="Asignada">Asignada</option>
            <option value="En ejecución">En Ejecución</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>

        <button
          onClick={handleOpenModal}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Transporte
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
            <span>Cargando órdenes de transporte...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-400 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron órdenes de transporte con el filtro aplicado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nº Orden</th>
                  <th className="py-3 px-4">Producto Solicitado</th>
                  <th className="py-3 px-4 text-center">Cant.</th>
                  <th className="py-3 px-4">Origen &rarr; Destino</th>
                  <th className="py-3 px-4 text-center">Prioridad</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">{ord.order_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-mono">{ord.product?.sku}</div>
                      <div className="text-slate-400">{ord.product?.name}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white text-sm">{ord.requested_quantity}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {ord.origin_location_code} &rarr; {ord.destination_location_code}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.priority === 'Alta' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        ord.priority === 'Media' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {ord.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(ord.status)}</td>
                    <td className="py-3 px-4 text-slate-400">{ord.requester_user}</td>
                    <td className="py-3 px-4 text-right">
                      {['Reservada', 'Pendiente', 'Asignada'].includes(ord.status) && (
                        <button
                          onClick={() => handleCancelOrder(ord)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors font-semibold"
                        >
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form New Order */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Crear Orden de Transporte Interno</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Producto a Transportar *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name} (Stock Disp: {p.available_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Cantidad Solicatada *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requested_quantity}
                    onChange={(e) => setFormData({ ...formData, requested_quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Prioridad *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ubicación Origen (Recogida) *</label>
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

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ubicación Destino (Entrega) *</label>
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
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Observaciones Opcionales</label>
                <textarea
                  rows="2"
                  placeholder="Detalles sobre el despacho, fragilidad, etc..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  {formSubmitting ? 'Reservando Stock...' : 'Crear & Reservar Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
