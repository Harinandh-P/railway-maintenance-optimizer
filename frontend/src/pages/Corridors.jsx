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

  const handleDelete = async (row) => {
    if (row && row.corridor_id && row.track_id) {
      await api.delete(`/data/corridors/${row.corridor_id}/${row.track_id}`);
    } else if (row && row.corridor_id) {
      await api.delete(`/data/corridors/${row.corridor_id}`);
    }
  };

  const columns = [
    { key: 'corridor_id', label: 'Corridor ID', placeholder: 'e.g., COR004' },
    { key: 'track_id', label: 'Track ID', placeholder: 'e.g., T1' },
    { key: 'track_capacity', label: 'Track Capacity', type: 'number', placeholder: 'e.g., 100' },
    { key: 'current_occupancy', label: 'Current Occupancy', type: 'number', placeholder: 'e.g., 50' },
    { key: 'direction', label: 'Direction', placeholder: 'e.g., Both' },
    { key: 'compatible_train_types', label: 'Compatible Trains', placeholder: 'e.g., Passenger,Goods' },
    { key: 'alternative_routing_possible', label: 'Alt Routing', placeholder: 'e.g., False' },
    { key: 'block_availability', label: 'Block Available', placeholder: 'e.g., True' },
    { key: 'existing_restrictions', label: 'Existing Restrictions', placeholder: 'e.g., Speed restriction' },
    { key: 'maintenance_restrictions', label: 'Maintenance Restrictions', placeholder: 'e.g., Maintenance requested' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Corridors Dataset...</div>;

  return (
    <div>
      <DataGrid
        title="Corridor Master Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/corridors/export/csv"
        exportExcelUrl="/api/data/corridors/export/excel"
      />
    </div>
  );
};
