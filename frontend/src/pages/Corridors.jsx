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
    { key: 'corridor_id', label: 'Corridor ID' },
    { key: 'corridor_name', label: 'Corridor Name' },
    { key: 'total_length_km', label: 'Length (km)', type: 'number' },
    { key: 'total_sections', label: 'Sections', type: 'number' },
    { key: 'daily_train_frequency', label: 'Train Freq', type: 'number' },
    { key: 'average_traffic_density', label: 'Traffic Density', type: 'number' },
    { key: 'operational_priority', label: 'Priority', type: 'number' }
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
