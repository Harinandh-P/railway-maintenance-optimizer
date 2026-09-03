import React, { useState, useEffect } from 'react';
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
  GitCommit
} from 'lucide-react';
import api from '../services/api';
import { TiltCard } from '../components/TiltCard';

export const Dashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [requests, setRequests] = useState([]);
  const [plan, setPlan] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING MISSION CONTROL METRICS...</div>
      </div>
    );
  }

  const safeRequests = Array.isArray(requests) ? requests : [];
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
    { title: 'Candidate Gaps (Phase 2)', value: metrics?.candidate_gaps_generated || 0, icon: Layers, color: 'text-cyan-600', bg: 'bg-cyan-100/70' },
    { title: 'Final Selected Blocks (Phase 3)', value: allocatedCount, icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-100/70' },
    { title: 'Available Workers', value: `${metrics?.available_workers || 0} / ${metrics?.total_workers || 0}`, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100/70' },
    { title: 'Available Equipment', value: `${metrics?.available_equipment || 0} / ${metrics?.total_equipment || 0}`, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100/70' }
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Page Banner */}
      <section className="tactile-card rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 shadow-neu-flat">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
              AROHA // ADMIN OPERATIONS DASHBOARD
            </span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              SYSTEM ONLINE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            RAILWAY MAINTENANCE DASHBOARD
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-Time System Overview & Optimization Telemetry • Sector NR-HQ / DLI
          </p>
        </div>

        <NavLink
          to="/pipeline"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-neu-btn-blue flex items-center gap-2 transform active:scale-95 transition-all"
        >
          <PlaySquare size={16} strokeWidth={2.5} />
          <span>Run Optimization Pipeline</span>
        </NavLink>
      </section>

      {errorBanner && (
        <div className="tactile-pill border-l-4 border-rose-500 p-4 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Notice: {errorBanner}</span>
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
