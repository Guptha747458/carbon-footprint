import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ECO_DATA } from '../data/ecoData';

export default function Simulator() {
  const { state } = useAuth();
  const base = state.calculatorInputs;

  // Initialize sliders with user's baseline calculator inputs
  const [driving, setDriving] = useState(base.carType !== "none" ? base.carDist : 0);
  const [electricity, setElectricity] = useState(base.electricityBill);
  const [flightsShort, setFlightsShort] = useState(base.flightsShort);

  const dietTypes = ["vegan", "vegetarian", "flexitarian", "average", "carnivore"];
  const initialDietIdx = dietTypes.indexOf(base.dietType);
  const [dietIndex, setDietIndex] = useState(initialDietIdx !== -1 ? initialDietIdx : 3);

  // Sync with state changes (e.g. initial load)
  useEffect(() => {
    setDriving(base.carType !== "none" ? base.carDist : 0);
    setElectricity(base.electricityBill);
    setFlightsShort(base.flightsShort);
    const idx = dietTypes.indexOf(base.dietType);
    setDietIndex(idx !== -1 ? idx : 3);
  }, [state.calculatorInputs]);

  // Math simulation
  const factors = ECO_DATA.emissionFactors;
  const carFuel = base.carType !== "none" ? base.carType : "car_petrol";
  const carFactor = factors.transport[carFuel] || 0;

  const transportSimAnnual = ((driving * 52 * carFactor) / 1000) 
    + ((base.transitDist * 52 * factors.transport.public_transit) / 1000)
    + ((flightsShort * factors.transport.flight_short) / 1000)
    + ((base.flightsLong * factors.transport.flight_long) / 1000);

  const hhSize = Math.max(1, base.householdSize);
  const energySimAnnual = ((electricity * 12 * factors.energy.electricity) / hhSize / 1000)
    + ((base.gasBill * 12 * factors.energy.gas) / hhSize / 1000);

  const recycleFactor = base.recycleActive ? factors.energy.waste_reduction_recycling : 0;
  const wasteSimAnnual = (base.wasteProduced * 52 * (factors.energy.waste - recycleFactor)) / hhSize / 1000;

  const simDietType = dietTypes[dietIndex];
  const dietSimAnnual = factors.diet[simDietType] / 1000;

  const totalSim = transportSimAnnual + energySimAnnual + wasteSimAnnual + dietSimAnnual;
  const baselineVal = state.baseline;

  const diff = baselineVal - totalSim;
  const diffPercent = baselineVal > 0 ? Math.round((diff / baselineVal) * 100) : 0;
  const percentOfBaseline = baselineVal > 0 ? (totalSim / baselineVal) * 100 : 0;

  const dietsText = ["Vegan", "Vegetarian", "Flexitarian", "Average", "Meat-Heavy"];

  // Conic gradient style logic
  const gaugeColor = totalSim <= baselineVal ? "var(--color-primary)" : "var(--color-danger)";
  const gaugeStyle = {
    background: `conic-gradient(${gaugeColor} ${percentOfBaseline}%, var(--input-border) ${percentOfBaseline}%)`
  };

  return (
    <section id="view-simulator" className="app-view">
      <div className="section-header">
        <h2>"What-If" Scenario Simulator</h2>
        <p>Experiment with sliders to see how shifting your habits, travel schedules, or home energy usage impacts your carbon footprint in real time compared to your current baseline.</p>
      </div>

      <div className="simulator-main-grid">
        {/* Sliders Dashboard */}
        <div className="simulator-control-panel glass-panel">
          <h3><i className="fa-solid fa-sliders"></i> Lifestyle Adjustment Controls</h3>
          
          <div className="sim-slider-group">
            <div className="slider-header">
              <span className="slider-title"><i className="fa-solid fa-car"></i> Weekly Driving (Petrol/Diesel)</span>
              <span className="slider-val">{driving} km</span>
            </div>
            <input
              type="range"
              className="sim-slider"
              min="0"
              max="600"
              step="10"
              value={driving}
              onChange={(e) => setDriving(parseInt(e.target.value) || 0)}
            />
            <span className="slider-limits">
              <span>0 km (No car)</span>
              <span>600 km</span>
            </span>
          </div>

          <div className="sim-slider-group">
            <div className="slider-header">
              <span className="slider-title"><i className="fa-solid fa-plug"></i> Electricity Usage (Monthly)</span>
              <span className="slider-val">{electricity} kWh</span>
            </div>
            <input
              type="range"
              className="sim-slider"
              min="0"
              max="800"
              step="20"
              value={electricity}
              onChange={(e) => setElectricity(parseInt(e.target.value) || 0)}
            />
            <span className="slider-limits">
              <span>0 kWh (Solar/Offgrid)</span>
              <span>800 kWh</span>
            </span>
          </div>

          <div className="sim-slider-group">
            <div className="slider-header">
              <span className="slider-title"><i className="fa-solid fa-plane"></i> Short-Haul Flights (Annual)</span>
              <span className="slider-val">{flightsShort} flight{flightsShort === 1 ? '' : 's'}</span>
            </div>
            <input
              type="range"
              className="sim-slider"
              min="0"
              max="15"
              step="1"
              value={flightsShort}
              onChange={(e) => setFlightsShort(parseInt(e.target.value) || 0)}
            />
            <span className="slider-limits">
              <span>0 flights</span>
              <span>15 flights</span>
            </span>
          </div>

          <div className="sim-slider-group">
            <div className="slider-header">
              <span className="slider-title"><i className="fa-solid fa-leaf"></i> Primary Dietary Pattern</span>
              <span className="slider-val">{dietsText[dietIndex]}</span>
            </div>
            <input
              type="range"
              className="sim-slider"
              min="0"
              max="4"
              step="1"
              value={dietIndex}
              onChange={(e) => setDietIndex(parseInt(e.target.value) || 0)}
            />
            <div className="slider-ticks">
              <span>Vegan</span>
              <span>Veggie</span>
              <span>Flex</span>
              <span>Average</span>
              <span>Meat-Heavy</span>
            </div>
          </div>
        </div>

        {/* Real-time dynamic report */}
        <div className="simulator-report-panel glass-panel text-center">
          <h3>Simulated Carbon Footprint</h3>
          
          <div className="sim-gauge-container">
            <div className="sim-gauge-circle" style={gaugeStyle}>
              <div className="sim-gauge-inner">
                <span className="sim-gauge-value">{totalSim.toFixed(1)}</span>
                <span className="sim-gauge-label">t CO₂e/year</span>
              </div>
            </div>
          </div>

          <div className="sim-comparison-rows">
            <div className="sim-comp-row">
              <span>Your Current Baseline:</span>
              <strong>{baselineVal.toFixed(1)} t</strong>
            </div>
            <div className="sim-comp-row highlights">
              <span>Simulated Footprint:</span>
              <strong>{totalSim.toFixed(1)} t</strong>
            </div>
            <div className="sim-comp-row savings">
              <span>Potential Net Savings:</span>
              <strong className={diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-muted'}>
                {diff > 0 ? `${diff.toFixed(1)} t (-${diffPercent}%)` : diff < 0 ? `+${Math.abs(diff).toFixed(1)} t (+${Math.abs(diffPercent)}%)` : `0.0 t (0%)`}
              </strong>
            </div>
          </div>

          <div className="sim-analysis-box">
            {diff > 0 ? (
              <>
                <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-check"></i> Great savings!
                </span>{' '}
                By modifying your lifestyle to these values, you would cut your carbon output by{' '}
                <strong>{diff.toFixed(1)} metric tons per year</strong>.
              </>
            ) : diff < 0 ? (
              <>
                <span style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> Footprint Increase!
                </span>{' '}
                These settings represent an increase of <strong>{Math.abs(diff).toFixed(1)} metric tons</strong> above your baseline. Adjust the sliders downward to save carbon.
              </>
            ) : (
              'These settings match your baseline footprint exactly. Toggle options to simulate climate impacts!'
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
