/**
 * EcoStride - Application Logic & State Controller
 */

  const startApp = () => {
  // --------------------------------------------------------------------------
  // 1. Initial State Definition
  // --------------------------------------------------------------------------
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
    baseline: 0, // Annual footprint in metric tons CO2e
    goalPercent: 20, // Goal reduction percentage
    history: [], // Array of { actionId, timestamp, co2Saved, xp, category }
    xp: 0,
    level: 1,
    streak: 0,
    lastLoggedDate: null // YYYY-MM-DD
  };

  let state = { ...DEFAULT_STATE };
  let activeTab = "dashboard";
  let chartInstances = { category: null, comparison: null };
  let saveStateTimer = null; // for debouncing saveState network calls

  // Helper selectors
  const DOM = {
    themeToggle: document.getElementById("theme-toggle"),
    navButtons: document.querySelectorAll(".nav-btn"),
    views: document.querySelectorAll(".app-view"),
    onboardingGate: document.getElementById("onboarding-gate"),
    startAssessmentBtn: document.getElementById("start-assessment-btn"),
    
    // Calculator Elements
    calcForm: document.getElementById("calc-form"),
    calcSteps: document.querySelectorAll(".calc-step"),
    stepIndicators: document.querySelectorAll(".step-indicator"),
    calcResultVal: document.getElementById("calc-result-val"),
    calcResultComparison: document.getElementById("calc-result-comparison"),
    btnCalcGoDashboard: document.getElementById("btn-calc-go-dashboard"),
    btnCalcDownloadPdf: document.getElementById("btn-calc-download-pdf"),
    btnCalcReassess: document.getElementById("btn-calc-reassess"),

    // Dashboard KPIs
    kpiBaseline: document.getElementById("kpi-baseline"),
    kpiBaselineSub: document.getElementById("kpi-baseline-sub"),
    kpiGoalPercent: document.getElementById("kpi-goal-percent"),
    kpiGoalTarget: document.getElementById("kpi-goal-target"),
    kpiGoalProgress: document.getElementById("kpi-goal-progress"),
    kpiSavedCo2: document.getElementById("kpi-saved-co2"),
    kpiActionsLogged: document.getElementById("kpi-actions-logged"),
    kpiStreak: document.getElementById("kpi-streak"),
    kpiStreakQuote: document.getElementById("kpi-streak-quote"),
    dashboardInsights: document.getElementById("dashboard-insights"),
    activityLogContainer: document.getElementById("activity-log-container"),
    btnSetupGoal: document.getElementById("btn-setup-goal"),
    
    // Level & XP
    userLevel: document.getElementById("user-level"),
    userXpCurrent: document.getElementById("user-xp-current"),
    userXpNext: document.getElementById("user-xp-next"),
    userXpBar: document.getElementById("user-xp-bar"),

    // Action Hub
    dailyActionsList: document.getElementById("daily-actions-list"),
    onetimeActionsList: document.getElementById("onetime-actions-list"),
    categoryFilters: document.getElementById("action-category-filters"),

    // Simulator
    simValDriving: document.getElementById("sim-val-driving"),
    simValElectricity: document.getElementById("sim-val-electricity"),
    simValFlightsShort: document.getElementById("sim-val-flights-short"),
    simValDiet: document.getElementById("sim-val-diet"),
    simInputDriving: document.getElementById("sim-input-driving"),
    simInputElectricity: document.getElementById("sim-input-electricity"),
    simInputFlightsShort: document.getElementById("sim-input-flights-short"),
    simInputDiet: document.getElementById("sim-input-diet"),
    simGaugeVal: document.getElementById("sim-gauge-val"),
    simGaugeCircle: document.querySelector(".sim-gauge-circle"),
    simCompBaseline: document.getElementById("sim-comp-baseline"),
    simCompSimulated: document.getElementById("sim-comp-simulated"),
    simCompSavings: document.getElementById("sim-comp-savings"),
    simAnalysisFeedback: document.getElementById("sim-analysis-feedback"),

    // Goal Modal
    goalModal: document.getElementById("goal-modal"),
    closeGoalModal: document.getElementById("close-goal-modal"),
    goalForm: document.getElementById("goal-form"),
    btnCancelGoal: document.getElementById("btn-cancel-goal"),
    goalPercentageRange: document.getElementById("goal-percentage-range"),
    goalPreviewVal: document.getElementById("goal-preview-val"),
    goalCalcCurrent: document.getElementById("goal-calc-current"),
    goalCalcTarget: document.getElementById("goal-calc-target"),
    goalCalcSaved: document.getElementById("goal-calc-saved")
  };

  // --------------------------------------------------------------------------
  // 2. Application Setup & State Management
  // --------------------------------------------------------------------------
  async function init() {
    loadTheme();
    await loadState();
    setupEventListeners();
    renderUserXP();
    updateUIForOnboardState();
    updateAuthUI();
    
    // If not onboarded, block user interaction and show onboarding popup
    if (!state.onboarded) {
      DOM.onboardingGate.classList.remove("hidden");
    } else {
      refreshAllViews();
    }
  }

  async function loadState() {
    try {
      const token = localStorage.getItem('ecostride_token');
      if (token) {
        const response = await apiFetch('/api/user/data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const saved = await response.json();
          if (Object.keys(saved).length > 0) {
            state = { ...DEFAULT_STATE, ...saved };
            state.calculatorInputs = { ...DEFAULT_STATE.calculatorInputs, ...state.calculatorInputs };
          }
        } else {
          if(response.status === 401 || response.status === 403) {
            localStorage.removeItem('ecostride_token');
          }
        }
      } else {
        const saved = localStorage.getItem("ecostride_state");
        if (saved) {
          state = JSON.parse(saved);
          state.calculatorInputs = { ...DEFAULT_STATE.calculatorInputs, ...state.calculatorInputs };
        }
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  }

  async function saveState() {
    try {
      localStorage.setItem("ecostride_state", JSON.stringify(state)); // local fallback always immediate
      const token = localStorage.getItem('ecostride_token');
      if (token) {
        // Debounce network call — wait 1s after last change before posting
        clearTimeout(saveStateTimer);
        saveStateTimer = setTimeout(async () => {
          try {
            await apiFetch('/api/user/data', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(state)
            });
          } catch (e) {
            console.error("Failed to sync state to server", e);
          }
        }, 1000);
      }
    } catch (e) {
      console.error("Failed to save state", e);
    }
  }

  function updateAuthUI() {
    const token = localStorage.getItem('ecostride_token');
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');

    if (token) {
      if (loginLink) loginLink.style.display = 'none';
      if (signupLink) {
        signupLink.textContent = 'Logout';
        signupLink.href = '#';
        // Clone node to remove any previously attached listeners before adding a new one
        const newSignupLink = signupLink.cloneNode(true);
        signupLink.parentNode.replaceChild(newSignupLink, signupLink);
        newSignupLink.addEventListener('click', (e) => {
          e.preventDefault();
          localStorage.removeItem('ecostride_token');
          window.location.reload();
        });
      }
    }
  }

  function updateUIForOnboardState() {
    if (state.onboarded) {
      DOM.onboardingGate.classList.add("hidden");
    } else {
      DOM.onboardingGate.classList.remove("hidden");
    }
  }

  // --------------------------------------------------------------------------
  // 3. Carbon Calculation Logic
  // --------------------------------------------------------------------------
  function calculateFootprint(inputs) {
    const factors = ECO_DATA.emissionFactors;
    
    // 1. Transportation Category (annual metric tons CO2e)
    let transportAnnual = 0;
    if (inputs.carType !== "none" && inputs.carDist > 0) {
      const carFactor = factors.transport[inputs.carType] || 0;
      // Dist per week * 52 weeks * factor / 1000 to convert kg to tons
      transportAnnual += (inputs.carDist * 52 * carFactor) / 1000;
    }
    if (inputs.transitDist > 0) {
      transportAnnual += (inputs.transitDist * 52 * factors.transport.public_transit) / 1000;
    }
    if (inputs.flightsShort > 0) {
      transportAnnual += (inputs.flightsShort * factors.transport.flight_short) / 1000;
    }
    if (inputs.flightsLong > 0) {
      transportAnnual += (inputs.flightsLong * factors.transport.flight_long) / 1000;
    }

    // 2. Home Energy Category (annual metric tons CO2e per household share)
    let energyAnnual = 0;
    const hhSize = Math.max(1, inputs.householdSize);
    if (inputs.electricityBill > 0) {
      // Monthly kWh * 12 months * electricity factor / hh size / 1000
      energyAnnual += (inputs.electricityBill * 12 * factors.energy.electricity) / hhSize / 1000;
    }
    if (inputs.gasBill > 0) {
      // Monthly therms * 12 months * gas factor / hh size / 1000
      energyAnnual += (inputs.gasBill * 12 * factors.energy.gas) / hhSize / 1000;
    }

    // 3. Waste Category (annual metric tons CO2e per household share)
    let wasteAnnual = 0;
    if (inputs.wasteProduced > 0) {
      const recycleFactor = inputs.recycleActive ? factors.energy.waste_reduction_recycling : 0;
      const baseWasteFactor = factors.energy.waste - recycleFactor;
      // Weekly kg * 52 weeks * factor / hh size / 1000
      wasteAnnual += (inputs.wasteProduced * 52 * baseWasteFactor) / hhSize / 1000;
    }

    // 4. Diet Category (already annual, convert kg to tons)
    const dietAnnual = (factors.diet[inputs.dietType] || 1900) / 1000;

    const total = transportAnnual + energyAnnual + wasteAnnual + dietAnnual;

    return {
      total: parseFloat(total.toFixed(2)),
      breakdown: {
        transport: parseFloat(transportAnnual.toFixed(2)),
        energy: parseFloat((energyAnnual + wasteAnnual).toFixed(2)), // Combining home energy + waste
        diet: parseFloat(dietAnnual.toFixed(2))
      }
    };
  }

  // --------------------------------------------------------------------------
  // 4. Views Refreshers & Renderers
  // --------------------------------------------------------------------------
  function refreshAllViews() {
    updateUIForOnboardState();
    renderDashboard();
    renderActionHub();
    renderSimulator();
    renderUserXP();
  }

  // A. Navigation Tabs Routing
  function switchTab(targetTab) {
    if (!state.onboarded && targetTab !== "calculator") {
      // Don't allow other tabs if they aren't assessed yet
      return;
    }
    activeTab = targetTab;

    // Update nav buttons
    DOM.navButtons.forEach(btn => {
      const isActive = btn.getAttribute("data-tab") === targetTab;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    // Update view sections visibility
    DOM.views.forEach(view => {
      const viewId = view.getAttribute("id");
      if (viewId === `view-${targetTab}`) {
        view.classList.remove("hidden");
      } else {
        view.classList.add("hidden");
      }
    });

    // Specific tab activations
    if (targetTab === "dashboard") {
      renderDashboard();
    } else if (targetTab === "simulator") {
      renderSimulator();
    } else if (targetTab === "habits") {
      renderActionHub();
    }
  }

  // B. Render Dashboard
  function renderDashboard() {
    if (!state.onboarded) return;

    // 1. Calculations — use cached baseline, only recalculate when needed
    const results = calculateFootprint(state.calculatorInputs);
    // Update baseline without triggering a network save on every render
    state.baseline = results.total;

    // 2. Set KPI Cards
    DOM.kpiBaseline.textContent = state.baseline.toFixed(1);
    
    // Compute comparison baseline relative to global average
    let compareText = "";
    const globalAvg = ECO_DATA.nationalAverages.Global;
    const userKg = state.baseline * 1000;
    
    if (userKg < globalAvg) {
      compareText = `<i class="fa-solid fa-leaf text-success"></i> Excellent! Your footprint is <strong>${Math.round(((globalAvg - userKg) / globalAvg) * 100)}% lower</strong> than the global average.`;
    } else {
      compareText = `🚨 Your footprint is <strong>${Math.round(((userKg - globalAvg) / globalAvg) * 100)}% higher</strong> than the global average.`;
    }
    DOM.kpiBaselineSub.innerHTML = compareText;

    // Goal calculation
    const goalReduction = state.baseline * (state.goalPercent / 100);
    const goalTarget = state.baseline - goalReduction;
    DOM.kpiGoalPercent.textContent = `-${state.goalPercent}%`;
    DOM.kpiGoalTarget.textContent = `Target: ${goalTarget.toFixed(1)} t CO₂e/yr`;

    // Monthly logged savings calculation
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyHistory = state.history.filter(item => {
      const date = new Date(item.timestamp);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalSavedKg = monthlyHistory.reduce((acc, curr) => acc + curr.co2Saved, 0);
    DOM.kpiSavedCo2.textContent = totalSavedKg.toFixed(1);
    DOM.kpiActionsLogged.textContent = `${monthlyHistory.length} habit${monthlyHistory.length === 1 ? '' : 's'} logged this month`;

    // Habit Streak
    DOM.kpiStreak.textContent = state.streak;
    let streakQuote = "Log actions daily to maintain your streak!";
    if (state.streak > 0) {
      if (state.streak < 3) streakQuote = "Great start! Keep it up!";
      else if (state.streak < 7) streakQuote = "Awesome momentum! You're making a difference.";
      else streakQuote = "Unstoppable! A true champion for the planet!";
    }
    DOM.kpiStreakQuote.textContent = streakQuote;

    // Goal Progress Bar
    // Convert monthly savings to annualized equivalent in metric tons
    // Saved Kg per month * 12 / 1000 = Saved metric tons per year
    const annualizedSavingsTons = (totalSavedKg * 12) / 1000;
    const progressPercent = state.baseline > 0 
      ? Math.min(100, (annualizedSavingsTons / goalReduction) * 100) 
      : 0;
    DOM.kpiGoalProgress.style.width = `${progressPercent}%`;

    // 3. Render Charts
    renderCharts(results.breakdown);

    // 4. Populate Insights Panel
    populateInsights(results.breakdown, totalSavedKg);

    // 5. Render Activity History log
    renderActivityLog();
  }

  // C. Chart.js Controls
  function renderCharts(breakdown) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
    const labelColor = isDark ? "#94a3b8" : "#475569";
    const fontName = "Plus Jakarta Sans";

    // ── 1. Doughnut Chart: Breakdown by category ──────────────────────────────
    const categoryCtx = document.getElementById("categoryChart").getContext("2d");
    const categoryData = [breakdown.transport, breakdown.energy, breakdown.diet];

    if (chartInstances.category) {
      // Update existing chart instead of destroying and recreating
      chartInstances.category.data.datasets[0].data = categoryData;
      chartInstances.category.options.plugins.legend.labels.color = labelColor;
      chartInstances.category.update();
    } else {
      chartInstances.category = new Chart(categoryCtx, {
        type: "doughnut",
        data: {
          labels: ["Transportation", "Home Energy & Waste", "Diet"],
          datasets: [{
            data: categoryData,
            backgroundColor: ["#06b6d4", "#10b981", "#6366f1"],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
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
        }
      });
    }

    // ── 2. Comparison Bar Chart: Baseline vs Benchmarks ───────────────────────
    const comparisonCtx = document.getElementById("comparisonChart").getContext("2d");
    const benchmarks = ECO_DATA.nationalAverages;
    const userVal = state.baseline;
    const barData = [
      userVal,
      benchmarks.Target / 1000,
      benchmarks.Global / 1000,
      benchmarks.EU / 1000,
      benchmarks.US / 1000
    ];
    const barColors = [
      userVal <= benchmarks.Target / 1000 ? "#10b981" : "#f59e0b",
      "#10b981", "#94a3b8", "#64748b", "#475569"
    ];

    if (chartInstances.comparison) {
      chartInstances.comparison.data.datasets[0].data = barData;
      chartInstances.comparison.data.datasets[0].backgroundColor = barColors;
      chartInstances.comparison.options.scales.x.ticks.color = labelColor;
      chartInstances.comparison.options.scales.y.ticks.color = labelColor;
      chartInstances.comparison.options.scales.y.grid.color = gridColor;
      chartInstances.comparison.options.scales.y.title.color = labelColor;
      chartInstances.comparison.update();
    } else {
      chartInstances.comparison = new Chart(comparisonCtx, {
        type: "bar",
        data: {
          labels: ["Your Footprint", "Climate Target", "Global Avg", "EU Avg", "US Avg"],
          datasets: [{
            data: barData,
            backgroundColor: barColors,
            borderRadius: 6,
            barThickness: 20
          }]
        },
        options: {
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
        }
      });
    }
  }

  // D. Dynamic Insights Generation
  function populateInsights(breakdown, monthlySavings) {
    const list = DOM.dashboardInsights;
    list.innerHTML = ""; // Clear existing

    // Determine highest category
    const categories = [
      { name: "Transportation", val: breakdown.transport, icon: "fa-car", class: "info" },
      { name: "Home Energy", val: breakdown.energy, icon: "fa-plug", class: "success" },
      { name: "Diet & Waste", val: breakdown.diet, icon: "fa-leaf", class: "warning" }
    ];
    categories.sort((a, b) => b.val - a.val);
    const dominant = categories[0];

    // Card 1: Dominant Sector Insight
    const sectorInsight = document.createElement("div");
    sectorInsight.className = `insight-card ${dominant.class}`;
    
    let adviceText = "";
    if (dominant.name === "Transportation") {
      adviceText = "Your travel habits make up the biggest slice of your footprint. Prioritize cycling or walking for short errands (<5km), or bundle car trips. If long commutes are necessary, carpooling or EV conversion yields massive reductions.";
    } else if (dominant.name === "Home Energy") {
      adviceText = "Household power and utility waste dominates your footprint. Wash laundry in cold water and switch to clothesline air-drying to immediately slash energy usage. Adjusting your heating down by 1°C in winter saves up to 10% on emissions.";
    } else {
      adviceText = "Your dietary pattern and household waste produce significant emissions. Transitioning to 'meatless days' or a flexitarian diet is the single most effective action. Also, focus on portion control and freezing leftovers to prevent greenhouse emissions from food waste.";
    }

    sectorInsight.innerHTML = `
      <div class="insight-icon"><i class="fa-solid ${dominant.icon}"></i></div>
      <div class="insight-content">
        <h5>Focus Area: ${dominant.name} (${dominant.val.toFixed(1)} t)</h5>
        <p>${adviceText}</p>
      </div>
    `;
    list.appendChild(sectorInsight);

    // Card 2: Goal progress update
    const goalCard = document.createElement("div");
    goalCard.className = "insight-card info";
    
    const goalReduction = state.baseline * (state.goalPercent / 100);
    const annualizedSavingsTons = (monthlySavings * 12) / 1000;
    
    let goalProgressText = "";
    if (monthlySavings === 0) {
      goalProgressText = `You haven't logged any eco-actions this month yet. Check out the <strong>Action Hub</strong> to log habits and start your journey towards your -${state.goalPercent}% reduction goal!`;
    } else {
      const progressPercent = Math.round((annualizedSavingsTons / goalReduction) * 100);
      if (progressPercent >= 100) {
        goalProgressText = `⭐ Amazing! Your active habits have already surpassed your reduction goal for the month! You have prevented ${monthlySavings.toFixed(1)} kg of carbon. Keep setting new milestones!`;
      } else {
        goalProgressText = `You've saved ${monthlySavings.toFixed(1)} kg of CO₂ this month, achieving <strong>${progressPercent}%</strong> of your target goal pace. Maintain consistency to unlock your next levels!`;
      }
    }

    goalCard.innerHTML = `
      <div class="insight-icon"><i class="fa-solid fa-bullseye"></i></div>
      <div class="insight-content">
        <h5>Goal Progress</h5>
        <p>${goalProgressText}</p>
      </div>
    `;
    list.appendChild(goalCard);

    // Card 3: Quick Tip
    const tipCard = document.createElement("div");
    tipCard.className = "insight-card success";
    
    const tips = [
      { title: "Slay Vampire Loads", text: "Electronics left plugged in on standby consume 'vampire electricity' that accounts for up to 10% of standard household bills. Turn off or use smart strips." },
      { title: "Low Temp Wash", text: "90% of energy in laundry washing machines goes towards heating water. Switching from hot to warm or cold water saves substantial emissions." },
      { title: "Reduce Food Waste", text: "If food waste were a country, it would be the third-largest global emitter of greenhouse gases. Plan meals and compost organic waste to reduce home output." },
      { title: "Eco Tire Check", text: "Under-inflated tires increase fuel consumption by up to 3%. Check tire pressure monthly to save petrol cost and emissions." }
    ];
    
    // Pick standard tip based on day of month
    const activeTip = tips[new Date().getDate() % tips.length];

    tipCard.innerHTML = `
      <div class="insight-icon"><i class="fa-solid fa-lightbulb"></i></div>
      <div class="insight-content">
        <h5>Daily Tip: ${activeTip.title}</h5>
        <p>${activeTip.text}</p>
      </div>
    `;
    list.appendChild(tipCard);
  }

  // E. Render Activity History Logs
  function renderActivityLog() {
    const container = DOM.activityLogContainer;
    container.innerHTML = "";

    if (state.history.length === 0) {
      container.innerHTML = `
        <div class="no-activity-placeholder">
          <p>No actions logged yet. Head over to the <strong>Action Hub</strong> to log your first green activity!</p>
        </div>
      `;
      return;
    }

    // Sort logs descending (newest first)
    const sorted = [...state.history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); // Show top 10

    sorted.forEach(item => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Find matching action to fetch dynamic icon
      const actionRef = ECO_DATA.actions.find(a => a.id === item.actionId);
      const iconClass = actionRef ? actionRef.icon : "fa-leaf";

      const logRow = document.createElement("div");
      logRow.className = "history-item";
      logRow.innerHTML = `
        <div class="history-item-left">
          <div class="history-icon-circle"><i class="fa-solid ${iconClass}"></i></div>
          <div class="history-details">
            <span class="history-title">${item.title}</span>
            <span class="history-time">${formattedDate}</span>
          </div>
        </div>
        <div class="history-item-right">
          <span class="history-reduction">-${item.co2Saved.toFixed(1)} kg CO₂</span>
          <span class="history-xp">+${item.xp} XP</span>
        </div>
      `;
      container.appendChild(logRow);
    });
  }

  // F. Render Action Hub
  function renderActionHub(filterCategory = "all") {
    DOM.dailyActionsList.innerHTML = "";
    DOM.onetimeActionsList.innerHTML = "";

    const actions = ECO_DATA.actions;
    const filtered = filterCategory === "all" 
      ? actions 
      : actions.filter(a => a.category === filterCategory);

    // Track which one-time actions have already been completed to disable logging
    const loggedOneTimes = state.history
      .filter(item => {
        const act = actions.find(a => a.id === item.actionId);
        return act && act.type === "one-time";
      })
      .map(item => item.actionId);

    filtered.forEach(action => {
      const card = document.createElement("div");
      card.className = "action-card";
      
      const isOneTimeCompleted = action.type === "one-time" && loggedOneTimes.includes(action.id);
      if (isOneTimeCompleted) {
        card.classList.add("logged");
      }

      card.innerHTML = `
        <div class="action-card-left">
          <div class="action-icon"><i class="fa-solid ${action.icon}"></i></div>
          <div class="action-info">
            <h4>${action.title}</h4>
            <p>${action.description}</p>
            <div class="action-meta">
              <span class="meta-tag co2">-${action.co2Saved.toFixed(1)} kg CO₂e</span>
              <span class="meta-tag xp">+${action.xp} XP</span>
              <span class="meta-tag info" style="background: rgba(255,255,255,0.05); color: var(--text-secondary);">${action.category}</span>
            </div>
          </div>
        </div>
        <div class="action-card-right">
          <button class="btn btn-primary btn-small btn-log" data-id="${action.id}" ${isOneTimeCompleted ? "disabled" : ""}>
            ${isOneTimeCompleted ? '<i class="fa-solid fa-check"></i> Completed' : '<i class="fa-solid fa-plus"></i> Log Action'}
          </button>
        </div>
      `;

      // Event listener on card log button
      const logBtn = card.querySelector(".btn-log");
      logBtn.addEventListener("click", () => logAction(action));

      if (action.type === "daily") {
        DOM.dailyActionsList.appendChild(card);
      } else {
        DOM.onetimeActionsList.appendChild(card);
      }
    });

    // Handle filter buttons class changes
    DOM.categoryFilters.querySelectorAll(".filter-btn").forEach(btn => {
      if (btn.getAttribute("data-filter") === filterCategory) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // G. Action Logging Engine
  function logAction(action) {
    // 1. Double check one-time requirements
    if (action.type === "one-time") {
      const alreadyCompleted = state.history.some(h => h.actionId === action.id);
      if (alreadyCompleted) return;
    }

    // 2. Add History
    state.history.push({
      actionId: action.id,
      title: action.title,
      timestamp: Date.now(),
      co2Saved: action.co2Saved,
      xp: action.xp,
      category: action.category
    });

    // 3. Update Streak calculations
    updateHabitStreak();

    // 4. Update Gamified XP and Level
    state.xp += action.xp;
    let leveledUp = false;
    let nextXpTarget = state.level * 100;
    while (state.xp >= nextXpTarget) {
      state.xp -= nextXpTarget;
      state.level++;
      nextXpTarget = state.level * 100;
      leveledUp = true;
    }

    saveState();

    // 5. Toast / Notification visual trigger
    showToastNotification(action, leveledUp);

    // 6. Refresh screens
    renderUserXP();
    if (activeTab === "dashboard") {
      renderDashboard();
    } else if (activeTab === "habits") {
      renderActionHub(DOM.categoryFilters.querySelector(".filter-btn.active").getAttribute("data-filter"));
    }
  }

  function updateHabitStreak() {
    const todayStr = new Date().toISOString().split("T")[0];

    if (!state.lastLoggedDate) {
      state.streak = 1;
    } else if (state.lastLoggedDate === todayStr) {
      // Already logged today — streak stays the same, don't double-increment
      return;
    } else {
      // Compare date strings directly to avoid DST / timezone ms-diff bugs
      const last = new Date(state.lastLoggedDate + 'T00:00:00');
      const today = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.round((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        state.streak++;
      } else {
        state.streak = 1; // reset if a day was skipped
      }
    }
    state.lastLoggedDate = todayStr;
  }

  function renderUserXP() {
    DOM.userLevel.textContent = state.level;
    DOM.userXpCurrent.textContent = state.xp;
    const xpNeeded = state.level * 100;
    DOM.userXpNext.textContent = xpNeeded;
    
    const pct = Math.min(100, (state.xp / xpNeeded) * 100);
    DOM.userXpBar.style.width = `${pct}%`;
  }

  function showToastNotification(action, leveledUp) {
    // Use the persistent ARIA live region to announce to screen readers
    const liveRegion = document.getElementById('toast-live-region');
    if (liveRegion) {
      liveRegion.textContent = `Action logged: saved ${action.co2Saved} kg CO₂ and earned ${action.xp} XP.`;
      // Clear after announcement so it re-fires on next action
      setTimeout(() => { liveRegion.textContent = ''; }, 3000);
    }

    // Use a single persistent toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement("div");
      container.id = 'toast-container';
      container.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:1000;display:flex;flex-direction:column;gap:10px;";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "glass-panel";
    toast.style.background = "rgba(16, 185, 129, 0.95)";
    toast.style.color = "#ffffff";
    toast.style.padding = "14px 20px";
    toast.style.borderRadius = "8px";
    toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "12px";
    toast.style.transform = "translateY(50px)";
    toast.style.opacity = "0";
    toast.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    toast.innerHTML = `
      <i class="fa-solid fa-leaf" style="font-size: 1.3rem;"></i>
      <div>
        <h5 style="font-weight:700; font-size: 0.9rem;">Action Logged!</h5>
        <p style="color: rgba(255,255,255,0.85); font-size: 0.75rem;">Saved <strong>${action.co2Saved} kg CO₂</strong> and earned <strong>${action.xp} XP</strong></p>
      </div>
    `;
    container.appendChild(toast);

    // Trigger slide up
    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 50);

    // Auto remove toast
    setTimeout(() => {
      toast.style.transform = "translateY(-30px)";
      toast.style.opacity = "0";
      setTimeout(() => {
        container.remove();
      }, 400);
    }, 3500);

    // Secondary level up alert
    if (leveledUp) {
      setTimeout(() => {
        const lvlToast = document.createElement("div");
        lvlToast.className = "glass-panel";
        lvlToast.style.background = "rgba(99, 102, 241, 0.95)";
        lvlToast.style.color = "#ffffff";
        lvlToast.style.padding = "14px 20px";
        lvlToast.style.borderRadius = "8px";
        lvlToast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.3)";
        lvlToast.style.display = "flex";
        lvlToast.style.alignItems = "center";
        lvlToast.style.gap = "12px";
        lvlToast.style.transform = "translateY(50px)";
        lvlToast.style.opacity = "0";
        lvlToast.style.transition = "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
        lvlToast.innerHTML = `
          <i class="fa-solid fa-award" style="font-size: 1.5rem; color: #f59e0b;"></i>
          <div>
            <h5 style="font-weight:800; font-size: 1rem;">Leveled Up! 🎉</h5>
            <p style="color: rgba(255,255,255,0.85); font-size: 0.75rem;">You have reached <strong>Level ${state.level}</strong>!</p>
          </div>
        `;
        container.appendChild(lvlToast);
        
        setTimeout(() => {
          lvlToast.style.transform = "translateY(0)";
          lvlToast.style.opacity = "1";
        }, 100);

        setTimeout(() => {
          lvlToast.style.transform = "translateY(-30px)";
          lvlToast.style.opacity = "0";
        }, 4000);
      }, 800);
    }
  }

  // H. Render What-If Simulator
  function renderSimulator() {
    if (!state.onboarded) return;

    // Set simulator slider default values matching their baseline values on first render of tab
    const base = state.calculatorInputs;
    
    // Set text display variables for inputs
    DOM.simValDriving.textContent = `${DOM.simInputDriving.value} km`;
    DOM.simValElectricity.textContent = `${DOM.simInputElectricity.value} kWh`;
    
    const shortFlightsCount = parseInt(DOM.simInputFlightsShort.value);
    DOM.simValFlightsShort.textContent = `${shortFlightsCount} flight${shortFlightsCount === 1 ? '' : 's'}`;
    
    const diets = ["Vegan", "Vegetarian", "Flexitarian", "Average", "Meat-Heavy"];
    DOM.simValDiet.textContent = diets[DOM.simInputDiet.value];

    // Read values directly from DOM sliders
    const simDriving = parseFloat(DOM.simInputDriving.value);
    const simElectricity = parseFloat(DOM.simInputElectricity.value);
    const simFlightsShort = parseInt(DOM.simInputFlightsShort.value);
    const simDietIndex = parseInt(DOM.simInputDiet.value);
    const dietTypes = ["vegan", "vegetarian", "flexitarian", "average", "carnivore"];
    const simDietType = dietTypes[simDietIndex];

    // 1. Calculate simulated footprint
    const factors = ECO_DATA.emissionFactors;
    const carFuel = base.carType !== "none" ? base.carType : "car_petrol"; // Fallback petrol
    const carFactor = factors.transport[carFuel] || 0;
    
    const transportSimAnnual = ((simDriving * 52 * carFactor) / 1000) 
      + ((base.transitDist * 52 * factors.transport.public_transit) / 1000)
      + ((simFlightsShort * factors.transport.flight_short) / 1000)
      + ((base.flightsLong * factors.transport.flight_long) / 1000);

    const hhSize = Math.max(1, base.householdSize);
    const energySimAnnual = ((simElectricity * 12 * factors.energy.electricity) / hhSize / 1000)
      + ((base.gasBill * 12 * factors.energy.gas) / hhSize / 1000);

    const recycleFactor = base.recycleActive ? factors.energy.waste_reduction_recycling : 0;
    const wasteSimAnnual = (base.wasteProduced * 52 * (factors.energy.waste - recycleFactor)) / hhSize / 1000;

    const dietSimAnnual = factors.diet[simDietType] / 1000;

    const totalSim = transportSimAnnual + energySimAnnual + wasteSimAnnual + dietSimAnnual;
    const baselineVal = state.baseline;

    // Update gauge text
    DOM.simGaugeVal.textContent = totalSim.toFixed(1);

    // Calculate percent for conic gradient gauge circle
    // Standardize: full circle (100%) matches baseline, green if lower, orange/red if higher
    const percentOfBaseline = baselineVal > 0 ? (totalSim / baselineVal) * 100 : 0;
    DOM.simGaugeCircle.style.setProperty("--sim-percent", `${percentOfBaseline}%`);
    
    if (totalSim <= baselineVal) {
      DOM.simGaugeCircle.style.background = `conic-gradient(var(--color-primary) ${percentOfBaseline}%, var(--input-border) ${percentOfBaseline}%)`;
    } else {
      DOM.simGaugeCircle.style.background = `conic-gradient(var(--color-danger) ${percentOfBaseline}%, var(--input-border) ${percentOfBaseline}%)`;
    }

    // Set comparison details
    DOM.simCompBaseline.textContent = `${baselineVal.toFixed(1)} t`;
    DOM.simCompSimulated.textContent = `${totalSim.toFixed(1)} t`;

    const diff = baselineVal - totalSim;
    const diffPercent = baselineVal > 0 ? Math.round((diff / baselineVal) * 100) : 0;

    if (diff > 0) {
      DOM.simCompSavings.textContent = `${diff.toFixed(1)} t (-${diffPercent}%)`;
      DOM.simCompSavings.className = "text-success";
      DOM.simAnalysisFeedback.innerHTML = `
        <span style="color: var(--color-primary); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Great savings!</span> By modifying your lifestyle to these values, you would cut your carbon output by <strong>${diff.toFixed(1)} metric tons per year</strong>.
      `;
    } else if (diff < 0) {
      DOM.simCompSavings.textContent = `+${Math.abs(diff).toFixed(1)} t (+${Math.abs(diffPercent)}%)`;
      DOM.simCompSavings.className = "text-danger";
      DOM.simAnalysisFeedback.innerHTML = `
        <span style="color: var(--color-danger); font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> Footprint Increase!</span> These settings represent an increase of <strong>${Math.abs(diff).toFixed(1)} metric tons</strong> above your baseline. Adjust the sliders downward to save carbon.
      `;
    } else {
      DOM.simCompSavings.textContent = `0.0 t (0%)`;
      DOM.simCompSavings.className = "text-muted";
      DOM.simAnalysisFeedback.textContent = "These settings match your baseline footprint exactly. Toggle options to simulate climate impacts!";
    }
  }

  // --------------------------------------------------------------------------
  // 5. Questionnaire Step-by-Step Navigation
  // --------------------------------------------------------------------------
  let currentCalcStep = 1;

  function setCalcStep(step) {
    currentCalcStep = step;
    
    DOM.calcSteps.forEach(el => {
      const stepNum = parseInt(el.getAttribute("data-step"));
      if (stepNum === step) {
        el.classList.add("active");
      } else {
        el.classList.remove("active");
      }
    });

    DOM.stepIndicators.forEach(el => {
      const stepNum = parseInt(el.getAttribute("data-step"));
      el.classList.remove("active", "completed");
      
      if (stepNum === step) {
        el.classList.add("active");
      } else if (stepNum < step) {
        el.classList.add("completed");
      }
    });
  }

  function handleCalculatorOnboardingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(DOM.calcForm);
    const inputs = {
      carType: formData.get("carType"),
      carDist: parseFloat(formData.get("carDist")) || 0,
      transitDist: parseFloat(formData.get("transitDist")) || 0,
      flightsShort: parseInt(formData.get("flightsShort")) || 0,
      flightsLong: parseInt(formData.get("flightsLong")) || 0,
      electricityBill: parseFloat(formData.get("electricityBill")) || 0,
      gasBill: parseFloat(formData.get("gasBill")) || 0,
      householdSize: parseInt(formData.get("householdSize")) || 1,
      dietType: formData.get("dietType"),
      wasteProduced: parseFloat(formData.get("wasteProduced")) || 0,
      recycleActive: DOM.calcForm.querySelector("#recycle-active").checked
    };

    // Calculate
    const results = calculateFootprint(inputs);
    
    // Save State
    state.calculatorInputs = inputs;
    state.baseline = results.total;
    state.onboarded = true;
    
    // award XP for completing assessment if first time
    if (state.history.length === 0 && state.xp === 0) {
      state.xp = 50; // Onboarding bonus
    }

    saveState();

    // Display values in results step
    DOM.calcResultVal.textContent = results.total.toFixed(1);

    // Benchmarking sentence
    let benchmarkComp = "";
    const USavg = ECO_DATA.nationalAverages.US / 1000;
    const globalAvg = ECO_DATA.nationalAverages.Global / 1000;
    
    if (results.total <= globalAvg) {
      benchmarkComp = `Incredible! Your footprint is lower than the Global Average of <strong>${globalAvg} tons</strong>. You're an eco-champion.`;
    } else if (results.total <= USavg) {
      benchmarkComp = `Your footprint is <strong>${results.total} tons</strong>, which is below the US Average of <strong>${USavg} tons</strong>, but still above the global sustainable target of <strong>2.0 tons</strong>.`;
    } else {
      benchmarkComp = `Your annual emissions are <strong>${results.total} tons</strong>, which exceeds the US Average of <strong>${USavg} tons</strong>. Let's work together to reduce it!`;
    }
    DOM.calcResultComparison.innerHTML = benchmarkComp;

    // Progress to Step 4 (Results Page)
    setCalcStep(4);
    
    // Refresh XP bar
    renderUserXP();
  }

  // --------------------------------------------------------------------------
  // 6. Goal Slider and Form controls
  // --------------------------------------------------------------------------
  function openGoalModal() {
    DOM.goalPercentageRange.value = state.goalPercent;
    updateGoalModalPreviews();
    DOM.goalModal.classList.remove("hidden");
  }

  function closeGoalModal() {
    DOM.goalModal.classList.add("hidden");
  }

  function updateGoalModalPreviews() {
    const pct = parseInt(DOM.goalPercentageRange.value);
    DOM.goalPreviewVal.textContent = `${pct}%`;

    const baseline = state.baseline;
    const savings = baseline * (pct / 100);
    const target = baseline - savings;

    DOM.goalCalcCurrent.textContent = `${baseline.toFixed(2)} t`;
    DOM.goalCalcTarget.textContent = `${target.toFixed(2)} t`;
    DOM.goalCalcSaved.textContent = `${savings.toFixed(2)} t`;
  }

  function saveGoal(e) {
    e.preventDefault();
    state.goalPercent = parseInt(DOM.goalPercentageRange.value);
    saveState();
    closeGoalModal();
    renderDashboard();
  }

  // --------------------------------------------------------------------------
  // 7. Theme Control (Light/Dark Mode)
  // --------------------------------------------------------------------------
  function loadTheme() {
    const savedTheme = localStorage.getItem("ecostride_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ecostride_theme", next);
    updateThemeToggleIcon(next);
    
    // Redraw charts with new styles if onboarded
    if (state.onboarded) {
      const results = calculateFootprint(state.calculatorInputs);
      renderCharts(results.breakdown);
    }
  }

  function updateThemeToggleIcon(theme) {
    const icon = DOM.themeToggle.querySelector("i");
    if (theme === "dark") {
      icon.className = "fa-solid fa-sun";
    } else {
      icon.className = "fa-solid fa-moon";
    }
  }

  // --------------------------------------------------------------------------
  // 8. Global Event Listeners Setup
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Brand header click resets to dashboard
    document.getElementById("brand-logo").addEventListener("click", () => {
      if (state.onboarded) switchTab("dashboard");
    });

    // Theme toggle
    DOM.themeToggle.addEventListener("click", toggleTheme);

    // Nav tabs click
    DOM.navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        switchTab(targetTab);
      });
    });

    // Onboarding Gate Btn
    DOM.startAssessmentBtn.addEventListener("click", () => {
      DOM.onboardingGate.classList.add("hidden");
      switchTab("calculator");
      setCalcStep(1);
    });

    // Calculator Next / Back Steps
    DOM.calcForm.querySelectorAll(".next-step-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setCalcStep(currentCalcStep + 1);
      });
    });
    DOM.calcForm.querySelectorAll(".prev-step-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setCalcStep(currentCalcStep - 1);
      });
    });

    // Calc submission
    DOM.calcForm.addEventListener("submit", handleCalculatorOnboardingSubmit);

    // Calc Results buttons
    DOM.btnCalcGoDashboard.addEventListener("click", () => {
      switchTab("dashboard");
    });
    DOM.btnCalcDownloadPdf.addEventListener("click", () => {
      const element = document.querySelector('.calc-step[data-step="4"]');
      const btnGroup = element.querySelector('.btn-group');
      
      const opt = {
        margin:       0.5,
        filename:     'EcoStride_Footprint_Assessment.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      // Temporarily hide the button group so it isn't in the PDF
      if(btnGroup) btnGroup.style.display = 'none';
      
      html2pdf().set(opt).from(element).save().then(() => {
        // Restore buttons
        if(btnGroup) btnGroup.style.display = 'flex';
      });
    });
    DOM.btnCalcReassess.addEventListener("click", () => {
      setCalcStep(1);
    });

    // Goal Modal trigger
    DOM.btnSetupGoal.addEventListener("click", openGoalModal);
    DOM.closeGoalModal.addEventListener("click", closeGoalModal);
    DOM.btnCancelGoal.addEventListener("click", closeGoalModal);
    DOM.goalPercentageRange.addEventListener("input", updateGoalModalPreviews);
    DOM.goalForm.addEventListener("submit", saveGoal);

    // Action filter clicks
    DOM.categoryFilters.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.getAttribute("data-filter");
        renderActionHub(filter);
      });
    });

    // Simulator input event bindings
    const simInputs = [DOM.simInputDriving, DOM.simInputElectricity, DOM.simInputFlightsShort, DOM.simInputDiet];
    simInputs.forEach(input => {
      input.addEventListener("input", renderSimulator);
    });

    // Sync simulator inputs to user calculator outputs initially when they open simulator tab
    DOM.navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.getAttribute("data-tab") === "simulator") {
          syncSimulatorSliders();
        }
      });
    });
  }

  function syncSimulatorSliders() {
    const inputs = state.calculatorInputs;
    DOM.simInputDriving.value = inputs.carType !== "none" ? inputs.carDist : 0;
    DOM.simInputElectricity.value = inputs.electricityBill;
    DOM.simInputFlightsShort.value = inputs.flightsShort;
    
    // Map diet to slider index (vegan -> 0, vegetarian -> 1, flexitarian -> 2, average -> 3, carnivore -> 4)
    const dietTypes = ["vegan", "vegetarian", "flexitarian", "average", "carnivore"];
    const idx = dietTypes.indexOf(inputs.dietType);
    DOM.simInputDiet.value = idx !== -1 ? idx : 3;

    renderSimulator();
  }

  // --------------------------------------------------------------------------
  // 9. Startup Execution
  // --------------------------------------------------------------------------
    init();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }
