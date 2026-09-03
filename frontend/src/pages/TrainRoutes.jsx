import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const TrainRoutes = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/train-routes');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/train-routes', updatedData);
    setData(updatedData);
  };

  const handleDelete = async (row) => {
    if (row && row.train_id) {
      await api.delete(`/data/train-routes/${row.train_id}`);
    }
  };

  const columns = [
    { key: 'train_id', label: 'Train ID', placeholder: 'e.g., TRN009' },
    { key: 'train_number', label: 'Train No', placeholder: 'e.g., 12674' },
    { key: 'sequence', label: 'Seq', type: 'number', placeholder: 'e.g., 5' },
    { key: 'station_code', label: 'Station Code', placeholder: 'e.g., SA' },
    { key: 'station_name', label: 'Station Name', placeholder: 'e.g., Salem Junction' },
    { key: 'arrival_time', label: 'Arrival', placeholder: 'e.g., 06:00' },
    { key: 'departure_time', label: 'Departure', placeholder: 'e.g., 06:15' },
    { key: 'distance_from_origin', label: 'Dist Origin (km)', type: 'number', placeholder: 'e.g., 0' },
    { key: 'distance_from_previous_station', label: 'Dist Prev (km)', type: 'number', placeholder: 'e.g., 15' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'e.g., C1' },
    { key: 'section_id', label: 'Section ID', placeholder: 'e.g., SEC004' },
    { key: 'direction', label: 'Direction', placeholder: 'e.g., UP' },
    { key: 'km_location', label: 'KM Loc', type: 'number', placeholder: 'e.g., 155' },
    { key: 'from_km', label: 'From KM', type: 'number', placeholder: 'e.g., 150' },
    { key: 'to_km', label: 'To KM', type: 'number', placeholder: 'e.g., 160' },
    { key: 'previous_station', label: 'Prev Station', placeholder: 'e.g., Station A' },
    { key: 'next_station', label: 'Next Station', placeholder: 'e.g., Station B' },
    { key: 'track_id', label: 'Track', placeholder: 'e.g., UP Track' },
    { key: 'railway_division', label: 'Division', placeholder: 'e.g., Salem Division' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Train Routes...</div>;

  return (
    <div>
      <DataGrid
        title="Train Route Sequence Dataset (Station-by-Station Movement Model)"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        importCsvUrl="/api/data/train-routes/import/csv"
        onRefresh={fetchData}
        exportCsvUrl="/api/data/train-routes/export/csv"
        exportExcelUrl="/api/data/train-routes/export/excel"
      />
    </div>
  );
};
