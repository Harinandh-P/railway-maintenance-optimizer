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
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedReqDetail, setSelectedReqDetail] = useState(null);

  const dept = user?.department || 'TRACK';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/maintenance-requests');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      setRequests(list);
    } catch (err) {
      console.error('Failed to load engineer portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING ENGINEER CONSOLE...</div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6 select-none">
      {/* Hero Banner */}
      <section className="tactile-card rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 shadow-neu-flat">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
              ENGINEER PORTAL // {dept}
            </span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              LOGGED IN: {user?.fullName}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            MAINTENANCE COORDINATION CONSOLE
          </h1>
        </div>
      </section>

      {/* Requests Table */}
      <div className="tactile-card rounded-2xl flex flex-col justify-between overflow-hidden shadow-neu-flat">
        <div className="border-b border-slate-200/80 px-6 py-3 bg-slate-100/50">
          <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
            {dept} Department Requests ({filteredRequests.length})
          </div>
        </div>

        <div className="table-container border-0 shadow-none rounded-none">
          <table className="custom-table w-full">
            <thead>
              <tr>
                <th>REQUEST ID</th>
                <th>ASSET ID</th>
                <th>LOCATION</th>
                <th>DEFECT TYPE</th>
                <th>SEVERITY</th>
                <th>DURATION</th>
                <th>CREW</th>
                <th>DUE DATE</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r, idx) => (
                <tr key={idx}>
                  <td className="font-mono font-bold text-slate-900">{r.request_id}</td>
                  <td className="font-mono text-slate-600">{r.asset_id}</td>
                  <td className="text-slate-700">{r.corridor_id} ({r.location})</td>
                  <td className="font-semibold text-slate-900">{r.defect_type}</td>
                  <td>
                    <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {r.defect_severity}
                    </span>
                  </td>
                  <td className="font-mono text-blue-600 font-bold">{r.required_duration_hours} h</td>
                  <td className="font-mono text-emerald-600 font-bold">{r.required_workers}</td>
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
      </div>
    </div>
  );
};
