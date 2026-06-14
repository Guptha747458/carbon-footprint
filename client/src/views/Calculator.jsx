import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { calculateFootprint, ECO_DATA } from '../data/ecoData';

export default function Calculator({ onGoToDashboard }) {
  const { state, updateState } = useAuth();
  const [step, setStep] = useState(1);
  const [inputs, setInputs] = useState(state.calculatorInputs);
  const [results, setResults] = useState(null);

  useEffect(() => {
    // Sync local input state if auth state changes
    setInputs(state.calculatorInputs);
  }, [state.calculatorInputs]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : (type === 'number' ? (parseFloat(value) || 0) : value);
    setInputs(prev => ({
      ...prev,
      [name]: val
    }));
  };

  const handleDietSelect = (dietType) => {
    setInputs(prev => ({
      ...prev,
      dietType
    }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    const footprint = calculateFootprint(inputs);
    setResults(footprint);

    updateState(prev => {
      const next = {
        ...prev,
        calculatorInputs: inputs,
        baseline: footprint.total,
        onboarded: true
      };
      // Give onboarding bonus if first time
      if (prev.history.length === 0 && prev.xp === 0) {
        next.xp = 50;
      }
      return next;
    });

    setStep(4);
  };

  const handleRedo = () => {
    setStep(1);
    setResults(null);
  };



  const USavg = ECO_DATA.nationalAverages.US / 1000;
  const globalAvg = ECO_DATA.nationalAverages.Global / 1000;

  return (
    <section id="view-calculator" className="app-view">
      <div className="section-header">
        <h2>Carbon Calculator</h2>
        <p>Answer a few questions about your travel, household energy, and diet to calculate your annual carbon footprint.</p>
      </div>

      <div className="calculator-container glass-panel">
        {/* Step indicators */}
        <div className="step-indicator-bar">
          <div className={`step-indicator ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`} onClick={() => step < 4 && setStep(1)}>
            <div className="step-num">1</div>
            <span>Transport</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`} onClick={() => step < 4 && step >= 2 && setStep(2)}>
            <div className="step-num">2</div>
            <span>Home Energy</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`} onClick={() => step < 4 && step >= 3 && setStep(3)}>
            <div className="step-num">3</div>
            <span>Diet & Waste</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-indicator ${step === 4 ? 'active' : ''}`}>
            <div className="step-num">4</div>
            <span>Results</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="calc-steps-wrapper">
          {/* STEP 1: TRANSPORTATION */}
          {step === 1 && (
            <div className="calc-step active" data-step="1">
              <h3 className="step-title"><i className="fa-solid fa-car"></i> Transportation Habits</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="car-type">Primary Car Fuel Type</label>
                  <select id="car-type" name="carType" value={inputs.carType} onChange={handleChange}>
                    <option value="none">I don't drive / No Car</option>
                    <option value="car_petrol">Petrol (Gasoline)</option>
                    <option value="car_diesel">Diesel</option>
                    <option value="car_hybrid">Hybrid</option>
                    <option value="car_ev">Electric Vehicle (EV)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="car-dist">Weekly Driving Distance (km)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="car-dist"
                      name="carDist"
                      min="0"
                      value={inputs.carDist}
                      onChange={handleChange}
                      placeholder="e.g. 150"
                    />
                    <span className="suffix">km</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="transit-dist">Weekly Public Transit (Bus/Train) (km)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="transit-dist"
                      name="transitDist"
                      min="0"
                      value={inputs.transitDist}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                    />
                    <span className="suffix">km</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="flights-short">Annual Short-Haul Flights (&lt; 3 hrs duration)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="flights-short"
                      name="flightsShort"
                      min="0"
                      value={inputs.flightsShort}
                      onChange={handleChange}
                      placeholder="e.g. 2"
                    />
                    <span className="suffix">flights</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="flights-long">Annual Long-Haul Flights (&gt; 3 hrs duration)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="flights-long"
                      name="flightsLong"
                      min="0"
                      value={inputs.flightsLong}
                      onChange={handleChange}
                      placeholder="e.g. 1"
                    />
                    <span className="suffix">flights</span>
                  </div>
                </div>
              </div>

              <div className="step-actions text-right">
                <button type="button" className="btn btn-primary next-step-btn" onClick={nextStep}>
                  Next: Home Energy <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: HOME ENERGY */}
          {step === 2 && (
            <div className="calc-step active" data-step="2">
              <h3 className="step-title"><i className="fa-solid fa-house-chimney"></i> Home Energy Consumption</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="electricity-bill">Monthly Electricity Usage (kWh)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="electricity-bill"
                      name="electricityBill"
                      min="0"
                      value={inputs.electricityBill}
                      onChange={handleChange}
                      placeholder="e.g. 250"
                    />
                    <span className="suffix">kWh</span>
                  </div>
                  <small className="form-help">Tip: Average household usage is around 300 kWh/month.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="gas-bill">Monthly Natural Gas Usage (Therms)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="gas-bill"
                      name="gasBill"
                      min="0"
                      value={inputs.gasBill}
                      onChange={handleChange}
                      placeholder="e.g. 20"
                    />
                    <span className="suffix">therms</span>
                  </div>
                  <small className="form-help">Enter 0 if your home is fully electric or gas-free.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="household-size">Number of People in Household</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="household-size"
                      name="householdSize"
                      min="1"
                      value={inputs.householdSize}
                      onChange={handleChange}
                    />
                    <span className="suffix">people</span>
                  </div>
                  <small className="form-help">Your share of home energy will be divided by household size.</small>
                </div>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-secondary prev-step-btn" onClick={prevStep}>
                  <i className="fa-solid fa-chevron-left"></i> Back
                </button>
                <button type="button" className="btn btn-primary next-step-btn" onClick={nextStep}>
                  Next: Diet & Waste <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DIET & WASTE */}
          {step === 3 && (
            <div className="calc-step active" data-step="3">
              <h3 className="step-title"><i className="fa-solid fa-utensils"></i> Diet & Lifestyle</h3>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label id="diet-group-label">Which best describes your diet?</label>
                  <div className="radio-card-grid" role="radiogroup" aria-labelledby="diet-group-label">
                    {[
                      { id: 'carnivore', icon: 'fa-drumstick-bite', title: 'Heavy Meat Eater', desc: 'Red meat or poultry almost every day.' },
                      { id: 'average', icon: 'fa-burger', title: 'Average Diet', desc: 'Moderate meat, poultry, dairy, fish.' },
                      { id: 'flexitarian', icon: 'fa-fish', title: 'Flexitarian', desc: 'Mostly plant-based, occasional meat/fish.' },
                      { id: 'vegetarian', icon: 'fa-cheese', title: 'Vegetarian', desc: 'No meat, fish or poultry. Includes dairy/eggs.' },
                      { id: 'vegan', icon: 'fa-leaf', title: 'Vegan', desc: 'Strictly plant-based food items only.' },
                    ].map(diet => (
                      <div
                        key={diet.id}
                        role="radio"
                        aria-checked={inputs.dietType === diet.id}
                        tabIndex={0}
                        className={`radio-card ${inputs.dietType === diet.id ? 'active' : ''}`}
                        onClick={() => handleDietSelect(diet.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleDietSelect(diet.id); } }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="radio-card-content">
                          <span className="radio-card-icon"><i className={`fa-solid ${diet.icon}`} aria-hidden="true"></i></span>
                          <span className="radio-card-title">{diet.title}</span>
                          <span className="radio-card-desc">{diet.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="waste-produced">Weekly Household Waste Produced (kg)</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      id="waste-produced"
                      name="wasteProduced"
                      min="0"
                      value={inputs.wasteProduced}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                    />
                    <span className="suffix">kg</span>
                  </div>
                  <small className="form-help">Standard trash bag full is roughly 7-10 kg.</small>
                </div>

                <div className="form-group flex-align-center">
                  <label className="checkbox-toggle">
                    <input
                      type="checkbox"
                      id="recycle-active"
                      name="recycleActive"
                      checked={inputs.recycleActive}
                      onChange={handleChange}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">We actively recycle paper, plastic, and glass.</span>
                  </label>
                </div>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-secondary prev-step-btn" onClick={prevStep}>
                  <i className="fa-solid fa-chevron-left"></i> Back
                </button>
                <button type="submit" className="btn btn-success" id="calc-submit-btn">
                  Calculate Footprint <i className="fa-solid fa-square-poll-vertical"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CALCULATION RESULTS */}
          {step === 4 && (
            <div className="calc-step active" data-step="4" id="calc-results-pdf-target">
              <div className="result-celebration text-center">
                <div className="celebration-icon">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h3 className="step-title">Your Assessment is Ready!</h3>
                <p>We've calculated your estimated annual footprint. Let's see how you compare.</p>
                
                <div className="result-score-panel">
                  <span className="score-number">{results?.total || state.baseline.toFixed(1)}</span>
                  <span className="score-unit">Metric Tons CO<sub>2</sub>e / year</span>
                </div>

                <p className="comparison-sentence">
                  {results ? (
                    results.total <= globalAvg ? (
                      <span>Incredible! Your footprint is lower than the Global Average of <strong>{globalAvg} tons</strong>. You're an eco-champion.</span>
                    ) : results.total <= USavg ? (
                      <span>Your footprint is <strong>{results.total} tons</strong>, which is below the US Average of <strong>{USavg} tons</strong>, but still above the global sustainable target of <strong>2.0 tons</strong>.</span>
                    ) : (
                      <span>Your annual emissions are <strong>{results.total} tons</strong>, which exceeds the US Average of <strong>{USavg} tons</strong>. Let's work together to reduce it!</span>
                    )
                  ) : null}
                </p>

                <div className="btn-group">
                  <button type="button" className="btn btn-primary" onClick={onGoToDashboard}>
                    Go to Dashboard <i className="fa-solid fa-chart-line"></i>
                  </button>

                  <button type="button" className="btn btn-outline" onClick={handleRedo}>
                    Redo Assessment <i className="fa-solid fa-rotate-left"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
