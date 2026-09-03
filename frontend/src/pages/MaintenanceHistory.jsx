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
      const res = await api.get('/data/maintenance-history/');
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updatedData) => {
    await api.post('/data/maintenance-history/', updatedData);
    setData(updatedData);
  };

  const handleDelete = async (row) => {
    if (row && row.task_id) {
      await api.delete(`/data/maintenance-history/${row.task_id}`);
    }
  };

  const columns = [
    { key: 'task_id', label: 'Task ID', placeholder: 'eg: TSK001' },
    { key: 'asset_id', label: 'Asset ID', placeholder: 'eg: AST012 - Track Joint' },
    { key: 'location', label: 'Location', placeholder: 'eg: C1-KM155.5 (Salem - Erode)' },
    { key: 'department', label: 'Department', placeholder: 'eg: Engineering (Track)' },
    { key: 'maintenance_type', label: 'Type', placeholder: 'eg: Corrective Maintenance' },
    { key: 'defect_type', label: 'Defect Type', placeholder: 'eg: Heavy Rail Joint Fracture' },
    { key: 'severity', label: 'Severity', placeholder: 'eg: Critical' },
    { key: 'planned_duration_hours', label: 'Planned (hrs)', type: 'number', placeholder: 'eg: 2.0' },
    { key: 'actual_duration_hours', label: 'Actual (hrs)', type: 'number', placeholder: 'eg: 2.5' },
    { key: 'previous_failure', label: 'Prev Failure', placeholder: 'eg: True' },
    { key: 'failure_date', label: 'Failure Date', placeholder: 'eg: 2026-08-01' },
    { key: 'maintenance_date', label: 'Maintenance Date', placeholder: 'eg: 2026-08-02' },
    { key: 'workers_used', label: 'Workers Used', type: 'number', placeholder: 'eg: 4' },
    { key: 'equipment_used', label: 'Equipment Used', placeholder: 'eg: Hydraulic Track Tamping Machine' }
  ];

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading Maintenance History...</div>;

  return (
    <div>
      <DataGrid
        title="Past Maintenance History Dataset"
        columns={columns}
        data={data}
        onSave={handleSave}
        onDeleteRow={handleDelete}
        exportCsvUrl="/api/data/maintenance-history/export/csv"
        exportExcelUrl="/api/data/maintenance-history/export/excel"
      />
    </div>
  );
};
