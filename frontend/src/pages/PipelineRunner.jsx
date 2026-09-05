import React, { useState } from 'react';
import { Play, CheckCircle, AlertCircle, RefreshCw, Layers, Calendar, ArrowRight } from 'lucide-react';
import api from '../services/api';

export const PipelineRunner = () => {
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [resultSummary, setResultSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunFullPipeline = async () => {
    setRunning(true);
    setLogs([]);
    setErrorMsg(null);
    setResultSummary(null);

    try {
      setActiveStep(1);
      addLog('PHASE 1 STARTED — Scoring maintenance request priorities & risks...');
      const p1Res = await api.post('/run/phase1');
      addLog(`PHASE 1 COMPLETED — Processed ${p1Res.data.processed_count} requests.`);

      setActiveStep(2);
      addLog('PHASE 2 STARTED — Calculating section-specific train movements & candidate gaps...');
      const p2Res = await api.post('/run/phase2');
      addLog(`PHASE 2 COMPLETED — Candidate gaps generated.`);

      setActiveStep(3);
      addLog('PHASE 3 STARTED — Synchronizing workers, loading equipment & running CP-SAT solver...');
      const p3Res = await api.post('/run/phase3');
      addLog(`PHASE 3 COMPLETED — CP-SAT optimizer allocated ${p3Res.data.allocated_groups} block groups.`);

      setActiveStep(4);
      addLog('FULL PIPELINE EXECUTED SUCCESSFULLY!');
      setResultSummary(p3Res.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setErrorMsg(msg);
      addLog(`ERROR: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1a2638' }}>Execute Optimization Pipeline</h1>
        <p style={{ fontSize: '0.9rem', color: '#71829d', marginTop: '4px' }}>
          Execute actual 3-Phase Railway Maintenance Pipeline (P1 → P2 → P3 CP-SAT)
        </p>
      </div>

      {/* Pipeline Stepper Visual */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          {[
            { step: 1, title: 'Phase 1', desc: 'Priority & Risk' },
            { step: 2, title: 'Phase 2', desc: 'Section Gap Candidates' },
            { step: 3, title: 'Phase 3', desc: 'CP-SAT Final Optimization' }
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 2 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  background: activeStep > s.step ? '#10b981' : activeStep === s.step ? '#3b82f6' : '#334155',
                  color: '#1a2638',
                  boxShadow: activeStep === s.step ? '0 0 16px rgba(59, 130, 246, 0.6)' : 'none'
                }}>
                  {activeStep > s.step ? <CheckCircle size={24} /> : s.step}
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2638' }}>{s.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#71829d' }}>{s.desc}</div>
                </div>
              </div>
              {idx < 2 && (
                <div style={{ flex: 1, height: '2px', background: activeStep > s.step ? '#10b981' : '#334155', margin: '0 20px' }} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <button
            onClick={handleRunFullPipeline}
            disabled={running}
            className="btn btn-emerald"
            style={{ padding: '14px 36px', fontSize: '1.05rem' }}
          >
            {running ? <RefreshCw className="spin" size={22} /> : <Play size={22} />}
            {running ? 'Executing Pipeline...' : 'Run Full 3-Phase Pipeline'}
          </button>
        </div>
      </div>

      {/* Execution Logs & Status */}
      {logs.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2638', marginBottom: '14px' }}>Live Pipeline Execution Logs</h3>
          <div style={{
            background: '#090d16',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            color: '#3B82F6',
            maxHeight: '240px',
            overflowY: 'auto'
          }}>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '6px' }}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Result Summary */}
      {resultSummary && (
        <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid #8b5cf6' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a2638', marginBottom: '12px' }}>
            Optimization Complete — Final Block Plan Ready
          </h3>
          <p style={{ color: '#71829d', fontSize: '0.9rem', marginBottom: '20px' }}>
            CP-SAT optimizer allocated {resultSummary.allocated_groups} block groups satisfying all train gap, worker, and equipment constraints.
          </p>
          <a href="/final-plan" className="btn btn-primary">
            View Final Block Plan Details <ArrowRight size={18} />
          </a>
        </div>
      )}
    </div>
  );
};
