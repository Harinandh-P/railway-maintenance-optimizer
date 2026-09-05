import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { PlaySquare, Clock, CheckCircle2, AlertTriangle, Layers, CalendarCheck, Eye, ArrowRight, RefreshCw, TrainTrack, CheckSquare, Square, XCircle } from 'lucide-react';
import api from '../services/api';
import { TiltCard } from '../components/TiltCard';
import { SortControl, naturalSort } from '../components/SortControl';

export const isRequestSelectable = (request) => {
  if (!request || !request.request_id) return false;
  const status = String(request.status || 'PENDING').trim().toUpperCase();
  return !['SCHEDULED', 'ALLOCATED', 'COMPLETED', 'REJECTED'].includes(status);
};

export const PipelineRequests = () => {
  const [requests, setRequests] = useState([]);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);
  const [runningPipeline, setRunningPipeline] = useState(false);

  const [selectedRequests, setSelectedRequests] = useState(new Set());

  const [sortField, setSortField] = useState('request_id');
  const [sortOrder, setSortOrder] = useState('asc');

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

  const sortedRequests = useMemo(() => {
    return naturalSort(requests, sortField, sortOrder);
  }, [requests, sortField, sortOrder]);

  const readyRequests = useMemo(() => {
    return requests.filter(isRequestSelectable);
  }, [requests]);

  const handleToggleSelectAllPending = () => {
    const readyIds = readyRequests.map(r => String(r.request_id).trim());
    const allSelected = readyIds.length > 0 && readyIds.every(id => selectedRequests.has(id));
    
    if (allSelected) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(readyIds));
    }
  };

  const handleToggleSelectRequest = (reqId) => {
    const id = String(reqId).trim();
    setSelectedRequests(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedRequests(new Set());
  };

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const payload = selectedRequests.size > 0 ? { request_ids: Array.from(selectedRequests) } : {};
      const res = await api.post('/run/full-pipeline', payload);
      setSuccessBanner(`3-Phase Optimization Pipeline executed successfully! ${selectedRequests.size > 0 ? `Processed ${selectedRequests.size} selected requests.` : 'Processed all pending requests.'} Allocated: ${res.data?.phase3_allocated_groups || 0} block groups.`);
      setSelectedRequests(new Set());
      await fetchData();
    } catch (err) {
      console.error('Pipeline execution error:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Pipeline execution failed');
    } finally {
      setRunningPipeline(false);
    }
  };

  const sortOptions = [
    { label: 'Request ID', value: 'request_id' },
    { label: 'Department', value: 'department' },
    { label: 'Defect Severity', value: 'defect_severity' },
    { label: 'Due Date', value: 'due_date' },
    { label: 'Corridor', value: 'corridor_id' }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING PIPELINE QUEUE...</div>
      </div>
    );
  }

  const totalRequests = requests.length;
  const scheduledCount = requests.filter(r => !isRequestSelectable(r)).length;
  const unallocatedCount = planData?.total_unallocated || (totalRequests > scheduledCount ? totalRequests - scheduledCount : 0);
  const allPendingSelected = readyRequests.length > 0 && readyRequests.every(r => selectedRequests.has(String(r.request_id).trim()));

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
            Select maintenance requests and run 3-phase optimization pipeline with conflict resolution & CP-SAT solver.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={fetchData} className="tactile-pill px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 tactile-btn">
            <RefreshCw size={15} className="text-slate-500" />
            <span>Refresh Queue</span>
          </button>

          <button
            onClick={handleRunPipeline}
            disabled={runningPipeline}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-neu-btn-blue flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50"
          >
            <PlaySquare size={16} strokeWidth={2.5} />
            <span>
              {runningPipeline
                ? 'Running Pipeline...'
                : selectedRequests.size > 0
                ? `Run Pipeline for Selected (${selectedRequests.size})`
                : 'Run Full Optimization Pipeline'}
            </span>
          </button>
        </div>
      </section>

      {errorBanner && (
        <div className="tactile-pill border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Notice: {errorBanner}</span>
        </div>
      )}

      {successBanner && (
        <div className="tactile-pill border-l-4 border-emerald-500 p-4 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successBanner}</span>
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
          <div className="text-[11px] font-mono font-bold text-indigo-600 uppercase">SELECTED</div>
          <div className="text-2xl font-extrabold text-indigo-600 font-display mt-1">{selectedRequests.size}</div>
          <div className="text-[10px] text-slate-500 mt-1">Targeted Batch</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-emerald-600 uppercase">SCHEDULED</div>
          <div className="text-2xl font-extrabold text-emerald-600 font-display mt-1">{scheduledCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Locked in Database</div>
        </TiltCard>

        <TiltCard className="tactile-card p-4 rounded-2xl shadow-neu-flat">
          <div className="text-[11px] font-mono font-bold text-purple-600 uppercase">UNALLOCATED</div>
          <div className="text-2xl font-extrabold text-purple-600 font-display mt-1">{unallocatedCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Gap Capacity Limited</div>
        </TiltCard>
      </div>

      {/* Selection Control Bar */}
      <div className="tactile-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-neu-flat bg-slate-50/80">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSelectAllPending}
            className="tactile-pill px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-2"
          >
            {allPendingSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-400" />}
            <span>{allPendingSelected ? 'Deselect All Unscheduled' : 'Select All Unscheduled'}</span>
          </button>

          {selectedRequests.size > 0 && (
            <button
              onClick={handleClearSelection}
              className="tactile-pill px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5"
            >
              <XCircle size={15} />
              <span>Clear Selection</span>
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-slate-600 font-semibold">
          Selected: <strong className="text-blue-600 font-bold">{selectedRequests.size}</strong> of {readyRequests.length} unscheduled requests
        </div>
      </div>

      {/* Pipeline Requests Workstation Table */}
      <div className="tactile-card rounded-2xl flex flex-col justify-between overflow-hidden shadow-neu-flat">
        <div className="border-b border-slate-200/80 px-6 py-3.5 bg-slate-100/50 flex items-center justify-between flex-wrap gap-4">
          <div className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
            Pipeline Queue Matrix ({sortedRequests.length} Items)
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SortControl
              options={sortOptions}
              sortField={sortField}
              onSortFieldChange={setSortField}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
          </div>
        </div>

        <div className="table-container border-0 shadow-none rounded-none">
          <table className="custom-table w-full text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-[11px] font-mono font-bold text-slate-500 uppercase">
                <th className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allPendingSelected}
                    onChange={handleToggleSelectAllPending}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    title="Select/Deselect All Unscheduled Requests"
                  />
                </th>
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
              {sortedRequests.map((r, idx) => {
                const reqId = String(r.request_id).trim();
                const selectable = isRequestSelectable(r);
                const isSelected = selectedRequests.has(reqId);
                const statusStr = String(r.status || 'PENDING').trim().toUpperCase();

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 font-medium border-l-4 border-l-blue-600'
                        : !selectable
                        ? 'hover:bg-slate-50 opacity-90'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="text-center">
                      <input
                        type="checkbox"
                        disabled={!selectable}
                        checked={isSelected}
                        onChange={() => handleToggleSelectRequest(reqId)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
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
                      {statusStr === 'SCHEDULED' || statusStr === 'ALLOCATED' ? (
                        <span className="badge badge-final">SCHEDULED</span>
                      ) : statusStr === 'COMPLETED' ? (
                        <span className="badge badge-final">COMPLETED</span>
                      ) : statusStr === 'REJECTED' ? (
                        <span className="badge badge-critical">REJECTED</span>
                      ) : (
                        <span className="badge badge-candidate">READY FOR PIPELINE</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedReq(r)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {requests.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-500 font-mono text-xs">
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
              <div>Database Status: <strong>{selectedReq.status || 'PENDING'}</strong></div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
              {isRequestSelectable(selectedReq) && (
                <button
                  onClick={() => {
                    setSelectedReq(null);
                    handleToggleSelectRequest(selectedReq.request_id);
                  }}
                  className="btn btn-primary"
                >
                  {selectedRequests.has(String(selectedReq.request_id).trim()) ? 'Remove from Selection' : 'Add to Pipeline Selection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
