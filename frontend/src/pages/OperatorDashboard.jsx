import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, TrainTrack, Clock, Users, Wrench, ShieldAlert, CheckCircle, AlertTriangle, FileText, Layers, CalendarCheck, Eye, Activity, Radio, Search, Filter, Upload, Download, ShieldCheck, Database, Cpu, ChevronRight, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GroupDetailModal } from '../components/GroupDetailModal';
import { WorkerModal } from '../components/WorkerModal';
import { EquipmentModal } from '../components/EquipmentModal';
import { EquipmentSelect } from '../components/EquipmentSelect';
import { TiltCard } from '../components/TiltCard';

export const OperatorDashboard = ({ activeTab = 'overview' }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [selectedReqDetail, setSelectedReqDetail] = useState(null);
  const [selectedGroupModal, setSelectedGroupModal] = useState(null);
  const [selectedWorkerBlock, setSelectedWorkerBlock] = useState(null);
  const [selectedEquipBlock, setSelectedEquipBlock] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [formErrors, setFormErrors] = useState({});

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
    fault_description: 'Observed defect during inspection. Requires immediate maintenance block.',
    required_duration_hours: 2.0,
    required_workers: 6,
    required_equipment: dept === 'SIGNAL' ? 'Signal Testing Kit' : (dept === 'ELECTRICAL' ? 'Tower Wagon' : 'Track Machine'),
    required_materials: 'Fasteners; Connectors; Spares',
    due_date: '2026-08-30'
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleFieldChange = (field, value, isCodeField = false) => {
    const val = isCodeField && typeof value === 'string' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [field]: val }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (data) => {
    const errors = {};
    if (!data.department || !data.department.toString().trim()) {
      errors.department = 'Department is required';
    }
    if (!data.corridor_id || !data.corridor_id.toString().trim()) {
      errors.corridor_id = 'Corridor ID is required';
    }
    if (!data.location || !data.location.toString().trim()) {
      errors.location = 'Location (KM) is required';
    }
    if (!data.asset_id || !data.asset_id.toString().trim()) {
      errors.asset_id = 'Asset ID is required';
    }
    if (!data.asset_type || !data.asset_type.toString().trim()) {
      errors.asset_type = 'Asset Type is required';
    }
    if (!data.defect_type || !data.defect_type.toString().trim()) {
      errors.defect_type = 'Defect Type is required';
    }
    if (!data.defect_severity || !['Critical', 'High', 'Medium', 'Low'].includes(data.defect_severity)) {
      errors.defect_severity = 'Valid Defect Severity is required';
    }
    const duration = parseFloat(data.required_duration_hours);
    if (isNaN(duration) || duration <= 0) {
      errors.required_duration_hours = 'Duration must be > 0 hours';
    }
    const workers = parseInt(data.required_workers, 10);
    if (isNaN(workers) || workers < 1) {
      errors.required_workers = 'Workers count must be at least 1';
    }
    if (!data.required_equipment || !data.required_equipment.toString().trim()) {
      errors.required_equipment = 'Required Equipment must be selected';
    }
    if (!data.due_date || !data.due_date.toString().trim()) {
      errors.due_date = 'Due Date is required';
    }
    return errors;
  };

  // Determine view mode based on props & URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const isCreateAction = searchParams.get('action') === 'create' || activeTab === 'create';
  const currentView = isCreateAction ? 'create' : activeTab;

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
      console.error('Failed to load operator portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setErrorMsg('Please correct the highlighted errors before submitting the request.');
      return;
    }

    setFormErrors({});
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        required_duration_hours: parseFloat(formData.required_duration_hours),
        required_workers: parseInt(formData.required_workers)
      };

      await api.post('/data/maintenance-requests/create', payload);
      setSuccessMsg(`Maintenance Request ${formData.request_id} submitted & saved to database successfully!`);
      setShowFormModal(false);
      setFormStep(1);
      await fetchData();
      setFormData({
        ...initialFormState,
        request_id: `REQ${Math.floor(100 + Math.random() * 900)}`
      });
    } catch (err) {
      console.error('Create maintenance request failed:', err);
      const status = err.response?.status;
      const detailMsg = err.response?.data?.detail;
      const isAuthErr = status === 401 || status === 403 || detailMsg === 'Invalid credentials' || (typeof err.message === 'string' && err.message.includes('401'));
      if (isAuthErr) {
        setErrorMsg('Session expired. Please log in again.');
      } else {
        setErrorMsg(err.response?.data?.detail?.message || err.response?.data?.detail || err.message || 'Failed to submit maintenance request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING ENGINEER OPERATIONS CONSOLE...</div>
      </div>
    );
  }

  // Filter requests for operator department / user safely
  const filteredRequests = (Array.isArray(requests) ? requests : []).filter(r => {
    if (!r || typeof r !== 'object') return false;
    if (user?.role === 'ADMIN' || dept === 'ALL') return true;
    if (r.created_by && user?.username && r.created_by.toString().toLowerCase().trim() === user.username.toString().toLowerCase().trim()) return true;
    const d = (r.department || '').toUpperCase();
    if (dept === 'SIGNAL' && (d.includes('SIGNAL') || d.includes('S&T'))) return true;
    if (dept === 'ELECTRICAL' && (d.includes('ELECTRICAL') || d.includes('TRACTION') || d.includes('ELEC'))) return true;
    if (dept === 'TRACK' && (d.includes('TRACK') || d.includes('ENGINEERING') || d.includes('ENG'))) return true;
    return false;
  });

  const allocatedBlocks = planData?.final_block_plan || [];

  // Filter allocated blocks for operator department requests safely
  const filteredAllocatedBlocks = (Array.isArray(allocatedBlocks) ? allocatedBlocks : []).filter(b => {
    if (!b || typeof b !== 'object') return false;
    if (dept === 'ALL') return true;
    const reqDetails = b.request_details_in_group || [];
    return reqDetails.some(r => {
      if (!r || typeof r !== 'object') return false;
      const d = (r.department || '').toUpperCase();
      if (dept === 'SIGNAL' && (d.includes('SIGNAL') || d.includes('S&T'))) return true;
      if (dept === 'ELECTRICAL' && (d.includes('ELECTRICAL') || d.includes('TRACTION') || d.includes('ELEC'))) return true;
      if (dept === 'TRACK' && (d.includes('TRACK') || d.includes('ENGINEERING') || d.includes('ENG'))) return true;
      return false;
    });
  });

  return (
    <div className="space-y-6 select-none">
      {/* Shared Modals */}
      <GroupDetailModal
        isOpen={!!selectedGroupModal}
        onClose={() => setSelectedGroupModal(null)}
        group={selectedGroupModal}
      />

      <WorkerModal
        isOpen={!!selectedWorkerBlock}
        onClose={() => setSelectedWorkerBlock(null)}
        blockId={selectedWorkerBlock?.block_id}
        workersRequired={selectedWorkerBlock?.workers_required || 4}
        workersAvailable={selectedWorkerBlock?.workers_available || 17}
        assignedWorkers={selectedWorkerBlock?.assigned_worker_details || []}
      />

      <EquipmentModal
        isOpen={!!selectedEquipBlock}
        onClose={() => setSelectedEquipBlock(null)}
        blockId={selectedEquipBlock?.block_id}
        assignedEquipment={selectedEquipBlock?.assigned_equipment_details || []}
      />

      {/* Hero Dataset Banner */}
      <section className="tactile-card rounded-2xl p-7 mb-6 grid grid-cols-1 xl:grid-cols-3 gap-6 items-center shadow-neu-flat" data-purpose="dataset-header">
        <div className="xl:col-span-2 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">Topology Engine // Sector NR-HQ</span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              DEPARTMENT: {dept} ({user?.fullName})
            </span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display uppercase">
            {currentView === 'create' && 'CREATE MAINTENANCE REQUEST'}
            {currentView === 'requests' && 'MY MAINTENANCE REQUESTS'}
            {currentView === 'slots' && 'MY ALLOCATED SLOTS'}
            {currentView === 'overview' && 'ENGINEER OPERATIONS PORTAL'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Station-by-Station Movement & Maintenance Coordination Model</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-400">Phase-1 Conflict Calibration Grid</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="tactile-pill rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100/70 text-blue-600 flex items-center justify-center tactile-inset">
                <TrainTrack size={18} />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">Partition Sector</div>
                <div className="text-xs font-bold text-slate-800">IR Sector 4B (Northern Grid)</div>
              </div>
            </div>
          </div>

          <div className="tactile-pill rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center tactile-inset">
                <Clock size={18} />
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold">Sync State</div>
                <div className="text-xs font-bold text-slate-800">
                  Just now <span className="text-slate-400 font-mono font-normal">//</span> <span className="text-blue-600 font-semibold">Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {successMsg && (
        <div className="tactile-pill border-l-4 border-emerald-500 p-4 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* VIEW 1: DASHBOARD OVERVIEW (/operator) */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* KPI 3D Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <TiltCard className="tactile-card p-5 rounded-2xl shadow-neu-flat">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">DEPARTMENT REQUESTS</div>
                  <div className="text-3xl font-extrabold text-slate-900 font-display mt-1">{filteredRequests.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Logged Items</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center tactile-inset">
                  <TrainTrack size={22} />
                </div>
              </div>
            </TiltCard>

            <TiltCard className="tactile-card p-5 rounded-2xl shadow-neu-flat">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">PENDING OPTIMIZATION</div>
                  <div className="text-3xl font-extrabold text-blue-600 font-display mt-1">{filteredRequests.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Awaiting Solver Run</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-cyan-100/70 text-cyan-600 flex items-center justify-center tactile-inset">
                  <Clock size={22} />
                </div>
              </div>
            </TiltCard>

            <TiltCard className="tactile-card p-5 rounded-2xl shadow-neu-flat">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">MY ALLOCATED SLOTS</div>
                  <div className="text-3xl font-extrabold text-emerald-600 font-display mt-1">{filteredAllocatedBlocks.length}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Phase 3 Verified</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center tactile-inset">
                  <CalendarCheck size={22} />
                </div>
              </div>
            </TiltCard>

            <TiltCard className="tactile-card p-5 rounded-2xl shadow-neu-flat">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">SYSTEM TELEMETRY</div>
                  <div className="text-base font-bold text-emerald-600 font-mono mt-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    SYSTEM ONLINE
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Database Synced</div>
                </div>
                <div className="w-11 h-11 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center tactile-inset">
                  <Radio size={22} />
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Quick Summary Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Requests Card */}
            <div className="tactile-card rounded-2xl p-6 shadow-neu-flat space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench size={18} className="text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Recent Requests Summary</h3>
                </div>
                <NavLink to="/operator/requests" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <span>View All ({filteredRequests.length})</span>
                  <ArrowRight size={14} />
                </NavLink>
              </div>

              <div className="space-y-3">
                {filteredRequests.slice(0, 3).map((r, idx) => (
                  <div key={idx} className="tactile-pill p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-bold text-slate-900">{r.request_id} — <span className="text-blue-600">{r.defect_type}</span></div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{r.corridor_id} ({r.location}) • {r.required_duration_hours}h duration</div>
                    </div>
                    <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {r.defect_severity}
                    </span>
                  </div>
                ))}

                {filteredRequests.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 font-mono">NO SUBMITTED REQUESTS YET.</div>
                )}
              </div>
            </div>

            {/* Allocated Slots Card */}
            <div className="tactile-card rounded-2xl p-6 shadow-neu-flat space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={18} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">My Allocated Slots Summary</h3>
                </div>
                <NavLink to="/operator/slots" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                  <span>View All ({filteredAllocatedBlocks.length})</span>
                  <ArrowRight size={14} />
                </NavLink>
              </div>

              <div className="space-y-3">
                {filteredAllocatedBlocks.slice(0, 2).map((block, idx) => (
                  <div key={idx} className="tactile-pill p-3 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center font-bold text-slate-900 font-display">
                      <span>{block.block_id} — Corridor {block.corridor}</span>
                      <span className="badge badge-final">ALLOCATED</span>
                    </div>
                    <div className="font-mono text-[11px] text-blue-600">
                      Date: {block.date} • Time: {block.block_start} — {block.block_end}
                    </div>
                  </div>
                ))}

                {filteredAllocatedBlocks.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 font-mono">NO ALLOCATED SLOTS YET. CONTROL OFFICE WILL RUN OPTIMIZER.</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Diagnostics Row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5" data-purpose="diagnostic-row">
            <TiltCard className="tactile-card rounded-2xl p-5 flex flex-col justify-between shadow-neu-flat">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Topology Integrity</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-100/60 text-blue-600 flex items-center justify-center tactile-inset">
                    <ShieldCheck size={20} />
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-900 font-display mb-1">PASS 1 READY</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Station mileage sequence validator loaded with 48 Sector points.
                </p>
              </div>
              <div className="mt-4 pt-3 flex justify-end">
                <button className="w-7 h-7 rounded-full tactile-pill flex items-center justify-center text-slate-400 hover:text-slate-800 tactile-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            </TiltCard>

            <TiltCard className="tactile-card rounded-2xl p-5 flex flex-col justify-between shadow-neu-flat">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Ingestion Protocols</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-100/60 text-indigo-600 flex items-center justify-center tactile-inset">
                    <Database size={20} />
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-900 font-display mb-1">GTFS / CSV / JSON</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Standardized column auto-mapping enabled for Indian Railways CSV dumps.
                </p>
              </div>
              <div className="mt-4 pt-3 flex justify-end">
                <button className="w-7 h-7 rounded-full tactile-pill flex items-center justify-center text-slate-400 hover:text-slate-800 tactile-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            </TiltCard>

            <TiltCard className="tactile-card rounded-2xl p-5 flex flex-col justify-between shadow-neu-flat">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono tracking-wider font-bold text-slate-400 uppercase">Arbitration Engine</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-100/60 text-purple-600 flex items-center justify-center tactile-inset">
                    <Cpu size={20} />
                  </div>
                </div>
                <h4 className="text-base font-bold text-slate-900 font-display mb-1">STANDBY MODE</h4>
                <p className="text-xs text-slate-500 leading-normal">
                  Sequence records directly feed Phase-2 gap window calculation.
                </p>
              </div>
              <div className="mt-4 pt-3 flex justify-end">
                <button className="w-7 h-7 rounded-full tactile-pill flex items-center justify-center text-slate-400 hover:text-slate-800 tactile-btn">
                  <ChevronRight size={14} />
                </button>
              </div>
            </TiltCard>
          </section>
        </div>
      )}

      {/* VIEW 2: CREATE MAINTENANCE REQUEST FORM WORKSTATION (/operator?action=create) */}
      {currentView === 'create' && (
        <div className="tactile-card rounded-2xl p-7 shadow-neu-flat space-y-6">
          <div className="border-b border-slate-200/80 pb-4">
            <h3 className="text-xl font-bold text-slate-900 font-display uppercase">New Maintenance Request Entry Form</h3>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Phase 1 Raw Input Collection • Logged in Engineer: <strong className="text-slate-800">{user?.fullName}</strong> ({dept})
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div className="tactile-card p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-mono font-bold text-blue-600 uppercase">[1] REQUEST & LOCATION INFORMATION</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Request ID (Auto-Gen)</label>
                  <input type="text" className="input-field opacity-60 cursor-not-allowed" value={formData.request_id} readOnly disabled />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department Context</label>
                  <input
                    type="text"
                    className={`input-field ${formErrors.department ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.department}
                    onChange={e => handleFieldChange('department', e.target.value)}
                    required
                  />
                  {formErrors.department && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.department}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Corridor ID</label>
                  <select
                    className={`input-field ${formErrors.corridor_id ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.corridor_id}
                    onChange={e => handleFieldChange('corridor_id', e.target.value, true)}
                  >
                    <option value="C1">C1 (Salem - Chennai)</option>
                    <option value="C2">C2 (Bangalore - Chennai)</option>
                    <option value="C3">C3 (Trichy - Madurai)</option>
                  </select>
                  {formErrors.corridor_id && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.corridor_id}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location (KM)</label>
                  <input
                    type="text"
                    className={`input-field ${formErrors.location ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.location}
                    onChange={e => handleFieldChange('location', e.target.value, true)}
                    placeholder="e.g. KM 128/2"
                    required
                  />
                  {formErrors.location && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="tactile-card p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-mono font-bold text-indigo-600 uppercase">[2] ASSET & DEFECT DETAILS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset ID</label>
                  <input
                    type="text"
                    className={`input-field ${formErrors.asset_id ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.asset_id}
                    onChange={e => handleFieldChange('asset_id', e.target.value, true)}
                    placeholder="e.g. TRK003"
                    required
                  />
                  {formErrors.asset_id && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.asset_id}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Type</label>
                  <select
                    className={`input-field ${formErrors.asset_type ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.asset_type}
                    onChange={e => handleFieldChange('asset_type', e.target.value)}
                  >
                    <option value="Signal">Signal</option>
                    <option value="Track">Track</option>
                    <option value="OHE">OHE</option>
                  </select>
                  {formErrors.asset_type && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.asset_type}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Type</label>
                  <input
                    type="text"
                    className={`input-field ${formErrors.defect_type ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.defect_type}
                    onChange={e => handleFieldChange('defect_type', e.target.value)}
                    required
                  />
                  {formErrors.defect_type && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.defect_type}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Severity</label>
                  <select
                    className={`input-field ${formErrors.defect_severity ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.defect_severity}
                    onChange={e => handleFieldChange('defect_severity', e.target.value)}
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  {formErrors.defect_severity && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.defect_severity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="tactile-card p-5 rounded-xl space-y-4">
              <h4 className="text-xs font-mono font-bold text-amber-600 uppercase">[3] RESOURCE REQUIREMENTS & DEADLINE</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Duration (Hours)</label>
                  <input
                    type="number"
                    step="0.5"
                    className={`input-field ${formErrors.required_duration_hours ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.required_duration_hours}
                    onChange={e => handleFieldChange('required_duration_hours', e.target.value)}
                    required
                  />
                  {formErrors.required_duration_hours && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.required_duration_hours}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Workers (Crew)</label>
                  <input
                    type="number"
                    className={`input-field ${formErrors.required_workers ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.required_workers}
                    onChange={e => handleFieldChange('required_workers', e.target.value)}
                    required
                  />
                  {formErrors.required_workers && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.required_workers}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Equipment</label>
                  <EquipmentSelect
                    value={formData.required_equipment}
                    onChange={val => handleFieldChange('required_equipment', val)}
                    hasError={!!formErrors.required_equipment}
                    required
                  />
                  {formErrors.required_equipment && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.required_equipment}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    className={`input-field ${formErrors.due_date ? 'border-rose-500 ring-2 ring-rose-500/30' : ''}`}
                    value={formData.due_date}
                    onChange={e => handleFieldChange('due_date', e.target.value)}
                    required
                  />
                  {formErrors.due_date && (
                    <div className="text-xs text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <span>❌</span> <span>{formErrors.due_date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <NavLink to="/operator/requests" className="btn btn-secondary">Cancel</NavLink>
              <button type="submit" disabled={submitting} className="btn btn-emerald">
                {submitting ? 'Saving to Database...' : 'Confirm & Save Maintenance Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 3: MY REQUESTS TAB (/operator/requests) */}
      {currentView === 'requests' && (
        <div className="tactile-card rounded-2xl flex flex-col justify-between overflow-hidden shadow-neu-flat" data-purpose="table-container">
          <div className="border-b border-slate-200/80 px-6 py-3.5 bg-slate-100/50 flex items-center justify-between">
            <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
              {dept} Department Maintenance Requests ({filteredRequests.length})
            </div>
            <NavLink to="/operator?action=create" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-xl shadow-neu-btn-blue flex items-center gap-1.5">
              <Plus size={14} /> Add New Request
            </NavLink>
          </div>

          <div className="table-container border-0 shadow-none rounded-none">
            <table className="custom-table w-full">
              <thead>
                <tr>
                  <th>REQUEST ID</th>
                  <th>ASSET ID</th>
                  <th>ASSET TYPE</th>
                  <th>LOCATION</th>
                  <th>DEFECT TYPE</th>
                  <th>SEVERITY</th>
                  <th>DURATION</th>
                  <th>CREW</th>
                  <th>EQUIPMENT</th>
                  <th>DUE DATE</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((r, idx) => (
                  <tr key={idx}>
                    <td className="font-mono font-bold text-slate-900">{r.request_id}</td>
                    <td className="font-mono text-slate-600">{r.asset_id}</td>
                    <td className="text-slate-700">{r.asset_type}</td>
                    <td className="text-slate-700">{r.corridor_id} ({r.location})</td>
                    <td className="font-semibold text-slate-900">{r.defect_type}</td>
                    <td>
                      <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                        {r.defect_severity}
                      </span>
                    </td>
                    <td className="font-mono text-blue-600 font-bold">{r.required_duration_hours} h</td>
                    <td className="font-mono text-emerald-600 font-bold">{r.required_workers}</td>
                    <td className="text-slate-600">{r.required_equipment}</td>
                    <td className="font-mono text-slate-500">{r.due_date}</td>
                    <td className="text-right">
                      <button onClick={() => setSelectedReqDetail(r)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800 tactile-btn">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-200/80 px-6 py-3 flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-50/50">
            <span>{filteredRequests.length} OF {filteredRequests.length} ENTRIES</span>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>LIVE DB: CONNECTED</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: MY ALLOCATED SLOTS TAB (/operator/slots) */}
      {currentView === 'slots' && (
        <section className="space-y-4">
          <h3 className="text-base font-bold text-slate-800 font-display uppercase tracking-wide">
            My Department Allocated Slots ({filteredAllocatedBlocks.length})
          </h3>

          {filteredAllocatedBlocks.length === 0 ? (
            <div className="tactile-card rounded-2xl p-8 text-center text-slate-500 font-mono text-xs">
              NO ALLOCATED MAINTENANCE SLOTS YET. CONTROL OFFICE ADMIN WILL RUN OPTIMIZATION.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAllocatedBlocks.map((block, idx) => (
                <div key={idx} className="tactile-card rounded-2xl p-6 shadow-neu-flat border-l-4 border-l-emerald-500">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 font-display">
                        {block.block_id} — Corridor {block.corridor} ({block.work_area})
                      </h4>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">
                        Group: <strong>{block.group_id}</strong> • Tasks: <strong>{block.group_task_count || 1}</strong>
                      </div>
                    </div>
                    <span className="badge badge-final">
                      STATUS: ALLOCATED
                    </span>
                  </div>

                  <div className="tactile-inset p-3 rounded-xl mb-3 text-xs text-slate-700">
                    <div className="font-mono font-bold text-blue-600 uppercase mb-1">
                      Work Included ({block.group_task_count || 1} Tasks)
                    </div>
                    {block.group_work_summary?.map((w, wIdx) => (
                      <div key={wIdx} className="font-medium">• {w}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tactile-inset p-3 rounded-xl mb-4 font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">SCHEDULED DATE</div>
                      <div className="font-bold text-slate-800">{block.date}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">ALLOCATED TIME</div>
                      <div className="font-bold text-blue-600">{block.block_start} — {block.block_end}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">DURATION</div>
                      <div className="font-bold text-amber-600">{block.allocated_duration_minutes} MIN</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedWorkerBlock(block)} className="bg-emerald-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-sm">
                      View Crew ({block.assigned_worker_details?.length || block.workers_required})
                    </button>
                    <button onClick={() => setSelectedEquipBlock(block)} className="tactile-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600">
                      View Equipment Details
                    </button>
                    <button onClick={() => setSelectedGroupModal(block)} className="tactile-pill px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600">
                      Task Breakdown
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* REQUEST DETAIL MODAL */}
      {selectedReqDetail && (
        <div className="modal-overlay">
          <div className="modal-box max-w-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Request Details — {selectedReqDetail.request_id}
              </h3>
              <button onClick={() => setSelectedReqDetail(null)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-700">
              <div>Department: <strong>{selectedReqDetail.department}</strong></div>
              <div>Asset ID: <strong>{selectedReqDetail.asset_id}</strong></div>
              <div>Defect Type: <strong className="text-blue-600">{selectedReqDetail.defect_type}</strong></div>
              <div>Severity: <strong className="text-red-600">{selectedReqDetail.defect_severity}</strong></div>
              <div>Safety Risk: <strong className="text-amber-600">{selectedReqDetail.safety_risk}</strong></div>
              <div>Duration: <strong>{selectedReqDetail.required_duration_hours} hours</strong></div>
              <div>Crew Required: <strong>{selectedReqDetail.required_workers}</strong></div>
              <div>Equipment: <strong>{selectedReqDetail.required_equipment}</strong></div>
              <div>Due Date: <strong>{selectedReqDetail.due_date}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
