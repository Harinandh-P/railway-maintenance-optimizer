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
    { key: 'equipment_id', label: 'Equipment ID', placeholder: 'Example: EQ001' },
    { key: 'equipment_name', label: 'Equipment Name', placeholder: 'Example: Track Machine' },
    { key: 'equipment_type', label: 'Type', placeholder: 'Example: Tamping Machine' },
    { key: 'equipment_category', label: 'Category', placeholder: 'Example: Heavy Equipment' },
    { key: 'quantity', label: 'Qty', type: 'number', placeholder: 'Example: 1' },
    { key: 'condition', label: 'Condition', placeholder: 'Example: Good' },
    { key: 'operational', label: 'Operational', placeholder: 'Example: True' },
    { key: 'corridor', label: 'Corridor', placeholder: 'Example: C1' },
    { key: 'available', label: 'Available', placeholder: 'Example: True' },
    { key: 'status', label: 'Status', placeholder: 'Example: Available' }
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
