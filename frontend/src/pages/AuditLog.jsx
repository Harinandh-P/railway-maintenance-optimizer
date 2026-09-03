import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { DataGrid } from '../components/DataGrid';

export const AuditLog = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/audit-log');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      setData(list);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'log_id', label: 'Log ID' },
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'username', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'action', label: 'Action' },
    { key: 'dataset', label: 'Dataset' },
    { key: 'details', label: 'Details' }
  ];

  if (loading) return <div style={{ color: '#94A3B8', padding: '40px' }}>Loading Audit Logs...</div>;

  return (
    <div>
      <DataGrid
        title="System Security & Modification Audit Logs"
        columns={columns}
        data={data}
        readOnly={true}
      />
    </div>
  );
};
