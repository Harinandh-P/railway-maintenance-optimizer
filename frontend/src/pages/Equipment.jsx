import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const Equipment = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/equipment');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/equipment', updatedData);
    setData(updatedData);
  };

  const columns = [
    { key: 'equipment_id', label: 'Equipment ID' },
    { key: 'equipment_name', label: 'Equipment Name' },
    { key: 'equipment_type', label: 'Type' },
    { key: 'equipment_category', label: 'Category' },
    { key: 'quantity', label: 'Qty', type: 'number' },
    { key: 'condition', label: 'Condition' },
    { key: 'operational', label: 'Operational' },
    { key: 'corridor', label: 'Corridor' },
    { key: 'available', label: 'Available' },
    { key: 'status', label: 'Status' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Equipment Database...</div>;

  return (
    <div>
      <DataGrid
        title="Equipment Database (Canonical Source)"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/equipment/export/csv"
        exportExcelUrl="/api/data/equipment/export/excel"
      />
    </div>
  );
};
