import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const HeaderBar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const ist = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setTimeString(`${ist} IST`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageTitle = (path) => {
    switch (path) {
      case '/operator': return 'Engineer Operations Portal';
      case '/operator/requests': return 'My Maintenance Requests';
      case '/operator/slots': return 'My Allocated Slots';
      case '/admin': return 'Control Office Dashboard';
      case '/pipeline': return 'Run Optimization Pipeline';
      case '/final-plan': return 'Final Block Plan (Phase 3)';
      case '/phase1-results': return 'Phase 1 Analysis Results';
      case '/phase2-results': return 'Phase 2 Candidate Gaps';
      case '/phase3-results': return 'Phase 3 Optimization Matrix';
      case '/requests': return 'All Maintenance Requests';
      case '/train-master': return 'Train Master Dataset';
      case '/train-routes': return 'Train Route Sequence Dataset';
      case '/station-km': return 'Station / KM Mapping';
      case '/corridors': return 'Corridor Topology Details';
      case '/workers': return 'Worker Roster & Skills';
      case '/equipment': return 'Equipment Inventory';
      case '/history': return 'Maintenance History';
      case '/audit-log': return 'System Audit Logs';
      default: return 'Control Office Portal';
    }
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="tactile-card rounded-2xl px-6 py-3.5 flex items-center justify-between mb-6 shadow-neu-flat select-none" data-purpose="top-navigation">
      {/* Breadcrumbs & Status Subtitle */}
      <div className="flex items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>AROHA</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">{pageTitle}</span>
          </div>
          <div className="text-sm font-semibold text-slate-800 tracking-tight font-sans">
            Railway Maintenance & Track Block System
          </div>
        </div>

        {/* Pill: System Online */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full tactile-inset text-slate-700 text-xs font-mono font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* Search Input and Quick Actions */}
      <div className="flex items-center gap-5">
        {/* Recessed Search Bar */}
        <div className="relative w-72 md:w-80 tactile-inset rounded-full flex items-center px-3.5 py-1.5">
          <Search size={16} className="text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            className="bg-transparent border-0 text-xs w-full text-slate-700 focus:outline-none focus:ring-0 placeholder-slate-400 p-0 font-sans"
            placeholder="Search routes, blocks, train IDs..."
          />
          <div className="flex items-center ml-1">
            <kbd className="tactile-pill px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400">⌘K</kbd>
          </div>
        </div>

        {/* Time & Zone Telemetry */}
        <div className="hidden lg:block text-right pr-2 border-r border-slate-300/60 font-mono">
          <div className="text-xs font-bold text-slate-800">{timeString || '12:12:42 IST'}</div>
          <div className="text-[10px] text-slate-400 tracking-wider">ZONE: NR-HQ / DLI</div>
        </div>

        {/* Notification Bell */}
        <button className="tactile-pill w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 relative transition-transform tactile-btn">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-white">1</span>
        </button>

        {/* User Account Icon */}
        <div className="tactile-pill w-10 h-10 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs uppercase font-mono">
          {user?.username?.substring(0, 2) || 'AD'}
        </div>
      </div>
    </header>
  );
};
