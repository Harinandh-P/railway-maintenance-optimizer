import React from 'react';
import { X, CalendarCheck, MapPin, Train, Users, Wrench, ShieldCheck, Clock, Layers, AlertCircle } from 'lucide-react';

export const BlockDetailModal = ({ isOpen, onClose, block, onOpenWorkers, onOpenEquipment }) => {
  if (!isOpen || !block) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 900,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '850px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '32px',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '10px', borderRadius: '10px' }}>
                <CalendarCheck size={26} color="#c084fc" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                  {block.block_id} — Operational Plan Details
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
                  Group {block.group_id} • Corridor {block.corridor} • Status: <span style={{ color: '#34d399', fontWeight: 700 }}>{block.status || 'ALLOCATED'}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
            <X size={24} />
          </button>
        </div>

        {/* 1. Block Information */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} /> Block Time & Schedule
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SCHEDULED DATE</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white', marginTop: '2px' }}>{block.date}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>START TIME</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>{block.block_start || '00:00'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>END TIME</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e', marginTop: '2px' }}>{block.block_end || '03:00'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>DURATION</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>{block.allocated_duration_minutes} minutes</div>
            </div>
          </div>
        </div>

        {/* 2. Maintenance Location */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#c084fc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} /> Location & Railway Section
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>CORRIDOR</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>Corridor {block.corridor}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SECTION</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>{block.section || 'C1-S1'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WORK AREA</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginTop: '2px' }}>{block.work_area}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>TASKS INCLUDED</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', marginTop: '2px' }}>{block.allocated_tasks?.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* 3. Workforce & Equipment Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Workforce */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#34d399' }}>
                <Users size={18} /> Assigned Workforce
              </div>
              <button onClick={() => { onClose(); onOpenWorkers(block); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                View {block.assigned_worker_details?.length || block.workers_required} Assigned Crew →
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div>Required: <strong>{block.workers_required}</strong></div>
              <div>Available: <strong>{block.workers_available}</strong></div>
              <div>Assigned: <strong style={{ color: '#34d399' }}>{block.assigned_worker_details?.length || block.workers_required} qualified workers</strong></div>
            </div>
          </div>

          {/* Equipment */}
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '18px', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#fbbf24' }}>
                <Wrench size={18} /> Assigned Equipment
              </div>
              <button onClick={() => { onClose(); onOpenEquipment(block); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                View Equipment Details →
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div>Assigned Machinery: <strong>{block.assigned_equipment?.join(', ') || 'Track Machine'}</strong></div>
              <div>Status: <span style={{ color: '#fbbf24', fontWeight: 600 }}>Reserved & Mobilized</span></div>
            </div>
          </div>
        </div>

        {/* 4. Optimization & Decision Metrics */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '10px', marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#10b981" /> CP-SAT Optimizer Decision Rationale
          </h4>
          <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span>Priority Score: <strong style={{ color: 'white' }}>{block.priority}</strong></span>
            <span>Risk Score: <strong style={{ color: 'white' }}>{block.risk_score}</strong></span>
            <span>Global Objective Score: <strong style={{ color: '#38bdf8' }}>{block.score}</strong></span>
            <span>Deadline Status: <strong style={{ color: '#34d399' }}>{block.deadline_status}</strong></span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(30, 41, 59, 0.6)', padding: '10px', borderRadius: '6px' }}>
            {block.reason}
          </p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Close Details</button>
        </div>
      </div>
    </div>
  );
};
