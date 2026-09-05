import React, { useState, useMemo } from 'react';
import { Search, Download, FileSpreadsheet, Plus, Trash2, Save, RotateCcw, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { SortControl, naturalSort } from './SortControl';

export const DataGrid = ({
  title,
  columns = [],
  data,
  onSave,
  onDeleteRow,
  exportCsvUrl,
  exportExcelUrl,
  importCsvUrl,
  onRefresh,
  readOnly = false
}) => {
  const [gridData, setGridData] = useState(data);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState(columns[0]?.key || null);
  const [sortDir, setSortDir] = useState('asc');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Sync if parent data changes
  React.useEffect(() => {
    if (!isDirty) {
      setGridData(Array.isArray(data) ? data : []);
    } else {
      const unsavedRows = (gridData || []).filter(r => r && r._isNew);
      setGridData([...unsavedRows, ...(Array.isArray(data) ? data : [])]);
    }
  }, [data]);

  const handleCellChange = (rowIdx, colKey, value) => {
    const updated = [...gridData];
    updated[rowIdx] = { ...updated[rowIdx], [colKey]: value };
    setGridData(updated);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const newRow = { _isNew: true };
    columns.forEach(col => {
      newRow[col.key] = '';
    });
    setGridData([newRow, ...gridData]);
    setIsDirty(true);
  };

  const handleDeleteRow = async (rowIdx) => {
    const rowToDelete = gridData[rowIdx];
    if (rowToDelete._isNew) {
      const updated = gridData.filter((_, idx) => idx !== rowIdx);
      setGridData(updated);
      const remainingNew = updated.filter(r => r._isNew).length;
      if (remainingNew === 0) setIsDirty(false);
      return;
    }

    if (onDeleteRow) {
      try {
        await onDeleteRow(rowToDelete);
        const updated = gridData.filter((_, idx) => idx !== rowIdx);
        setGridData(updated);
        setSuccessMsg('Record deleted successfully from database!');
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        setErrorMsg(err.response?.data?.detail || err.message || 'Failed to delete record');
      }
    } else {
      const updated = gridData.filter((_, idx) => idx !== rowIdx);
      setGridData(updated);
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (onSave) {
        const cleanData = gridData.map(({ _isNew, ...rest }) => rest);
        await onSave(cleanData);
        setIsDirty(false);
        setSuccessMsg('Changes saved successfully to database!');
        setTimeout(() => setSuccessMsg(null), 3000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      const errDetails = err.response?.data?.detail?.errors || [err.response?.data?.detail || err.message];
      setErrorMsg(Array.isArray(errDetails) ? errDetails.join(' | ') : String(errDetails));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGridData(Array.isArray(data) ? data : []);
    setIsDirty(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !importCsvUrl) return;

    const formData = new FormData();
    formData.append('file', file);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(importCsvUrl, formData);
      setSuccessMsg('CSV records imported successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || err.message;
      setErrorMsg(Array.isArray(msg) ? msg.join(' | ') : String(msg));
    }
  };

  // Search & Filter
  const filteredData = useMemo(() => {
    return (gridData || []).filter(row => {
      if (!row || typeof row !== 'object') return false;
      if (!searchTerm) return true;
      return Object.values(row).some(val =>
        String(val ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [gridData, searchTerm]);

  // Sort using naturalSort helper (handles REQ1, REQ2, REQ10, dates, numbers)
  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return naturalSort(filteredData, sortCol, sortDir);
  }, [filteredData, sortCol, sortDir]);

  const existingCount = useMemo(() => {
    return sortedData.filter(r => !r._isNew).length;
  }, [sortedData]);

  const unsavedCount = useMemo(() => {
    return sortedData.filter(r => r._isNew).length;
  }, [sortedData]);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  const sortOptions = useMemo(() => {
    return columns.map(c => ({ value: c.key, label: c.label }));
  }, [columns]);

  const getColMinWidth = (col) => {
    if (col.minWidth) return col.minWidth;
    const key = (col.key || '').toLowerCase();
    if (key.includes('name') || key.includes('description') || key.includes('defect') || key.includes('location') || key.includes('track') || key.includes('equipment')) {
      return '220px';
    }
    if (key.includes('id') || key.includes('department') || key.includes('qualification') || key.includes('corridor') || key.includes('section')) {
      return '160px';
    }
    return '130px';
  };

  return (
    <div className="tactile-card rounded-2xl p-6 mb-6 shadow-neu-flat select-none">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight">{title}</h2>
          <span className="text-xs font-mono text-slate-500">
            Showing <strong className="text-blue-600">{existingCount}</strong> existing records
            {unsavedCount > 0 && <span className="text-amber-600 ml-2 font-bold">+ {unsavedCount} unsaved row{unsavedCount > 1 ? 's' : ''}</span>}
            {isDirty && <span className="text-cyan-600 ml-2 font-bold">• (UNSAVED CHANGES)</span>}
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Reusable Sort Controls */}
          <SortControl
            options={sortOptions}
            sortField={sortCol}
            onSortFieldChange={(field) => setSortCol(field)}
            sortOrder={sortDir}
            onSortOrderChange={(dir) => setSortDir(dir)}
          />

          {/* Search Box */}
          <div className="relative w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search dataset..."
              className="input-field pl-9 py-2 text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          {!readOnly && (
            <>
              {importCsvUrl && (
                <label className="tactile-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer flex items-center gap-1.5 tactile-btn" title="Import CSV File">
                  <Upload size={15} className="text-slate-500" /> Import
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
              )}
              <button onClick={handleAddRow} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-neu-btn-blue flex items-center gap-1.5 transform active:scale-95 transition-all" title="Add Row">
                <Plus size={15} strokeWidth={2.5} /> Add Row
              </button>
              {isDirty && (
                <>
                  <button onClick={handleReset} className="tactile-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 tactile-btn" title="Discard Changes">
                    <RotateCcw size={15} /> Reset
                  </button>
                  <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5">
                    <Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </>
          )}

          {exportCsvUrl && (
            <a href={exportCsvUrl} className="tactile-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 tactile-btn" title="Export CSV" download>
              <Download size={15} className="text-slate-500" /> CSV
            </a>
          )}
          {exportExcelUrl && (
            <a href={exportExcelUrl} className="tactile-pill px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 tactile-btn" title="Export Excel" download>
              <FileSpreadsheet size={15} className="text-emerald-600" /> Excel
            </a>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="tactile-pill border-l-4 border-emerald-500 p-3 rounded-xl text-xs text-emerald-700 font-semibold mb-4 flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="tactile-pill border-l-4 border-rose-500 p-3 rounded-xl text-xs text-rose-700 font-semibold mb-4">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Table Grid (Light 3D Neumorphic) */}
      <div className="table-container rounded-xl overflow-x-auto shadow-neu-flat bg-gradient-to-br from-[#f8faff] to-[#edf2f8] border border-white/70">
        <table className="custom-table w-full text-left font-sans text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b-2 border-slate-200 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} className="py-3 px-4 cursor-pointer hover:text-slate-800" style={{ minWidth: getColMinWidth(col) }}>
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {sortCol === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
              ))}
              {!readOnly && <th className="py-3 px-4 text-right w-20">ACTIONS</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80">
            {sortedData.map((row, rowIdx) => {
              const isNumericOrId = (key) => {
                const k = (key || '').toLowerCase();
                return k.includes('id') || k.includes('km') || k.includes('no') || k.includes('seq') || k.includes('code') || k.includes('time') || k.includes('date');
              };

              return (
                <tr key={rowIdx} className={`transition-colors ${row._isNew ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : 'bg-white hover:bg-slate-50 even:bg-slate-50/50'}`}>
                  {columns.map(col => (
                    <td key={col.key} className="py-2.5 px-4" style={{ minWidth: getColMinWidth(col) }}>
                      {!readOnly ? (
                        <input
                          type={col.type || 'text'}
                          className="input-field py-1 px-2.5 text-xs text-slate-800"
                          value={row[col.key] ?? ''}
                          placeholder={col.placeholder || ''}
                          onChange={e => handleCellChange(rowIdx, col.key, e.target.value)}
                          style={{
                            fontFamily: isNumericOrId(col.key) ? "'JetBrains Mono', monospace" : 'inherit'
                          }}
                        />
                      ) : (
                        <span className={isNumericOrId(col.key) ? 'font-mono text-slate-800 font-bold' : 'text-slate-800'}>
                          {row[col.key]}
                        </span>
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="text-rose-600 hover:text-rose-800 p-1 transition-colors"
                        title={row._isNew ? 'Discard Unsaved Row' : 'Delete Row'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="text-center py-12 px-4 bg-white">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2 tactile-inset">
                      <Search size={24} />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 font-display">
                      NO RECORDS AVAILABLE IN DATASET
                    </h3>
                    <p className="max-w-md text-xs text-slate-500 leading-relaxed font-sans">
                      Add a record manually using "+ Add Row" or import a CSV dataset to populate this matrix.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Bar */}
      <div className="border-t border-slate-200/80 pt-3 mt-4 flex items-center justify-between text-xs font-mono text-slate-500">
        <div>
          <span className="font-bold text-slate-700">{existingCount} OF {existingCount} ENTRIES</span>
          <span className="mx-2 text-slate-300">•</span>
          <span>Engine ready for schedule ingestion</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>LIVE DB: CONNECTED</span>
        </div>
      </div>
    </div>
  );
};
