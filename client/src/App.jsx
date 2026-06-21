import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './views/Login';
import Signup from './views/Signup';
import Calculator from './views/Calculator';
import Dashboard from './views/Dashboard';
import ActionHub from './views/ActionHub';
import Simulator from './views/Simulator';
import Assistant from './views/Assistant';
import GoalModal from './components/GoalModal';

export default function App() {
  const { state, updateState, user, logout, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'signup' | null
  const [theme, setTheme] = useState(localStorage.getItem('ecostride_theme') || 'dark');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef([]);

  // Sync theme attribute on documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ecostride_theme', theme);
  }, [theme]);

  // When user logs in successfully, dismiss the auth gate
  useEffect(() => {
    if (!loading && user) {
      setAuthView(null);
    } else if (!loading && !user && authView === null) {
      setAuthView('landing');
    }
  }, [user, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup all toast timers on unmount to prevent memory leaks
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const addToast = useCallback((title, message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type }]);
    // Announce to screen readers via ARIA live region
    const liveRegion = document.getElementById('toast-live-region');
    if (liveRegion) liveRegion.textContent = `${title}: ${message}`;
    // Auto-remove after 3.5 s; track timer for cleanup on unmount
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
    toastTimers.current.push(timer);
  }, []);

  const handleLogAction = useCallback((action) => {
    if (action.type === 'one-time') {
      const alreadyCompleted = state.history.some(h => h.actionId === action.id);
      if (alreadyCompleted) return;
    }

    // Pre-compute next state values from current snapshot (safe for single-user click events)
    const todayStr = new Date().toISOString().split("T")[0];
    const historyEntry = {
      actionId: action.id,
      title: action.title,
      timestamp: Date.now(),
      co2Saved: action.co2Saved,
      xp: action.xp,
      category: action.category
    };

    // Streak calculation
    let nextStreak = state.streak;
    let nextLastLoggedDate = state.lastLoggedDate;
    if (!state.lastLoggedDate) {
      nextStreak = 1;
      nextLastLoggedDate = todayStr;
    } else if (state.lastLoggedDate !== todayStr) {
      const last = new Date(state.lastLoggedDate + 'T00:00:00');
      const today = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) nextStreak = state.streak + 1;
      else if (diffDays > 1) nextStreak = 1;
      nextLastLoggedDate = todayStr;
    }

    // XP & Level calculations
    let nextXp = state.xp + action.xp;
    let nextLevel = state.level;
    let nextXpTarget = nextLevel * 100;
    let leveledUp = false;
    while (nextXp >= nextXpTarget) {
      nextXp -= nextXpTarget;
      nextLevel++;
      nextXpTarget = nextLevel * 100;
      leveledUp = true;
    }

    // Update state using functional form — side effects are kept outside the updater
    updateState(prev => ({
      ...prev,
      history: [...prev.history, historyEntry],
      streak: nextStreak,
      lastLoggedDate: nextLastLoggedDate,
      xp: nextXp,
      level: nextLevel
    }));

    // Side effects separated from the pure state updater
    addToast('Action Logged!', `Saved ${action.co2Saved} kg CO₂ and earned ${action.xp} XP`, 'success');
    if (leveledUp) {
      setTimeout(() => addToast(`Leveled Up! 🎉`, `You have reached Level ${nextLevel}!`, 'info'), 800);
    }
  }, [state, updateState, addToast]);

  const handleStartAssessment = () => {
    setActiveTab('calculator');
  };

  // --- All hooks declared above; conditional returns are safe from here ---

  if (loading) {
    return (
      <div className="auth-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <i className="fa-solid fa-spinner fa-spin" role="img" aria-label="Loading EcoStride" style={{ fontSize: '3rem', color: 'var(--color-primary)' }}></i>
        <p style={{ color: 'var(--text-secondary)' }}>Loading EcoStride...</p>
      </div>
    );
  }

  // Render Auth screens fully
  if (authView === 'landing') {
    return (
      <div className="auth-page">
        <div className="ambient-blob blob-1"></div>
        <div className="ambient-blob blob-2"></div>
        <div className="ambient-blob blob-3"></div>
        <div className="auth-container">
          <div className="auth-card glass-panel" style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div className="auth-header text-center">
              <div className="brand-icon mx-auto" style={{ marginBottom: '16px' }}>
                <i className="fa-solid fa-seedling"></i>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>EcoStride</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Track, understand, and reduce your carbon footprint.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '28px' }}>Join thousands taking steps toward a greener future.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn btn-primary btn-large full-width"
                onClick={() => setAuthView('signup')}
                id="landing-signup-btn"
              >
                <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Create Account
              </button>
              <button
                className="btn btn-outline btn-large full-width"
                onClick={() => setAuthView('login')}
                id="landing-login-btn"
              >
                <i className="fa-solid fa-right-to-bracket" aria-hidden="true"></i> Login
              </button>
            </div>
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setAuthView(null)}
              >
                Continue without an account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (authView === 'login') {
    return <Login onSwitchView={setAuthView} onBackToMain={() => setAuthView('landing')} />;
  }
  if (authView === 'signup') {
    return <Signup onSwitchView={setAuthView} onBackToMain={() => setAuthView('landing')} />;
  }

  const xpNeeded = state.level * 100;
  const xpPct = Math.min(100, (state.xp / xpNeeded) * 100);

  return (
    <>
      {/* Skip Navigation Link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ARIA live region for screen-reader toast notifications */}
      <div id="toast-live-region" role="status" aria-live="polite" aria-atomic="true" className="sr-only"></div>

      {/* Ambient Background Blobs */}
      <div className="ambient-blob blob-1"></div>
      <div className="ambient-blob blob-2"></div>
      <div className="ambient-blob blob-3"></div>

      {/* Header Navigation */}
      <header className="main-header">
        <div className="header-container">
          <button
            className="brand"
            id="brand-logo"
            onClick={() => state.onboarded && setActiveTab('dashboard')}
            style={{ cursor: state.onboarded ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
            aria-label="EcoStride – go to dashboard"
            disabled={!state.onboarded}
          >
            <div className="brand-icon">
              <i className="fa-solid fa-seedling" aria-hidden="true"></i>
            </div>
            <div className="brand-text">
              <h1>EcoStride</h1>
              <span>Step Lightly</span>
            </div>
          </button>
          
          {/* Desktop Navigation Tabs */}
          <nav className="nav-tabs" aria-label="Main navigation">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => state.onboarded && setActiveTab('dashboard')}
              disabled={!state.onboarded}
              aria-selected={activeTab === 'dashboard'}
              role="tab"
            >
              <i className="fa-solid fa-chart-pie" aria-hidden="true"></i> Dashboard
            </button>
            <button
              className={`nav-btn ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
              aria-selected={activeTab === 'calculator'}
              role="tab"
            >
              <i className="fa-solid fa-calculator" aria-hidden="true"></i> Calculator
            </button>
            <button
              className={`nav-btn ${activeTab === 'habits' ? 'active' : ''}`}
              onClick={() => state.onboarded && setActiveTab('habits')}
              disabled={!state.onboarded}
              aria-selected={activeTab === 'habits'}
              role="tab"
            >
              <i className="fa-solid fa-list-check" aria-hidden="true"></i> Action Hub
            </button>
            <button
              className={`nav-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => state.onboarded && setActiveTab('simulator')}
              disabled={!state.onboarded}
              aria-selected={activeTab === 'simulator'}
              role="tab"
            >
              <i className="fa-solid fa-sliders" aria-hidden="true"></i> What-If Sim
            </button>
            <button
              className={`nav-btn ${activeTab === 'assistant' ? 'active' : ''}`}
              onClick={() => state.onboarded && setActiveTab('assistant')}
              disabled={!state.onboarded}
              aria-selected={activeTab === 'assistant'}
              role="tab"
            >
              <i className="fa-solid fa-comment-dots" aria-hidden="true"></i> Eco-Assistant
            </button>
          </nav>

          {/* User Badges & Utilities */}
          <div className="header-utilities">
            <div className="xp-badge" id="user-xp-badge" title="Earn XP by completing carbon-reducing actions!">
              <div className="level-circle"><span id="user-level">{state.level}</span></div>
              <div className="xp-details">
                <span className="xp-label">Level Progress</span>
                <div className="xp-bar-outer">
                  <div className="xp-bar-inner" id="user-xp-bar" style={{ width: `${xpPct}%` }}></div>
                </div>
                <span className="xp-val"><span id="user-xp-current">{state.xp}</span>/<span id="user-xp-next">{xpNeeded}</span> XP</span>
              </div>
            </div>

            {user ? (
              <button onClick={logout} className="btn btn-primary btn-small">Logout</button>
            ) : (
              <>
                <button onClick={() => setAuthView('login')} className="btn btn-outline btn-small" id="login-link">Login</button>
                <button onClick={() => setAuthView('signup')} className="btn btn-primary btn-small" id="signup-link">Sign Up</button>
              </>
            )}

            <button className="utility-btn" id="theme-toggle" onClick={toggleTheme} aria-label="Toggle light and dark mode">
              <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content" id="main-content">
        {/* Onboarding Gate Overlay */}
        {!state.onboarded && activeTab !== 'calculator' && (
          <section id="onboarding-gate" className="gate-overlay">
            <div className="gate-card glass-panel text-center">
              <div className="gate-icon">
                <i className="fa-solid fa-earth-americas"></i>
              </div>
              <h2>Welcome to EcoStride</h2>
              <p>Your journey to a sustainable, low-carbon lifestyle starts here. To begin tracking and reducing your carbon footprint, take a quick 2-minute lifestyle assessment.</p>
              <button className="btn btn-primary btn-large" onClick={handleStartAssessment}>
                Start Assessment <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </section>
        )}

        {/* Tab views */}
        {activeTab === 'dashboard' && state.onboarded && (
          <Dashboard onAdjustGoal={() => setIsGoalModalOpen(true)} theme={theme} />
        )}
        {activeTab === 'calculator' && (
          <Calculator onGoToDashboard={() => setActiveTab('dashboard')} />
        )}
        {activeTab === 'habits' && state.onboarded && (
          <ActionHub onLogAction={handleLogAction} />
        )}
        {activeTab === 'simulator' && state.onboarded && (
          <Simulator />
        )}
        {activeTab === 'assistant' && state.onboarded && (
          <Assistant onLogAction={handleLogAction} />
        )}
      </main>

      {/* Modal: Goal Config */}
      <GoalModal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} />

      {/* Footer Info */}
      <footer className="main-footer">
        <div className="footer-container">
          <p>&copy; 2026 EcoStride. Designed to help you step lightly on Earth. Climate coefficients aggregated from standard EPA & DEFRA averages.</p>
        </div>
      </footer>

      {/* Toast Notifications container */}
      <div id="toast-container" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="glass-panel"
            style={{
              background: t.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(99, 102, 241, 0.95)',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              opacity: 1,
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            <i className={`fa-solid ${t.type === 'success' ? 'fa-leaf' : 'fa-award'}`} style={{ fontSize: '1.3rem' }}></i>
            <div>
              <h5 style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{t.title}</h5>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', margin: '4px 0 0 0' }}>{t.message}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
