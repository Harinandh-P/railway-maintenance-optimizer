import React, { useState, useRef, useEffect } from 'react';
import { User, KeyRound, Lock, LogOut, ChevronDown, CheckCircle, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProfileDropdown = () => {
  const { user, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password visibility states
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

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
          background: '#1E2B42',
          border: '1px solid #24334D',
          borderRadius: '12px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#DFE2EE',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
        }}>
          <User size={18} color="white" />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#DFE2EE', lineHeight: '1.2', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.fullName || user?.username}</div>
          <div style={{ fontSize: '0.70rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>{user?.role} ({user?.department || 'ALL'})</div>
        </div>
        <ChevronDown size={16} color="#94A3B8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          background: '#1A2438',
          border: '1px solid #24334D'
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #24334D', marginBottom: '4px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DFE2EE', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{user?.fullName}</div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>Username: <strong>{user?.username}</strong></div>
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
                  color: '#C2C6D6',
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
                  color: '#C2C6D6',
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

          <div style={{ borderTop: '1px solid #24334D', marginTop: '4px', paddingTop: '4px' }}>
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
                color: '#EF4444',
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DFE2EE', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={20} color="#38bdf8" /> Change Admin Username
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px' }}>
              Server-side passkey verification required.
            </p>

            {unameMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {unameMsg}
              </div>
            )}

            {unameErr && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#EF4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {unameErr}
              </div>
            )}

            <form onSubmit={handleChangeUsername}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>Current Username</label>
                <input type="text" className="input-field" value={user?.username || ''} readOnly style={{ opacity: 0.7 }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#C2C6D6', display: 'block', marginBottom: '6px' }}>New Username</label>
                <input type="text" className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="Enter new username" />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#F59E0B', display: 'block', marginBottom: '6px' }}>Security Passkey</label>
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#DFE2EE', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={20} color="#c084fc" /> Change Admin Password
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '20px' }}>
              Update your account password.
            </p>

            {passMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#10B981', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <CheckCircle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {passMsg}
              </div>
            )}

            {passErr && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#EF4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem' }}>
                <AlertTriangle size={16} style={{ display: 'inline', marginRight: '6px' }} />
                {passErr}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#C2C6D6', display: 'block', marginBottom: '6px' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrPass ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '40px' }}
                    value={currPassword}
                    onChange={e => setCurrPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPass(!showCurrPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title={showCurrPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#C2C6D6', display: 'block', marginBottom: '6px' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '40px' }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label className="label-text" style={{ fontSize: '0.82rem', color: '#C2C6D6', display: 'block', marginBottom: '6px' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="input-field"
                    style={{ paddingRight: '40px' }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    title={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
