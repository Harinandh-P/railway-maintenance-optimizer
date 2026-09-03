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

  if (loading) return <div style={{ color: '#94A3B8', padding: '40px', fontFamily: "'JetBrains Mono', monospace" }}>LOADING ROUTE DATA MATRIX...</div>;

  return (
    <div>
      {/* Dataset Hero Banner */}
      <section className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'center',
        background: '#1A2438',
        border: '1px solid #24334D',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3B82F6' }}>
              TOPOLOGY ENGINE // MATRIX B4
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 10px',
              borderRadius: '9999px',
              background: '#101726',
              border: '1px solid #24334D',
              fontSize: '0.70rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#C2C6D6'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
              Showing {data.length} existing records
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DFE2EE', textTransform: 'uppercase', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            TRAIN ROUTE SEQUENCE DATASET
          </h2>
          <div style={{ fontSize: '0.80rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Station-by-Station Movement Model</span>
            <span style={{ color: '#64748B' }}>•</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>Phase-1 Conflict Calibration Grid</span>
          </div>
        </div>

        {/* Right Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '12px 16px', background: '#151E2E', border: '1px solid #24334D', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justify: 'center', color: '#3B82F6' }}>
              ⚡
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PARTITION SECTOR</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DFE2EE' }}>IR Sector 4B (Northern Grid)</div>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: '#151E2E', border: '1px solid #24334D', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', display: 'flex', alignItems: 'center', justify: 'center', color: '#8B5CF6' }}>
              📡
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontFamily: "'JetBrains Mono', monospace", color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SYNC STATE</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DFE2EE' }}>
                Just now <span style={{ color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>//</span> <span style={{ color: '#10B981' }}>Synced</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DataGrid
        title="Movement Grid Data"
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
