import React, { useState, useMemo } from 'react';
import { Search, Download, FileSpreadsheet, Plus, Trash2, Save, RotateCcw, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';

export const DataGrid = ({
  title,
  columns,
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
  const [sortCol, setSortCol] = useState(null);
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
      // Preserve any active unsaved rows while syncing parent data
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
        // Strip temporary _isNew flag before sending to API
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

  // Sort
  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortCol] ?? '';
      const valB = b[sortCol] ?? '';
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
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
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', background: '#1A2438', border: '1px solid #24334D' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#DFE2EE', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</h2>
          <span style={{ fontSize: '0.80rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
            Showing <strong style={{ color: '#3B82F6' }}>{existingCount}</strong> existing records
            {unsavedCount > 0 && <span style={{ color: '#F59E0B', marginLeft: '8px' }}>+ {unsavedCount} unsaved row{unsavedCount > 1 ? 's' : ''}</span>}
            {isDirty && <span style={{ color: '#06B6D4', marginLeft: '8px' }}>• (UNSAVED CHANGES)</span>}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Search dataset..."
              className="input-field"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>

          {/* Action Buttons */}
          {!readOnly && (
            <>
              {importCsvUrl && (
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }} title="Import CSV File">
                  <Upload size={16} color="#94A3B8" /> Import
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              )}
              <button onClick={handleAddRow} className="btn btn-primary" title="Add Row">
                <Plus size={16} /> Add Row
              </button>
              {isDirty && (
                <>
                  <button onClick={handleReset} className="btn btn-secondary" title="Discard Changes">
                    <RotateCcw size={16} /> Reset
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn btn-emerald">
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </>
          )}

          {exportCsvUrl && (
            <a href={exportCsvUrl} className="btn btn-secondary" title="Export CSV" download>
              <Download size={16} color="#94A3B8" /> CSV
            </a>
          )}
          {exportExcelUrl && (
            <a href={exportExcelUrl} className="btn btn-secondary" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34D399' }} title="Export Excel" download>
              <FileSpreadsheet size={16} color="#10B981" /> Excel
            </a>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34D399', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem' }}>
          <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {successMsg}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#FCA5A5', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Table Grid */}
      <div className="table-container" style={{ background: '#1A2438', border: '1px solid #24334D' }}>
        <table className="custom-table" style={{ width: '100%', minWidth: 'max-content' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer', minWidth: getColMinWidth(col), background: '#151E2E', borderBottom: '2px solid #24334D', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.label}
                    {sortCol === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
              ))}
              {!readOnly && <th style={{ width: '80px', minWidth: '80px', background: '#151E2E', borderBottom: '2px solid #24334D', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>ACTIONS</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => {
              const isNumericOrId = (key) => {
                const k = (key || '').toLowerCase();
                return k.includes('id') || k.includes('km') || k.includes('no') || k.includes('seq') || k.includes('code') || k.includes('time') || k.includes('date');
              };

              return (
                <tr key={rowIdx} style={row._isNew ? { background: 'rgba(59, 130, 246, 0.15)', borderLeft: '3px solid #3B82F6' } : {}}>
                  {columns.map(col => (
                    <td key={col.key} style={{ minWidth: getColMinWidth(col), fontFamily: isNumericOrId(col.key) ? "'JetBrains Mono', monospace" : "'Inter', sans-serif" }}>
                      {!readOnly ? (
                        <input
                          type={col.type || 'text'}
                          className="input-field"
                          value={row[col.key] ?? ''}
                          placeholder={col.placeholder || ''}
                          onChange={e => handleCellChange(rowIdx, col.key, e.target.value)}
                          style={{
                            background: row._isNew ? '#101726' : 'transparent',
                            border: row._isNew ? '1px solid #3B82F6' : '1px solid transparent',
                            padding: '6px 10px',
                            height: 'auto',
                            width: '100%',
                            fontSize: '0.88rem',
                            fontFamily: isNumericOrId(col.key) ? "'JetBrains Mono', monospace" : 'inherit'
                          }}
                          onFocus={e => (e.target.style.border = '1px solid #3B82F6')}
                          onBlur={e => (e.target.style.border = row._isNew ? '1px solid #3B82F6' : '1px solid transparent')}
                        />
                      ) : (
                        <span>{row[col.key]}</span>
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      <button
                        onClick={() => handleDeleteRow(rowIdx)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
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
                <td colSpan={columns.length + (readOnly ? 0 : 1)} style={{ textAlign: 'center', padding: '48px 16px', background: '#1A2438' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Track Line Illustration */}
                    <div style={{ position: 'relative', width: '120px', height: '70px', marginBottom: '16px' }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)', filter: 'blur(10px)' }}></div>
                      <svg width="120" height="70" viewBox="0 0 120 70" fill="none" style={{ position: 'relative', zIndex: 2 }}>
                        <line x1="10" y1="60" x2="50" y2="40" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                        <line x1="110" y1="60" x2="70" y2="40" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                        <rect x="40" y="15" width="40" height="35" rx="8" fill="#151E2E" stroke="#3B82F6" strokeWidth="2" />
                        <circle cx="50" cy="38" r="3" fill="#3B82F6" />
                        <circle cx="70" cy="38" r="3" fill="#3B82F6" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#DFE2EE', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '6px' }}>
                      NO RECORDS AVAILABLE IN DATASET
                    </h3>
                    <p style={{ fontSize: '0.80rem', color: '#94A3B8', maxWidth: '420px', lineHeight: '1.4' }}>
                      Add a record manually using "+ Add Row" or import a CSV dataset to populate this matrix.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Bar: Status & Telemetry Readout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#94A3B8', borderTop: '1px solid #24334D', paddingTop: '14px' }}>
        <div>
          <span style={{ fontWeight: 700, color: '#DFE2EE' }}>{existingCount} OF {existingCount} ENTRIES</span>
          <span style={{ margin: '0 8px', color: '#64748B' }}>•</span>
          <span style={{ color: '#64748B' }}>Engine ready for schedule ingestion</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 600 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
          <span>LIVE DB: CONNECTED</span>
        </div>
      </div>
    </div>
  );
};
