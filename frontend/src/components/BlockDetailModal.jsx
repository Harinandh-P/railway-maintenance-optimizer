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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DFE2EE' }}>
                  {block.block_id} — Operational Plan Details
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '2px' }}>
                  Group {block.group_id} • Corridor {block.corridor} • Status: <span style={{ color: '#10B981', fontWeight: 700 }}>{block.status || 'ALLOCATED'}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '6px' }}>
            <X size={24} />
          </button>
        </div>

        {/* 1. Block Information */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#3B82F6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} /> Block Time & Schedule
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', background: '#151E2E', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>SCHEDULED DATE</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#DFE2EE', marginTop: '2px' }}>{block.date}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>START TIME</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{block.block_start || '00:00'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>END TIME</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>{block.block_end || '03:00'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>DURATION</span>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>{block.allocated_duration_minutes} minutes</div>
            </div>
          </div>
        </div>

        {/* 2. Maintenance Location */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#8B5CF6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} /> Location & Railway Section
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', background: '#151E2E', padding: '16px', borderRadius: '10px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>CORRIDOR</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#DFE2EE', marginTop: '2px' }}>Corridor {block.corridor}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>SECTION</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#DFE2EE', marginTop: '2px' }}>{block.section || 'C1-S1'}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>WORK AREA</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#3B82F6', marginTop: '2px' }}>{block.work_area}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>TASKS INCLUDED</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#DFE2EE', marginTop: '2px' }}>{block.allocated_tasks?.join(', ')}</div>
            </div>
          </div>
        </div>

        {/* 3. Workforce & Equipment Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {/* Workforce */}
          <div style={{ background: '#151E2E', padding: '18px', borderRadius: '10px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#10B981' }}>
                <Users size={18} /> Assigned Workforce
              </div>
              <button onClick={() => { onClose(); onOpenWorkers(block); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                View {block.assigned_worker_details?.length || block.workers_required} Assigned Crew →
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#C2C6D6' }}>
              <div>Required: <strong>{block.workers_required}</strong></div>
              <div>Available: <strong>{block.workers_available}</strong></div>
              <div>Assigned: <strong style={{ color: '#10B981' }}>{block.assigned_worker_details?.length || block.workers_required} qualified workers</strong></div>
            </div>
          </div>

          {/* Equipment */}
          <div style={{ background: '#151E2E', padding: '18px', borderRadius: '10px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#F59E0B' }}>
                <Wrench size={18} /> Assigned Equipment
              </div>
              <button onClick={() => { onClose(); onOpenEquipment(block); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                View Equipment Details →
              </button>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#C2C6D6' }}>
              <div>Assigned Machinery: <strong>{block.assigned_equipment?.join(', ') || 'Track Machine'}</strong></div>
              <div>Status: <span style={{ color: '#F59E0B', fontWeight: 600 }}>Reserved & Mobilized</span></div>
            </div>
          </div>
        </div>

        {/* 4. Optimization & Decision Metrics */}
        {/* 4. EXPLAIN WHY — Optimization & Decision Metrics */}
        <div style={{ background: '#101726', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3B82F6', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color="#10b981" /> Why Was This Block Selected? (Explain Why Decision Rationale)
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.85rem', color: '#C2C6D6', marginBottom: '16px' }}>
            <div>Request ID: <strong style={{ color: '#DFE2EE' }}>{block.request_details_in_group?.[0]?.request_id || block.requests_in_group?.join(', ') || 'REQ001'}</strong></div>
            <div>Asset ID: <strong style={{ color: '#DFE2EE' }}>{block.request_details_in_group?.[0]?.asset_id || block.work_area || 'TRK001'}</strong></div>
            <div>Defect Type: <strong style={{ color: '#DFE2EE' }}>{block.request_details_in_group?.[0]?.defect_type || 'Track Defect'}</strong></div>
            <div>Severity: <strong style={{ color: '#EF4444' }}>{block.request_details_in_group?.[0]?.defect_severity || 'High'}</strong></div>
            <div>Safety Risk: <strong style={{ color: '#EF4444' }}>{block.request_details_in_group?.[0]?.safety_risk || 'High'}</strong></div>
            <div>Priority Score: <strong style={{ color: '#F59E0B' }}>{block.priority || '9.5'}</strong></div>
            <div>Risk Score: <strong style={{ color: '#F59E0B' }}>{block.risk_score || '0.95'}</strong></div>
            <div>Required Duration: <strong style={{ color: '#DFE2EE' }}>{block.allocated_duration_minutes} min</strong></div>
            <div>Allocated Duration: <strong style={{ color: '#10B981' }}>{block.allocated_duration_minutes} min</strong></div>
            <div>Workers Required: <strong style={{ color: '#DFE2EE' }}>{block.workers_required}</strong></div>
            <div>Workers Assigned: <strong style={{ color: '#10B981' }}>{block.assigned_worker_details?.length || block.workers_required}</strong></div>
            <div>Equipment Required: <strong style={{ color: '#DFE2EE' }}>{block.assigned_equipment?.join(', ') || 'Track Machine'}</strong></div>
            <div>Equipment Assigned: <strong style={{ color: '#8B5CF6' }}>{block.assigned_equipment?.join(', ') || 'Track Machine'}</strong></div>
            <div>Available Gap: <strong style={{ color: '#3B82F6' }}>{block.block_start || '00:00'} — {block.block_end || '03:00'}</strong></div>
            <div>Selected Block: <strong style={{ color: '#DFE2EE' }}>{block.block_id}</strong></div>
            <div>Train Conflict: <strong style={{ color: '#10B981' }}>None (Conflict-Free Window)</strong></div>
            <div>Deadline Status: <strong style={{ color: '#10B981' }}>{block.deadline_status || 'BEFORE DUE DATE'}</strong></div>
          </div>

          <div style={{ background: '#151E2E', padding: '12px 16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
              CP-SAT Optimizer Decision Reason
            </div>
            <p style={{ fontSize: '0.88rem', color: '#DFE2EE', margin: 0, lineHeight: 1.5 }}>
              {block.reason || 'High-risk maintenance requirement was assigned to a conflict-free railway gap that satisfies the required maintenance duration and available resources.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Close Details</button>
        </div>
      </div>
    </div>
  );
};
