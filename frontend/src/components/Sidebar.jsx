import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlaySquare,
  FileCheck,
  CalendarCheck,
  Layers,
  Train,
  MapPin,
  Users,
  Wrench,
  ShieldAlert,
  LogOut,
  TrainTrack,
  History,
  GitCommit,
  HardHat,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ProfileDropdown } from './ProfileDropdown';

export const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const isOperator = user?.role === 'OPERATOR';

  // Role 1: OPERATOR navigation (Simplified for engineers)
  const operatorNavItems = [
    { to: '/operator', label: 'Engineer Portal', icon: HardHat, badge: user?.department || 'ENG' },
    { to: '/operator/requests', label: 'My Requests', icon: TrainTrack },
    { to: '/operator/slots', label: 'My Allocated Slots', icon: CalendarCheck, badge: 'Phase 3' }
  ];

  // Role 2: ADMIN navigation (Full Railway Control Office system)
  const adminNavItems = [
    { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/pipeline', label: 'Run Optimization', icon: PlaySquare, badge: 'ADMIN ONLY' },
    { to: '/final-plan', label: 'Final Block Plan', icon: CalendarCheck, badge: 'Phase 3' },
    { to: '/phase1-results', label: 'Phase 1 Analysis', icon: FileCheck },
    { to: '/phase2-results', label: 'Phase 2 Candidate Gaps', icon: Layers },
    { to: '/phase3-results', label: 'Phase 3 Optimization', icon: CalendarCheck },
    { to: '/requests', label: 'All Maintenance Requests', icon: TrainTrack },
    { to: '/train-master', label: 'Train Master', icon: Train },
    { to: '/train-routes', label: 'Train Routes', icon: MapPin },
    { to: '/station-km', label: 'Station / KM Mapping', icon: MapPin },
    { to: '/corridors', label: 'Corridor Details', icon: GitCommit },
    { to: '/workers', label: 'Worker Database', icon: Users },
    { to: '/equipment', label: 'Equipment Database', icon: Wrench },
    { to: '/history', label: 'Maintenance History', icon: History },
    { to: '/audit-log', label: 'System Audit Logs', icon: ShieldAlert }
  ];

  const navItems = isAdmin ? adminNavItems : operatorNavItems;

  return (
    <aside className="sidebar-aside">
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '10px',
            borderRadius: '10px',
            display: 'flex'
          }}>
            <Train size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'white', letterSpacing: '1px' }}>
              AROHA
            </h1>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
              {isAdmin ? 'Control Office Portal' : 'Engineer Operations'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)' : 'transparent',
                border: isActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.85rem',
                textDecoration: 'none',
                marginBottom: '4px',
                transition: 'all 0.15s ease'
              })}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span className="badge badge-final" style={{ fontSize: '0.62rem' }}>{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      {/* User Footer with Profile Dropdown */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#1e293b' }}>
        <ProfileDropdown />
      </div>
    </aside>
  );
};
