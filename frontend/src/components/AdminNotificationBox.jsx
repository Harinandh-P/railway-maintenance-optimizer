import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, ArrowRight, CheckCircle2, FileText, Wrench } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminNotificationBox = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Baseline tracking ref (to avoid baseline false alerts)
  const knownReqIdsRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;

    // Close dropdown on click outside
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Initial Baseline Fetch & Polling
    fetchNotificationsBaseline();
    const interval = setInterval(pollNewRequests, 10000); // 10s polling

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, [isAdmin]);

  const fetchNotificationsBaseline = async () => {
    try {
      const res = await api.get('/data/maintenance-requests');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));
      
      // Store initial set of existing request IDs so baseline is established
      const initialSet = new Set(list.map(r => String(r.request_id || '').trim()));
      knownReqIdsRef.current = initialSet;
    } catch (err) {
      console.error('Failed to initialize notification baseline:', err);
      knownReqIdsRef.current = new Set();
    }
  };

  const pollNewRequests = async () => {
    if (!knownReqIdsRef.current) return;

    try {
      const res = await api.get('/data/maintenance-requests');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));

      const newNotifications = [];
      list.forEach(r => {
        const reqId = String(r.request_id || '').trim();
        if (reqId && !knownReqIdsRef.current.has(reqId)) {
          // Mark as known so we don't duplicate
          knownReqIdsRef.current.add(reqId);

          newNotifications.push({
            id: `${reqId}_${Date.now()}`,
            requestId: reqId,
            requester: r.created_by || r.department || 'Employee',
            department: r.department || 'Engineering',
            defectType: r.defect_type || 'Maintenance Issue',
            severity: r.defect_severity || 'High',
            location: r.location || 'KM 100',
            date: r.request_datetime || new Date().toISOString().slice(0, 16).replace('T', ' '),
            read: false
          });
        }
      });

      if (newNotifications.length > 0) {
        setNotifications(prev => [...newNotifications, ...prev]);
      }
    } catch (err) {
      // Silent error during background polling
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    setShowDropdown(false);
    navigate('/pipeline-requests');
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  if (!isAdmin) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="tactile-pill w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 relative transition-transform tactile-btn"
        title="Admin Live Notifications"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {showDropdown && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-neu-flat border border-slate-200 z-50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold font-display uppercase tracking-wider text-slate-900">
                Admin Notifications {unreadCount > 0 && `(${unreadCount} New)`}
              </h4>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-mono font-semibold text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-6 px-3 text-xs text-slate-500 font-mono space-y-1">
                <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                <div className="font-bold text-slate-700">NO NEW NOTIFICATIONS</div>
                <div className="text-[11px] text-slate-400">
                  New employee maintenance requests will appear here in real-time.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    n.read ? 'bg-slate-50 border-slate-200/80 opacity-75' : 'bg-blue-50/60 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-slate-900">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>🔔 New Request: {n.requestId}</span>
                    </div>
                    <span className={`badge ${n.severity === 'Critical' ? 'badge-critical' : 'badge-candidate'}`}>
                      {n.severity}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium">
                    {n.defectType} — <span className="text-slate-500">{n.department}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2 pt-1 border-t border-slate-200/60">
                    <span>Submitted by: <strong>{n.requester}</strong></span>
                    <span className="text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
                      View Request <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-center">
            <button
              onClick={() => {
                setShowDropdown(false);
                navigate('/pipeline-requests');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 font-mono"
            >
              <span>Go to Pipeline Requests Queue →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
