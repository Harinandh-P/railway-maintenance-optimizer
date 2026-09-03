import React, { useState, useEffect } from 'react';
import { Plus, TrainTrack, Clock, Users, Wrench, ShieldAlert, CheckCircle, AlertTriangle, FileText, Layers, CalendarCheck, Eye, Activity } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { GroupDetailModal } from '../components/GroupDetailModal';
import { WorkerModal } from '../components/WorkerModal';
import { EquipmentModal } from '../components/EquipmentModal';
import { EquipmentSelect } from '../components/EquipmentSelect';

export const EngineerDashboard = () => {
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
        <div>LOADING ENGINEER CONSOLE...</div>
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

      {/* Header Banner */}
      <section className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest">
              MISSION CONTROL // ENGINEER CONSOLE
            </span>
            <span className="bg-[#101726] border border-[#24334D] text-[#DFE2EE] font-mono text-[11px] px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              DEPARTMENT: {dept}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#DFE2EE] font-display uppercase tracking-tight">
            ENGINEER PORTAL & MAINTENANCE COORDINATION
          </h1>
          <p className="text-xs md:text-sm text-[#94A3B8] mt-1 font-sans">
            Logged in: <strong className="text-[#DFE2EE]">{user?.fullName}</strong> ({user?.role})
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

      {/* Requests Table Panel */}
      <section className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#24334D]">
          <h3 className="text-lg font-bold text-[#DFE2EE] font-display flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            <span>{dept} Department Requests</span>
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
                <th className="py-3 px-4">LOCATION</th>
                <th className="py-3 px-4">DEFECT TYPE</th>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">DURATION</th>
                <th className="py-3 px-4">CREW</th>
                <th className="py-3 px-4">DUE DATE</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#24334D]/50">
              {filteredRequests.map((r, idx) => (
                <tr key={idx} className="hover:bg-[#1E2B42] transition-colors bg-[#1A2438] even:bg-[#181F2D]">
                  <td className="py-3 px-4 font-mono font-bold text-[#DFE2EE]">{r.request_id}</td>
                  <td className="py-3 px-4 font-mono text-[#94A3B8]">{r.asset_id}</td>
                  <td className="py-3 px-4 text-[#C2C6D6]">{r.corridor_id} ({r.location})</td>
                  <td className="py-3 px-4 font-semibold text-[#DFE2EE]">{r.defect_type}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {r.defect_severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[#F59E0B]">{r.required_duration_hours} h</td>
                  <td className="py-3 px-4 font-mono text-[#10B981]">{r.required_workers}</td>
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
