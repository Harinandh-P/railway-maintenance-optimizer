import React, { useState, useRef, useEffect } from 'react';
import { User, KeyRound, Lock, LogOut, ChevronDown, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProfileDropdown = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Change Username form state
  const [newUsername, setNewUsername] = useState('');
  const [passkey, setPasskey] = useState('');
  const [unameMsg, setUnameMsg] = useState(null);
  const [unameErr, setUnameErr] = useState(null);
  const [unameLoading, setUnameLoading] = useState(false);

  // Change Password form state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [passErr, setPassErr] = useState(null);
  const [passLoading, setPassLoading] = useState(false);

  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    setUnameLoading(true);
    setUnameMsg(null);
    setUnameErr(null);

    try {
      // Passkey is validated 100% SERVER-SIDE via POST /api/auth/change-username
      const res = await api.post('/auth/change-username', {
        current_username: user?.username,
        new_username: newUsername,
        passkey: passkey
      });

      const { access_token, new_username, message } = res.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('username', new_username);

      setUnameMsg(message || 'Username updated successfully!');
      setTimeout(() => {
        setShowUsernameModal(false);
        setNewUsername('');
        setPasskey('');
        window.location.reload();
      }, 1200);
    } catch (err) {
      setUnameErr(err.response?.data?.detail || err.message || 'Failed to update username.');
    } finally {
      setUnameLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassLoading(true);
    setPassMsg(null);
    setPassErr(null);

    if (newPassword !== confirmPassword) {
      setPassErr('New password and confirmation do not match.');
      setPassLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/change-password', {
        current_password: currPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      setPassMsg(res.data?.message || 'Password changed successfully.');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1200);
    } catch (err) {
      setPassErr(err.response?.data?.detail || err.message || 'Failed to change password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '10px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={18} color="white" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'white', lineHeight: '1.2' }}>{user?.fullName || user?.username}</div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{user?.role} ({user?.department || 'ALL'})</div>
        </div>
        <ChevronDown size={16} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="glass-panel" style={{
          position: 'absolute',
          right: 0,
          bottom: 'calc(100% + 8px)',
          width: '240px',
          zIndex: 500,
          padding: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          background: '#1e293b'
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{user?.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Username: <strong>{user?.username}</strong></div>
          </div>

          {isAdmin && (
            <>
              <button
                onClick={() => { setIsOpen(false); setShowUsernameModal(true); setUnameMsg(null); setUnameErr(null); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textAlign: 'left'
                }}
              >
                <KeyRound size={16} color="#38bdf8" /> Change Username
              </button>

              <button
                onClick={() => { setIsOpen(false); setShowPasswordModal(true); setPassMsg(null); setPassErr(null); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textAlign: 'left'
                }}
              >
                <Lock size={16} color="#c084fc" /> Change Password
              </button>
            </>
          )}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '4px' }}>
            <button
              onClick={() => { setIsOpen(false); logout(); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                color: '#fb7185',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      {/* CHANGE USERNAME MODAL */}
      {showUsernameModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-box" style={{ maxWidth: 'min(92vw, 480px)', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="#38bdf8" /> Change Admin Username
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              Server-side passkey verification required.
            </p>

            {unameMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {unameMsg}
              </div>
            )}

            {unameErr && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {unameErr}
              </div>
            )}

            <form onSubmit={handleChangeUsername}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Current Username</label>
                <input type="text" className="input-field" value={user?.username || ''} readOnly style={{ opacity: 0.7 }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>New Username</label>
                <input type="text" className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="Enter new username" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#fbbf24', display: 'block', marginBottom: '6px' }}>Security Passkey</label>
                <input type="password" className="input-field" value={passkey} onChange={e => setPasskey(e.target.value)} required placeholder="Enter 10-digit passkey" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowUsernameModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={unameLoading} className="btn btn-primary">
                  {unameLoading ? 'Validating...' : 'Update Username'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="glass-panel modal-box" style={{ maxWidth: 'min(92vw, 480px)', border: '1px solid rgba(192, 132, 252, 0.4)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} color="#c084fc" /> Change Admin Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              Update your account password.
            </p>

            {passMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {passMsg}
              </div>
            )}

            {passErr && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fb7185', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {passErr}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Current Password</label>
                <input type="password" className="input-field" value={currPassword} onChange={e => setCurrPassword(e.target.value)} required placeholder="Enter current password" />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>New Password</label>
                <input type="password" className="input-field" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Enter new password (min 6 chars)" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>Confirm New Password</label>
                <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm new password" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={passLoading} className="btn btn-emerald">
                  {passLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
