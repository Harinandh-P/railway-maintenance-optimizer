import React, { useState, useEffect } from 'react';
import { Plus, Upload, CheckCircle, AlertCircle, TrainTrack, Calendar, Clock, Users, Wrench } from 'lucide-react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const MaintenanceRequests = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const initialFormState = {
    request_id: `REQ${Math.floor(100 + Math.random() * 900)}`,
    request_datetime: new Date().toISOString().slice(0, 16).replace('T', ' '),
    department: 'Engineering',
    asset_id: 'TRK003',
    asset_type: 'Track',
    location: 'KM 128/2',
    point_a: 'Station B',
    point_b: 'Station C',
    corridor_id: 'COR001',
    maintenance_type: 'Corrective',
    defect_type: 'Rail Joint Defect',
    defect_reason: 'Thermal Stress',
    defect_severity: 'High',
    safety_risk: 'High',
    required_duration_hours: 2.0,
    required_workers: 6,
    required_equipment: 'Track Machine',
    required_materials: 'Fasteners;Rail Joiners',
    due_date: '2026-08-30'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/maintenance-requests');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/maintenance-requests', updatedData);
    setData(updatedData);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/data/maintenance-requests/create', formData);
      setSuccessMsg(`Maintenance Request ${formData.request_id} created successfully!`);
      setShowForm(false);
      fetchData();
      setFormData({
        ...initialFormState,
        request_id: `REQ${Math.floor(100 + Math.random() * 900)}`
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      await api.post('/data/maintenance-requests/import/csv', uploadData);
      setSuccessMsg('CSV records imported successfully!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'CSV Import failed');
    }
  };

  const columns = [
    { key: 'request_id', label: 'Request ID', placeholder: 'Example: M037' },
    { key: 'request_datetime', label: 'Request Date/Time', placeholder: 'Format: YYYY-MM-DD HH:MM' },
    { key: 'department', label: 'Department', placeholder: 'Example: Track Maintenance' },
    { key: 'asset_id', label: 'Asset ID', placeholder: 'Example: AST-C1-015' },
    { key: 'asset_type', label: 'Asset Type', placeholder: 'Example: Track' },
    { key: 'location', label: 'Location', placeholder: 'Example: Salem Junction' },
    { key: 'point_a', label: 'Point A', placeholder: 'Example: Station A' },
    { key: 'point_b', label: 'Point B', placeholder: 'Example: Station B' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'Example: C1' },
    { key: 'maintenance_type', label: 'Type', placeholder: 'Example: Track Inspection' },
    { key: 'defect_type', label: 'Defect Type', placeholder: 'Example: Rail Crack' },
    { key: 'defect_reason', label: 'Defect Reason', placeholder: 'Example: Thermal Stress' },
    { key: 'defect_severity', label: 'Severity', placeholder: 'Example: High' },
    { key: 'safety_risk', label: 'Safety Risk', placeholder: 'Example: High' },
    { key: 'required_duration_hours', label: 'Duration (hrs)', type: 'number', placeholder: 'Example: 2.5' },
    { key: 'required_workers', label: 'Workers', type: 'number', placeholder: 'Example: 4' },
    { key: 'required_equipment', label: 'Equipment', placeholder: 'Example: Track Machine' },
    { key: 'due_date', label: 'Due Date', placeholder: 'Example: 2026-09-15' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Maintenance Requests...</div>;

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Maintenance Requests</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
            Submit new maintenance block requests or manage canonical dataset
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> Import CSV
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
            <Plus size={18} /> {showForm ? 'Hide Form' : 'New Request Form'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* New Request Interactive Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '20px' }}>
            Submit Railway Maintenance Block Request (Phase 1 Source Data)
          </h3>

          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Request ID</label>
                <input type="text" className="input-field" value={formData.request_id} onChange={e => setFormData({ ...formData, request_id: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Department</label>
                <select className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                  <option value="Engineering">Engineering (Track)</option>
                  <option value="S&T">S&T (Signal & Telecom)</option>
                  <option value="Traction">Traction (OHE / Electrical)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Asset ID</label>
                <input type="text" className="input-field" value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Asset Type</label>
                <select className="input-field" value={formData.asset_type} onChange={e => setFormData({ ...formData, asset_type: e.target.value })}>
                  <option value="Track">Track</option>
                  <option value="Signal">Signal</option>
                  <option value="OHE">OHE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Location (KM)</label>
                <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Corridor ID</label>
                <select className="input-field" value={formData.corridor_id} onChange={e => setFormData({ ...formData, corridor_id: e.target.value })}>
                  <option value="COR001">COR001 (C1 - Salem - Chennai)</option>
                  <option value="COR002">COR002 (C2 - Bangalore - Chennai)</option>
                  <option value="COR003">COR003 (C3 - Trichy - Madurai)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Defect Type</label>
                <input type="text" className="input-field" value={formData.defect_type} onChange={e => setFormData({ ...formData, defect_type: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Defect Severity</label>
                <select className="input-field" value={formData.defect_severity} onChange={e => setFormData({ ...formData, defect_severity: e.target.value })}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Safety Risk</label>
                <select className="input-field" value={formData.safety_risk} onChange={e => setFormData({ ...formData, safety_risk: e.target.value })}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Duration (Hours)</label>
                <input type="number" step="0.5" className="input-field" value={formData.required_duration_hours} onChange={e => setFormData({ ...formData, required_duration_hours: parseFloat(e.target.value) })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Workers Required</label>
                <input type="number" className="input-field" value={formData.required_workers} onChange={e => setFormData({ ...formData, required_workers: parseInt(e.target.value) })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Equipment Required</label>
                <input type="text" className="input-field" value={formData.required_equipment} onChange={e => setFormData({ ...formData, required_equipment: e.target.value })} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Due Date</label>
                <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} required />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-emerald">
                {submitting ? 'Submitting...' : 'Save & Append to Maintenance Requests'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dataset Grid */}
      <DataGrid
        title="Maintenance Requests Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/maintenance-requests/export/csv"
        exportExcelUrl="/api/data/maintenance-requests/export/excel"
      />
    </div>
  );
};
