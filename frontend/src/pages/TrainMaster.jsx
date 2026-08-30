import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const TrainMaster = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/train-master');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/train-master', updatedData);
    setData(updatedData);
  };

  const columns = [
    { key: 'train_id', label: 'Train ID' },
    { key: 'train_number', label: 'Train Number' },
    { key: 'train_name', label: 'Train Name' },
    { key: 'train_type', label: 'Train Type' },
    { key: 'traffic_type', label: 'Traffic Type' },
    { key: 'origin', label: 'Origin' },
    { key: 'destination', label: 'Destination' },
    { key: 'direction', label: 'Direction' },
    { key: 'running_days', label: 'Running Days' },
    { key: 'frequency_per_hour', label: 'Frequency (tph)', type: 'number' },
    { key: 'priority_class', label: 'Priority Class', type: 'number' },
    { key: 'operational_status', label: 'Status' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Train Master...</div>;

  return (
    <div>
      <DataGrid
        title="Train Master Dataset (Section-Aware Header Model)"
        columns={columns}
        data={data}
        onSave={handleSave}
        importCsvUrl="/api/data/train-master/import/csv"
        onRefresh={fetchData}
        exportCsvUrl="/api/data/train-master/export/csv"
        exportExcelUrl="/api/data/train-master/export/excel"
      />
    </div>
  );
};
