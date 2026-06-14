import React, { useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ECO_DATA, calculateFootprint } from '../data/ecoData';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard({ onAdjustGoal, theme }) {
  const { state, updateState, user } = useAuth();
  
  const results = useMemo(() => calculateFootprint(state.calculatorInputs), [state.calculatorInputs]);
  const baselineVal = results.total;

  // Sync baseline back to state if it has changed without loop
  useEffect(() => {
    if (state.baseline !== baselineVal) {
      updateState(prev => ({ ...prev, baseline: baselineVal }));
    }
  }, [baselineVal]);

  const globalAvg = ECO_DATA.nationalAverages.Global;
  const userKg = baselineVal * 1000;
  const lowerThanGlobal = userKg < globalAvg;
  const comparePercent = Math.round(Math.abs(globalAvg - userKg) / globalAvg * 100);

  const goalReduction = baselineVal * (state.goalPercent / 100);
  const goalTarget = baselineVal - goalReduction;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyHistory = state.history.filter(item => {
    const date = new Date(item.timestamp);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalSavedKg = monthlyHistory.reduce((acc, curr) => acc + curr.co2Saved, 0);

  let streakQuote = "Log actions daily to maintain your streak!";
  if (state.streak > 0) {
    if (state.streak < 3) streakQuote = "Great start! Keep it up!";
    else if (state.streak < 7) streakQuote = "Awesome momentum! You're making a difference.";
    else streakQuote = "Unstoppable! A true champion for the planet!";
  }

  const annualizedSavingsTons = (totalSavedKg * 12) / 1000;
  const progressPercent = baselineVal > 0 
    ? Math.min(100, (annualizedSavingsTons / goalReduction) * 100) 
    : 0;

  // Chart Styling configuration based on active theme
  const isDark = theme === 'dark';
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const labelColor = isDark ? "#94a3b8" : "#475569";
  const fontName = "Plus Jakarta Sans";

  // 1. Doughnut Chart data
  const doughnutData = {
    labels: ["Transportation", "Home Energy & Waste", "Diet"],
    datasets: [{
      data: [results.breakdown.transport, results.breakdown.energy, results.breakdown.diet],
      backgroundColor: ["#06b6d4", "#10b981", "#6366f1"],
      borderWidth: 0,
      hoverOffset: 6
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: labelColor,
          font: { family: fontName, size: 11, weight: 600 },
          padding: 15
        }
      }
    },
    cutout: "70%"
  };

  // 2. Bar Chart data
  const benchmarks = ECO_DATA.nationalAverages;
  const barData = {
    labels: ["Your Footprint", "Climate Target", "Global Avg", "EU Avg", "US Avg"],
    datasets: [{
      data: [
        baselineVal,
        benchmarks.Target / 1000,
        benchmarks.Global / 1000,
        benchmarks.EU / 1000,
        benchmarks.US / 1000
      ],
      backgroundColor: [
        baselineVal <= benchmarks.Target / 1000 ? "#10b981" : "#f59e0b",
        "#10b981", "#94a3b8", "#64748b", "#475569"
      ],
      borderRadius: 6,
      barThickness: 20
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: labelColor, font: { family: fontName, size: 9, weight: 600 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: labelColor, font: { family: fontName, size: 10 } },
        title: {
          display: true,
          text: "Metric Tons CO2e / Year",
          color: labelColor,
          font: { family: fontName, size: 10, weight: 700 }
        }
      }
    }
  };

  // Tailored eco-insights definitions
  const categoriesSort = [
    { name: "Transportation", val: results.breakdown.transport, icon: "fa-car", class: "info" },
    { name: "Home Energy", val: results.breakdown.energy, icon: "fa-plug", class: "success" },
    { name: "Diet & Waste", val: results.breakdown.diet, icon: "fa-leaf", class: "warning" }
  ].sort((a, b) => b.val - a.val);

  const dominant = categoriesSort[0];

  let dominantAdvice = "";
  if (dominant.name === "Transportation") {
    dominantAdvice = "Your travel habits make up the biggest slice of your footprint. Prioritize cycling or walking for short errands (<5km), or bundle car trips. If long commutes are necessary, carpooling or EV conversion yields massive reductions.";
  } else if (dominant.name === "Home Energy") {
    dominantAdvice = "Household power and utility waste dominates your footprint. Wash laundry in cold water and switch to clothesline air-drying to immediately slash energy usage. Adjusting your heating down by 1°C in winter saves up to 10% on emissions.";
  } else {
    dominantAdvice = "Your dietary pattern and household waste produce significant emissions. Transitioning to 'meatless days' or a flexitarian diet is the single most effective action. Also, focus on portion control and freezing leftovers to prevent greenhouse emissions from food waste.";
  }

  let goalProgressAdvice = "";
  if (totalSavedKg === 0) {
    goalProgressAdvice = `You haven't logged any eco-actions this month yet. Check out the Action Hub to log habits and start your journey towards your -${state.goalPercent}% reduction goal!`;
  } else {
    const progressPercentRounded = Math.round((annualizedSavingsTons / goalReduction) * 100);
    if (progressPercentRounded >= 100) {
      goalProgressAdvice = `⭐ Amazing! Your active habits have already surpassed your reduction goal for the month! You have prevented ${totalSavedKg.toFixed(1)} kg of carbon. Keep setting new milestones!`;
    } else {
      goalProgressAdvice = `You've saved ${totalSavedKg.toFixed(1)} kg of CO₂ this month, achieving ${progressPercentRounded}% of your target goal pace. Maintain consistency to unlock your next levels!`;
    }
  }

  const tips = [
    { title: "Slay Vampire Loads", text: "Electronics left plugged in on standby consume 'vampire electricity' that accounts for up to 10% of standard household bills. Turn off or use smart strips." },
    { title: "Low Temp Wash", text: "90% of energy in laundry washing machines goes towards heating water. Switching from hot to warm or cold water saves substantial emissions." },
    { title: "Reduce Food Waste", text: "If food waste were a country, it would be the third-largest global emitter of greenhouse gases. Plan meals and compost organic waste to reduce home output." },
    { title: "Eco Tire Check", text: "Under-inflated tires increase fuel consumption by up to 3%. Check tire pressure monthly to save petrol cost and emissions." }
  ];
  // Memoize tip-of-the-day so new Date() doesn't re-run on every render
  const activeTip = useMemo(() => tips[new Date().getDate() % tips.length], []);

  // History list descending order — memoized to avoid re-sorting on every render
  const sortedHistory = useMemo(
    () => [...state.history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [state.history]
  );

  return (
    <section id="view-dashboard" className="app-view">
      <div className="dashboard-welcome-banner glass-panel">
        <div className="welcome-text">
          <h2>Hello, {user?.name ? user.name.split(' ')[0] : 'Eco-Hero'}! 👋</h2>
          <p>Tracking your daily actions is paving the road to a zero-carbon future. Keep up the green work.</p>
        </div>
        <button className="btn btn-secondary-accent btn-small" onClick={onAdjustGoal}>
          <i className="fa-solid fa-bullseye"></i> Adjust Carbon Goal
        </button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-header">
            <span>Annual Footprint Baseline</span>
            <i className="fa-solid fa-cloud-arrow-up icon-transport"></i>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{baselineVal.toFixed(1)} <small>t CO₂e/yr</small></span>
            <span className="kpi-subtext">
              {lowerThanGlobal ? (
                <>
                  <i className="fa-solid fa-leaf text-success"></i> Excellent! Your footprint is <strong>{comparePercent}% lower</strong> than the global average.
                </>
              ) : (
                <>
                  🚨 Your footprint is <strong>{comparePercent}% higher</strong> than the global average.
                </>
              )}
            </span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-header">
            <span>Reduction Target Goal</span>
            <i className="fa-solid fa-circle-check icon-goal"></i>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">-{state.goalPercent}%</span>
            <span className="kpi-subtext">Target: {goalTarget.toFixed(1)} t CO₂e/yr</span>
          </div>
          <div className="goal-progress-container">
            <div className="goal-progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-header">
            <span>Carbon Saved This Month</span>
            <i className="fa-solid fa-leaf icon-energy"></i>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{totalSavedKg.toFixed(1)} <small>kg CO₂</small></span>
            <span className="kpi-subtext">{monthlyHistory.length} habit{monthlyHistory.length === 1 ? '' : 's'} logged</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-header">
            <span>Habit Streak</span>
            <i className="fa-solid fa-fire icon-streak"></i>
          </div>
          <div className="kpi-body">
            <span className="kpi-value">{state.streak} <small>days</small></span>
            <span className="kpi-subtext">{streakQuote}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-details-grid">
        <div className="chart-section-wrapper glass-panel">
          <div className="panel-header">
            <h3><i className="fa-solid fa-chart-column"></i> Carbon Diagnostics</h3>
          </div>
          <div className="charts-container">
            <div className="chart-box">
              <h4>Emissions Breakdown</h4>
              <div className="canvas-wrapper">
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            </div>
            <div className="chart-box">
              <h4>Benchmark Comparison</h4>
              <div className="canvas-wrapper">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>
        </div>

        <div className="insights-section-wrapper glass-panel">
          <div className="panel-header">
            <h3><i className="fa-solid fa-lightbulb"></i> Tailored Eco-Insights</h3>
          </div>
          <div className="insights-list">
            <div className={`insight-card ${dominant.class}`}>
              <div className="insight-icon"><i className={`fa-solid ${dominant.icon}`}></i></div>
              <div className="insight-content">
                <h5>Focus Area: {dominant.name} ({dominant.val.toFixed(1)} t)</h5>
                <p>{dominantAdvice}</p>
              </div>
            </div>

            <div className="insight-card info">
              <div className="insight-icon"><i className="fa-solid fa-bullseye"></i></div>
              <div className="insight-content">
                <h5>Goal Progress</h5>
                <p>{goalProgressAdvice}</p>
              </div>
            </div>

            <div className="insight-card success">
              <div className="insight-icon"><i className="fa-solid fa-lightbulb"></i></div>
              <div className="insight-content">
                <h5>Daily Tip: {activeTip.title}</h5>
                <p>{activeTip.text}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-dashboard-grid">
        <div className="recent-actions-panel glass-panel">
          <div className="panel-header">
            <h3><i className="fa-solid fa-history"></i> Logged Activity History</h3>
          </div>
          <div className="activity-history-list">
            {sortedHistory.length === 0 ? (
              <div className="no-activity-placeholder">
                <p>No actions logged yet. Head over to the <strong>Action Hub</strong> to log your first green activity!</p>
              </div>
            ) : (
              sortedHistory.map((item, index) => {
                const date = new Date(item.timestamp);
                const formattedDate = date.toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                const actionRef = ECO_DATA.actions.find(a => a.id === item.actionId);
                const iconClass = actionRef ? actionRef.icon : "fa-leaf";

                return (
                  <div className="history-item" key={`${item.actionId}-${item.timestamp}`}>
                    <div className="history-item-left">
                      <div className="history-icon-circle"><i className={`fa-solid ${iconClass}`}></i></div>
                      <div className="history-details">
                        <span className="history-title">{item.title}</span>
                        <span className="history-time">{formattedDate}</span>
                      </div>
                    </div>
                    <div className="history-item-right">
                      <span className="history-reduction">-{item.co2Saved.toFixed(1)} kg CO₂</span>
                      <span className="history-xp">+{item.xp} XP</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
