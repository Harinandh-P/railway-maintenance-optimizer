import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const Workers = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/workers');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/workers', updatedData);
    setData(updatedData);
  };

  const columns = [
    { key: 'worker_id', label: 'Worker ID', placeholder: 'Example: W001' },
    { key: 'worker_name', label: 'Name', placeholder: 'Example: Raj Kumar' },
    { key: 'worker_type', label: 'Sector', placeholder: 'Example: TRACK' },
    { key: 'skill', label: 'Skill', placeholder: 'Example: Track Maintenance' },
    { key: 'skill_level', label: 'Skill Level', type: 'number', placeholder: 'Example: 2' },
    { key: 'qualification_level', label: 'Qualification', placeholder: 'Example: Senior Technician' },
    { key: 'corridor', label: 'Corridor', placeholder: 'Example: C1' },
    { key: 'available', label: 'Available', placeholder: 'Example: True' },
    { key: 'status', label: 'Status', placeholder: 'Example: Available' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Workers Database...</div>;

  return (
    <div>
      <DataGrid
        title="Worker Database (Canonical Source)"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/workers/export/csv"
        exportExcelUrl="/api/data/workers/export/excel"
      />
    </div>
  );
};
