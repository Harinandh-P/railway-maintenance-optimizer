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
    { key: 'mapping_id', label: 'Mapping ID', placeholder: 'Example: MAP001' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'Example: C1' },
    { key: 'section_id', label: 'Section ID', placeholder: 'Example: SEC-C1-01' },
    { key: 'section_name', label: 'Section Name', placeholder: 'Example: Salem - Erode' },
    { key: 'start_station_code', label: 'Start Code', placeholder: 'Example: SA' },
    { key: 'start_station_name', label: 'Start Station', placeholder: 'Example: Salem Junction' },
    { key: 'start_km', label: 'Start KM', type: 'number', placeholder: 'Example: 150' },
    { key: 'end_station_code', label: 'End Code', placeholder: 'Example: ED' },
    { key: 'end_station_name', label: 'End Station', placeholder: 'Example: Erode Junction' },
    { key: 'end_km', label: 'End KM', type: 'number', placeholder: 'Example: 210' },
    { key: 'direction', label: 'Direction', placeholder: 'Example: UP' },
    { key: 'line_name', label: 'Line Name', placeholder: 'Example: Main Line' },
    { key: 'track_id', label: 'Track', placeholder: 'Example: UP Track' }
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
