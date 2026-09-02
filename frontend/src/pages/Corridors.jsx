import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const Corridors = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/corridors');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/corridors', updatedData);
    setData(updatedData);
  };

  const columns = [
    { key: 'corridor_id', label: 'Corridor ID', placeholder: 'Example: C1' },
    { key: 'corridor_name', label: 'Corridor Name', placeholder: 'Example: Salem - Chennai' },
    { key: 'total_length_km', label: 'Length (km)', type: 'number', placeholder: 'Example: 334' },
    { key: 'total_sections', label: 'Sections', type: 'number', placeholder: 'Example: 12' },
    { key: 'daily_train_frequency', label: 'Train Freq', type: 'number', placeholder: 'Example: 45' },
    { key: 'average_traffic_density', label: 'Traffic Density', type: 'number', placeholder: 'Example: 8.5' },
    { key: 'operational_priority', label: 'Priority', type: 'number', placeholder: 'Example: 1' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Corridors Dataset...</div>;

  return (
    <div>
      <DataGrid
        title="Corridor Master Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/corridors/export/csv"
        exportExcelUrl="/api/data/corridors/export/excel"
      />
    </div>
  );
};
