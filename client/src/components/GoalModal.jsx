import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function GoalModal({ isOpen, onClose }) {
  const { state, updateState } = useAuth();
  const [goalPercent, setGoalPercent] = useState(state.goalPercent);

  useEffect(() => {
    if (isOpen) {
      setGoalPercent(state.goalPercent);
    }
  }, [isOpen, state.goalPercent]);

  if (!isOpen) return null;

  const baseline = state.baseline;
  const savings = baseline * (goalPercent / 100);
  const target = baseline - savings;

  const handleSubmit = (e) => {
    e.preventDefault();
    updateState(prev => ({
      ...prev,
      goalPercent
    }));
    onClose();
  };

  return (
    <div className="modal-overlay" id="goal-modal" onClick={onClose}>
      <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure Carbon Reduction Goal</h3>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close goal modal">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form id="goal-form" className="modal-body" onSubmit={handleSubmit}>
          <p>Set a target percentage reduction you want to achieve through daily habits and upgrades.</p>
          
          <div className="goal-slider-wrapper text-center">
            <span className="goal-preview-percentage" id="goal-preview-val">{goalPercent}%</span>
            <span className="goal-preview-label">Footprint Reduction Target</span>
            
            <input
              type="range"
              id="goal-percentage-range"
              min="5"
              max="60"
              step="5"
              value={goalPercent}
              onChange={(e) => setGoalPercent(parseInt(e.target.value) || 20)}
            />
            <div className="slider-limits">
              <span>5% (Conservative)</span>
              <span>60% (Highly Ambitious)</span>
            </div>
          </div>

          <div className="goal-impact-preview">
            <div className="preview-item">
              <span>Current Footprint:</span>
              <strong id="goal-calc-current">{baseline.toFixed(2)} t</strong>
            </div>
            <div className="preview-item">
              <span>Target Carbon Limit:</span>
              <strong id="goal-calc-target">{target.toFixed(2)} t</strong>
            </div>
            <div className="preview-item success">
              <span>Annual CO₂ prevented:</span>
              <strong id="goal-calc-saved">{savings.toFixed(2)} t</strong>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-success">Save Active Goal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
