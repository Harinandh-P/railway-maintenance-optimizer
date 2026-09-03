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

  // Grouped ADMIN navigation for Mission Control telemetry
  const adminNavGroups = [
    {
      groupLabel: 'OPERATIONS TELEMETRY',
      items: [
        { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
        { to: '/pipeline', label: 'Run Optimization', icon: PlaySquare, badge: 'ADMIN' },
        { to: '/final-plan', label: 'Final Block Plan', icon: CalendarCheck, badge: 'P-3' }
      ]
    },
    {
      groupLabel: 'ARBITRATION WORKFLOW',
      items: [
        { to: '/phase1-results', label: 'Phase 1 Analysis', icon: FileCheck },
        { to: '/phase2-results', label: 'Phase 2 Candidate Gaps', icon: Layers },
        { to: '/phase3-results', label: 'Phase 3 Optimization', icon: CalendarCheck },
        { to: '/requests', label: 'All Maintenance Requests', icon: TrainTrack }
      ]
    },
    {
      groupLabel: 'RAILWAY TOPOLOGY',
      items: [
        { to: '/train-master', label: 'Train Master', icon: Train },
        { to: '/train-routes', label: 'Train Routes', icon: MapPin },
        { to: '/station-km', label: 'Station / KM Mapping', icon: MapPin },
        { to: '/corridors', label: 'Corridor Details', icon: GitCommit },
        { to: '/workers', label: 'Worker Database', icon: Users },
        { to: '/equipment', label: 'Equipment Database', icon: Wrench },
        { to: '/history', label: 'Maintenance History', icon: History },
        { to: '/audit-log', label: 'System Audit Logs', icon: ShieldAlert }
      ]
    }
  ];

  return (
    <aside className="sidebar-aside">
      {/* Brand Header */}
      <div style={{ padding: '20px 20px', borderBottom: '1px solid #24334D', background: '#151E2E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}>
            <Train size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DFE2EE', letterSpacing: '1px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              AROHA
            </h1>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {isAdmin ? 'Control Office Portal' : 'Engineer Operations'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {isAdmin ? (
          adminNavGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '16px' }}>
              <div style={{ padding: '0 12px 6px 12px', fontSize: '0.65rem', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {group.groupLabel}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 14px',
                      borderRadius: '10px',
                      color: isActive ? '#ffffff' : '#C2C6D6',
                      background: isActive ? '#1E2B42' : 'transparent',
                      border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                      boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      marginBottom: '3px',
                      transition: 'all 0.18s ease'
                    })}
                  >
                    <Icon size={17} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span className="badge badge-final" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>{item.badge}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))
        ) : (
          operatorNavItems.map((item) => {
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
                  borderRadius: '10px',
                  color: isActive ? '#ffffff' : '#C2C6D6',
                  background: isActive ? '#1E2B42' : 'transparent',
                  border: isActive ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid transparent',
                  boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.20)' : 'none',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  marginBottom: '4px',
                  transition: 'all 0.18s ease'
                })}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span className="badge badge-final" style={{ fontSize: '0.62rem' }}>{item.badge}</span>
                )}
              </NavLink>
            );
          })
        )}
      </nav>

      {/* User Footer with Profile Dropdown */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #24334D', background: '#151E2E' }}>
        <ProfileDropdown />
      </div>
    </aside>
  );
};
