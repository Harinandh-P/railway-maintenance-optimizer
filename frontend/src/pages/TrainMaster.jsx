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
    await api.post('/data/train-master', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.train_id) {
      await api.delete(`/data/train-master/${row.train_id}`);
    }
  };

  const columns = [
    { key: 'train_id', label: 'Train ID', placeholder: 'eg: TRN009' },
    { key: 'train_number', label: 'Train Number', placeholder: 'eg: 12674' },
    { key: 'train_name', label: 'Train Name', placeholder: 'eg: Cheran Superfast Express' },
    { key: 'train_type', label: 'Train Type', placeholder: 'eg: Superfast Express' },
    { key: 'traffic_type', label: 'Traffic Type', placeholder: 'eg: Passenger' },
    { key: 'origin', label: 'Origin', placeholder: 'eg: Salem Junction (SA)' },
    { key: 'destination', label: 'Destination', placeholder: 'eg: Chennai Central (MAS)' },
    { key: 'direction', label: 'Direction', placeholder: 'eg: UP' },
    { key: 'running_days', label: 'Running Days', placeholder: 'eg: DAILY' },
    { key: 'frequency_per_hour', label: 'Frequency (tph)', type: 'number', placeholder: 'eg: 2' },
    { key: 'priority_class', label: 'Priority Class', type: 'number', placeholder: 'eg: 1' },
    { key: 'operational_status', label: 'Status', placeholder: 'eg: Active' }
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
