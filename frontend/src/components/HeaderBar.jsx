import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';

export const HeaderBar = () => {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const istTime = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setTimeStr(istTime + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path) => {
    switch (path) {
      case '/admin': return 'Admin Dashboard';
      case '/pipeline': return 'Run Optimization';
      case '/final-plan': return 'Final Block Plan';
      case '/phase1-results': return 'Phase 1 Analysis';
      case '/phase2-results': return 'Phase 2 Candidate Gaps';
      case '/phase3-results': return 'Phase 3 Optimization';
      case '/requests': return 'All Maintenance Requests';
      case '/train-master': return 'Train Master';
      case '/train-routes': return 'Train Routes';
      case '/station-km': return 'Station / KM Mapping';
      case '/corridors': return 'Corridor Details';
      case '/workers': return 'Worker Database';
      case '/equipment': return 'Equipment Database';
      case '/history': return 'Maintenance History';
      case '/audit-log': return 'System Audit Logs';
      case '/operator': return 'Engineer Portal';
      case '/operator/requests': return 'My Maintenance Requests';
      case '/operator/slots': return 'My Allocated Slots';
      default: return 'Control Office';
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="glass-panel" style={{
      padding: '14px 24px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      background: '#151E2E',
      border: '1px solid #24334D',
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Breadcrumb & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '0.70rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>AROHA</span>
            <span>/</span>
            <span style={{ color: '#3B82F6', fontWeight: 700 }}>{pageTitle}</span>
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#DFE2EE', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Station-by-Station Movement & Block Optimization
          </div>
        </div>

        {/* System Online Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: '#101726',
          border: '1px solid #24334D',
          fontSize: '0.72rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          color: '#DFE2EE'
        }}>
          <span style={{ position: 'relative', display: 'flex', width: '8px', height: '8px' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#10B981', opacity: 0.75 }}></span>
            <span style={{ position: 'relative', borderRadius: '50%', width: '8px', height: '8px', background: '#10B981' }}></span>
          </span>
          <span style={{ letterSpacing: '0.05em' }}>SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Right Telemetry & Quick Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Recessed Search Bar */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Search routes, blocks, train IDs..."
            className="input-field"
            style={{ paddingLeft: '34px', paddingRight: '45px', height: '36px', fontSize: '0.80rem' }}
          />
          <kbd style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#1E2B42',
            border: '1px solid #24334D',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.65rem',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#94A3B8'
          }}>⌘K</kbd>
        </div>

        {/* Live Clock Telemetry */}
        <div style={{ textAlign: 'right', paddingRight: '12px', borderRight: '1px solid #24334D', fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DFE2EE' }}>{timeStr || '12:00:00 IST'}</div>
          <div style={{ fontSize: '0.65rem', color: '#64748B', letterSpacing: '0.05em' }}>ZONE: NR-HQ / DLI</div>
        </div>

        {/* Notification Bell */}
        <button
          style={{
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#1E2B42',
            border: '1px solid #24334D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            cursor: 'pointer'
          }}
          title="Notifications"
        >
          <Bell size={16} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: '#8B5CF6',
            color: '#DFE2EE',
            fontSize: '0.65rem',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #151E2E'
          }}>1</span>
        </button>
      </div>
    </header>
  );
};
