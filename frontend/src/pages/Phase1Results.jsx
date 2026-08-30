import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const Phase1Results = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/results/phase1');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'request_id', label: 'Request ID' },
    { key: 'department', label: 'Department' },
    { key: 'asset_id', label: 'Asset ID' },
    { key: 'corridor_id', label: 'Corridor' },
    { key: 'defect_type', label: 'Defect Type' },
    { key: 'defect_severity', label: 'Severity' },
    { key: 'safety_risk', label: 'Safety Risk' },
    { key: 'priority_score', label: 'Priority Score' },
    { key: 'priority_level', label: 'Priority Level' },
    { key: 'current_request_risk_score', label: 'Risk Score' },
    { key: 'required_duration_hours', label: 'Duration (hrs)' },
    { key: 'required_workers', label: 'Workers Req.' },
    { key: 'due_date', label: 'Due Date' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Phase 1 Output...</div>;

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>Phase 1 Analysis Results</h1>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px' }}>
          Maintenance Priority & Risk Scoring Engine Output
        </p>
      </div>

      <DataGrid
        title="Phase 1 Priority & Risk Output"
        columns={columns}
        data={data}
        readOnly={true}
      />
    </div>
  );
};
