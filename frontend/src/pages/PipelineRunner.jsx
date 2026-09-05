import React, { useState } from 'react';
import { Play, CheckCircle, AlertCircle, RefreshCw, Layers, Calendar, ArrowRight, XCircle } from 'lucide-react';
import api from '../services/api';
import { TiltCard } from '../components/TiltCard';

export const PipelineRunner = () => {
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [resultSummary, setResultSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunFullPipeline = async () => {
    setShowConfirmModal(false);
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
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <section className="tactile-card rounded-2xl p-7 flex flex-wrap items-center justify-between gap-6 shadow-neu-flat">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-widest">
              AROHA // OPTIMIZATION PIPELINE EXECUTION
            </span>
            <span className="tactile-inset px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SOLVER ENGINE: READY
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-display uppercase tracking-tight">
            OPTIMIZATION PIPELINE RUNNER
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Execute 3-Phase Railway Maintenance Pipeline (P1 Priority Scoring → P2 Gap Analysis → P3 CP-SAT Solver)
          </p>
        </div>
      </section>

      {/* Pipeline Stepper Visual (Accessible High Contrast Steps) */}
      <div className="tactile-card rounded-2xl p-7 shadow-neu-flat space-y-6">
        <div className="flex items-center justify-between relative flex-wrap gap-6">
          {[
            { step: 1, title: 'Phase 1', desc: 'Priority & Risk Scoring' },
            { step: 2, title: 'Phase 2', desc: 'Section Gap Analysis' },
            { step: 3, title: 'Phase 3', desc: 'CP-SAT Block Allocation' }
          ].map((s, idx) => {
            const isCompleted = activeStep > s.step;
            const isActive = activeStep === s.step;

            return (
              <React.Fragment key={s.step}>
                <div className="flex items-center gap-4.5 z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-neu-flat'
                        : isActive
                        ? 'bg-blue-600 text-white shadow-neu-btn-blue ring-4 ring-blue-500/20'
                        : 'tactile-inset bg-slate-200/90 text-slate-800 font-bold border border-slate-300'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={22} className="text-white" /> : s.step}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-display uppercase tracking-tight">{s.title}</div>
                    <div className="text-xs text-slate-500 font-medium">{s.desc}</div>
                  </div>
                </div>
                {idx < 2 && (
                  <div
                    className={`flex-1 h-1 rounded-full transition-colors hidden md:block mx-4 ${
                      activeStep > s.step ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="pt-4 text-center border-t border-slate-200/80">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={running}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-neu-btn-blue inline-flex items-center gap-2.5 transform active:scale-95 transition-all disabled:opacity-50"
          >
            {running ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
            <span>{running ? 'Executing Pipeline...' : 'Run Full 3-Phase Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Execution Logs & Status */}
      {logs.length > 0 && (
        <div className="tactile-card rounded-2xl p-6 shadow-neu-flat space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Live Pipeline Execution Logs</h3>
          <div className="tactile-inset p-4 rounded-xl font-mono text-xs text-blue-600 space-y-1.5 max-h-60 overflow-y-auto bg-slate-900 text-blue-400">
            {logs.map((log, i) => (
              <div key={i} className="leading-relaxed">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Result Summary */}
      {resultSummary && (
        <div className="tactile-card rounded-2xl p-6 border-l-4 border-l-purple-600 shadow-neu-flat space-y-3">
          <h3 className="text-lg font-extrabold text-slate-900 font-display uppercase tracking-tight">
            Optimization Complete — Final Block Plan Ready
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            CP-SAT optimizer allocated <strong className="text-purple-600 font-bold">{resultSummary.allocated_groups}</strong> block groups satisfying all train gap, worker, and equipment constraints.
          </p>
          <a
            href="/final-plan"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-neu-btn-blue inline-flex items-center gap-2"
          >
            <span>View Final Block Plan Details</span>
            <ArrowRight size={16} />
          </a>
        </div>
      )}

      {/* FULL PIPELINE EXECUTION CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Play className="text-emerald-600" size={18} />
                <span>Confirm Full Pipeline Execution</span>
              </h3>
              <button onClick={() => setShowConfirmModal(false)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">Close</button>
            </div>

            <p className="text-xs text-slate-600 font-medium mb-6 leading-relaxed">
              This will run Phase 1 → Phase 2 → Phase 3 and replace/update the current optimization output.
            </p>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="tactile-pill px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRunFullPipeline}
                disabled={running}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-neu-btn-blue flex items-center gap-2 disabled:opacity-50"
              >
                {running ? <RefreshCw className="animate-spin" size={14} /> : <Play size={14} />}
                <span>{running ? 'Executing...' : 'Run Full Pipeline'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
