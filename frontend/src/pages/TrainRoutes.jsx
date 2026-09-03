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
    await api.post('/data/train-routes', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.train_id) {
      await api.delete(`/data/train-routes/${row.train_id}`);
    }
  };

  const columns = [
    { key: 'train_id', label: 'Train ID', placeholder: 'eg: TRN009' },
    { key: 'train_number', label: 'Train No', placeholder: 'eg: 12674' },
    { key: 'sequence', label: 'Seq', type: 'number', placeholder: 'eg: 5' },
    { key: 'station_code', label: 'Station Code', placeholder: 'eg: SA' },
    { key: 'station_name', label: 'Station Name', placeholder: 'eg: Salem Junction Station' },
    { key: 'arrival_time', label: 'Arrival', placeholder: 'eg: 06:00' },
    { key: 'departure_time', label: 'Departure', placeholder: 'eg: 06:15' },
    { key: 'distance_from_origin', label: 'Dist Origin (km)', type: 'number', placeholder: 'eg: 155' },
    { key: 'distance_from_previous_station', label: 'Dist Prev (km)', type: 'number', placeholder: 'eg: 15' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'eg: C1' },
    { key: 'section_id', label: 'Section ID', placeholder: 'eg: SEC004' },
    { key: 'direction', label: 'Direction', placeholder: 'eg: UP' },
    { key: 'km_location', label: 'KM Loc', type: 'number', placeholder: 'eg: 155.5' },
    { key: 'from_km', label: 'From KM', type: 'number', placeholder: 'eg: 150.0' },
    { key: 'to_km', label: 'To KM', type: 'number', placeholder: 'eg: 160.0' },
    { key: 'previous_station', label: 'Prev Station', placeholder: 'eg: Karuppur Station' },
    { key: 'next_station', label: 'Next Station', placeholder: 'eg: Erode Junction' },
    { key: 'track_id', label: 'Track', placeholder: 'eg: UP Main Line Track T1' },
    { key: 'railway_division', label: 'Division', placeholder: 'eg: Salem Division' }
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
