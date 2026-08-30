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

  const columns = [
    { key: 'train_id', label: 'Train ID' },
    { key: 'train_number', label: 'Train No' },
    { key: 'sequence', label: 'Seq', type: 'number' },
    { key: 'station_code', label: 'Station Code' },
    { key: 'station_name', label: 'Station Name' },
    { key: 'arrival_time', label: 'Arrival' },
    { key: 'departure_time', label: 'Departure' },
    { key: 'distance_from_origin', label: 'Dist Origin (km)', type: 'number' },
    { key: 'distance_from_previous_station', label: 'Dist Prev (km)', type: 'number' },
    { key: 'corridor_id', label: 'Corridor' },
    { key: 'section_id', label: 'Section ID' },
    { key: 'direction', label: 'Direction' },
    { key: 'km_location', label: 'KM Loc', type: 'number' },
    { key: 'from_km', label: 'From KM', type: 'number' },
    { key: 'to_km', label: 'To KM', type: 'number' },
    { key: 'previous_station', label: 'Prev Station' },
    { key: 'next_station', label: 'Next Station' },
    { key: 'track_id', label: 'Track' },
    { key: 'railway_division', label: 'Division' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Train Routes...</div>;

  return (
    <div>
      <DataGrid
        title="Train Route Sequence Dataset (Station-by-Station Movement Model)"
        columns={columns}
        data={data}
        onSave={handleSave}
        importCsvUrl="/api/data/train-routes/import/csv"
        onRefresh={fetchData}
        exportCsvUrl="/api/data/train-routes/export/csv"
        exportExcelUrl="/api/data/train-routes/export/excel"
      />
    </div>
  );
};
