import React from 'react';
import { Clock, Train, CalendarCheck, Layers } from 'lucide-react';

export const BlockTimeline = ({ candidateGaps = [], finalBlocks = [] }) => {
  // Convert time HH:MM or minutes into timeline percentage (00:00 to 24:00 = 1440 min)
  const getPercent = (min) => {
    return Math.max(0, Math.min(100, (min / 1440) * 100));
  };

  const parseTimeMin = (timeStr) => {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1a2638' }}>
            Interactive Train Occupation vs. Maintenance Block Timeline
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#71829d', marginTop: '2px' }}>
            24-Hour Corridor Occupation Analysis (Actual Phase 2 & Phase 3 JSON Data)
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f43f5e' }} />
            <span style={{ color: '#71829d' }}>Train Occupation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#06b6d4' }} />
            <span style={{ color: '#71829d' }}>Candidate Gap</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#8b5cf6' }} />
            <span style={{ color: '#71829d' }}>Selected Final Block</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Scale Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#71829d', marginBottom: '8px', paddingLeft: '140px' }}>
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span>24:00</span>
      </div>

      {/* Timelines by Candidate Gap */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {candidateGaps.map((gap, idx) => {
          const startMin = parseTimeMin(gap.start || gap.start_minutes || 0);
          const endMin = parseTimeMin(gap.end || gap.end_minutes || 1440);
          const durMin = endMin - startMin;

          const prevTrainMin = gap.previous_train ? parseTimeMin(gap.previous_train.departure || gap.previous_train.arrival || 0) : null;
          const nextTrainMin = gap.next_train ? parseTimeMin(gap.next_train.arrival || gap.next_train.departure || 1440) : null;

          // Check matching final block
          const matchingBlock = finalBlocks.find(b =>
            (b.group_id === gap.request_id || b.allocated_tasks?.includes(gap.request_id)) &&
            b.allocated_start_minutes >= startMin && b.allocated_end_minutes <= endMin
          );

          return (
            <div key={idx} style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '130px', fontSize: '0.82rem', fontWeight: 600, color: '#1a2638' }}>
                  Gap {gap.gap_id || `G-${idx+1}`} ({gap.corridor || 'C1'})
                </div>

                <div style={{ flex: 1, position: 'relative', height: '32px', background: '#f8faff', borderRadius: '6px', overflow: 'hidden' }}>
                  {/* Previous Train Occupancy */}
                  {prevTrainMin !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${getPercent(Math.max(0, prevTrainMin - 30))}%`,
                        width: `${getPercent(30)}%`,
                        height: '100%',
                        background: '#f43f5e',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        color: '#1a2638',
                        fontWeight: 700
                      }}
                      title={`Train Occupation: ${gap.previous_train?.train_name || 'Prev Train'}`}
                    >
                      Train
                    </div>
                  )}

                  {/* Candidate Gap Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${getPercent(startMin)}%`,
                      width: `${getPercent(durMin)}%`,
                      height: '100%',
                      background: 'rgba(6, 182, 212, 0.35)',
                      border: '1px solid #06b6d4',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '8px',
                      fontSize: '0.72rem',
                      color: '#22d3ee',
                      fontWeight: 600
                    }}
                    title={`Candidate Gap: ${gap.start} - ${gap.end} (${durMin} min)`}
                  >
                    Candidate Gap ({durMin}m)
                  </div>

                  {/* Final Selected Block Bar */}
                  {matchingBlock && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${getPercent(matchingBlock.allocated_start_minutes)}%`,
                        width: `${getPercent(matchingBlock.allocated_duration_minutes)}%`,
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(109, 40, 217, 0.9) 100%)',
                        border: '1px solid #c084fc',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#1a2638',
                        fontWeight: 700,
                        boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
                      }}
                      title={`Final Block Plan: ${matchingBlock.block_id}`}
                    >
                      ★ {matchingBlock.block_id}
                    </div>
                  )}

                  {/* Next Train Occupancy */}
                  {nextTrainMin !== null && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${getPercent(nextTrainMin)}%`,
                        width: `${getPercent(30)}%`,
                        height: '100%',
                        background: '#f43f5e',
                        opacity: 0.8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.68rem',
                        color: '#1a2638',
                        fontWeight: 700
                      }}
                      title={`Train Occupation: ${gap.next_train?.train_name || 'Next Train'}`}
                    >
                      Train
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {candidateGaps.length === 0 && (
          <div style={{ textAlign: 'center', color: '#71829d', padding: '20px' }}>
            No candidate gap timeline data available. Please execute optimization pipeline.
          </div>
        )}
      </div>
    </div>
  );
};
