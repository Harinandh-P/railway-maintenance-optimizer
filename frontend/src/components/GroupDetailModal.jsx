import React from 'react';
import { X, Layers, TrainTrack, Wrench, Clock, ShieldAlert, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export const GroupDetailModal = ({ isOpen, onClose, group }) => {
  if (!isOpen || !group) return null;

  const isUnallocated = group.status === 'UNALLOCATED';
  const requests = group.request_details_in_group || [];

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-box" style={{
        maxWidth: 'min(92vw, 850px)',
        border: `1px solid ${isUnallocated ? 'rgba(244, 63, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: isUnallocated ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)', padding: '10px', borderRadius: '10px' }}>
                <Layers size={26} color={isUnallocated ? '#fb7185' : '#60a5fa'} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                  Group {group.group_id} — Work Content Breakdown
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
                  Total Requests: <strong>{group.group_task_count || requests.length}</strong> • Corridor: <strong>{group.corridor || 'C1'}</strong> • Status: <span className={`badge ${isUnallocated ? 'badge-critical' : 'badge-final'}`}>{group.status || 'ALLOCATED'}</span>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Work Summary List */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#38bdf8" /> Tasks & Maintenance Work Included ({requests.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {requests.map((req, idx) => (
              <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>{req.request_id} — {req.defect_type}</span>
                    <span className="badge badge-candidate" style={{ marginLeft: '10px', fontSize: '0.72rem' }}>{req.department}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Asset: <strong>{req.asset_id} ({req.asset_type})</strong> • Location: <strong>{req.location}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem', color: '#cbd5e1', background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '6px' }}>
                  <div>Defect Cause: <strong>{req.defect_reason}</strong></div>
                  <div>Maintenance Type: <strong>{req.maintenance_type}</strong></div>
                  <div>Required Duration: <strong>{req.required_duration_minutes} min</strong></div>
                  <div>Workers Required: <strong>{req.required_workers} crew</strong></div>
                  <div>Required Equipment: <strong>{req.required_equipment}</strong></div>
                  <div>Priority / Risk: <strong>{req.priority} / {req.risk_score}</strong></div>
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div style={{ padding: '16px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', color: '#94a3b8' }}>
                {group.group_work_summary?.map((w, i) => (
                  <div key={i} style={{ padding: '6px 0', borderBottom: i < group.group_work_summary.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', color: 'white' }}>
                    • {w}
                  </div>
                )) || 'No detailed task list available.'}
              </div>
            )}
          </div>
        </div>

        {/* Unallocated Reason Banner */}
        {isUnallocated && (
          <div style={{ padding: '16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '10px', color: '#fb7185', marginBottom: '24px' }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={18} /> Non-allocation Rationale
            </div>
            <div style={{ fontSize: '0.88rem' }}>{group.reason}</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Close Details</button>
        </div>
      </div>
    </div>
  );
};
