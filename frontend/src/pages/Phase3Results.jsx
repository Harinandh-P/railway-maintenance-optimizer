import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CalendarCheck } from 'lucide-react';

export const Phase3Results = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/results/phase3');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Phase 3 Output...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Phase 3 CP-SAT Optimization Summary</h1>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
          Resource-Aware Mathematical CP-SAT Block Optimization Output
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '16px' }}>Optimization Execution Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>TOTAL GROUPS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>{data?.total_groups || 0}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ALLOCATED GROUPS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{data?.allocated_groups || 0}</div>
          </div>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>UNALLOCATED GROUPS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e' }}>{data?.unallocated_groups || 0}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Raw JSON Response</h3>
        <pre style={{ background: '#090d16', padding: '16px', borderRadius: '8px', color: '#38bdf8', fontSize: '0.82rem', overflowX: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
};
