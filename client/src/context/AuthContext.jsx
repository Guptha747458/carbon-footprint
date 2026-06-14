import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

const DEFAULT_STATE = {
  onboarded: false,
  calculatorInputs: {
    carType: "none",
    carDist: 0,
    transitDist: 0,
    flightsShort: 0,
    flightsLong: 0,
    electricityBill: 0,
    gasBill: 0,
    householdSize: 1,
    dietType: "average",
    wasteProduced: 10,
    recycleActive: true
  },
  baseline: 0,
  goalPercent: 20,
  history: [],
  xp: 0,
  level: 1,
  streak: 0,
  lastLoggedDate: null
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('ecostride_token'));
  const [user, setUser] = useState(null);
  const [state, setState] = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const syncTimer = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Parse JWT token helper
  const parseJwt = (token) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  // On mount or token change, load user and state
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser({ email: decoded.email, id: decoded.id, name: localStorage.getItem('ecostride_user_name') || '' });
          await fetchUserData(token);
        } else {
          // Token expired
          logout();
        }
      } else {
        // Load local state from localStorage
        const local = localStorage.getItem('ecostride_state');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            setState({ ...DEFAULT_STATE, ...parsed });
          } catch (e) {
            console.error("Failed to parse local state", e);
          }
        } else {
          setState(DEFAULT_STATE);
        }
        setUser(null);
      }
      setLoading(false);
    };

    initialize();
  }, [token]);

  const fetchUserData = async (activeToken) => {
    try {
      const res = await fetch(`${API_URL}/api/user/data`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const saved = await res.json();
        if (Object.keys(saved).length > 0) {
          setState(prev => ({
            ...prev,
            ...saved,
            calculatorInputs: { ...prev.calculatorInputs, ...saved.calculatorInputs }
          }));
        }
      } else if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (e) {
      console.error("Failed to fetch user data", e);
    }
  };

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    localStorage.setItem('ecostride_token', data.token);
    if (data.user?.name) localStorage.setItem('ecostride_user_name', data.user.name);
    setToken(data.token);
    return data;
  };

  const signup = async (name, email, password) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed');
    }
    localStorage.setItem('ecostride_token', data.token);
    if (data.user?.name) localStorage.setItem('ecostride_user_name', data.user.name);
    setToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ecostride_token');
    localStorage.removeItem('ecostride_state');
    localStorage.removeItem('ecostride_user_name');
    setToken(null);
    setUser(null);
    setState(DEFAULT_STATE);
  };

  // Update tracking state and sync to local/network
  const updateState = (updater) => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Always save to localStorage immediately
      localStorage.setItem('ecostride_state', JSON.stringify(next));

      if (token) {
        // Debounce backend sync
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(() => {
          fetch(`${API_URL}/api/user/data`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(next)
          }).catch(err => console.error("Sync error", err));
        }, 1000);
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ token, user, state, updateState, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
