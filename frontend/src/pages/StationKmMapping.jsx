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
    await api.post('/data/station-km', updatedData);
    await fetchData();
  };

  const handleDelete = async (row) => {
    if (row && row.mapping_id) {
      await api.delete(`/data/station-km/${row.mapping_id}`);
    }
  };

  const columns = [
    { key: 'mapping_id', label: 'Mapping ID', placeholder: 'eg: MAP001' },
    { key: 'corridor_id', label: 'Corridor', placeholder: 'eg: COR004' },
    { key: 'section_id', label: 'Section ID', placeholder: 'eg: SEC004' },
    { key: 'section_name', label: 'Section Name', placeholder: 'eg: Salem–Erode Main Line Section' },
    { key: 'start_station_code', label: 'Start Code', placeholder: 'eg: SA' },
    { key: 'start_station_name', label: 'Start Station', placeholder: 'eg: Salem Junction Station' },
    { key: 'start_km', label: 'Start KM', type: 'number', placeholder: 'eg: 120.0' },
    { key: 'end_station_code', label: 'End Code', placeholder: 'eg: ED' },
    { key: 'end_station_name', label: 'End Station', placeholder: 'eg: Erode Junction Station' },
    { key: 'end_km', label: 'End KM', type: 'number', placeholder: 'eg: 155.5' },
    { key: 'direction', label: 'Direction', placeholder: 'eg: UP' },
    { key: 'line_name', label: 'Line Name', placeholder: 'eg: Salem - Erode UP Main Line' },
    { key: 'track_id', label: 'Track', placeholder: 'eg: UP Main Line Track T1' }
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
