import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const MaintenanceHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/data/maintenance-history');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/maintenance-history', updatedData);
    setData(updatedData);
  };

  const columns = [
    { key: 'task_id', label: 'Task ID' },
    { key: 'asset_id', label: 'Asset ID' },
    { key: 'location', label: 'Location' },
    { key: 'department', label: 'Department' },
    { key: 'maintenance_type', label: 'Type' },
    { key: 'defect_type', label: 'Defect Type' },
    { key: 'severity', label: 'Severity' },
    { key: 'planned_duration_hours', label: 'Planned (hrs)', type: 'number' },
    { key: 'actual_duration_hours', label: 'Actual (hrs)', type: 'number' },
    { key: 'previous_failure', label: 'Prev Failure' },
    { key: 'failure_date', label: 'Failure Date' },
    { key: 'maintenance_date', label: 'Maintenance Date' },
    { key: 'workers_used', label: 'Workers Used', type: 'number' },
    { key: 'equipment_used', label: 'Equipment Used' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Maintenance History...</div>;

  return (
    <div>
      <DataGrid
        title="Past Maintenance History Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        exportCsvUrl="/api/data/maintenance-history/export/csv"
        exportExcelUrl="/api/data/maintenance-history/export/excel"
      />
    </div>
  );
};
