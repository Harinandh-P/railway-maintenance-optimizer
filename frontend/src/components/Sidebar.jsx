import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlaySquare,
  CalendarCheck,
  Activity,
  Layers,
  Sliders,
  Wrench,
  TrainTrack,
  MapPin,
  Users,
  HardHat,
  History,
  FileText,
  Train,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

export const Sidebar = () => {
  const { user, isAdmin } = useAuth();

  const adminNavGroups = [
    {
      title: 'MAIN',
      items: [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Operator Console', path: '/operator', icon: Activity },
        { name: 'Final Block Plan', path: '/final-plan', icon: CalendarCheck, badge: 'P-3', badgeType: 'p3' },
      ]
    },
    {
      title: 'PHASE EXECUTION',
      items: [
        { name: 'Run Phase 1', path: '/pipeline?phase=1', icon: Activity },
        { name: 'Run Phase 2', path: '/pipeline?phase=2', icon: Layers },
        { name: 'Run Phase 3', path: '/pipeline?phase=3', icon: Sliders },
        { name: 'Run Full Pipeline', path: '/pipeline', icon: PlaySquare, badge: 'Admin', badgeType: 'admin' },
      ]
    },
    {
      title: 'DATABASE / DATA MANAGEMENT',
      items: [
        { name: 'Maintenance Requests', path: '/requests', icon: Wrench },
        { name: 'Workers', path: '/workers', icon: Users },
        { name: 'Equipment', path: '/equipment', icon: HardHat },
        { name: 'Train Master', path: '/train-master', icon: TrainTrack },
        { name: 'Train Routes', path: '/train-routes', icon: MapPin },
        { name: 'Station KM Mapping', path: '/station-km', icon: MapPin },
        { name: 'Corridors', path: '/corridors', icon: MapPin },
        { name: 'Maintenance History', path: '/history', icon: History },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Phase 1 Results', path: '/phase1-results', icon: Activity },
        { name: 'Phase 2 Results', path: '/phase2-results', icon: Layers },
        { name: 'Phase 3 Results', path: '/phase3-results', icon: Sliders },
        { name: 'Audit Log', path: '/audit-log', icon: FileText },
      ]
    }
  ];

  const employeeNavGroups = [
    {
      title: 'MY WORK',
      items: [
        { name: 'Dashboard', path: '/operator', icon: LayoutDashboard },
        { name: 'Create Request', path: '/operator?action=create', icon: PlusCircle },
        { name: 'My Requests', path: '/operator/requests', icon: Wrench },
        { name: 'My Allocated Slots', path: '/operator/slots', icon: CalendarCheck },
      ]
    }
  ];

  const navGroups = isAdmin ? adminNavGroups : employeeNavGroups;
  const portalTitle = isAdmin ? 'RAILWAY OPERATIONS' : 'EMPLOYEE PORTAL';

  return (
    <aside className="w-[282px] shrink-0 min-h-screen p-5 flex flex-col justify-between select-none bg-[#ebf0f7] border-r border-[#d2dceb] fixed left-0 top-0 z-50 overflow-y-auto" data-purpose="sidebar">
      <div className="flex flex-col gap-6">
        {/* App Brand / Header */}
        <div className="flex items-center gap-3.5 px-2 py-1.5" data-purpose="app-branding">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/30 text-white">
            <Train size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight font-display">AROHA</h1>
            <p className="text-[10px] font-mono tracking-wider font-semibold text-slate-500 uppercase">{portalTitle}</p>
          </div>
        </div>

        {/* Navigation Links Container */}
        <nav aria-label="Main Navigation" className="space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase font-mono">
                {group.title}
              </div>
              <ul className="space-y-1.5 font-medium text-sm">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <li key={iIdx}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `sidebar-nav-item flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                            isActive
                              ? 'nav-active-card text-blue-600 font-bold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              {isActive ? (
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute w-5 h-5 rounded-full bg-blue-400/30 animate-pulse"></div>
                                  <Icon size={16} className="text-blue-600 relative z-10" />
                                </div>
                              ) : (
                                <Icon size={16} className="text-slate-500" />
                              )}
                              <span className="tracking-tight">{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase text-white shadow-sm ${
                                item.badgeType === 'admin' ? 'bg-gradient-to-r from-indigo-500 to-purple-600' : 'bg-blue-500'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* System Status & User Profile Dropdown Pill Widget */}
      <div className="space-y-3 mt-6">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl tactile-inset text-[11px] font-mono font-medium text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SYSTEM ONLINE</span>
          </div>
          <span className="text-[10px] text-slate-400">DB CONNECTED</span>
        </div>

        <ProfileDropdown />
      </div>
    </aside>
  );
};
