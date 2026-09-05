import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrainTrack,
  AlertTriangle,
  Layers,
  CalendarCheck,
  Users,
  Wrench,
  PlaySquare,
  TrendingUp,
  CheckCircle2,
  PieChart,
  BarChart3,
  GitCommit,
  Clock,
  ArrowRight,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { TiltCard } from '../components/TiltCard';
import { SortControl, naturalSort } from '../components/SortControl';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [requests, setRequests] = useState([]);
  const [plan, setPlan] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);
  const [pipelineSuccess, setPipelineSuccess] = useState(null);
  const [runningPipeline, setRunningPipeline] = useState(false);

  // Request Selection State for Controlled Pipeline
  const [selectedRequests, setSelectedRequests] = useState(new Set());

  // Sorting States
  const [scheduleSortField, setScheduleSortField] = useState('date');
  const [scheduleSortOrder, setScheduleSortOrder] = useState('asc');

  const [pendingSortField, setPendingSortField] = useState('request_id');
  const [pendingSortOrder, setPendingSortOrder] = useState('asc');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data || {});

      try {
        const reqRes = await api.get('/data/maintenance-requests');
        const list = Array.isArray(reqRes.data) ? reqRes.data : (Array.isArray(reqRes.data?.data) ? reqRes.data.data : (Array.isArray(reqRes.data?.records) ? reqRes.data.records : []));
        setRequests(list);
      } catch (e) {
        setRequests([]);
      }

      try {
        const planRes = await api.get('/results/final-plan');
        setPlan(planRes.data || {});
      } catch (e) {
        setPlan({});
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Failed to connect to backend server');
      setMetrics({});
      setRequests([]);
      setPlan({});
    } finally {
      setLoading(false);
    }
  };

  const safeRequests = Array.isArray(requests) ? requests : [];
  const allocatedBlocks = plan?.final_block_plan || [];

  // Extract set of request IDs that are already scheduled
  const allocatedReqIds = useMemo(() => {
    const ids = new Set();
    allocatedBlocks.forEach(block => {
      (block.request_details_in_group || []).forEach(r => {
        if (r && r.request_id) ids.add(String(r.request_id).trim());
      });
    });
    return ids;
  }, [allocatedBlocks]);

  // Derive Pending Requests (Requests NOT yet allocated in Final Block Plan)
  const pendingRequests = useMemo(() => {
    return safeRequests.filter(r => r && r.request_id && !allocatedReqIds.has(String(r.request_id).trim()));
  }, [safeRequests, allocatedReqIds]);

  // Sorted Upcoming Schedule
  const sortedUpcomingSchedule = useMemo(() => {
    return naturalSort(allocatedBlocks, scheduleSortField, scheduleSortOrder);
  }, [allocatedBlocks, scheduleSortField, scheduleSortOrder]);

  // Sorted Pending Requests
  const sortedPendingRequests = useMemo(() => {
    return naturalSort(pendingRequests, pendingSortField, pendingSortOrder);
  }, [pendingRequests, pendingSortField, pendingSortOrder]);

  // Checkbox handlers
  const toggleSelectRequest = (reqId) => {
    setSelectedRequests(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const handleSelectAllPending = () => {
    const allIds = pendingRequests.map(r => String(r.request_id).trim());
    setSelectedRequests(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedRequests(new Set());
  };

  // Pipeline Execution Handlers
  const handleRunSelectedPipeline = async () => {
    if (selectedRequests.size === 0) return;
    setRunningPipeline(true);
    setPipelineSuccess(null);
    setErrorBanner(null);

    const selectedIds = Array.from(selectedRequests);
    try {
      const res = await api.post('/run/full-pipeline', { request_ids: selectedIds });
      setPipelineSuccess(`Optimization Pipeline executed successfully for ${selectedIds.length} selected request(s)! Allocated: ${res.data?.phase3_allocated_groups || 0} block groups.`);
      setSelectedRequests(new Set());
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to run selected pipeline:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Pipeline execution failed');
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleRunFullPipeline = async () => {
    setRunningPipeline(true);
    setPipelineSuccess(null);
    setErrorBanner(null);

    try {
      const res = await api.post('/run/full-pipeline');
      setPipelineSuccess(`Full 3-Phase Optimization Pipeline executed successfully! Allocated: ${res.data?.phase3_allocated_groups || 0} block groups.`);
      setSelectedRequests(new Set());
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to run full pipeline:', err);
      setErrorBanner(err.response?.data?.detail || err.message || 'Full pipeline execution failed');
    } finally {
      setRunningPipeline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING MISSION CONTROL METRICS...</div>
      </div>
    );
  }

  const priorityCount = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const corridorCount = {};

  safeRequests.forEach(r => {
    if (!r || typeof r !== 'object') return;
    const sev = r.defect_severity || 'Medium';
    priorityCount[sev] = (priorityCount[sev] || 0) + 1;

    const corr = r.corridor_id || 'C1';
    corridorCount[corr] = (corridorCount[corr] || 0) + 1;
  });

  const allocatedCount = plan?.total_allocated || metrics?.final_selected_blocks || 0;
  const unallocatedCount = plan?.total_unallocated || 0;

  const statCards = [
    { title: 'Total Maintenance Requests', value: metrics?.total_maintenance_requests || 0, icon: TrainTrack, color: 'text-blue-600', bg: 'bg-blue-100/70' },
    { title: 'High-Risk Requests', value: metrics?.high_risk_requests || 0, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-100/70' },
    { title: 'Pending Pipeline Requests', value: pendingRequests.length, icon: Layers, color: 'text-cyan-600', bg: 'bg-cyan-100/70' },
    { title: 'Final Selected Blocks (Phase 3)', value: allocatedCount, icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-100/70' },
    { title: 'Available Workers', value: `${metrics?.available_workers || 0} / ${metrics?.total_workers || 0}`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100/70' },
    { title: 'Available Equipment', value: `${metrics?.available_equipment || 0} / ${metrics?.total_equipment || 0}`, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100/70' }
  ];

  const scheduleSortOptions = [
    { label: 'Scheduled Date', value: 'date' },
    { label: 'Block Start Time', value: 'block_start' },
    { label: 'Corridor', value: 'corridor' },
    { label: 'Group / Block ID', value: 'block_id' }
  ];

  const pendingSortOptions = [
    { label: 'Request ID', value: 'request_id' },
    { label: 'Defect Severity', value: 'defect_severity' },
    { label: 'Due Date', value: 'due_date' },
    { label: 'Corridor ID', value: 'corridor_id' },
    { label: 'Department', value: 'department' }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Page Banner */}
      <section className="tactile-card rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 shadow-neu-flat">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
              AROHA // ADMIN OPERATIONS CONTROL
            </span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SYSTEM ONLINE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            RAILWAY OPERATIONS DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-Time Telemetry, Upcoming Maintenance Schedule & Controlled Pipeline Dispatcher
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRunFullPipeline}
            disabled={runningPipeline}
            className="tactile-pill px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 tactile-btn"
          >
            <PlaySquare size={15} className="text-emerald-600" />
            <span>{runningPipeline ? 'Executing...' : 'Run Full Pipeline'}</span>
          </button>
        </div>
      </section>

      {errorBanner && (
        <div className="tactile-pill border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Notice: {errorBanner}</span>
        </div>
      )}

      {pipelineSuccess && (
        <div className="tactile-pill border-l-4 border-emerald-500 p-4 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{pipelineSuccess}</span>
        </div>
      )}

      {/* Metrics Grid (3D Cursor Tilt Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <TiltCard key={idx} className="tactile-card p-5 rounded-2xl shadow-neu-flat">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">{card.title}</div>
                  <div className="text-3xl font-extrabold text-slate-900 font-display mt-1">{card.value}</div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bg} ${card.color} flex items-center justify-center tactile-inset`}>
                  <Icon size={24} />
                </div>
              </div>
            </TiltCard>
          );
        })}
      </div>

      {/* SECTION 1: UPCOMING SCHEDULE */}
      <section className="tactile-card rounded-2xl p-6 shadow-neu-flat space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-emerald-600" />
              <h2 className="text-lg font-extrabold text-slate-900 font-display uppercase tracking-tight">
                UPCOMING MAINTENANCE BLOCK SCHEDULE
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Verified Phase 3 CP-SAT Block Allocations • Chronologically Ordered
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SortControl
              options={scheduleSortOptions}
              sortField={scheduleSortField}
              onSortFieldChange={setScheduleSortField}
              sortOrder={scheduleSortOrder}
              onSortOrderChange={setScheduleSortOrder}
            />

            <NavLink
              to="/final-block-plan"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-neu-btn-blue flex items-center gap-1.5"
            >
              <span>View Final Block Plan</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        </div>

        {sortedUpcomingSchedule.length === 0 ? (
          <div className="tactile-card p-8 rounded-xl text-center font-mono text-xs text-slate-500">
            No upcoming maintenance blocks. Run optimization pipeline to schedule pending requests.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedUpcomingSchedule.map((block, idx) => (
              <div key={idx} className="tactile-card p-4 rounded-xl border-l-4 border-l-emerald-500 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-900 font-display">
                  <span>{block.block_id} (Group {block.group_id})</span>
                  <span className="badge badge-final">ALLOCATED</span>
                </div>
                <div className="font-mono text-blue-600 text-[11px] font-bold">
                  Date: {block.date} • {block.block_start} — {block.block_end} ({block.allocated_duration_minutes}m)
                </div>
                <div className="text-slate-700 font-medium">
                  Corridor <strong>{block.corridor}</strong> ({block.work_area || 'Section Work Area'})
                </div>
                <div className="tactile-inset p-2 rounded-lg text-[11px] text-slate-600 space-y-0.5">
                  <div className="font-mono font-bold text-slate-700 uppercase">Tasks Included ({block.group_task_count || 1}):</div>
                  {(block.group_work_summary || []).slice(0, 2).map((w, wIdx) => (
                    <div key={wIdx} className="truncate">• {w}</div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Workers: <strong>{block.assigned_worker_details?.length || block.workers_required || 0}</strong></span>
                  <span>Equip: <strong>{block.assigned_equipment_details?.length || 1}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: PENDING MAINTENANCE REQUESTS & CONTROLLED PIPELINE DISPATCHER */}
      <section className="tactile-card rounded-2xl p-6 shadow-neu-flat space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-blue-600" />
              <h2 className="text-lg font-extrabold text-slate-900 font-display uppercase tracking-tight">
                PENDING MAINTENANCE REQUESTS (UNSCHEDULED QUEUE)
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Select specific requests to enter Phase 1 → Phase 2 → Phase 3 CP-SAT Optimization Solver.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SortControl
              options={pendingSortOptions}
              sortField={pendingSortField}
              onSortFieldChange={setPendingSortField}
              sortOrder={pendingSortOrder}
              onSortOrderChange={setPendingSortOrder}
            />
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100/60 p-3.5 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <button
              onClick={handleSelectAllPending}
              disabled={pendingRequests.length === 0}
              className="tactile-pill px-3 py-1.5 rounded-xl font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5 tactile-btn disabled:opacity-50"
            >
              <CheckSquare size={15} className="text-blue-600" />
              <span>Select All ({pendingRequests.length})</span>
            </button>

            <button
              onClick={handleClearSelection}
              disabled={selectedRequests.size === 0}
              className="tactile-pill px-3 py-1.5 rounded-xl font-semibold text-slate-700 hover:text-rose-600 flex items-center gap-1.5 tactile-btn disabled:opacity-50"
            >
              <Square size={15} className="text-slate-400" />
              <span>Clear Selection</span>
            </button>

            <span className="font-mono text-slate-500 font-bold">
              Selected: <strong className="text-blue-600">{selectedRequests.size}</strong> of {pendingRequests.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSelectedPipeline}
              disabled={selectedRequests.size === 0 || runningPipeline}
              className={`btn ${selectedRequests.size > 0 ? 'btn-primary' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} text-xs px-4 py-2 flex items-center gap-1.5`}
            >
              <PlaySquare size={16} />
              <span>{runningPipeline ? 'Optimizing...' : `Run Pipeline for Selected (${selectedRequests.size})`}</span>
            </button>
          </div>
        </div>

        {/* Pending Requests List */}
        {sortedPendingRequests.length === 0 ? (
          <div className="tactile-card p-8 rounded-xl text-center font-mono text-xs text-slate-500">
            No pending maintenance requests awaiting optimization.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPendingRequests.map((r, idx) => {
              const reqId = String(r.request_id).trim();
              const isSelected = selectedRequests.has(reqId);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelectRequest(reqId)}
                  className={`tactile-card p-4 rounded-xl cursor-pointer transition-all space-y-2 text-xs border ${
                    isSelected ? 'border-blue-500 bg-blue-50/40 shadow-neu-flat ring-2 ring-blue-500/30' : 'border-white/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div onClick
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                      <span>{r.request_id}</span>
                    </div>
                    <span className={`badge ${r.defect_severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {r.defect_severity || 'Medium'}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-900 truncate">
                    {r.defect_type} ({r.department})
                  </div>

                  <div className="font-mono text-[11px] text-slate-500">
                    Location: <strong>{r.corridor_id}</strong> ({r.location})
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-600 pt-1 border-t border-slate-200/60">
                    <span>Duration: <strong>{r.required_duration_hours}h</strong></span>
                    <span>Workers: <strong>{r.required_workers}</strong></span>
                    <span>Due: <strong>{r.due_date}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Visual Distribution Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="tactile-card rounded-2xl p-6 shadow-neu-flat">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200">
            <PieChart size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Defect Severity Distribution</h3>
          </div>

          <div className="space-y-3.5">
            {Object.entries(priorityCount).map(([key, val]) => {
              const pct = safeRequests.length ? Math.round((val / safeRequests.length) * 100) : 0;
              const colors = { Critical: '#e11d48', High: '#d97706', Medium: '#2563eb', Low: '#16a34a' };
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-800 font-bold">{key}</span>
                    <span className="text-slate-500">{val} ({pct}%)</span>
                  </div>
                  <div className="h-2 tactile-inset rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, background: colors[key] || '#2563eb' }} className="h-full rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Requests by Corridor */}
        <div className="tactile-card rounded-2xl p-6 shadow-neu-flat">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200">
            <GitCommit size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Requests by Corridor</h3>
          </div>

          <div className="space-y-3.5">
            {Object.entries(corridorCount).map(([corr, val]) => {
              const maxVal = Math.max(...Object.values(corridorCount), 1);
              const pct = Math.round((val / maxVal) * 100);
              return (
                <div key={corr}>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-800 font-bold">Corridor {corr}</span>
                    <span className="text-slate-500">{val} requests</span>
                  </div>
                  <div className="h-2 tactile-inset rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-indigo-600" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Allocation Status */}
        <div className="tactile-card rounded-2xl p-6 shadow-neu-flat">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200">
            <BarChart3 size={18} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Phase 3 Allocation Ratio</h3>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="text-4xl font-extrabold text-emerald-600 font-display">
              {allocatedCount} / {allocatedCount + unallocatedCount}
            </div>
            <div className="text-xs text-slate-500 font-mono">Block Groups Successfully Allocated</div>

            <div className="flex gap-1 h-3 tactile-inset rounded-full overflow-hidden mt-6">
              <div style={{ width: `${(allocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%` }} className="bg-emerald-500" title="Allocated" />
              <div style={{ width: `${(unallocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%` }} className="bg-rose-500" title="Unallocated" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
