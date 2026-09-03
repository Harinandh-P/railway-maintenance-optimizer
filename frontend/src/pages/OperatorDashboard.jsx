import React, { useState, useEffect } from 'react';
import { Plus, TrainTrack, Clock, Users, Wrench, ShieldAlert, CheckCircle, AlertTriangle, FileText, Layers, CalendarCheck, Eye, Activity, Radio } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GroupDetailModal } from '../components/GroupDetailModal';
import { WorkerModal } from '../components/WorkerModal';
import { EquipmentModal } from '../components/EquipmentModal';
import { EquipmentSelect } from '../components/EquipmentSelect';

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
      setSuccessMsg(`Maintenance Request ${formData.request_id} submitted & saved to database successfully!`);
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
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8] font-mono">
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
    <div className="space-y-6">
      {/* Modals */}
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

      {/* Header Mission Banner */}
      <section className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest">
              MISSION CONTROL // ENGINEER PORTAL
            </span>
            <span className="bg-[#101726] border border-[#24334D] text-[#DFE2EE] font-mono text-[11px] px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              DEPARTMENT: {dept}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#DFE2EE] font-display uppercase tracking-tight">
            ENGINEER OPERATIONS CONSOLE
          </h1>
          <p className="text-xs md:text-sm text-[#94A3B8] mt-1 font-sans">
            Railway Maintenance & Block Coordination • Logged in: <strong className="text-[#DFE2EE]">{user?.fullName}</strong> ({user?.role})
          </p>
        </div>

        <button
          onClick={() => { setShowFormModal(true); setFormStep(1); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2.5 transition-all transform active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>CREATE MAINTENANCE REQUEST</span>
        </button>
      </section>

      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Mission Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">DEPARTMENT REQUESTS</div>
            <div className="text-3xl font-extrabold text-[#DFE2EE] font-mono mt-1">{filteredRequests.length}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Active Logged Items</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-500 flex items-center justify-center">
            <TrainTrack size={22} />
          </div>
        </div>

        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">PENDING OPTIMIZATION</div>
            <div className="text-3xl font-extrabold text-blue-400 font-mono mt-1">{filteredRequests.length}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Awaiting CP-SAT Run</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">MY ALLOCATED SLOTS</div>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">{filteredAllocatedBlocks.length}</div>
            <div className="text-[11px] text-[#64748B] mt-1">Phase-3 Verified</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">SYSTEM TELEMETRY</div>
            <div className="text-xl font-extrabold text-emerald-400 font-mono mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              ONLINE
            </div>
            <div className="text-[11px] text-[#64748B] mt-1">Database Connected</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
            <Radio size={22} />
          </div>
        </div>
      </div>

      {/* TAB 1: REQUESTS VIEW */}
      {(activeTab === 'overview' || activeTab === 'requests') && (
        <section className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#24334D]">
            <h3 className="text-lg font-bold text-[#DFE2EE] font-display flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              <span>{dept} Department Maintenance Requests</span>
              <span className="text-xs font-mono bg-[#101726] border border-[#24334D] px-2.5 py-0.5 rounded-full text-[#94A3B8]">
                {filteredRequests.length} ITEMS
              </span>
            </h3>
          </div>

          <div className="table-container bg-[#1A2438] border border-[#24334D] rounded-xl overflow-x-auto">
            <table className="custom-table w-full text-left font-sans text-sm">
              <thead>
                <tr className="bg-[#151E2E] border-b-2 border-[#24334D] text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">
                  <th className="py-3 px-4">REQUEST ID</th>
                  <th className="py-3 px-4">ASSET ID</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">LOCATION</th>
                  <th className="py-3 px-4">DEFECT TYPE</th>
                  <th className="py-3 px-4">SEVERITY</th>
                  <th className="py-3 px-4">RISK</th>
                  <th className="py-3 px-4">DURATION</th>
                  <th className="py-3 px-4">CREW</th>
                  <th className="py-3 px-4">EQUIPMENT</th>
                  <th className="py-3 px-4">DUE DATE</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#24334D]/50">
                {filteredRequests.map((r, idx) => (
                  <tr key={idx} className="hover:bg-[#1E2B42] transition-colors bg-[#1A2438] even:bg-[#181F2D]">
                    <td className="py-3 px-4 font-mono font-bold text-[#DFE2EE]">{r.request_id}</td>
                    <td className="py-3 px-4 font-mono text-[#94A3B8]">{r.asset_id}</td>
                    <td className="py-3 px-4 text-[#C2C6D6]">{r.asset_type}</td>
                    <td className="py-3 px-4 text-[#C2C6D6]">{r.corridor_id} ({r.location})</td>
                    <td className="py-3 px-4 font-semibold text-[#DFE2EE]">{r.defect_type}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                        {r.defect_severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#94A3B8]">{r.safety_risk}</td>
                    <td className="py-3 px-4 font-mono text-[#F59E0B]">{r.required_duration_hours} h</td>
                    <td className="py-3 px-4 font-mono text-[#10B981]">{r.required_workers}</td>
                    <td className="py-3 px-4 text-[#C2C6D6]">{r.required_equipment}</td>
                    <td className="py-3 px-4 font-mono text-[#94A3B8]">{r.due_date}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => setSelectedReqDetail(r)} className="btn btn-secondary text-xs py-1 px-2.5">
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: MY ALLOCATED SLOTS VIEW */}
      {(activeTab === 'overview' || activeTab === 'slots') && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-[#DFE2EE] font-display flex items-center gap-2">
            <CalendarCheck size={18} className="text-emerald-400" />
            <span>My Department Allocated Slots</span>
            <span className="text-xs font-mono bg-[#101726] border border-[#24334D] px-2.5 py-0.5 rounded-full text-[#94A3B8]">
              {filteredAllocatedBlocks.length} SLOTS
            </span>
          </h3>

          {filteredAllocatedBlocks.length === 0 ? (
            <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-10 text-center text-[#94A3B8] font-mono text-sm">
              NO ALLOCATED MAINTENANCE SLOTS YET. CONTROL OFFICE ADMIN WILL RUN OPTIMIZATION.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAllocatedBlocks.map((block, idx) => (
                <div key={idx} className="bg-[#1A2438] border border-[#24334D] border-l-4 border-l-emerald-500 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-[#DFE2EE] font-display">
                        {block.block_id} — Corridor {block.corridor} ({block.work_area})
                      </h4>
                      <div className="text-xs font-mono text-[#94A3B8] mt-1">
                        Group: <strong className="text-[#DFE2EE]">{block.group_id}</strong> • Tasks: <strong className="text-[#DFE2EE]">{block.group_task_count || 1}</strong>
                      </div>
                    </div>
                    <span className="badge badge-final text-xs px-3 py-1">
                      STATUS: ALLOCATED
                    </span>
                  </div>

                  <div className="bg-[#151E2E] border border-[#24334D] rounded-xl p-4 mb-4">
                    <div className="text-xs font-mono font-bold text-blue-400 uppercase mb-2">
                      Work Included ({block.group_task_count || 1} Tasks)
                    </div>
                    {block.group_work_summary?.map((w, wIdx) => (
                      <div key={wIdx} className="text-sm text-[#DFE2EE] font-semibold mt-1">
                        • {w}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#101726] border border-[#24334D] p-4 rounded-xl mb-4 font-mono">
                    <div>
                      <div className="text-[10px] text-[#64748B] uppercase">SCHEDULED DATE</div>
                      <div className="text-base font-bold text-[#DFE2EE] mt-0.5">{block.date}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B] uppercase">ALLOCATED TIME</div>
                      <div className="text-base font-bold text-blue-400 mt-0.5">{block.block_start} — {block.block_end}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#64748B] uppercase">DURATION</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">{block.allocated_duration_minutes} MIN</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setSelectedWorkerBlock(block)} className="btn btn-emerald text-xs">
                      <Users size={15} /> View Assigned Crew ({block.assigned_worker_details?.length || block.workers_required})
                    </button>
                    <button onClick={() => setSelectedEquipBlock(block)} className="btn btn-secondary text-xs text-amber-400 border-amber-500/30">
                      <Wrench size={15} /> View Equipment Details
                    </button>
                    <button onClick={() => setSelectedGroupModal(block)} className="btn btn-secondary text-xs">
                      <FileText size={15} /> View Task Breakdown
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* CREATE REQUEST MODAL */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-box max-w-3xl bg-[#1A2438] border border-[#24334D]">
            <h2 className="text-xl font-bold text-[#DFE2EE] font-display mb-2">
              {formStep === 1 ? 'New Maintenance Request Entry Form' : 'Review & Confirm Request Submission'}
            </h2>
            <p className="text-xs text-[#94A3B8] mb-6 font-mono">
              Phase 1 Raw Input Collection • Logged in Engineer: <strong className="text-[#DFE2EE]">{user?.fullName}</strong> ({dept})
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-500/15 border border-red-500/40 text-red-400 rounded-xl mb-4 text-xs flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {formStep === 1 ? (
              <form onSubmit={(e) => { e.preventDefault(); setFormStep(2); }} className="space-y-5">
                <div className="bg-[#151E2E] border border-[#24334D] p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-mono font-bold text-blue-400 uppercase">[1] REQUEST & LOCATION INFORMATION</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#94A3B8] mb-1">Request ID (Backend Auto-Gen)</label>
                      <input type="text" className="input-field bg-[#101726] opacity-70 cursor-not-allowed" value="[Auto-Generated Unique ID]" readOnly disabled />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Department Context</label>
                      <input type="text" className="input-field" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="eg: Engineering" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Corridor ID</label>
                      <select className="input-field" value={formData.corridor_id} onChange={e => setFormData({ ...formData, corridor_id: e.target.value })}>
                        <option value="C1">C1 (Salem - Chennai)</option>
                        <option value="C2">C2 (Bangalore - Chennai)</option>
                        <option value="C3">C3 (Trichy - Madurai)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Location (KM)</label>
                      <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="eg: KM 128/2" required />
                    </div>
                  </div>
                </div>

                <div className="bg-[#151E2E] border border-[#24334D] p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-mono font-bold text-purple-400 uppercase">[2] ASSET & DEFECT DETAILS</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Asset ID</label>
                      <input type="text" className="input-field" value={formData.asset_id} onChange={e => setFormData({ ...formData, asset_id: e.target.value })} placeholder="eg: TRK003" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Asset Type</label>
                      <select className="input-field" value={formData.asset_type} onChange={e => setFormData({ ...formData, asset_type: e.target.value })}>
                        <option value="Signal">Signal</option>
                        <option value="Track">Track</option>
                        <option value="OHE">OHE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Defect Type</label>
                      <input type="text" className="input-field" value={formData.defect_type} onChange={e => setFormData({ ...formData, defect_type: e.target.value })} placeholder="eg: Rail Crack" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Defect Severity</label>
                      <select className="input-field" value={formData.defect_severity} onChange={e => setFormData({ ...formData, defect_severity: e.target.value })}>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-[#151E2E] border border-[#24334D] p-4 rounded-xl space-y-4">
                  <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">[3] RESOURCE REQUIREMENTS & DEADLINE</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Required Duration (Hours)</label>
                      <input type="number" step="0.5" className="input-field" value={formData.required_duration_hours} onChange={e => setFormData({ ...formData, required_duration_hours: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Required Workers (Crew)</label>
                      <input type="number" className="input-field" value={formData.required_workers} onChange={e => setFormData({ ...formData, required_workers: e.target.value })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Required Equipment</label>
                      <EquipmentSelect value={formData.required_equipment} onChange={val => setFormData({ ...formData, required_equipment: val })} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#C2C6D6] mb-1">Due Date</label>
                      <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} required />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowFormModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" className="btn btn-primary">Proceed to Review →</button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#151E2E] border border-[#24334D] p-5 rounded-xl space-y-3 font-sans text-sm">
                  <h3 className="text-base font-bold text-blue-400 font-display mb-2">Review Maintenance Request Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[#C2C6D6]">
                    <div>Request ID: <strong className="text-[#DFE2EE]">{formData.request_id}</strong></div>
                    <div>Engineer: <strong className="text-[#DFE2EE]">{user?.fullName}</strong></div>
                    <div>Department: <strong className="text-[#DFE2EE]">{formData.department}</strong></div>
                    <div>Asset ID: <strong className="text-[#DFE2EE]">{formData.asset_id}</strong></div>
                    <div>Location: <strong className="text-[#DFE2EE]">{formData.location}</strong></div>
                    <div>Severity: <strong className="text-red-400">{formData.defect_severity}</strong></div>
                    <div>Duration: <strong className="text-amber-400">{formData.required_duration_hours} hrs</strong></div>
                    <div>Crew: <strong className="text-emerald-400">{formData.required_workers} workers</strong></div>
                  </div>
                </div>

                <div className="flex justify-between gap-3">
                  <button type="button" onClick={() => setFormStep(1)} className="btn btn-secondary">← Back & Edit</button>
                  <button type="button" onClick={handleCreateSubmit} disabled={submitting} className="btn btn-emerald">
                    {submitting ? 'Submitting...' : 'Confirm & Save to Database'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REQUEST DETAIL MODAL */}
      {selectedReqDetail && (
        <div className="modal-overlay">
          <div className="glass-panel modal-box max-w-xl bg-[#1A2438] border border-[#24334D]">
            <div className="flex items-center justify-between mb-4 border-b border-[#24334D] pb-3">
              <h3 className="text-base font-bold text-[#DFE2EE] font-display">
                Request Details — {selectedReqDetail.request_id}
              </h3>
              <button onClick={() => setSelectedReqDetail(null)} className="btn btn-secondary text-xs py-1 px-3.5">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[#C2C6D6]">
              <div>Department: <strong className="text-[#DFE2EE]">{selectedReqDetail.department}</strong></div>
              <div>Asset ID: <strong className="text-[#DFE2EE]">{selectedReqDetail.asset_id}</strong></div>
              <div>Defect Type: <strong className="text-blue-400">{selectedReqDetail.defect_type}</strong></div>
              <div>Severity: <strong className="text-red-400">{selectedReqDetail.defect_severity}</strong></div>
              <div>Safety Risk: <strong className="text-amber-400">{selectedReqDetail.safety_risk}</strong></div>
              <div>Duration: <strong className="text-[#DFE2EE]">{selectedReqDetail.required_duration_hours} hours</strong></div>
              <div>Crew Required: <strong className="text-[#DFE2EE]">{selectedReqDetail.required_workers}</strong></div>
              <div>Equipment: <strong className="text-[#DFE2EE]">{selectedReqDetail.required_equipment}</strong></div>
              <div>Due Date: <strong className="text-[#DFE2EE]">{selectedReqDetail.due_date}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Mission Telemetry Footer */}
      <footer className="flex items-center justify-between text-xs font-mono text-[#64748B] border-t border-[#24334D] pt-4">
        <div>
          ● LIVE DATABASE: <span className="text-emerald-400 font-bold">CONNECTED</span> • API: ACTIVE
        </div>
        <div>ZONE: NR-HQ / DLI</div>
      </footer>
    </div>
  );
};
