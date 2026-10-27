import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { MapPin, Plus, Package, Info, RefreshCw, AlertCircle, X, CheckCircle } from 'lucide-react';

export function LocationsModule() {
  const [locations, setLocations] = useState([]);
  const [selectedLocCode, setSelectedLocCode] = useState(null);
  const [locStock, setLocStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ALMACEN',
    description: ''
  });
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getLocations();
      setLocations(data);
      if (data.length > 0 && !selectedLocCode) {
        setSelectedLocCode(data[0].code);
      }
    } catch (err) {
      setError(err.message || 'Error cargando ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (!selectedLocCode) return;
    const loadStock = async () => {
      try {
        setStockLoading(true);
        const data = await apiService.getLocationStock(selectedLocCode);
        setLocStock(data);
      } catch (err) {
        console.error('Error stock por ubicación:', err);
      } finally {
        setStockLoading(false);
      }
    };
    loadStock();
  }, [selectedLocCode]);

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      await apiService.createLocation(formData);
      setIsModalOpen(false);
      setFormData({ code: '', name: '', type: 'ALMACEN', description: '' });
      loadLocations();
    } catch (err) {
      setFormError(err.message || 'Error creando ubicación');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Warning Box on Hardware Navigation vs Inventory Locations */}
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-3 text-xs text-indigo-300">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">
            Diferenciación Técnica: Ubicaciones de Inventario vs Nodos de Navegación del Robot
          </span>
          <p className="text-indigo-200/80">
            Las ubicaciones de inventario (ej. ALM-01, REC-01) representan zonas lógicas de custodia de existencias.
            El carrito RoboTrack navega mediante sensores ópticos IR sobre líneas e intersecciones de referencia en la pista.
            La llegada física a una ubicación requiere detección o confirmación de eventos, no solo representación en el mapa.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Locations List */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Ubicaciones del Almacén
            </h3>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
              title="Nueva Ubicación"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-6 text-center text-slate-500 text-xs">Cargando ubicaciones...</div>
          ) : error ? (
            <div className="p-4 text-red-400 text-xs">{error}</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {locations.map((loc) => {
                const isSelected = loc.code === selectedLocCode;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocCode(loc.code)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">{loc.code}</span>
                        <span className="font-semibold">{loc.name}</span>
                      </div>
                      {loc.description && <p className="text-[11px] text-slate-500 mt-0.5">{loc.description}</p>}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      {loc.type}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Inventory Details for Selected Location */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Existencias Almacenadas en: <span className="font-mono text-emerald-400 font-bold">{selectedLocCode || 'N/A'}</span>
            </h3>
            <span className="text-xs text-slate-500">Consulta en tiempo real</span>
          </div>

          {stockLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
              Consultando stock de {selectedLocCode}...
            </div>
          ) : locStock.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No hay productos almacenados actualmente en la ubicación <span className="font-mono font-bold text-slate-400">{selectedLocCode}</span>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Producto</th>
                    <th className="py-2.5 px-3 text-center">Cantidad en Esta Ubicación</th>
                    <th className="py-2.5 px-3 text-center">Estado del Producto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {locStock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{item.product?.sku}</td>
                      <td className="py-2.5 px-3">{item.product?.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-400 text-sm">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-center">
                        {item.product?.is_active ? (
                          <span className="text-emerald-400 font-medium">Activo</span>
                        ) : (
                          <span className="text-slate-500 font-medium">Inactivo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form New Location */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Definir Nueva Ubicación</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Código de Ubicación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. REC-02"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Estación de Carga A2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Tipo de Ubicación *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="ALMACEN">ALMACEN</option>
                  <option value="RECOGIDA">RECOGIDA</option>
                  <option value="DESPACHO">DESPACHO</option>
                  <option value="ENTREGA">ENTREGA</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Descripción Opcional</label>
                <textarea
                  rows="2"
                  placeholder="Descripción de la zona o pauta de acceso..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {formSubmitting ? 'Guardando...' : 'Crear Ubicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
