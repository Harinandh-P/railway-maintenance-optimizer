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
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      setData(list);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/workers', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.worker_id) {
      await api.delete(`/data/workers/${row.worker_id}`);
    }
  };

  const columns = [
    { key: 'worker_id', label: 'Worker ID', placeholder: 'eg: W081' },
    { key: 'worker_name', label: 'Name', placeholder: 'eg: Arun Kumar - Senior Track Technician' },
    { key: 'worker_type', label: 'Sector', placeholder: 'eg: TRACK' },
    { key: 'skill', label: 'Skill', placeholder: 'eg: Heavy Rail Track Maintenance & Welding' },
    { key: 'skill_level', label: 'Skill Level', type: 'number', placeholder: 'eg: 3' },
    { key: 'qualification_level', label: 'Qualification', placeholder: 'eg: Senior Certified Technician' },
    { key: 'corridor', label: 'Corridor', placeholder: 'eg: C1 - Salem to Chennai Main Line' },
    { key: 'available', label: 'Available', placeholder: 'eg: True' },
    { key: 'status', label: 'Status', placeholder: 'eg: Available' }
  ];

  if (loading) return <div style={{ color: '#94A3B8', padding: '40px' }}>Loading Workers Database...</div>;

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
