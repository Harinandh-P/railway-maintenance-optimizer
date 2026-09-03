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
  GitCommit,
  Activity,
  Radio,
  Cpu
} from 'lucide-react';
import api from '../services/api';

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
      <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8] font-mono">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div>LOADING MISSION CONTROL METRICS...</div>
      </div>
    );
  }

  // Calculate Distributions safely
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
    { title: 'Total Maintenance Requests', value: metrics?.total_maintenance_requests || 0, icon: TrainTrack, color: '#3B82F6' },
    { title: 'High-Risk Requests', value: metrics?.high_risk_requests || 0, icon: AlertTriangle, color: '#EF4444' },
    { title: 'Candidate Gaps (Phase 2)', value: metrics?.candidate_gaps_generated || 0, icon: Layers, color: '#06B6D4' },
    { title: 'Final Selected Blocks (Phase 3)', value: allocatedCount, icon: CalendarCheck, color: '#8B5CF6' },
    { title: 'Available Workers', value: `${metrics?.available_workers || 0} / ${metrics?.total_workers || 0}`, icon: Users, color: '#10B981' },
    { title: 'Available Equipment', value: `${metrics?.available_equipment || 0} / ${metrics?.total_equipment || 0}`, icon: Wrench, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Banner */}
      <section className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-widest">
              AROHA MISSION CONTROL // ADMIN CONSOLE
            </span>
            <span className="bg-[#101726] border border-[#24334D] text-[#DFE2EE] font-mono text-[11px] px-3 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SYSTEM ONLINE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#DFE2EE] font-display uppercase tracking-tight">
            RAILWAY OPERATIONS DASHBOARD
          </h1>
          <p className="text-xs md:text-sm text-[#94A3B8] mt-1 font-sans">
            Real-time Telemetry & Block Optimization Overview • Sector NR-HQ / DLI
          </p>
        </div>

        <NavLink
          to="/pipeline"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2.5 transition-all transform active:scale-95"
        >
          <PlaySquare size={18} strokeWidth={2.5} />
          <span>RUN OPTIMIZATION PIPELINE</span>
        </NavLink>
      </section>

      {errorBanner && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-400 p-4 rounded-xl text-sm flex items-center gap-3">
          <AlertTriangle size={18} />
          <span>Notice: {errorBanner}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-5 shadow-lg flex items-center justify-between hover:border-blue-500/40 transition-all">
              <div>
                <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider">{card.title}</div>
                <div className="text-3xl font-extrabold text-[#DFE2EE] font-mono mt-1">{card.value}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#151E2E] border border-[#24334D] flex items-center justify-center" style={{ color: card.color }}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Distribution Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#24334D]">
            <PieChart size={18} className="text-blue-500" />
            <h3 className="text-base font-bold text-[#DFE2EE] font-display">Defect Severity Distribution</h3>
          </div>

          <div className="space-y-4">
            {Object.entries(priorityCount).map(([key, val]) => {
              const pct = safeRequests.length ? Math.round((val / safeRequests.length) * 100) : 0;
              const colors = { Critical: '#EF4444', High: '#F59E0B', Medium: '#3B82F6', Low: '#10B981' };
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#DFE2EE] font-bold">{key}</span>
                    <span className="text-[#94A3B8]">{val} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#101726] rounded-full overflow-hidden border border-[#24334D]">
                    <div style={{ width: `${pct}%`, background: colors[key] || '#3B82F6' }} className="h-full rounded-full" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Requests by Corridor */}
        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#24334D]">
            <GitCommit size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-[#DFE2EE] font-display">Requests by Corridor</h3>
          </div>

          <div className="space-y-4">
            {Object.entries(corridorCount).map(([corr, val]) => {
              const maxVal = Math.max(...Object.values(corridorCount), 1);
              const pct = Math.round((val / maxVal) * 100);
              return (
                <div key={corr}>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#DFE2EE] font-bold">Corridor {corr}</span>
                    <span className="text-[#94A3B8]">{val} requests</span>
                  </div>
                  <div className="h-2 bg-[#101726] rounded-full overflow-hidden border border-[#24334D]">
                    <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-purple-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Allocation Status */}
        <div className="bg-[#1A2438] border border-[#24334D] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#24334D]">
            <BarChart3 size={18} className="text-emerald-400" />
            <h3 className="text-base font-bold text-[#DFE2EE] font-display">Phase 3 Allocation Ratio</h3>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="text-4xl font-extrabold text-emerald-400 font-mono">
              {allocatedCount} / {allocatedCount + unallocatedCount}
            </div>
            <div className="text-xs text-[#94A3B8] font-mono">Block Groups Successfully Allocated</div>

            <div className="flex gap-1 h-3 bg-[#101726] rounded-full overflow-hidden border border-[#24334D] mt-6">
              <div style={{ width: `${(allocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%` }} className="bg-emerald-500" title="Allocated" />
              <div style={{ width: `${(unallocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%` }} className="bg-red-500" title="Unallocated" />
            </div>
          </div>
        </div>
      </div>

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
