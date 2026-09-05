import React from 'react';
import { X, Wrench, ShieldCheck, Clock, MapPin, CheckCircle } from 'lucide-react';

export const EquipmentModal = ({ isOpen, onClose, blockId, assignedEquipment = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box" style={{
        maxWidth: 'min(92vw, 750px)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench size={24} color="#fbbf24" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1a2638' }}>
                Assigned Machinery & Equipment — {blockId}
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#71829d', marginTop: '4px' }}>
              Real Equipment Assignment from Equipment Database
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#71829d', cursor: 'pointer', padding: '6px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Equipment List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {assignedEquipment.map((eq, idx) => (
            <div key={idx} style={{
              background: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1a2638' }}>{eq.equipment_name}</span>
                  <span className="badge badge-candidate" style={{ fontSize: '0.68rem' }}>{eq.equipment_id}</span>
                  <span className="badge badge-final" style={{ fontSize: '0.68rem' }}>{eq.equipment_type || 'Heavy Machinery'}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#71829d', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span><ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px' }} /> Condition: {eq.condition || 'Good'}</span>
                  <span><MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Corridor: {eq.corridor || 'C1'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Reserved & Mobilized
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71829d', marginTop: '4px' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> {eq.assigned_start || '00:00'} — {eq.assigned_end || '03:00'} ({eq.assigned_date || '2026-08-28'})
                </div>
              </div>
            </div>
          ))}

          {assignedEquipment.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#71829d' }}>
              No specific assigned equipment details available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Close Panel</button>
        </div>
      </div>
    </div>
  );
};
