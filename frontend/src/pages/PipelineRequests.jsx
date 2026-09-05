import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { PlaySquare, Clock, CheckCircle2, AlertTriangle, Layers, CalendarCheck, Eye, ArrowRight, RefreshCw, TrainTrack } from 'lucide-react';
import api from '../services/api';
import { TiltCard } from '../components/TiltCard';

export const PipelineRequests = () => {
  const [requests, setRequests] = useState([]);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const reqRes = await api.get('/data/maintenance-requests');
      const list = Array.isArray(reqRes.data) ? reqRes.data : (Array.isArray(reqRes.data?.data) ? reqRes.data.data : (Array.isArray(reqRes.data?.records) ? reqRes.data.records : []));
      setRequests(list);

      try {
        const planRes = await api.get('/results/final-plan');
        setPlanData(planRes.data);
      } catch (e) {
        setPlanData(null);
      }
    } catch (err) {
      console.error('Failed to load pipeline requests data:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING PIPELINE QUEUE...</div>
      </div>
    );
  }

  const allocatedBlocks = planData?.final_block_plan || [];
  const allocatedReqIds = new Set();
  allocatedBlocks.forEach(b => {
    (b.request_details_in_group || []).forEach(r => {
      if (r && r.request_id) allocatedReqIds.add(r.request_id);
    });
  });

  const totalRequests = requests.length;
  const readyRequests = requests.filter(r => !allocatedReqIds.has(r.request_id));
  const scheduledCount = planData?.total_allocated || allocatedReqIds.size;
  const unallocatedCount = planData?.total_unallocated || (totalRequests > scheduledCount ? totalRequests - scheduledCount : 0);

  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <section className="tactile-card rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 shadow-neu-flat">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
              AROHA // OPTIMIZATION PIPELINE QUEUE
            </span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SOLVER ENGINE: READY
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            PIPELINE REQUESTS
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Maintenance requests awaiting optimization, conflict resolution and CP-SAT block allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="tactile-pill px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 tactile-btn">
            <RefreshCw size={15} className="text-slate-500" />
            <span>Refresh Queue</span>
          </button>

          <NavLink
            to="/pipeline"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-neu-btn-blue flex items-center gap-2 transform active:scale-95 transition-all"
          >
            <PlaySquare size={16} strokeWidth={2.5} />
            <span>Run Optimization Pipeline →</span>
          </NavLink>
        </div>
      </section>

      {errorBanner && (
        <div className="tactile-pill border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Notice: {errorBanner}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-slate-400 uppercase">TOTAL REQUESTS</div>
          <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">{totalRequests}</div>
          <div className="text-[10px] text-slate-500 mt-1">Submitted in DB</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-blue-600 uppercase">READY FOR PIPELINE</div>
          <div className="text-2xl font-extrabold text-blue-600 font-display mt-1">{readyRequests.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Awaiting Solver Run</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-amber-600 uppercase">PROCESSING</div>
          <div className="text-2xl font-extrabold text-amber-600 font-display mt-1">
            {planData ? 'STANDBY' : '0'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Phase 1/2/3 Status</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-emerald-600 uppercase">SCHEDULED</div>
          <div className="text-2xl font-extrabold text-emerald-600 font-display mt-1">{scheduledCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Phase 3 Allocated</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-purple-600 uppercase">UNALLOCATED</div>
          <div className="text-2xl font-extrabold text-purple-600 font-display mt-1">{unallocatedCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gap Capacity Limited</div>
        </TiltCard>
      </div>

      {/* Pipeline Requests Workstation Table */}
      <div className="tactile-card rounded-2xl flex flex-col justify-between overflow-hidden shadow-neu-flat">
        <div className="border-b border-slate-200/80 px-6 py-3.5 bg-slate-100/50 flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
            Pipeline Queue Matrix ({requests.length} Items)
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>EMPLOYEE SUBMISSIONS → ADMIN PIPELINE REVIEW</span>
          </div>
        </div>

        <div className="table-container border-0 shadow-none rounded-none">
          <table className="custom-table w-full text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-mono font-bold text-slate-500 uppercase">
                <th>REQUEST ID</th>
                <th>DEPARTMENT</th>
                <th>LOCATION</th>
                <th>DEFECT TYPE</th>
                <th>SEVERITY</th>
                <th>DURATION</th>
                <th>CREW</th>
                <th>EQUIPMENT</th>
                <th>DUE DATE</th>
                <th>PIPELINE STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {requests.map((r, idx) => {
                const isScheduled = allocatedReqIds.has(r.request_id);
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="font-mono font-bold text-slate-900">{r.request_id}</td>
                    <td className="font-semibold text-slate-700">{r.department}</td>
                    <td className="text-slate-700">{r.corridor_id || 'C1'} ({r.location})</td>
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
                    <td>
                      {isScheduled ? (
                        <span className="badge badge-final">
                          SCHEDULED
                        </span>
                      ) : (
                        <span className="badge badge-candidate">
                          READY FOR PIPELINE
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedReq(r)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600">
                          View
                        </button>
                        <NavLink to="/pipeline" className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800">
                          Run Solver
                        </NavLink>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {requests.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-500 font-mono text-xs">
                    NO MAINTENANCE REQUESTS CURRENTLY IN PIPELINE QUEUE.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST DETAIL MODAL */}
      {selectedReq && (
        <div className="modal-overlay">
          <div className="modal-box max-w-xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Pipeline Request Details — {selectedReq.request_id}
              </h3>
              <button onClick={() => setSelectedReq(null)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-700 mb-4">
              <div>Department: <strong>{selectedReq.department}</strong></div>
              <div>Asset ID: <strong>{selectedReq.asset_id}</strong></div>
              <div>Location: <strong>{selectedReq.location}</strong></div>
              <div>Defect Type: <strong className="text-blue-600">{selectedReq.defect_type}</strong></div>
              <div>Severity: <strong className="text-red-600">{selectedReq.defect_severity}</strong></div>
              <div>Safety Risk: <strong className="text-amber-600">{selectedReq.safety_risk}</strong></div>
              <div>Duration: <strong>{selectedReq.required_duration_hours} hours</strong></div>
              <div>Crew Required: <strong>{selectedReq.required_workers}</strong></div>
              <div>Equipment: <strong>{selectedReq.required_equipment}</strong></div>
              <div>Due Date: <strong>{selectedReq.due_date}</strong></div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
              <NavLink to="/pipeline" className="btn btn-primary">
                Proceed to Optimization Pipeline →
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
