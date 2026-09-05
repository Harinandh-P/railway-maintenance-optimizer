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
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="tactile-card px-3.5 py-2 rounded-xl flex items-center gap-2.5 text-slate-800 hover:text-slate-900 shadow-neu-flat tactile-btn"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-neu-btn-blue text-white">
          <User size={18} color="white" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-slate-900 leading-tight font-display">{user?.fullName || user?.username}</div>
          <div className="text-[10px] text-slate-500 font-mono">{user?.role} ({user?.department || 'ALL'})</div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="tactile-card absolute right-0 bottom-full mb-2 w-60 z-50 p-2 shadow-neu-flat bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="px-3 py-2 border-b border-slate-200/80 mb-1">
            <div className="text-xs font-bold text-slate-900 font-display">{user?.fullName}</div>
            <div className="text-[11px] text-slate-500 font-mono">Username: <strong className="text-slate-700">{user?.username}</strong></div>
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <button
                onClick={() => { setIsOpen(false); setShowUsernameModal(true); setUnameMsg(null); setUnameErr(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 rounded-lg tactile-pill text-left transition-colors"
              >
                <KeyRound size={15} className="text-blue-500" />
                <span>Change Username</span>
              </button>

              <button
                onClick={() => { setIsOpen(false); setShowPasswordModal(true); setPassMsg(null); setPassErr(null); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-purple-600 rounded-lg tactile-pill text-left transition-colors"
              >
                <Lock size={15} className="text-purple-500" />
                <span>Change Password</span>
              </button>
            </div>
          )}

          <div className="border-t border-slate-200/80 mt-1 pt-1">
            <button
              onClick={() => { setIsOpen(false); logout(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 rounded-lg tactile-pill text-left transition-colors"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* CHANGE USERNAME MODAL */}
      {showUsernameModal && (
        <div className="modal-overlay">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <KeyRound size={18} className="text-blue-600" />
                <span>Change Admin Username</span>
              </h3>
              <button onClick={() => setShowUsernameModal(false)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">Close</button>
            </div>

            <p className="text-xs text-slate-500 font-medium mb-4">
              Server-side passkey verification required.
            </p>

            {unameMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
                <CheckCircle size={16} />
                <span>{unameMsg}</span>
              </div>
            )}

            {unameErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
                <AlertTriangle size={16} />
                <span>{unameErr}</span>
              </div>
            )}

            <form onSubmit={handleChangeUsername} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Current Username</label>
                <input type="text" className="input-field opacity-60 cursor-not-allowed" value={user?.username || ''} readOnly disabled />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Username</label>
                <input type="text" className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="Enter new username" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-600 mb-1">Security Passkey</label>
                <input type="password" className="input-field" value={passkey} onChange={e => setPasskey(e.target.value)} required placeholder="Enter security passkey" />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowUsernameModal(false)} className="tactile-pill px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={unameLoading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-neu-btn-blue disabled:opacity-50">
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
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <Lock size={18} className="text-purple-600" />
                <span>Change Admin Password</span>
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="tactile-pill px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">Close</button>
            </div>

            <p className="text-xs text-slate-500 font-medium mb-4">
              Update your account password with cryptographically secure per-user salt.
            </p>

            {passMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
                <CheckCircle size={16} />
                <span>{passMsg}</span>
              </div>
            )}

            {passErr && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 mb-4 font-semibold">
                <AlertTriangle size={16} />
                <span>{passErr}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrPass ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={currPassword}
                    onChange={e => setCurrPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPass(!showCurrPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showCurrPass ? 'Hide password' : 'Show password'}
                  >
                    {showCurrPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password (min 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showNewPass ? 'Hide password' : 'Show password'}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    className="input-field pr-10"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    title={showConfirmPass ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="tactile-pill px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={passLoading} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-neu-btn-blue disabled:opacity-50">
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
