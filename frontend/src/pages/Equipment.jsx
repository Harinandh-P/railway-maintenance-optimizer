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

  const handleDelete = async (row) => {
    if (row && row.equipment_id) {
      await api.delete(`/data/equipment/${row.equipment_id}`);
    }
  };

  const columns = [
    { key: 'equipment_id', label: 'Equipment ID', placeholder: 'e.g., EQ211' },
    { key: 'equipment_name', label: 'Equipment Name', placeholder: 'e.g., Track Machine' },
    { key: 'equipment_type', label: 'Type', placeholder: 'e.g., Tamping Machine' },
    { key: 'equipment_category', label: 'Category', placeholder: 'e.g., Heavy Equipment' },
    { key: 'quantity', label: 'Qty', type: 'number', placeholder: 'e.g., 2' },
    { key: 'condition', label: 'Condition', placeholder: 'e.g., Good' },
    { key: 'operational', label: 'Operational', placeholder: 'e.g., True' },
    { key: 'corridor', label: 'Corridor', placeholder: 'e.g., C1' },
    { key: 'available', label: 'Available', placeholder: 'e.g., True' },
    { key: 'status', label: 'Status', placeholder: 'e.g., Available' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Equipment Database...</div>;

  return (
    <div>
      <DataGrid
        title="Equipment Database (Canonical Source)"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/equipment/export/csv"
        exportExcelUrl="/api/data/equipment/export/excel"
      />
    </div>
  );
};
