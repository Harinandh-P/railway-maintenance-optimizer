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

  // Sync if parent data changes and grid is clean
  React.useEffect(() => {
    if (!isDirty) {
      setGridData(data);
    }
  }, [data, isDirty]);

  const handleCellChange = (rowIdx, colKey, value) => {
    const updated = [...gridData];
    updated[rowIdx] = { ...updated[rowIdx], [colKey]: value };
    setGridData(updated);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.key] = '';
    });
    setGridData([newRow, ...gridData]);
    setIsDirty(true);
  };

  const handleDeleteRow = async (rowIdx) => {
    const rowToDelete = gridData[rowIdx];
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
        await onSave(gridData);
        setIsDirty(false);
        setSuccessMsg('Changes saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      const errDetails = err.response?.data?.detail?.errors || [err.response?.data?.detail || err.message];
      setErrorMsg(Array.isArray(errDetails) ? errDetails.join(' | ') : String(errDetails));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setGridData(data);
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
    return gridData.filter(row => {
      if (!searchTerm) return true;
      return Object.values(row).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{title}</h2>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Showing {sortedData.length} records {isDirty && '• (Unsaved Changes)'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search dataset..."
              className="input-field"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Action Buttons */}
          {!readOnly && (
            <>
              {importCsvUrl && (
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }} title="Import CSV File">
                  <Upload size={16} /> Import
                  <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              )}
              <button onClick={handleAddRow} className="btn btn-secondary" title="Add Row">
                <Plus size={16} /> Add
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
              <Download size={16} /> CSV
            </a>
          )}
          {exportExcelUrl && (
            <a href={exportExcelUrl} className="btn btn-secondary" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }} title="Export Excel" download>
              <FileSpreadsheet size={16} /> Excel
            </a>
          )}
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
          <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {successMsg}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Table Grid */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.label}
                    {sortCol === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
              ))}
              {!readOnly && <th style={{ width: '60px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map(col => (
                  <td key={col.key}>
                    {!readOnly ? (
                      <input
                        type={col.type || 'text'}
                        className="input-field"
                        value={row[col.key] ?? ''}
                        placeholder={col.placeholder || ''}
                        onChange={e => handleCellChange(rowIdx, col.key, e.target.value)}
                        style={{
                          background: 'transparent',
                          border: '1px solid transparent',
                          padding: '4px 8px',
                          height: 'auto'
                        }}
                        onFocus={e => (e.target.style.border = '1px solid #3b82f6')}
                        onBlur={e => (e.target.style.border = '1px solid transparent')}
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
                      style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                      title="Delete Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length + (readOnly ? 0 : 1)} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
