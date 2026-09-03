import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, ChevronDown, Wrench, AlertCircle } from 'lucide-react';

export const EquipmentSelect = ({ value, onChange, required = false, placeholder = "eg: EQ211 - Hydraulic Track Tamping Machine" }) => {
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
      const res = await api.get('/data/equipment/');
      setEquipmentList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load equipment list:', err);
      setError('Failed to load equipment database');
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
          justify: 'space-between',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px 14px',
          color: value ? 'white' : '#94a3b8',
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
        <ChevronDown size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
            zIndex: 1100,
            maxHeight: '320px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search Input Box */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Name, Type, Category, or Corridor..."
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                outline: 'none',
                width: '100%',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ padding: '6px 12px', background: 'rgba(15, 23, 42, 0.6)', fontSize: '0.75rem', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            Available Equipment: <strong>{filteredEquipment.length}</strong> of {equipmentList.length}
          </div>

          {/* List Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
                Loading full equipment database...
              </div>
            ) : error ? (
              <div style={{ padding: '16px', color: '#fb7185', fontSize: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div style={{ padding: '16px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>
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
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'white' }}>
                    {eq.equipment_id} — {eq.equipment_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
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
