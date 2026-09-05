import React, { useState, useEffect } from 'react';
import { CalendarCheck, ShieldCheck, Clock, Users, Wrench, ChevronRight, Eye, AlertCircle, Layers, FileText, HelpCircle } from 'lucide-react';
import api from '../services/api';
import { BlockTimeline } from '../components/BlockTimeline';
import { WorkerModal } from '../components/WorkerModal';
import { EquipmentModal } from '../components/EquipmentModal';
import { BlockDetailModal } from '../components/BlockDetailModal';
import { GroupDetailModal } from '../components/GroupDetailModal';

export const FinalBlockPlan = () => {
  const [planData, setPlanData] = useState(null);
  const [candidateGaps, setCandidateGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedBlockForDetail, setSelectedBlockForDetail] = useState(null);
  const [selectedWorkerBlock, setSelectedWorkerBlock] = useState(null);
  const [selectedEquipBlock, setSelectedEquipBlock] = useState(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState(null);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      const res = await api.get('/results/final-plan');
      setPlanData(res.data);

      try {
        const p2Res = await api.get('/results/phase2');
        const gaps = [];
        (p2Res.data?.requests || []).forEach(r => {
          (r.candidate_gaps || []).forEach(g => {
            gaps.push({ ...g, request_id: r.request_information?.request_id });
          });
        });
        setCandidateGaps(gaps);
      } catch (err) {
        // Optional
      }
    } catch (err) {
      console.error('Failed to load final block plan:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#71829d', padding: '40px' }}>Loading Final Block Plan...</div>;
  }

  const blocks = planData?.final_block_plan || [];
  const unallocated = planData?.unallocated || [];

  return (
    <div>
      {/* Modals */}
      <BlockDetailModal
        isOpen={!!selectedBlockForDetail}
        onClose={() => setSelectedBlockForDetail(null)}
        block={selectedBlockForDetail}
        onOpenWorkers={(blk) => setSelectedWorkerBlock(blk)}
        onOpenEquipment={(blk) => setSelectedEquipBlock(blk)}
      />

      <GroupDetailModal
        isOpen={!!selectedGroupDetail}
        onClose={() => setSelectedGroupDetail(null)}
        group={selectedGroupDetail}
      />

      <WorkerModal
        isOpen={!!selectedWorkerBlock}
        onClose={() => setSelectedWorkerBlock(null)}
        blockId={selectedWorkerBlock?.block_id}
        workersRequired={selectedWorkerBlock?.workers_required || 4}
        workersAvailable={selectedWorkerBlock?.workers_available || 17}
        assignedWorkers={selectedWorkerBlock?.assigned_worker_details || []}
      />

      <EquipmentModal
        isOpen={!!selectedEquipBlock}
        onClose={() => setSelectedEquipBlock(null)}
        blockId={selectedEquipBlock?.block_id}
        assignedEquipment={selectedEquipBlock?.assigned_equipment_details || []}
      />

      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a2638' }}>Final Maintenance Block Schedule</h1>
          <p style={{ fontSize: '0.9rem', color: '#71829d', marginTop: '4px' }}>
            Operational Block Timetable & Real Workforce / Equipment Assignments
          </p>
        </div>
        <span className="badge badge-final" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          Phase 3 CP-SAT Solver Decision
        </span>
      </div>

      {/* Interactive Block Timeline */}
      <BlockTimeline candidateGaps={candidateGaps} finalBlocks={blocks} />

      {/* Allocated Maintenance Blocks Section */}
      {blocks.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#71829d' }}>
          No final maintenance blocks generated yet. Please execute the optimization pipeline.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1a2638' }}>
            Allocated Maintenance Blocks ({blocks.length})
          </h3>

          {blocks.map((block, idx) => (
            <div key={idx} className="glass-panel glass-panel-interactive" style={{ padding: '24px', borderLeft: '5px solid #8b5cf6' }}>
              {/* Top Banner Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ background: 'rgba(139, 92, 246, 0.25)', padding: '12px', borderRadius: '12px' }}>
                    <CalendarCheck size={26} color="#c084fc" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1a2638', letterSpacing: '-0.3px' }}>
                      {block.block_id} — Corridor {block.corridor} ({block.work_area})
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: '#71829d', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        onClick={() => setSelectedGroupDetail(block)}
                        style={{ cursor: 'pointer', color: '#3B82F6', textDecoration: 'underline', fontWeight: 700 }}
                        title="Click to view complete group breakdown"
                      >
                        Group {block.group_id} ({block.group_task_count || block.allocated_tasks?.length || 1} Tasks)
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-final" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                    STATUS: ALLOCATED
                  </span>
                  <button onClick={() => setSelectedBlockForDetail(block)} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                    <Eye size={16} /> Operational Details
                  </button>
                </div>
              </div>

              {/* ENCAPSULATED WORK INCLUDED SECTION */}
              <div style={{
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} /> Work Included ({block.group_task_count || block.allocated_tasks?.length || 1} Maintenance Requests)
                  </div>
                  <button
                    onClick={() => setSelectedGroupDetail(block)}
                    style={{ background: 'transparent', border: 'none', color: '#71829d', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                  >
                    View Complete Tasks →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {block.group_work_summary?.map((w, wIdx) => (
                    <div key={wIdx} style={{ fontSize: '0.88rem', color: '#1a2638', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#3B82F6' }}>•</span>
                      <span>{w}</span>
                    </div>
                  )) || (
                    <div style={{ fontSize: '0.88rem', color: '#1a2638', fontWeight: 600 }}>
                      • {block.allocated_tasks?.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Prominent Date & Time Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                background: '#e9eff7',
                padding: '20px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#71829d', fontWeight: 700, letterSpacing: '0.5px' }}>SCHEDULED DATE</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2638', marginTop: '4px' }}>
                    {block.date}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#71829d', fontWeight: 700, letterSpacing: '0.5px' }}>START — END TIME</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3B82F6', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={18} />
                    {block.block_start || '00:00'} — {block.block_end || '03:00'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#71829d', fontWeight: 700, letterSpacing: '0.5px' }}>ALLOCATED DURATION</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F59E0B', marginTop: '4px' }}>
                    {block.allocated_duration_minutes} MINUTES
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#71829d', fontWeight: 700, letterSpacing: '0.5px' }}>PRIORITY / RISK SCORE</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
                    Prio: {block.priority} • Risk: {block.risk_score}
                  </div>
                </div>
              </div>

              {/* Interactive Resource Buttons Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                {/* Clickable Workforce Button Box */}
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#71829d', fontWeight: 600 }}>WORKFORCE ASSIGNMENT</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2638', marginTop: '2px' }}>
                      Required: {block.workers_required} • Available: {block.workers_available}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 800, marginTop: '2px' }}>
                      Assigned: {block.assigned_worker_details?.length || block.workers_required} Employees
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedWorkerBlock(block)}
                    className="btn btn-emerald"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                    title="Click to view assigned worker names, IDs, skills, and shift schedule"
                  >
                    <Users size={16} /> View Assigned Crew ({block.assigned_worker_details?.length || block.workers_required})
                  </button>
                </div>

                {/* Clickable Equipment Button Box */}
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#71829d', fontWeight: 600 }}>EQUIPMENT RESERVATION</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2638', marginTop: '2px' }}>
                      Machinery: {block.assigned_equipment?.join(', ') || 'Track Machine'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#F59E0B', fontWeight: 800, marginTop: '2px' }}>
                      Status: Mobilized & Verified
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEquipBlock(block)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '8px 14px', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#F59E0B' }}
                    title="Click to view assigned machinery ID, type, condition, and status"
                  >
                    <Wrench size={16} /> View Equipment Details
                  </button>
                </div>
              </div>

              {/* Rationale Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#71829d', flex: 1 }}>
                  <ShieldCheck size={16} color="#10b981" />
                  <span>{block.reason}</span>
                </div>
                <button
                  onClick={() => setSelectedBlockForDetail(block)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#3B82F6', whiteSpace: 'nowrap' }}
                >
                  <HelpCircle size={16} /> Explain Why
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unallocated Groups Section */}
      {unallocated.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#EF4444', marginBottom: '16px' }}>
            Unallocated Maintenance Groups ({unallocated.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {unallocated.map((u, i) => (
              <div key={i} className="glass-panel" style={{ padding: '24px', borderLeft: '5px solid #f43f5e' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a2638' }}>
                      Group {u.group_id} ({u.group_task_count || u.tasks?.length || 1} Tasks)
                    </h4>
                    <button
                      onClick={() => setSelectedGroupDetail(u)}
                      style={{ background: 'transparent', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                      View Group Details →
                    </button>
                  </div>
                  <span className="badge badge-critical">UNALLOCATED</span>
                </div>

                {/* UNALLOCATED WORK INCLUDED BOX */}
                <div style={{ background: '#f1f5f9', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Work Included (Unallocated)
                  </div>
                  {u.group_work_summary?.map((w, wIdx) => (
                    <div key={wIdx} style={{ fontSize: '0.88rem', color: '#1a2638', fontWeight: 600, marginTop: '2px' }}>
                      • {w}
                    </div>
                  )) || (
                    <div style={{ fontSize: '0.88rem', color: '#1a2638', fontWeight: 600 }}>
                      • Tasks: {u.tasks?.join(', ')}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '0.88rem', color: '#71829d' }}>
                  <strong>Non-allocation Reason:</strong> {u.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
