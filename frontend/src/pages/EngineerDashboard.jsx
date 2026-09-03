import React, { useState, useEffect } from 'react';
import { Plus, TrainTrack, Clock, Users, Wrench, ShieldAlert, CheckCircle, AlertTriangle, FileText, Layers, CalendarCheck, Eye } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GroupDetailModal } from '../components/GroupDetailModal';

export const EngineerDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formStep, setFormStep] = useState(1); // 1: Form, 2: Review Preview
  const [selectedReqDetail, setSelectedReqDetail] = useState(null);
  const [selectedGroupModal, setSelectedGroupModal] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const dept = user?.department || 'TRACK';

  const initialFormState = {
    request_id: `REQ${Math.floor(100 + Math.random() * 900)}`,
    request_datetime: new Date().toISOString().slice(0, 16).replace('T', ' '),
    department: dept === 'ALL' ? 'Engineering' : (dept === 'SIGNAL' ? 'S&T' : (dept === 'ELECTRICAL' ? 'Traction' : 'Engineering')),
    asset_id: dept === 'SIGNAL' ? 'SIG003' : (dept === 'ELECTRICAL' ? 'OHE003' : 'TRK003'),
    asset_type: dept === 'SIGNAL' ? 'Signal' : (dept === 'ELECTRICAL' ? 'OHE' : 'Track'),
    location: 'KM 128/2',
    point_a: 'Station A',
    point_b: 'Station B',
    corridor_id: 'C1',
    section_id: 'C1-S1',
    maintenance_type: 'Corrective',
    defect_type: dept === 'SIGNAL' ? 'Signal Relay Failure' : (dept === 'ELECTRICAL' ? 'Insulator Flashover' : 'Rail Crack'),
    defect_reason: 'Thermal Stress & Aging',
    defect_severity: 'High',
    safety_risk: 'High',
    safety_risk_description: 'Risk of signal misdirection or track derailing if unattended.',
    fault_description: 'Observed intermittent defect during routine inspection. Requires immediate maintenance block.',
    required_duration_hours: 2.0,
    required_workers: 6,
    required_equipment: dept === 'SIGNAL' ? 'Signal Testing Kit' : (dept === 'ELECTRICAL' ? 'Tower Wagon' : 'Track Machine'),
    required_materials: 'Fasteners; Connectors; Spares',
    due_date: '2026-08-30'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/maintenance-requests');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      setRequests(list);

      try {
        const planRes = await api.get('/results/final-plan');
        setPlanData(planRes.data);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load engineer dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...formData,
        required_duration_hours: parseFloat(formData.required_duration_hours),
        required_workers: parseInt(formData.required_workers)
      };

      await api.post('/data/maintenance-requests/create', payload);
      setSuccessMsg(`Maintenance Request ${formData.request_id} created & persisted to database successfully!`);
      setShowFormModal(false);
      setFormStep(1);
      await fetchData();
      setFormData({
        ...initialFormState,
        request_id: `REQ${Math.floor(100 + Math.random() * 900)}`
      });
    } catch (err) {
      setErrorMsg(err.response?.data?.detail?.message || err.response?.data?.detail || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#94A3B8', padding: '40px' }}>Loading Engineer Dashboard...</div>;
  }

  // Filter requests for engineer department safely
  const filteredRequests = (Array.isArray(requests) ? requests : []).filter(r => {
    if (!r || typeof r !== 'object') return false;
    if (user?.role === 'ADMIN' || dept === 'ALL') return true;
    if (r.created_by && user?.username && r.created_by === user.username) return true;
    const d = (r.department || '').toUpperCase();
    if (dept === 'SIGNAL' && (d.includes('SIGNAL') || d.includes('S&T'))) return true;
    if (dept === 'ELECTRICAL' && (d.includes('ELECTRICAL') || d.includes('TRACTION') || d.includes('ELEC'))) return true;
    if (dept === 'TRACK' && (d.includes('TRACK') || d.includes('ENGINEERING') || d.includes('ENG'))) return true;
    return false;
  });

  const allocatedBlocks = planData?.final_block_plan || [];

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DFE2EE' }}>Engineer Maintenance Operations</h1>
            <span className="badge badge-candidate" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
              DEPARTMENT: {dept}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '4px' }}>
            Logged in as: <strong>{user?.fullName || user?.username}</strong> ({user?.role})
          </p>
        </div>

        <button onClick={() => { setShowFormModal(true); setFormStep(1); }} className="btn btn-emerald" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
          <Plus size={20} /> + Create Maintenance Request
        </button>
      </div>

      {successMsg && (
        <div style={{ padding: '14px 18px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', borderRadius: '10px', marginBottom: '24px', fontSize: '0.9rem' }}>
          <CheckCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
          {successMsg}
        </div>
      )}

      {/* Engineer Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '32px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>MY DEPARTMENT REQUESTS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DFE2EE', marginTop: '4px' }}>{filteredRequests.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>PENDING OPTIMIZATION</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>{filteredRequests.length}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>ALLOCATED BLOCKS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{allocatedBlocks.length}</div>
        </div>
      </div>

      {/* Requests List */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DFE2EE', marginBottom: '18px' }}>
          {dept} Department Maintenance Requests ({filteredRequests.length})
        </h3>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Asset ID</th>
                <th>Asset Type</th>
                <th>Corridor / Location</th>
                <th>Defect Type</th>
                <th>Severity</th>
                <th>Safety Risk</th>
                <th>Duration (hrs)</th>
                <th>Workers</th>
                <th>Equipment</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r, idx) => (
                <tr key={idx}>
                  <td><strong>{r.request_id}</strong></td>
                  <td>{r.asset_id}</td>
                  <td>{r.asset_type}</td>
                  <td>{r.corridor_id} ({r.location})</td>
                  <td><span style={{ color: '#DFE2EE', fontWeight: 600 }}>{r.defect_type}</span></td>
                  <td>
                    <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {r.defect_severity}
                    </span>
                  </td>
                  <td>{r.safety_risk}</td>
                  <td>{r.required_duration_hours} h</td>
                  <td>{r.required_workers}</td>
                  <td>{r.required_equipment}</td>
                  <td>{r.due_date}</td>
                  <td>
                    <button onClick={() => setSelectedReqDetail(r)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      <Eye size={14} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE REQUEST MULTI-STEP MODAL */}
      {showFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto', padding: '32px',
            border: '1px solid #24334D'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DFE2EE', marginBottom: '8px' }}>
              {formStep === 1 ? 'New Maintenance Request Entry Form' : 'Review & Confirm Request Submission'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '24px' }}>
              Phase 1 Raw Input Collection • Logged in Engineer: <strong>{user?.fullName}</strong> ({dept})
            </p>

            {errorMsg && (
              <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#EF4444', borderRadius: '8px', marginBottom: '20px', fontSize: '0.88rem' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {errorMsg}
              </div>
            )}

            {formStep === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); setFormStep(2); }}>
                {/* SECTION 1: REQUEST & LOCATION */}
                <div style={{ background: '#151E2E', padding: '18px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#3B82F6', fontWeight: 700, marginBottom: '14px' }}>[1] REQUEST & LOCATION INFORMATION</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label className="label-text">Request ID</label>
                      <input type="text" className="input-field" value={formData.request_id} onChange={e => setFormData({ ...formData, request_id: e.target.value })} placeholder="Example: REQ037" required />
                    </div>
                    <div>
                      <label className="label-text">Department Context</label>
                      <input type="text" className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="Example: Engineering" required />
                    </div>
                    <div>
                      <label className="label-text">Corridor ID</label>
                      <select className="input-field" value={formData.corridor_id} onChange={e => setFormData({ ...formData, corridor_id: e.target.value })}>
                        <option value="C1">C1 (Salem - Chennai)</option>
                        <option value="C2">C2 (Bangalore - Chennai)</option>
                        <option value="C3">C3 (Trichy - Madurai)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Location (KM)</label>
                      <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Example: KM 128/2" required />
                    </div>
                    <div>
                      <label className="label-text">Point A</label>
                      <input type="text" className="input-field" value={formData.point_a} onChange={e => setFormData({ ...formData, point_a: e.target.value })} placeholder="Example: Salem Junction" required />
                    </div>
                    <div>
                      <label className="label-text">Point B</label>
                      <input type="text" className="input-field" value={formData.point_b} onChange={e => setFormData({ ...formData, point_b: e.target.value })} placeholder="Example: Erode Junction" required />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: ASSET & FAULT DETAILS */}
                <div style={{ background: '#151E2E', padding: '18px', borderRadius: '10px', marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#8B5CF6', fontWeight: 700, marginBottom: '14px' }}>[2] ASSET & FAULT / DEFECT DETAILS</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                    <div>
                      <label className="label-text">Asset ID</label>
                      <input type="text" className="input-field" value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })} placeholder="Example: AST-C1-015" required />
                    </div>
                    <div>
                      <label className="label-text">Asset Type</label>
                      <select className="input-field" value={formData.asset_type} onChange={e => setFormData({ ...formData, asset_type: e.target.value })}>
                        <option value="Signal">Signal</option>
                        <option value="Track">Track</option>
                        <option value="OHE">OHE</option>
                        <option value="Point Machine">Point Machine</option>
                        <option value="Transformer">Transformer</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Maintenance Type</label>
                      <select className="input-field" value={formData.maintenance_type} onChange={e => setFormData({ ...formData, maintenance_type: e.target.value })}>
                        <option value="Corrective">Corrective Maintenance</option>
                        <option value="Preventive">Preventive Maintenance</option>
                        <option value="Emergency">Emergency Maintenance</option>
                        <option value="Inspection">Inspection & Testing</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Defect / Fault Type</label>
                      <input type="text" className="input-field" value={formData.defect_type} onChange={e => setFormData({ ...formData, defect_type: e.target.value })} placeholder="Example: Rail Crack" required />
                    </div>
                    <div>
                      <label className="label-text">Defect Severity</label>
                      <select className="input-field" value={formData.defect_severity} onChange={e => setFormData({ ...formData, defect_severity: e.target.value })}>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-text">Safety Risk Level</label>
                      <select className="input-field" value={formData.safety_risk} onChange={e => setFormData({ ...formData, safety_risk: e.target.value })}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label className="label-text">Fault Description (Engineer Notes)</label>
                    <textarea className="input-field" rows={2} value={formData.fault_description} onChange={e => setFormData({ ...formData, fault_description: e.target.value })} placeholder="Example: Observed defect during routine inspection. Requires maintenance block." required />
                  </div>
                </div>

                {/* SECTION 3: RESOURCES & DUE DATE */}
                <div style={{ background: '#151E2E', padding: '18px', borderRadius: '10px', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#F59E0B', fontWeight: 700, marginBottom: '14px' }}>[3] RESOURCE REQUIREMENTS & DEADLINE</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <div>
                      <label className="label-text">Required Duration (Hours)</label>
                      <input type="number" step="0.5" className="input-field" value={formData.required_duration_hours} onChange={e => setFormData({ ...formData, required_duration_hours: e.target.value })} placeholder="Example: 2.5" required />
                    </div>
                    <div>
                      <label className="label-text">Required Workers (Crew)</label>
                      <input type="number" className="input-field" value={formData.required_workers} onChange={e => setFormData({ ...formData, required_workers: e.target.value })} placeholder="Example: 4" required />
                    </div>
                    <div>
                      <label className="label-text">Required Equipment</label>
                      <input type="text" className="input-field" value={formData.required_equipment} onChange={e => setFormData({ ...formData, required_equipment: e.target.value })} placeholder="Example: Track Machine" required />
                    </div>
                    <div>
                      <label className="label-text">Due Date</label>
                      <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} placeholder="Format: YYYY-MM-DD" required />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setShowFormModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-emerald">Proceed to Review Preview →</button>
                </div>
              </form>
            ) : (
              <div>
                {/* PREVIEW CONFIRMATION SCREEN */}
                <div style={{ background: '#151E2E', padding: '20px', borderRadius: '10px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3B82F6', marginBottom: '14px' }}>Review Maintenance Request Summary</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.88rem', color: '#C2C6D6' }}>
                    <div>Request ID: <strong style={{ color: '#DFE2EE' }}>{formData.request_id}</strong></div>
                    <div>Engineer: <strong style={{ color: '#DFE2EE' }}>{user?.fullName}</strong></div>
                    <div>Department: <strong style={{ color: '#DFE2EE' }}>{formData.department}</strong></div>
                    <div>Asset ID: <strong style={{ color: '#DFE2EE' }}>{formData.asset_id} ({formData.asset_type})</strong></div>
                    <div>Location: <strong style={{ color: '#DFE2EE' }}>Corridor {formData.corridor_id} ({formData.location})</strong></div>
                    <div>Defect Type: <strong style={{ color: '#DFE2EE' }}>{formData.defect_type}</strong></div>
                    <div>Severity: <strong style={{ color: '#EF4444' }}>{formData.defect_severity}</strong></div>
                    <div>Duration: <strong style={{ color: '#F59E0B' }}>{formData.required_duration_hours} hours</strong></div>
                    <div>Workers Required: <strong style={{ color: '#10B981' }}>{formData.required_workers} crew</strong></div>
                    <div>Equipment Required: <strong style={{ color: '#8B5CF6' }}>{formData.required_equipment}</strong></div>
                    <div>Due Date: <strong style={{ color: '#DFE2EE' }}>{formData.due_date}</strong></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <button type="button" onClick={() => setFormStep(1)} className="btn btn-secondary">← Back & Edit Form</button>
                  <button type="button" onClick={handleCreateSubmit} disabled={submitting} className="btn btn-emerald">
                    {submitting ? 'Submitting...' : 'Confirm & Persist to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUEST DETAIL MODAL */}
      {selectedReqDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DFE2EE' }}>Request Details — {selectedReqDetail.request_id}</h3>
              <button onClick={() => setSelectedReqDetail(null)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.88rem', color: '#C2C6D6' }}>
              <div>Department: <strong style={{ color: '#DFE2EE' }}>{selectedReqDetail.department}</strong></div>
              <div>Asset ID: <strong style={{ color: '#DFE2EE' }}>{selectedReqDetail.asset_id}</strong></div>
              <div>Defect Type: <strong style={{ color: '#3B82F6' }}>{selectedReqDetail.defect_type}</strong></div>
              <div>Defect Reason: <strong>{selectedReqDetail.defect_reason}</strong></div>
              <div>Severity: <strong style={{ color: '#EF4444' }}>{selectedReqDetail.defect_severity}</strong></div>
              <div>Safety Risk: <strong>{selectedReqDetail.safety_risk}</strong></div>
              <div>Duration: <strong>{selectedReqDetail.required_duration_hours} hours</strong></div>
              <div>Workers Required: <strong>{selectedReqDetail.required_workers}</strong></div>
              <div>Equipment Required: <strong>{selectedReqDetail.required_equipment}</strong></div>
              <div>Due Date: <strong>{selectedReqDetail.due_date}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
