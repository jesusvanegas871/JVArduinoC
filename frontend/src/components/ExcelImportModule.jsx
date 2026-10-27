import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import {
  FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, XCircle,
  FileText, Database, Plus, RefreshCw, Eye, ArrowRight, ShieldCheck, Download
} from 'lucide-react';

export function ExcelImportModule() {
  const [metrics, setMetrics] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sheetName, setSheetName] = useState('PRODUCTOS A INCLUIR');
  const [previewData, setPreviewData] = useState(null);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Manual Creation Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    sku: '',
    name: '',
    category_id: '',
    unit_of_measure: 'unidades',
    min_stock: 5
  });
  const [categories, setCategories] = useState([]);
  const [manualError, setManualError] = useState(null);
  const [logs, setLogs] = useState([]);

  const loadMetricsAndLogs = async () => {
    try {
      const [mRes, lRes, cRes] = await Promise.all([
        apiService.getCatalogMetrics(),
        apiService.getImportLogs(),
        apiService.getCategories()
      ]);
      setMetrics(mRes);
      setLogs(lRes);
      setCategories(cRes);
    } catch (err) {
      console.error('Error cargando métricas:', err);
    }
  };

  useEffect(() => {
    loadMetricsAndLogs();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Por favor selecciona un archivo Excel (.xlsx)');
      return;
    }

    try {
      setLoadingPreview(true);
      setError(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('sheet_name', sheetName);

      const res = await apiService.previewExcelImport(formData);
      setPreviewData(res);
      setMetrics(res.catalog_metrics);
    } catch (err) {
      setError(err.message || 'Error al generar la vista previa del archivo Excel.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.preview_rows.length) return;

    try {
      setLoadingConfirm(true);
      setError(null);

      const res = await apiService.confirmExcelImport({
        filename: previewData.filename,
        sheet_name: previewData.sheet_name,
        preview_rows: previewData.preview_rows,
        user_id: 'operador_wms'
      });

      setSuccessMessage(res.message);
      setMetrics(res.catalog_metrics);
      setPreviewData(null);
      setSelectedFile(null);
      loadMetricsAndLogs();
    } catch (err) {
      setError(err.message || 'Error al confirmar la importación en base de datos.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    setManualError(null);
    try {
      await apiService.createProduct({
        sku: manualForm.sku,
        name: manualForm.name,
        category_id: manualForm.category_id ? Number(manualForm.category_id) : null,
        unit_of_measure: manualForm.unit_of_measure,
        min_stock: Number(manualForm.min_stock)
      });
      setIsManualModalOpen(false);
      setManualForm({ sku: '', name: '', category_id: '', unit_of_measure: 'unidades', min_stock: 5 });
      setSuccessMessage(`Referencia '${manualForm.sku}' agregada manualmente al catálogo.`);
      loadMetricsAndLogs();
    } catch (err) {
      setManualError(err.message || 'Error creando referencia manual');
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Catalog Metric Cards (Target 600) */}
      {metrics && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 border border-emerald-500/40 p-4 rounded-2xl flex flex-col justify-between shadow-lg shadow-emerald-950/20 col-span-2">
              <span className="text-[11px] font-bold uppercase text-emerald-400">Referencias únicas cargadas</span>
              <div className="text-2xl font-black text-white mt-1 font-mono">{metrics.total_existing_in_db} / {metrics.target_catalog}</div>
              <span className="text-[11px] text-amber-400 font-semibold mt-1">Faltan {metrics.total_missing_for_600} referencias para completar las 600</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-amber-400">Faltantes p/ 600</span>
              <div className="text-2xl font-black text-amber-400 mt-1 font-mono">{metrics.total_missing_for_600}</div>
              <span className="text-[10px] text-slate-500 mt-1">Para completar meta</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-blue-400">Elegibles Conteos</span>
              <div className="text-2xl font-black text-blue-400 mt-1 font-mono">{metrics.total_active_eligible_for_count}</div>
              <span className="text-[10px] text-slate-500 mt-1">&lt; 5 conteos anuales</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-purple-400">Nuevas en Import</span>
              <div className="text-2xl font-black text-purple-400 mt-1 font-mono">{metrics.total_new_imported}</div>
              <span className="text-[10px] text-slate-500 mt-1">Por incorporar</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase text-rose-400">Duplicadas Det.</span>
              <div className="text-2xl font-black text-rose-400 mt-1 font-mono">{metrics.total_duplicates_detected}</div>
              <span className="text-[10px] text-slate-500 mt-1">Identificadas</span>
            </div>
          </div>

          {metrics.info_message && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{metrics.info_message}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Upload Control & Actions */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Importador de Archivo Excel DATA FINAL</h2>
              <p className="text-xs text-slate-400">Soporta la lectura de `PRODUCTOS A INCLUIR` y `DATA VENTAS` (Referencia: DATA FINAL ENTREGAR2026.xlsx)</p>
            </div>
          </div>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Registrar Referencia Faltante Manual
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleGeneratePreview} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs items-end">
          <div>
            <label className="block text-slate-400 font-medium mb-1">1. Seleccionar Archivo Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">2. Hoja a Importar</label>
            <select
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="PRODUCTOS A INCLUIR">Hoja: PRODUCTOS A INCLUIR (11 productos propuestos)</option>
              <option value="DATA VENTAS">Hoja: DATA VENTAS (Histórico ventas 112 referencias únicas)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={!selectedFile || loadingPreview}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {loadingPreview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loadingPreview ? 'Analizando...' : 'Generar Vista Previa'}
          </button>
        </form>
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Vista Previa de Importación</h3>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-emerald-400 border border-slate-700">
                  {previewData.sheet_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Total Registros: <strong className="text-white">{previewData.total_rows}</strong> | Válidos: <strong className="text-emerald-400">{previewData.valid_rows_count}</strong> | A Crear: <strong className="text-purple-400">{previewData.to_create_count}</strong> | A Actualizar: <strong className="text-blue-400">{previewData.to_update_count}</strong> | Omitidos: <strong className="text-slate-400">{previewData.skipped_count}</strong> | Errores: <strong className="text-rose-400">{previewData.error_count}</strong>
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={loadingConfirm || previewData.valid_rows_count === 0}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 shrink-0"
            >
              {loadingConfirm ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loadingConfirm ? 'Guardando...' : 'Confirmar e Importar en Base de Datos'}
            </button>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Fila</th>
                  <th className="py-2.5 px-3">Código / SKU</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Origen</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                  <th className="py-2.5 px-3 text-center">Acción</th>
                  <th className="py-2.5 px-3">Observaciones / Advertencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {previewData.preview_rows.slice(0, 100).map((row, idx) => {
                  let statusBadge = 'bg-slate-800 text-slate-300';
                  if (row.status === 'NUEVO') statusBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                  if (row.status === 'EXISTENTE') statusBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                  if (row.status === 'DUPLICADO_EN_ARCHIVO') statusBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                  if (row.status === 'INVALIDO') statusBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/30';

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-mono text-slate-500">{row.row_index}</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-400">{row.sku}</td>
                      <td className="py-2 px-3 font-medium text-slate-200">{row.name}</td>
                      <td className="py-2 px-3 text-slate-400">{row.category || 'Sin categoría'}</td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">{row.origin_sheet}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusBadge}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-slate-300">{row.action}</td>
                      <td className="py-2 px-3 text-[11px]">
                        {row.warnings.map((w, i) => (
                          <div key={i} className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> {w}
                          </div>
                        ))}
                        {row.errors.map((e, i) => (
                          <div key={i} className="text-rose-400 flex items-center gap-1">
                            <XCircle className="w-3 h-3 shrink-0" /> {e}
                          </div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Log History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" /> Historial de Importaciones Realizadas
        </h3>

        {logs.length === 0 ? (
          <div className="text-slate-500 text-xs py-4 text-center">No hay registro previo de importaciones.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-3">Fecha</th>
                  <th className="py-2 px-3">Archivo</th>
                  <th className="py-2 px-3">Hoja</th>
                  <th className="py-2 px-3 text-center">Registros</th>
                  <th className="py-2 px-3 text-center">Creados</th>
                  <th className="py-2 px-3 text-center">Actualizados</th>
                  <th className="py-2 px-3 text-center">Omitidos</th>
                  <th className="py-2 px-3 text-center">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-400">{new Date(log.created_at).toLocaleString('es-ES')}</td>
                    <td className="py-2 px-3 font-semibold text-white">{log.filename}</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{log.sheet_name}</td>
                    <td className="py-2 px-3 text-center font-bold">{log.total_records}</td>
                    <td className="py-2 px-3 text-center text-purple-400 font-bold">{log.created_count}</td>
                    <td className="py-2 px-3 text-center text-blue-400 font-bold">{log.updated_count}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{log.skipped_count}</td>
                    <td className="py-2 px-3 text-center text-slate-400">{log.imported_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Manual Create Missing Product */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Registrar Referencia Faltante Manualmente</h3>
              <button onClick={() => setIsManualModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateManual} className="p-5 space-y-4 text-xs">
              {manualError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  {manualError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-medium mb-1">Código de Referencia / SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 500099"
                  value={manualForm.sku}
                  onChange={(e) => setManualForm({ ...manualForm, sku: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Descripción de la Referencia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Válvula Reguladora VR-50"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Categoría</label>
                <select
                  value={manualForm.category_id}
                  onChange={(e) => setManualForm({ ...manualForm, category_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  Guardar Referencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
