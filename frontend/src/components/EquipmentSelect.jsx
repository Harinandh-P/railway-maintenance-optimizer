import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, ChevronDown, Wrench, AlertCircle } from 'lucide-react';

export const EquipmentSelect = ({ value, onChange, required = false, placeholder = "eg: EQ211 - Hydraulic Track Tamping Machine", hasError = false }) => {
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchEquipment();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/data/equipment');
      const rawData = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      
      // Deduplicate by equipment_id or equipment_name
      const seen = new Set();
      const uniqueList = rawData.filter(item => {
        if (!item || typeof item !== 'object') return false;
        const key = item.equipment_id || item.equipment_name || JSON.stringify(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setEquipmentList(uniqueList);
    } catch (err) {
      console.error('Failed to load equipment list:', err);
      const status = err.response?.status;
      const detailMsg = err.response?.data?.detail;
      const isAuthErr = status === 401 || status === 403 || detailMsg === 'Invalid credentials' || (typeof err.message === 'string' && err.message.includes('401'));
      
      if (isAuthErr) {
        setError('Session expired. Please log in again.');
      } else {
        setError('Failed to load equipment database');
      }
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEquipment = equipmentList.filter(eq => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const id = (eq.equipment_id || '').toLowerCase();
    const name = (eq.equipment_name || '').toLowerCase();
    const type = (eq.equipment_type || '').toLowerCase();
    const category = (eq.equipment_category || '').toLowerCase();
    const corridor = (eq.corridor || '').toLowerCase();
    return id.includes(term) || name.includes(term) || type.includes(term) || category.includes(term) || corridor.includes(term);
  });

  const handleSelect = (eq) => {
    const val = eq.equipment_id && eq.equipment_name ? `${eq.equipment_id} - ${eq.equipment_name}` : (eq.equipment_name || eq.equipment_id);
    onChange(val);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ebf0f7',
          border: hasError ? '1px solid #ef4444' : '1px solid #cbd5e1',
          boxShadow: hasError ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : 'none',
          borderRadius: '8px',
          padding: '10px 14px',
          color: value ? '#1a2638' : '#71829d',
          fontWeight: value ? 600 : 400,
          cursor: 'pointer',
          fontSize: '0.9rem',
          minWidth: '220px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
          <Wrench size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={18} color="#71829d" style={{ flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1100,
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}>
            <Search size={16} color="#71829d" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Name, Type, Category, or Corridor..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#1a2638',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ padding: '6px 12px', background: '#f1f5f9', fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
            Available Equipment: <strong>{filteredEquipment.length}</strong> of {equipmentList.length}
          </div>

          {/* List Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                Loading full equipment database...
              </div>
            ) : error ? (
              <div style={{ padding: '16px', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div style={{ padding: '16px', color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>
                No matching equipment found
              </div>
            ) : (
              filteredEquipment.map((eq, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(eq)}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1a2638' }}>
                    {eq.equipment_id} — {eq.equipment_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Type: <strong>{eq.equipment_type || 'General'}</strong> • Category: <strong>{eq.equipment_category || 'Maintenance'}</strong> • Corridor: <strong>{eq.corridor || 'All'}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
