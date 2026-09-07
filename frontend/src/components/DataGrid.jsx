import React, { useState, useMemo, useEffect } from 'react';
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
  const [recentlyAddedIds, setRecentlyAddedIds] = useState(new Set());

  // Determine Authoritative Primary Key or Key Type
  const primaryKey = useMemo(() => {
    if (columns.some(c => c.key === 'worker_id')) return 'worker_id';
    if (columns.some(c => c.key === 'equipment_id')) return 'equipment_id';
    if (columns.some(c => c.key === 'train_id') && !columns.some(c => c.key === 'sequence')) return 'train_id';
    if (columns.some(c => c.key === 'request_id')) return 'request_id';
    if (columns.some(c => c.key === 'mapping_id')) return 'mapping_id';
    if (columns.some(c => c.key === 'task_id')) return 'task_id';
    if (columns.some(c => c.key === 'corridor_id') && !columns.some(c => c.key === 'track_id')) return 'corridor_id';
    const found = columns.find(c => (c.key || '').toLowerCase().endsWith('_id') || (c.key || '').toLowerCase().includes('id'));
    return found ? found.key : (columns[0]?.key || null);
  }, [columns]);

  // Compute a normalized identifier string for any row (handles single & composite keys)
  const getRowKeyString = (row) => {
    if (!row || typeof row !== 'object') return '';
    const hasTrainId = columns.some(c => c.key === 'train_id');
    const hasSequence = columns.some(c => c.key === 'sequence');
    const hasCorridorId = columns.some(c => c.key === 'corridor_id');
    const hasTrackId = columns.some(c => c.key === 'track_id');

    // Case A: Train Routes (Composite: train_id + sequence)
    if (hasTrainId && hasSequence && !columns.some(c => c.key === 'worker_id')) {
      const tid = String(row.train_id || '').trim().toLowerCase();
      const seq = String(row.sequence || '').trim().toLowerCase();
      return (tid && seq) ? `${tid}::seq_${seq}` : '';
    }

    // Case B: Corridor Data (Composite: corridor_id + track_id)
    if (hasCorridorId && hasTrackId && !columns.some(c => c.key === 'worker_id') && !columns.some(c => c.key === 'request_id')) {
      const cid = String(row.corridor_id || '').trim().toLowerCase();
      const trk = String(row.track_id || '').trim().toLowerCase();
      return (cid && trk) ? `${cid}::trk_${trk}` : '';
    }

    // Standard Single Primary Key
    if (primaryKey && row[primaryKey] !== undefined && row[primaryKey] !== null) {
      return String(row[primaryKey]).trim().toLowerCase();
    }
    return '';
  };

  // Sync when parent data updates, keeping drafts intact
  useEffect(() => {
    if (!isDirty) {
      setGridData(Array.isArray(data) ? data : []);
    } else {
      const unsavedRows = (gridData || []).filter(r => r && r._isNew);
      setGridData([...unsavedRows, ...(Array.isArray(data) ? data : [])]);
    }
  }, [data]);

  const handleCellChange = (rowIdx, colKey, value) => {
    const updated = [...gridData];
    const colDef = columns.find(c => c.key === colKey);
    const isNumCol = (colDef && colDef.type === 'number') || (
      colKey.includes('workers') || colKey.includes('duration') || colKey.includes('quantity') ||
      colKey.includes('km') || colKey.includes('hours') || colKey.includes('level') || colKey.includes('capacity') || colKey.includes('sequence')
    );

    let parsedVal = value;
    if (isNumCol && value !== '' && value !== null && value !== undefined) {
      const num = Number(value);
      if (!isNaN(num)) {
        parsedVal = num;
      }
    }

    updated[rowIdx] = { ...updated[rowIdx], [colKey]: parsedVal };
    setGridData(updated);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const newRow = { _isNew: true, _createdTs: Date.now() };
    columns.forEach(col => {
      if (col.key === 'request_id') {
        newRow[col.key] = 'Auto-Generated on Submission';
      } else {
        newRow[col.key] = '';
      }
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

    // REQUIREMENT 6 & 8: Dataset-Specific Duplicate Key Validation (INSERT vs UPDATE)
    const hasTrainId = columns.some(c => c.key === 'train_id');
    const hasSequence = columns.some(c => c.key === 'sequence');
    const hasCorridorId = columns.some(c => c.key === 'corridor_id');
    const hasTrackId = columns.some(c => c.key === 'track_id');

    if (hasTrainId && hasSequence && !columns.some(c => c.key === 'worker_id')) {
      // Train Routes: Duplicate sequence check per train
      const seenSeqPerTrain = new Map();
      for (let i = 0; i < gridData.length; i++) {
        const row = gridData[i];
        const tId = String(row.train_id || '').trim().toLowerCase();
        const seq = String(row.sequence || '').trim();
        if (tId && seq) {
          const key = `${tId}::${seq}`;
          if (seenSeqPerTrain.has(key)) {
            setErrorMsg(`Duplicate Sequence ${seq} for Train '${row.train_id}' already exists.`);
            setSaving(false);
            return;
          }
          seenSeqPerTrain.set(key, i);
        }
      }
    } else if (hasCorridorId && hasTrackId && !columns.some(c => c.key === 'worker_id') && !columns.some(c => c.key === 'request_id')) {
      // Corridors: Composite check (corridor_id + track_id)
      const seenCorridorTrack = new Map();
      for (let i = 0; i < gridData.length; i++) {
        const row = gridData[i];
        const cId = String(row.corridor_id || '').trim().toLowerCase();
        const trk = String(row.track_id || '').trim().toLowerCase();
        if (cId && trk) {
          const key = `${cId}::${trk}`;
          if (seenCorridorTrack.has(key)) {
            setErrorMsg(`Duplicate Corridor Track combination '${row.corridor_id}' / '${row.track_id}' already exists.`);
            setSaving(false);
            return;
          }
          seenCorridorTrack.set(key, i);
        }
      }
    } else if (primaryKey && primaryKey !== 'request_id') {
      // Standard Single Primary Key Datasets
      const seenPks = new Map();
      const colDef = columns.find(c => c.key === primaryKey);
      const pkLabel = colDef ? colDef.label : primaryKey;

      for (let i = 0; i < gridData.length; i++) {
        const row = gridData[i];
        const val = String(row[primaryKey] || '').trim();
        if (val) {
          const norm = val.toLowerCase();
          if (seenPks.has(norm)) {
            setErrorMsg(`Duplicate ${pkLabel}: '${val}' already exists.`);
            setSaving(false);
            return;
          }
          seenPks.set(norm, i);
        }
      }
    }

    try {
      if (onSave) {
        // Collect new row primary key IDs before cleanData strip
        const newKeys = new Set();
        gridData.forEach(r => {
          if (r._isNew) {
            const keyStr = getRowKeyString(r);
            if (keyStr) newKeys.add(keyStr);
          }
        });

        const cleanData = gridData.map(({ _isNew, _createdTs, ...rest }) => rest);
        await onSave(cleanData);

        if (newKeys.size > 0) {
          setRecentlyAddedIds(prev => new Set([...prev, ...newKeys]));
        }

        setIsDirty(false);
        setSuccessMsg('Changes saved successfully to database!');
        setTimeout(() => setSuccessMsg(null), 3000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      const errDetails = err.response?.data?.detail?.errors || err.response?.data?.detail || err.message;
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

  // REQUIREMENT 1, 3, 10, 11, 13: Top-Pinning + Natural Sort
  const sortedData = useMemo(() => {
    const rows = filteredData || [];
    if (!rows.length) return [];

    const draftRows = [];
    const recentlyAddedRows = [];
    const existingRows = [];

    rows.forEach(r => {
      const keyStr = getRowKeyString(r);
      if (r._isNew) {
        draftRows.push(r);
      } else if (keyStr && recentlyAddedIds.has(keyStr)) {
        recentlyAddedRows.push(r);
      } else {
        existingRows.push(r);
      }
    });

    // Pinned rows: draftRows (newest first) + recentlyAddedRows (newest first)
    const sortedExisting = sortCol ? naturalSort(existingRows, sortCol, sortDir) : existingRows;
    return [...draftRows, ...recentlyAddedRows, ...sortedExisting];
  }, [filteredData, sortCol, sortDir, recentlyAddedIds]);

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

              const keyStr = getRowKeyString(row);
              const isPinned = row._isNew || (keyStr && recentlyAddedIds.has(keyStr));
              const isServerGenIdCol = (colKey) => colKey === 'request_id' && row._isNew;

              return (
                <tr key={rowIdx} className={`transition-colors ${isPinned ? 'bg-blue-50/80 border-l-4 border-l-blue-500' : 'bg-white hover:bg-slate-50 even:bg-slate-50/50'}`}>
                  {columns.map(col => (
                    <td key={col.key} className="py-2.5 px-4" style={{ minWidth: getColMinWidth(col) }}>
                      {!readOnly ? (
                        <input
                          type={col.type || 'text'}
                          disabled={isServerGenIdCol(col.key)}
                          className={`input-field py-1 px-2.5 text-xs text-slate-800 ${isServerGenIdCol(col.key) ? 'bg-slate-100 italic text-slate-400 font-mono' : ''}`}
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
