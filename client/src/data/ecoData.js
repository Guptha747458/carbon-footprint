/**
 * EcoStride - Climate Emission Data and Actions
 * Emission factors are standard estimates represented in kg CO2e (carbon dioxide equivalent).
 */

export const ECO_DATA = {
  // Emission factors per unit
  emissionFactors: {
    // Transportation
    transport: {
      // kg CO2e per km
      car_petrol: 0.170,
      car_diesel: 0.160,
      car_hybrid: 0.100,
      car_ev: 0.040,
      public_transit: 0.030, // bus/train average
      flight_short: 90.0,    // kg CO2e per hour (short-haul, average aircraft)
      flight_long: 75.0      // kg CO2e per hour (long-haul, average aircraft)
    },
    // Home Energy
    energy: {
      electricity: 0.380,   // kg CO2e per kWh
      gas: 5.300,           // kg CO2e per therm (approx 100 cubic feet or 29.3 kWh)
      waste: 0.500,         // kg CO2e per kg of general waste
      waste_reduction_recycling: 0.200 // saved kg CO2e per kg of waste recycled
    },
    // Diet (annual kg CO2e based on daily dietary pattern)
    diet: {
      carnivore: 2500,      // High meat consumer
      average: 1900,        // Medium meat consumer (typical diet)
      flexitarian: 1300,    // Low meat/fish
      vegetarian: 1000,     // No meat/fish, includes dairy/eggs
      vegan: 700            // Purely plant-based
    }
  },

  // National averages for comparative visual charts (kg CO2e per year per capita)
  nationalAverages: {
    US: 15500,
    UK: 6500,
    EU: 7200,
    Global: 4500,
    Target: 2000 // Safe climate limit target
  },

  // Loggable habits & actions to reduce carbon emissions
  actions: [
    // TRANSPORTATION
    {
      id: "bike_short",
      title: "Bike or Walk Instead of Driving",
      description: "Ditch the car for short trips (under 5km) and walk or cycle instead.",
      category: "Transportation",
      co2Saved: 1.5, // kg CO2e
      xp: 40,
      type: "daily",
      icon: "fa-bicycle"
    },
    {
      id: "public_transit",
      title: "Commute via Public Transit",
      description: "Take the bus or train to work or school instead of driving solo.",
      category: "Transportation",
      co2Saved: 3.2,
      xp: 50,
      type: "daily",
      icon: "fa-bus"
    },
    {
      id: "carpool",
      title: "Share a Ride (Carpool)",
      description: "Commute with a colleague, friend, or family member to halve your trip's footprint.",
      category: "Transportation",
      co2Saved: 2.5,
      xp: 35,
      type: "daily",
      icon: "fa-users"
    },
    {
      id: "eco_driving",
      title: "Practice Eco-Driving",
      description: "Maintain steady speeds, check tire pressure, and avoid rapid acceleration.",
      category: "Transportation",
      co2Saved: 0.8,
      xp: 20,
      type: "daily",
      icon: "fa-gauge-simple-high"
    },

    // ENERGY
    {
      id: "thermostat_tweak",
      title: "Thermostat Optimization",
      description: "Lower your heating by 1°C in winter or raise AC by 1°C in summer.",
      category: "Energy",
      co2Saved: 1.8,
      xp: 30,
      type: "daily",
      icon: "fa-temperature-half"
    },
    {
      id: "cold_wash",
      title: "Wash Laundry in Cold Water",
      description: "Heat accounts for 90% of a washing machine's energy consumption. Use cold cycles.",
      category: "Energy",
      co2Saved: 0.6,
      xp: 20,
      type: "daily",
      icon: "fa-snowflake"
    },
    {
      id: "air_dry",
      title: "Line Dry Clothes",
      description: "Skip the electric clothes dryer and air-dry laundry on a rack or line.",
      category: "Energy",
      co2Saved: 1.8,
      xp: 35,
      type: "daily",
      icon: "fa-wind"
    },
    {
      id: "unplug_standby",
      title: "Slay Vampire Power",
      description: "Unplug chargers and appliances when not in use, or use a smart power strip.",
      category: "Energy",
      co2Saved: 0.4,
      xp: 15,
      type: "daily",
      icon: "fa-plug"
    },
    {
      id: "led_upgrade",
      title: "Install LED Light Bulbs",
      description: "Upgrade 5 active home lightbulbs to high-efficiency LEDs.",
      category: "Energy",
      co2Saved: 75.0, // Large one-time impact
      xp: 150,
      type: "one-time",
      icon: "fa-lightbulb"
    },

    // DIET & CONSUMPTION
    {
      id: "meatless_day",
      title: "Plant-Based Day (Meatless)",
      description: "Swap meat and dairy for vegetables, beans, and grains for all meals today.",
      category: "Diet & Waste",
      co2Saved: 4.2,
      xp: 60,
      type: "daily",
      icon: "fa-leaf"
    },
    {
      id: "prevent_food_waste",
      title: "Zero Waste Meal",
      description: "Plan meals carefully, store food properly, and eat leftover food instead of discarding it.",
      category: "Diet & Waste",
      co2Saved: 1.2,
      xp: 30,
      type: "daily",
      icon: "fa-utensils"
    },
    {
      id: "compost_waste",
      title: "Compost Organic Material",
      description: "Divert organic scraps from landfills to composting, preventing methane emissions.",
      category: "Diet & Waste",
      co2Saved: 0.6,
      xp: 20,
      type: "daily",
      icon: "fa-recycle"
    },
    {
      id: "local_organic",
      title: "Support Local Produce",
      description: "Buy food produced locally within 100 miles to minimize transport emissions.",
      category: "Diet & Waste",
      co2Saved: 1.0,
      xp: 25,
      type: "daily",
      icon: "fa-shop"
    },
    {
      id: "reusable_bottles",
      title: "Go Single-Use Free",
      description: "Avoid single-use plastic cups, water bottles, and plastic bags for the entire day.",
      category: "Diet & Waste",
      co2Saved: 0.3,
      xp: 15,
      type: "daily",
      icon: "fa-bottle-water"
    }
  ]
};

export function calculateFootprint(inputs) {
  const factors = ECO_DATA.emissionFactors;
  
  // 1. Transportation Category (annual metric tons CO2e)
  let transportAnnual = 0;
  if (inputs.carType !== "none" && inputs.carDist > 0) {
    const carFactor = factors.transport[inputs.carType] || 0;
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
    energyAnnual += (inputs.electricityBill * 12 * factors.energy.electricity) / hhSize / 1000;
  }
  if (inputs.gasBill > 0) {
    energyAnnual += (inputs.gasBill * 12 * factors.energy.gas) / hhSize / 1000;
  }

  // 3. Waste Category (annual metric tons CO2e per household share)
  let wasteAnnual = 0;
  if (inputs.wasteProduced > 0) {
    const recycleFactor = inputs.recycleActive ? factors.energy.waste_reduction_recycling : 0;
    const baseWasteFactor = factors.energy.waste - recycleFactor;
    wasteAnnual += (inputs.wasteProduced * 52 * baseWasteFactor) / hhSize / 1000;
  }

  // 4. Diet Category (already annual, convert kg to tons)
  const dietAnnual = (factors.diet[inputs.dietType] || 1900) / 1000;

  const total = transportAnnual + energyAnnual + wasteAnnual + dietAnnual;

  return {
    total: parseFloat(total.toFixed(2)),
    breakdown: {
      transport: parseFloat(transportAnnual.toFixed(2)),
      energy: parseFloat((energyAnnual + wasteAnnual).toFixed(2)),
      diet: parseFloat(dietAnnual.toFixed(2))
    }
  };
}
