import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const knownReqIdsRef = useRef(null);
  const isPollingRef = useRef(false);
  const backoffMsRef = useRef(60000); // Default 60 seconds
  const timerRef = useRef(null);

  const BASE_INTERVAL_MS = 60000; // 60 seconds
  const MAX_BACKOFF_MS = 300000;  // 5 minutes max

  const executePoll = async (isManual = false) => {
    if (!isAdmin) return;

    // STEP 3: Prevent overlapping requests
    if (isPollingRef.current) return;

    // STEP 4: Pause polling when tab is hidden
    if (document.hidden && !isManual) return;

    // STEP 8: Multi-tab coordination via localStorage timestamp
    const now = Date.now();
    const lastPoll = Number(localStorage.getItem('aroha_last_notif_poll_ts') || 0);
    if (!isManual && (now - lastPoll < 50000)) {
      return; // Skip poll tick if another tab polled < 50s ago
    }

    isPollingRef.current = true;

    try {
      const res = await api.get('/data/maintenance-requests');
      localStorage.setItem('aroha_last_notif_poll_ts', String(Date.now()));

      // Reset rate-limited state & backoff interval on success
      backoffMsRef.current = BASE_INTERVAL_MS;
      setRateLimited(false);

      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data?.records) ? res.data.records : []));

      if (!knownReqIdsRef.current) {
        // Initialize baseline
        knownReqIdsRef.current = new Set(list.map(r => String(r.request_id || '').trim()));
      } else {
        const newNotifications = [];
        list.forEach(r => {
          const reqId = String(r.request_id || '').trim();
          if (reqId && !knownReqIdsRef.current.has(reqId)) {
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
      }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setRateLimited(true);
        // STEP 5: Exponential backoff & Retry-After support
        const retryAfter = err.response.headers?.['retry-after'];
        let waitMs = MAX_BACKOFF_MS;
        if (retryAfter && !isNaN(Number(retryAfter))) {
          waitMs = Math.max(BASE_INTERVAL_MS, Number(retryAfter) * 1000);
        } else {
          waitMs = Math.min(MAX_BACKOFF_MS, backoffMsRef.current * 2);
        }
        backoffMsRef.current = waitMs;
        console.warn(`[NotificationContext] HTTP 429 Rate Limit encountered. Pausing polling for ${waitMs / 1000}s`);
      }
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    // STEP 1 & 2: Centralized poll scheduler
    const scheduleNextPoll = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await executePoll();
        scheduleNextPoll();
      }, backoffMsRef.current);
    };

    // Initial fetch on mount
    executePoll();
    scheduleNextPoll();

    // STEP 4: Visibility change listener
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const lastPoll = Number(localStorage.getItem('aroha_last_notif_poll_ts') || 0);
        if (Date.now() - lastPoll > BASE_INTERVAL_MS) {
          executePoll(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAdmin]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      showDropdown,
      setShowDropdown,
      rateLimited,
      markAsRead,
      markAllRead,
      refreshNotifications: () => executePoll(true)
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  return context || {
    notifications: [],
    unreadCount: 0,
    showDropdown: false,
    setShowDropdown: () => {},
    rateLimited: false,
    markAsRead: () => {},
    markAllRead: () => {},
    refreshNotifications: () => {}
  };
};
