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
      const res = await api.get('/data/train-master/');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/train-master/', updatedData);
    setData(updatedData);
  };

  const handleDelete = async (row) => {
    if (row && row.train_id) {
      await api.delete(`/data/train-master/${row.train_id}`);
    }
  };

  const columns = [
    { key: 'train_id', label: 'Train ID', placeholder: 'e.g., TRN009' },
    { key: 'train_number', label: 'Train Number', placeholder: 'e.g., 12674' },
    { key: 'train_name', label: 'Train Name', placeholder: 'e.g., Chennai Express' },
    { key: 'train_type', label: 'Train Type', placeholder: 'e.g., Express' },
    { key: 'traffic_type', label: 'Traffic Type', placeholder: 'e.g., Passenger' },
    { key: 'origin', label: 'Origin', placeholder: 'e.g., Salem' },
    { key: 'destination', label: 'Destination', placeholder: 'e.g., Chennai' },
    { key: 'direction', label: 'Direction', placeholder: 'e.g., UP' },
    { key: 'running_days', label: 'Running Days', placeholder: 'e.g., DAILY' },
    { key: 'frequency_per_hour', label: 'Frequency (tph)', type: 'number', placeholder: 'e.g., 2' },
    { key: 'priority_class', label: 'Priority Class', type: 'number', placeholder: 'e.g., 1' },
    { key: 'operational_status', label: 'Status', placeholder: 'e.g., Active' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Train Master...</div>;

  return (
    <div>
      <DataGrid
        title="Train Master Dataset (Section-Aware Header Model)"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        importCsvUrl="/api/data/train-master/import/csv"
        onRefresh={fetchData}
        exportCsvUrl="/api/data/train-master/export/csv"
        exportExcelUrl="/api/data/train-master/export/excel"
      />
    </div>
  );
};
