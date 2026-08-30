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

  const columns = [
    { key: 'mapping_id', label: 'Mapping ID' },
    { key: 'corridor_id', label: 'Corridor' },
    { key: 'section_id', label: 'Section ID' },
    { key: 'section_name', label: 'Section Name' },
    { key: 'start_station_code', label: 'Start Code' },
    { key: 'start_station_name', label: 'Start Station' },
    { key: 'start_km', label: 'Start KM', type: 'number' },
    { key: 'end_station_code', label: 'End Code' },
    { key: 'end_station_name', label: 'End Station' },
    { key: 'end_km', label: 'End KM', type: 'number' },
    { key: 'direction', label: 'Direction' },
    { key: 'line_name', label: 'Line Name' },
    { key: 'track_id', label: 'Track' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Station / KM Mapping...</div>;

  return (
    <div>
      <DataGrid
        title="Station / KM Section Mapping Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/station-km/export/csv"
        exportExcelUrl="/api/data/station-km/export/excel"
      />
    </div>
  );
};
