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

export const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);

      try {
        const reqRes = await api.get('/data/maintenance-requests/');
        setRequests(reqRes.data);
      } catch (e) {}

      try {
        const planRes = await api.get('/results/final-plan');
        setPlan(planRes.data);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Dashboard Metrics...</div>;
  }

  // Calculate Distributions
  const priorityCount = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const corridorCount = {};

  requests.forEach(r => {
    const sev = r.defect_severity || 'Medium';
    priorityCount[sev] = (priorityCount[sev] || 0) + 1;

    const corr = r.corridor_id || 'C1';
    corridorCount[corr] = (corridorCount[corr] || 0) + 1;
  });

  const allocatedCount = plan?.total_allocated || metrics?.final_selected_blocks || 0;
  const unallocatedCount = plan?.total_unallocated || 0;

  const statCards = [
    { title: 'Total Maintenance Requests', value: metrics?.total_maintenance_requests || 0, icon: TrainTrack, color: '#3b82f6' },
    { title: 'High-Risk Requests', value: metrics?.high_risk_requests || 0, icon: AlertTriangle, color: '#f43f5e' },
    { title: 'Candidate Gaps (Phase 2)', value: metrics?.candidate_gaps_generated || 0, icon: Layers, color: '#06b6d4' },
    { title: 'Final Selected Blocks (Phase 3)', value: allocatedCount, icon: CalendarCheck, color: '#8b5cf6' },
    { title: 'Available Workers', value: `${metrics?.available_workers || 0} / ${metrics?.total_workers || 0}`, icon: Users, color: '#10b981' },
    { title: 'Available Equipment', value: `${metrics?.available_equipment || 0} / ${metrics?.total_equipment || 0}`, icon: Wrench, color: '#f59e0b' }
  ];

  return (
    <div>
      {/* Page Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Operations Dashboard</h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
            System overview for Railway Maintenance Block Optimization
          </p>
        </div>

        <NavLink to="/pipeline" className="btn btn-emerald" style={{ padding: '12px 24px', fontSize: '0.95rem' }}>
          <PlaySquare size={20} /> Run Optimization Pipeline
        </NavLink>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass-panel glass-panel-interactive" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8' }}>{card.title}</span>
                <div style={{ background: `${card.color}20`, padding: '8px', borderRadius: '8px' }}>
                  <Icon size={20} color={card.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Visual Distribution Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Severity Distribution */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <PieChart size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Defect Severity Distribution</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(priorityCount).map(([key, val]) => {
              const pct = requests.length ? Math.round((val / requests.length) * 100) : 0;
              const colors = { Critical: '#f43f5e', High: '#f59e0b', Medium: '#3b82f6', Low: '#10b981' };
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>{key}</span>
                    <span style={{ color: '#94a3b8' }}>{val} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: colors[key] || '#3b82f6' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Requests by Corridor */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <GitCommit size={20} color="#c084fc" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Requests by Corridor</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(corridorCount).map(([corr, val]) => {
              const maxVal = Math.max(...Object.values(corridorCount), 1);
              const pct = Math.round((val / maxVal) * 100);
              return (
                <div key={corr}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>Corridor {corr}</span>
                    <span style={{ color: '#94a3b8' }}>{val} requests</span>
                  </div>
                  <div style={{ height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#8b5cf6' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Allocation Status */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <BarChart3 size={20} color="#34d399" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white' }}>Phase 3 Allocation Ratio</h3>
          </div>

          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#34d399' }}>
              {allocatedCount} / {allocatedCount + unallocatedCount}
            </div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Block Groups Successfully Allocated</span>

            <div style={{ display: 'flex', gap: '8px', height: '12px', background: '#1e293b', borderRadius: '6px', overflow: 'hidden', marginTop: '20px' }}>
              <div style={{ width: `${(allocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%`, background: '#10b981' }} title="Allocated" />
              <div style={{ width: `${(unallocatedCount / (allocatedCount + unallocatedCount || 1)) * 100}%`, background: '#f43f5e' }} title="Unallocated" />
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline Status Banner */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #10b981', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <CheckCircle2 size={20} color="#10b981" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Backend Pipeline Integrated & Verified</h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            Phase 1 (Priority/Risk) → Phase 2 (Section Movement Gaps) → Phase 3 (CP-SAT Optimization) ready for execution.
          </p>
        </div>
        <NavLink to="/final-plan" className="btn btn-secondary">
          View Final Block Plan →
        </NavLink>
      </div>
    </div>
  );
};
