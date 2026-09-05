import React, { useState, useEffect } from 'react';
import { Plus, Upload, CheckCircle, AlertCircle, TrainTrack, Calendar, Clock, Users, Wrench } from 'lucide-react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';
import { EquipmentSelect } from '../components/EquipmentSelect';

export const MaintenanceRequests = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const initialFormState = {
    request_id: '',
    request_datetime: new Date().toISOString().slice(0, 16).replace('T', ' '),
    department: 'Engineering',
    asset_id: '',
    asset_type: 'Track',
    location: '',
    point_a: '',
    point_b: '',
    corridor_id: 'COR001',
    maintenance_type: 'Corrective',
    defect_type: '',
    defect_reason: '',
    defect_severity: 'High',
    safety_risk: 'High',
    required_duration_hours: '',
    required_workers: '',
    required_equipment: '',
    required_materials: '',
    due_date: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/maintenance-requests');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      setData(list);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/maintenance-requests', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.request_id) {
      await api.delete(`/data/maintenance-requests/${row.request_id}`);
    }
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
      await fetchData();
      setFormData(initialFormState);
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
    { key: 'request_id', label: 'Request ID', placeholder: 'eg: REQ037' },
    { key: 'request_datetime', label: 'Request Date/Time', placeholder: 'eg: 2026-08-28 10:00' },
    { key: 'department', label: 'Department', placeholder: 'eg: Engineering (Track Maintenance)' },
    { key: 'asset_id', label: 'Asset ID', placeholder: 'eg: AST012 - Track Joint' },
    { key: 'asset_type', label: 'Asset Type', placeholder: 'eg: Track' },
    { key: 'location', label: 'Location', placeholder: 'eg: C1-KM155.5 (Salem - Erode)' },
    { key: 'point_a', label: 'Point A', placeholder: 'eg: Station A - Salem Junction' },
    { key: 'point_b', label: 'Point B', placeholder: 'eg: Station B - Erode Junction' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'eg: C1 - Salem to Chennai Line' },
    { key: 'maintenance_type', label: 'Type', placeholder: 'eg: Corrective Maintenance' },
    { key: 'defect_type', label: 'Defect Type', placeholder: 'eg: Heavy Rail Joint Fracture & Thermal Stress' },
    { key: 'defect_reason', label: 'Defect Reason', placeholder: 'eg: Thermal Expansion & Heavy Axle Load' },
    { key: 'defect_severity', label: 'Severity', placeholder: 'eg: Critical' },
    { key: 'safety_risk', label: 'Safety Risk', placeholder: 'eg: High' },
    { key: 'required_duration_hours', label: 'Duration (hrs)', type: 'number', placeholder: 'eg: 2.5' },
    { key: 'required_workers', label: 'Workers', type: 'number', placeholder: 'eg: 4' },
    { key: 'required_equipment', label: 'Equipment', placeholder: 'eg: Hydraulic Track Tamping Machine' },
    { key: 'due_date', label: 'Due Date', placeholder: 'eg: 2026-09-15' }
  ];

  if (loading) return <div style={{ color: '#71829d', padding: '40px' }}>Loading Maintenance Requests...</div>;

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a2638' }}>Maintenance Requests</h1>
          <p style={{ fontSize: '0.9rem', color: '#71829d', marginTop: '4px' }}>
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
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#EF4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
          <AlertCircle size={16} style={{ display: 'inline', marginRight: '8px' }} />
          {error}
        </div>
      )}

      {/* New Request Interactive Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1a2638', marginBottom: '20px' }}>
            Submit Railway Maintenance Block Request (Phase 1 Source Data)
          </h3>

          <form onSubmit={handleFormSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Request ID</label>
                <input type="text" className="input-field" value={formData.request_id} onChange={e => setFormData({ ...formData, request_id: e.target.value })} placeholder="e.g., M037" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Department</label>
                <select className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                  <option value="Engineering">Engineering (Track)</option>
                  <option value="S&T">S&T (Signal & Telecom)</option>
                  <option value="Traction">Traction (OHE / Electrical)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Asset ID</label>
                <input type="text" className="input-field" value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })} placeholder="e.g., AST012" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Asset Type</label>
                <select className="input-field" value={formData.asset_type} onChange={e => setFormData({ ...formData, asset_type: e.target.value })}>
                  <option value="Track">Track</option>
                  <option value="Signal">Signal</option>
                  <option value="OHE">OHE</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Location (KM)</label>
                <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., C1-KM155" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Corridor ID</label>
                <select className="input-field" value={formData.corridor_id} onChange={e => setFormData({ ...formData, corridor_id: e.target.value })}>
                  <option value="COR001">COR001 (C1 - Salem - Chennai)</option>
                  <option value="COR002">COR002 (C2 - Bangalore - Chennai)</option>
                  <option value="COR003">COR003 (C3 - Trichy - Madurai)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Defect Type</label>
                <input type="text" className="input-field" value={formData.defect_type} onChange={e => setFormData({ ...formData, defect_type: e.target.value })} placeholder="e.g., Rail Crack" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Defect Severity</label>
                <select className="input-field" value={formData.defect_severity} onChange={e => setFormData({ ...formData, defect_severity: e.target.value })}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Safety Risk</label>
                <select className="input-field" value={formData.safety_risk} onChange={e => setFormData({ ...formData, safety_risk: e.target.value })}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Duration (Hours)</label>
                <input type="number" step="0.5" className="input-field" value={formData.required_duration_hours} onChange={e => setFormData({ ...formData, required_duration_hours: e.target.value ? parseFloat(e.target.value) : '' })} placeholder="e.g., 2.5" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Workers Required</label>
                <input type="number" className="input-field" value={formData.required_workers} onChange={e => setFormData({ ...formData, required_workers: e.target.value ? parseInt(e.target.value) : '' })} placeholder="e.g., 4" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Equipment Required (Search Database)</label>
                <EquipmentSelect value={formData.required_equipment} onChange={val => setFormData({ ...formData, required_equipment: val })} required placeholder="eg: EQ211 - Hydraulic Track Tamping Machine" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#71829d', marginBottom: '6px' }}>Due Date</label>
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
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/maintenance-requests/export/csv"
        exportExcelUrl="/api/data/maintenance-requests/export/excel"
      />
    </div>
  );
};
