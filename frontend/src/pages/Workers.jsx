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

  const handleDelete = async (row) => {
    if (row && row.worker_id) {
      await api.delete(`/data/workers/${row.worker_id}`);
    }
  };

  const columns = [
    { key: 'worker_id', label: 'Worker ID', placeholder: 'e.g., W081' },
    { key: 'worker_name', label: 'Name', placeholder: 'e.g., Arun Kumar' },
    { key: 'worker_type', label: 'Sector', placeholder: 'e.g., TRACK' },
    { key: 'skill', label: 'Skill', placeholder: 'e.g., Track Maintenance' },
    { key: 'skill_level', label: 'Skill Level', type: 'number', placeholder: 'e.g., 3' },
    { key: 'qualification_level', label: 'Qualification', placeholder: 'e.g., Senior Technician' },
    { key: 'corridor', label: 'Corridor', placeholder: 'e.g., C1' },
    { key: 'available', label: 'Available', placeholder: 'e.g., True' },
    { key: 'status', label: 'Status', placeholder: 'e.g., Available' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Workers Database...</div>;

  return (
    <div>
      <DataGrid
        title="Worker Database (Canonical Source)"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/workers/export/csv"
        exportExcelUrl="/api/data/workers/export/excel"
      />
    </div>
  );
};
