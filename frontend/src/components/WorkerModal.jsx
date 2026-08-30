import React from 'react';
import { X, Users, Award, Briefcase, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';

export const WorkerModal = ({ isOpen, onClose, blockId, workersRequired, workersAvailable, assignedWorkers = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box" style={{
        maxWidth: 'min(92vw, 750px)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={24} color="#34d399" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                Assigned Workforce Crew — {blockId}
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              Real Employee Assignment from Worker Database
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
            <X size={22} />
          </button>
        </div>

        {/* Worker Metrics Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '10px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WORKERS REQUIRED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>{workersRequired}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WORKERS AVAILABLE</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>{workersAvailable}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WORKERS ASSIGNED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{assignedWorkers.length}</div>
          </div>
        </div>

        {/* Worker Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {assignedWorkers.map((w, idx) => (
            <div key={idx} style={{
              background: 'rgba(30, 41, 59, 0.8)',
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
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>{w.worker_name || `Worker ${w.worker_id}`}</span>
                  <span className="badge badge-candidate" style={{ fontSize: '0.68rem' }}>{w.worker_id}</span>
                  <span className="badge badge-low" style={{ fontSize: '0.68rem' }}>{w.sector || 'TRACK'}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span><Briefcase size={13} style={{ display: 'inline', marginRight: '4px' }} /> {w.skill}</span>
                  <span><Award size={13} style={{ display: 'inline', marginRight: '4px' }} /> Level: {w.skill_level} ({w.qualification})</span>
                  <span><MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Corridor: {w.corridor}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Assigned to Block
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> {w.assigned_start || '00:00'} — {w.assigned_end || '03:00'} ({w.assigned_date || '2026-08-28'})
                </div>
              </div>
            </div>
          ))}

          {assignedWorkers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No specific assigned worker details available.
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
