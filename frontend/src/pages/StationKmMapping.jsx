import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const StationKmMapping = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/station-km');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/station-km', updatedData);
    setData(updatedData);
  };

  const handleDelete = async (row) => {
    if (row && row.mapping_id) {
      await api.delete(`/data/station-km/${row.mapping_id}`);
    }
  };

  const columns = [
    { key: 'mapping_id', label: 'Mapping ID', placeholder: 'e.g., MAP001' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'e.g., COR004' },
    { key: 'section_id', label: 'Section ID', placeholder: 'e.g., SEC004' },
    { key: 'section_name', label: 'Section Name', placeholder: 'e.g., Salem–Chennai Section' },
    { key: 'start_station_code', label: 'Start Code', placeholder: 'e.g., SA' },
    { key: 'start_station_name', label: 'Start Station', placeholder: 'e.g., Salem Junction' },
    { key: 'start_km', label: 'Start KM', type: 'number', placeholder: 'e.g., 120' },
    { key: 'end_station_code', label: 'End Code', placeholder: 'e.g., ED' },
    { key: 'end_station_name', label: 'End Station', placeholder: 'e.g., Erode Junction' },
    { key: 'end_km', label: 'End KM', type: 'number', placeholder: 'e.g., 155' },
    { key: 'direction', label: 'Direction', placeholder: 'e.g., UP' },
    { key: 'line_name', label: 'Line Name', placeholder: 'e.g., Main Line' },
    { key: 'track_id', label: 'Track', placeholder: 'e.g., UP Track' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Station / KM Mapping...</div>;

  return (
    <div>
      <DataGrid
        title="Station / KM Section Mapping Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/station-km/export/csv"
        exportExcelUrl="/api/data/station-km/export/excel"
      />
    </div>
  );
};
