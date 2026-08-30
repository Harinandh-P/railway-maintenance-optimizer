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
    { key: 'worker_id', label: 'Worker ID' },
    { key: 'worker_name', label: 'Name' },
    { key: 'worker_type', label: 'Sector' },
    { key: 'skill', label: 'Skill' },
    { key: 'skill_level', label: 'Skill Level', type: 'number' },
    { key: 'qualification_level', label: 'Qualification' },
    { key: 'corridor', label: 'Corridor' },
    { key: 'available', label: 'Available' },
    { key: 'status', label: 'Status' }
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
