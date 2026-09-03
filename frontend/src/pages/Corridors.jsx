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
    await api.post('/data/corridors', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.corridor_id && row.track_id) {
      await api.delete(`/data/corridors/${row.corridor_id}/${row.track_id}`);
    } else if (row && row.corridor_id) {
      await api.delete(`/data/corridors/${row.corridor_id}`);
    }
  };

  const columns = [
    { key: 'corridor_id', label: 'Corridor ID', placeholder: 'eg: COR004' },
    { key: 'track_id', label: 'Track ID', placeholder: 'eg: T1' },
    { key: 'track_capacity', label: 'Track Capacity', type: 'number', placeholder: 'eg: 100' },
    { key: 'current_occupancy', label: 'Current Occupancy', type: 'number', placeholder: 'eg: 50' },
    { key: 'direction', label: 'Direction', placeholder: 'eg: Both UP & DOWN' },
    { key: 'compatible_train_types', label: 'Compatible Trains', placeholder: 'eg: Passenger, Freight, Express' },
    { key: 'alternative_routing_possible', label: 'Alt Routing', placeholder: 'eg: False' },
    { key: 'block_availability', label: 'Block Available', placeholder: 'eg: True' },
    { key: 'existing_restrictions', label: 'Existing Restrictions', placeholder: 'eg: Speed restriction 30 km/h' },
    { key: 'maintenance_restrictions', label: 'Maintenance Restrictions', placeholder: 'eg: Night maintenance block only' }
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
