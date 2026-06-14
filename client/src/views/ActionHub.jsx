import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ECO_DATA } from '../data/ecoData';

export default function ActionHub({ onLogAction }) {
  const { state } = useAuth();
  const [filter, setFilter] = useState('all');

  const actions = ECO_DATA.actions;
  const filtered = filter === 'all' 
    ? actions 
    : actions.filter(a => a.category === filter);

  // Track completed one-time milestones
  const completedOneTimes = state.history
    .filter(item => {
      const act = actions.find(a => a.id === item.actionId);
      return act && act.type === "one-time";
    })
    .map(item => item.actionId);

  const dailyHabits = filtered.filter(a => a.type === 'daily');
  const oneTimeMilestones = filtered.filter(a => a.type === 'one-time');

  return (
    <section id="view-habits" className="app-view">
      <div className="section-header-row">
        <div className="section-header">
          <h2>Eco-Action Hub</h2>
          <p>Commit to carbon-saving habits. Check them off when completed to reduce your footprint, earn XP, and level up!</p>
        </div>
        <div className="category-filter-bar">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'Transportation' ? 'active' : ''}`} onClick={() => setFilter('Transportation')}>
            <i className="fa-solid fa-car"></i> Transit
          </button>
          <button className={`filter-btn ${filter === 'Energy' ? 'active' : ''}`} onClick={() => setFilter('Energy')}>
            <i className="fa-solid fa-plug"></i> Energy
          </button>
          <button className={`filter-btn ${filter === 'Diet & Waste' ? 'active' : ''}`} onClick={() => setFilter('Diet & Waste')}>
            <i className="fa-solid fa-leaf"></i> Diet & Waste
          </button>
        </div>
      </div>

      <div className="actions-wrapper">
        {/* Daily repeatable actions */}
        <div className="actions-column">
          <div className="column-header">
            <h3><i className="fa-solid fa-rotate"></i> Repeatable Daily Habits</h3>
            <span className="subtext">Log these every day to earn streaks & reduce emissions</span>
          </div>
          <div className="actions-grid-list">
            {dailyHabits.map(action => (
              <div className="action-card" key={action.id}>
                <div className="action-card-left">
                  <div className="action-icon"><i className={`fa-solid ${action.icon}`}></i></div>
                  <div className="action-info">
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                    <div className="action-meta">
                      <span className="meta-tag co2">-{action.co2Saved.toFixed(1)} kg CO₂e</span>
                      <span className="meta-tag xp">+{action.xp} XP</span>
                      <span className="meta-tag info" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{action.category}</span>
                    </div>
                  </div>
                </div>
                <div className="action-card-right">
                  <button className="btn btn-primary btn-small btn-log" onClick={() => onLogAction(action)}>
                    <i className="fa-solid fa-plus"></i> Log Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* One-time upgrades */}
        <div className="actions-column">
          <div className="column-header">
            <h3><i className="fa-solid fa-trophy"></i> Home Eco-Milestones</h3>
            <span className="subtext">High impact, long-term modifications</span>
          </div>
          <div className="actions-grid-list">
            {oneTimeMilestones.map(action => {
              const isCompleted = completedOneTimes.includes(action.id);
              return (
                <div className={`action-card ${isCompleted ? 'logged' : ''}`} key={action.id}>
                  <div className="action-card-left">
                    <div className="action-icon"><i className={`fa-solid ${action.icon}`}></i></div>
                    <div className="action-info">
                      <h4>{action.title}</h4>
                      <p>{action.description}</p>
                      <div className="action-meta">
                        <span className="meta-tag co2">-{action.co2Saved.toFixed(1)} kg CO₂e</span>
                        <span className="meta-tag xp">+{action.xp} XP</span>
                        <span className="meta-tag info" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{action.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="action-card-right">
                    <button className="btn btn-primary btn-small btn-log" onClick={() => onLogAction(action)} disabled={isCompleted}>
                      {isCompleted ? (
                        <>
                          <i className="fa-solid fa-check"></i> Completed
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-plus"></i> Log Action
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
