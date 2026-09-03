import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Layers, Clock, AlertTriangle } from 'lucide-react';
import { BlockTimeline } from '../components/BlockTimeline';

export const Phase2Results = () => {
  const [phase2Data, setPhase2Data] = useState(null);
  const [finalPlan, setFinalPlan] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/results/phase2');
      setPhase2Data(res.data);

      try {
        const p3Res = await api.get('/results/final-plan');
        setFinalPlan(p3Res.data?.final_block_plan || []);
      } catch (err) {
        // Optional if Phase 3 not yet executed
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#94A3B8', padding: '40px' }}>Loading Phase 2 Output...</div>;

  const requests = phase2Data?.requests || [];
  const allCandidateGaps = [];
  requests.forEach(r => {
    (r.candidate_gaps || []).forEach(g => {
      allCandidateGaps.append ? allCandidateGaps.append(g) : allCandidateGaps.push({ ...g, request_id: r.request_information?.request_id });
    });
  });

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#DFE2EE' }}>Phase 2 Candidate Gap Analysis</h1>
        <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '4px' }}>
          Traffic Analysis & Section-Specific Candidate Gap Generation Output
        </p>
      </div>

      {/* Interactive Block Occupation Timeline */}
      <BlockTimeline candidateGaps={allCandidateGaps} finalBlocks={finalPlan} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {requests.map((reqBlock, rIdx) => {
          const reqInfo = reqBlock.request_information || {};
          const corridorInfo = reqBlock.corridor_analysis || {};
          const gaps = reqBlock.candidate_gaps || [];

          return (
            <div key={rIdx} className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DFE2EE' }}>
                    Request {reqInfo.request_id} — {reqInfo.department} ({reqInfo.asset_type})
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
                    Corridor: {corridorInfo.corridor_id} | Section: {corridorInfo.section_id} (KM {corridorInfo.from_km} → KM {corridorInfo.to_km})
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-candidate">CANDIDATE GAPS ONLY</span>
                </div>
              </div>

              {/* Gaps List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {gaps.map((gap, gIdx) => {
                  const isFeasible = gap.duration_sufficient_for_phase1_requirement;
                  return (
                    <div
                      key={gIdx}
                      style={{
                        background: '#151E2E',
                        border: `1px solid ${isFeasible ? 'rgba(6, 182, 212, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                        borderRadius: '8px',
                        padding: '14px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#DFE2EE' }}>Gap {gap.gap_id}</span>
                        <span className={`badge ${isFeasible ? 'badge-candidate' : 'badge-critical'}`}>
                          {isFeasible ? 'FEASIBLE CANDIDATE' : 'REJECTED (SHORT)'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#3B82F6', fontWeight: 600, marginBottom: '6px' }}>
                        <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                        {gap.start} → {gap.end} ({gap.duration_minutes} min)
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                        Required: {gap.required_duration_minutes} min • Traffic Density: {gap.traffic_density_level}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
