import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const fullName = localStorage.getItem('fullName');
    const department = localStorage.getItem('department') || 'ALL';

    if (token && username && role) {
      setUser({ token, username, role, fullName, department });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await api.post('/auth/token', formData);
    const { access_token, role, full_name, department } = res.data;

    const userDept = department || 'ALL';

    localStorage.setItem('token', access_token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
    localStorage.setItem('fullName', full_name);
    localStorage.setItem('department', userDept);

    setUser({ token: access_token, username, role, fullName: full_name, department: userDept });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('fullName');
    localStorage.removeItem('department');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      loading,
      isAdmin: user?.role === 'ADMIN',
      isOperator: user?.role === 'OPERATOR'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
