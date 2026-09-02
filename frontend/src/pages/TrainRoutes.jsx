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
    { key: 'train_id', label: 'Train ID', placeholder: 'Example: T001' },
    { key: 'train_number', label: 'Train No', placeholder: 'Example: 12673' },
    { key: 'sequence', label: 'Seq', type: 'number', placeholder: 'Example: 1' },
    { key: 'station_code', label: 'Station Code', placeholder: 'Example: SA' },
    { key: 'station_name', label: 'Station Name', placeholder: 'Example: Salem Junction' },
    { key: 'arrival_time', label: 'Arrival', placeholder: 'Example: 06:00' },
    { key: 'departure_time', label: 'Departure', placeholder: 'Example: 06:15' },
    { key: 'distance_from_origin', label: 'Dist Origin (km)', type: 'number', placeholder: 'Example: 0' },
    { key: 'distance_from_previous_station', label: 'Dist Prev (km)', type: 'number', placeholder: 'Example: 15' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'Example: C1' },
    { key: 'section_id', label: 'Section ID', placeholder: 'Example: SEC-C1-01' },
    { key: 'direction', label: 'Direction', placeholder: 'Example: UP' },
    { key: 'km_location', label: 'KM Loc', type: 'number', placeholder: 'Example: 155' },
    { key: 'from_km', label: 'From KM', type: 'number', placeholder: 'Example: 150' },
    { key: 'to_km', label: 'To KM', type: 'number', placeholder: 'Example: 160' },
    { key: 'previous_station', label: 'Prev Station', placeholder: 'Example: Station A' },
    { key: 'next_station', label: 'Next Station', placeholder: 'Example: Station B' },
    { key: 'track_id', label: 'Track', placeholder: 'Example: UP Track' },
    { key: 'railway_division', label: 'Division', placeholder: 'Example: Salem Division' }
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
