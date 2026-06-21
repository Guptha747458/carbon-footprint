# 🌍 EcoStride — Gamified Carbon Footprint Tracker

A sleek, gamified personal sustainability companion designed to track carbon emissions, cultivate eco-friendly habits, and run interactive simulations. Powered by **Google Gemini AI** and built on the MERN stack, EcoStride bridges the gap between complex climate data and everyday, actionable lifestyle improvements.

## 🔗 Live Demo & Repository
- **Live Application:** [EcoStride Vercel App](https://ecostride-self.vercel.app/)
- **GitHub Repository:** [carbon-footprint Repo](https://github.com/Guptha747458/carbon-footprint.git)

---

## 📌 Chosen Vertical
**Sustainability & Climate Action**

### Why this vertical?
Individual decisions collectively shape global carbon patterns, yet personal footprint tracking is often dry, confusing, and lacking actionable incentives. EcoStride addresses this by:
1. **Making impact clear:** Using localized benchmark comparisons (EU, US, and Global averages).
2. **Gamifying behavior change:** Reinforcing daily micro-habits through an Experience Point (XP) leveling system, progress streaks, and achievement badges.
3. **Offering smart coaching:** A context-aware chatbot powered by **Google Gemini** that understands the user's specific emissions data and lets them check off habits or simulate changes directly through conversational text.

---

## ⚙️ Approach & Logic

### 1. Unified Carbon Calculation Engine
EcoStride relies on empirical emission factors derived from the **EPA (US Environmental Protection Agency)** and **DEFRA (UK Department for Environment, Food & Rural Affairs)**:
- **Transportation:** Car travel (0.18 kg CO₂e per km), short-haul flights (115 kg CO₂e per flight), and public transit/carpool offsets.
- **Home Energy:** Electricity usage (0.42 kg CO₂e per kWh) and clean energy source configurations.
- **Diet & Nutrition:** Footprint calculations based on dietary profiles: Vegan (1.5 t CO₂e/yr), Vegetarian (1.7 t CO₂e/yr), Flexitarian (2.0 t CO₂e/yr), Average (2.5 t CO₂e/yr), and Meat-Heavy/Carnivore (3.3 t CO₂e/yr).
- **Waste & Recycling:** Weekly waste production (0.5 kg CO₂e per kg) with a 20% recycling offset factor.

### 2. Context-Aware AI Architecture
The **Eco-Assistant** features a dual-layer logic engine:
- **Online Mode (Gemini 2.5 Flash):** Sends the user's dynamic profile (current emissions, calculator answers, and habit history) directly into the model's system instructions. This turns the chatbot into a personalized coach capable of referencing specific metrics (e.g. *"I noticed your electricity emissions make up 40% of your total footprint..."*).
- **Offline Fallback Engine:** If API keys are missing or network requests fail, the client switches to a regex-based local processing loop. It scans queries for eco-themed keywords and triggers matching automated responses, maintaining assistant availability.
- **Action Tag Parsing Protocol (`:::action`):** The Gemini prompt instructs the model to append machine-readable action tags when users describe real-life activities (e.g., *"I rode my bike to work"*). The client intercepts these tags in real-time, executing functions to automatically award XP, log habits, or adjust simulator parameters without requiring manual UI clicking.

### 3. Gamification Framework
To transition users from passive trackers to active participants, the system applies a classic RPG loop:
- **XP Progression:** Every logged eco-habit grants between 15 XP to 150 XP. Leveling up requires quadratic thresholds ($\text{XP} = \text{Level}^2 \times 100$).
- **Streak Multipliers:** Logging actions on consecutive days increments the active habit streak, reinforcing behavioral stickiness.
- **What-If Impact Simulations:** A slider-based playground displaying immediate, real-time CO₂ reductions, letting users visually correlate lifestyle shifts (e.g. reducing driving) with carbon curve flattening.

---

## 🛠️ How the Solution Works

### Key Application Modules

#### 1. Interactive Onboarding & Calculator
New users input metrics across four categories: Transportation, Energy, Diet, and Waste. The system immediately computes annual carbon emissions in metric tons of CO₂ equivalent (t CO₂e).

#### 2. Personalized Insights Dashboard
Renders data visually using **Chart.js**:
- **Doughnut Charts:** Highlights category breakdowns to isolate the user's largest emission source.
- **Bar Charts:** Dynamically compares the user's total output side-by-side with global reference averages (EU/US/Global).
- **KPI Metrics:** Displays active streaks, level progress, and total carbon prevented to date.

#### 3. Gamified Action Hub
A dashboard where users log active, everyday habits (e.g. cold-water laundry wash, organic eating, carpooling). Checked actions immediately recalculate savings, grant XP, and update progress bars.

#### 4. "What-If" Simulator
Interactive slider controls allow users to simulate adjustments to their weekly travel distance, energy consumption, and short-haul flights. The graph adjusts live, illustrating potential footprint drops before committing to changes.

#### 5. Intelligent Eco-Assistant & Trivia Quiz
- **Conversational Coach:** Chat interface allowing direct dialogue with Gemini AI. Includes preloaded prompt suggestion chips.
- **Trivia Minigame:** A multi-question interactive environmental quiz. Users earn a bonus 50 XP per correct answer with instant feedback and logic explanations.
- **Flexible Configuration:** Features an API configuration manager inside the chat to easily switch between custom/shared API keys or local fallback mode.

---

## 🧩 Assumptions Made
1. **Linear Scalability:** Assumes emissions behave linearly based on monthly and weekly estimates extrapolated to an annual footprint.
2. **Simplified Dietary Profiles:** Diet-related emissions are calculated using average profile indexes (Vegan, Vegetarian, Average, etc.) rather than item-by-item logs.
3. **Representative Emission Factors:** Calculations use average regional grid/vehicle metrics (EPA/DEFRA), acknowledging that actual factors fluctuate depending on local power sources and vehicle fuel efficiencies.
4. **Self-Reported Data:** Relies entirely on the accuracy and honesty of user inputs.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 (Vite)
- **Styling:** Vanilla CSS (curated HSL palettes, neon micro-interactions, sleek dark mode dashboard)
- **Charts:** Chart.js + React-Chartjs-2
- **State & Context:** React Context API (Auth & App State persistence)

### Backend
- **Server:** Node.js + Express 5
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Security:** JWT (JSON Web Tokens) & Bcrypt hashing, Express Rate Limiting
- **AI Integration:** Google Gemini API (v1beta API endpoint with `gemini-2.5-flash` model support)

---

## 💻 Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB connection string (Atlas or Local)

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Guptha747458/carbon-footprint.git
   cd carbon-footprint
   ```

2. **Configure Environment Variables:**
   - Create a `.env` file inside the `server/` directory:
     ```env
     PORT=3001
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_signing_key
     GEMINI_API_KEY=your_optional_default_gemini_api_key
     ALLOWED_ORIGIN=http://localhost:5173
     ```
   - Create a `.env` file inside the `client/` directory:
     ```env
     VITE_API_URL=http://localhost:3001
     ```

3. **Install Dependencies & Start the Server:**
   ```bash
   # From root folder, install backend and run concurrent services:
   cd server
   npm install
   npm run dev
   ```

4. **Install Client Dependencies & Run Client:**
   ```bash
   # In another terminal window:
   cd client
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🙌 Acknowledgments
Thanks to **Hack2skill** and **Google for Developers PromptWars Virtual** for the opportunity to build and innovate.
