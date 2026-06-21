import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ECO_DATA, calculateFootprint } from '../data/ecoData';
import { QUIZ_QUESTIONS } from '../data/quizData';

export default function Assistant({ onLogAction }) {
  const { state, updateState } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: `Hello ${state.calculatorInputs ? (state.onboarded ? 'Eco-Hero' : 'friend') : 'friend'}! 🌿 I am **Eco-Coach**, your smart climate action assistant.\n\nI can help you analyze your footprint, log sustainable habits, simulate what-if scenarios, or test your environmental knowledge with a trivia quiz.\n\nHow can I help you today?`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [clientApiKey, setClientApiKey] = useState(localStorage.getItem('ecostride_gemini_api_key') || "");
  const messagesEndRef = useRef(null);

  // Trivia Quiz State
  const [quizState, setQuizState] = useState({
    active: false,
    currentQuestionIndex: 0,
    score: 0,
    selectedOption: null,
    answered: false,
    earnedXp: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, quizState.active]);

  const saveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('ecostride_gemini_api_key', clientApiKey.trim());
    setShowKeyConfig(false);
    addSystemMessage("Gemini API Key updated successfully!");
  };

  const clearApiKey = () => {
    localStorage.removeItem('ecostride_gemini_api_key');
    setClientApiKey("");
    addSystemMessage("Gemini API Key cleared. Now running in Offline Fallback mode.");
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: "system",
      text
    }]);
  };

  // Parses response text for command structures like :::action {"type": "..."} :::
  const handleActionParsing = (text) => {
    let cleanText = text;
    const actionRegex = /:::action\s*([\s\S]*?)\s*:::/i;
    const match = text.match(actionRegex);

    if (match) {
      cleanText = text.replace(actionRegex, '').trim();
      try {
        const actionData = JSON.parse(match[1].trim());
        executeAction(actionData);
      } catch (err) {
        console.error("Failed to parse assistant action payload:", err);
      }
    }
    return cleanText;
  };

  const executeAction = (actionData) => {
    if (actionData.type === 'LOG_ACTION') {
      const actionRef = ECO_DATA.actions.find(a => a.id === actionData.actionId);
      if (actionRef) {
        onLogAction(actionRef);
        // Wait briefly for app state to update, then add system verification bubble
        setTimeout(() => {
          addSystemMessage(`✅ Action Logged: ${actionRef.title} (-${actionRef.co2Saved} kg CO₂, +${actionRef.xp} XP)`);
        }, 1000);
      }
    } else if (actionData.type === 'SIMULATE') {
      const changes = actionData.changes;
      if (changes) {
        updateState(prev => {
          const nextInputs = { ...prev.calculatorInputs };
          
          if (changes.driving !== undefined) nextInputs.carDist = Number(changes.driving);
          if (changes.electricity !== undefined) nextInputs.electricityBill = Number(changes.electricity);
          if (changes.flightsShort !== undefined) nextInputs.flightsShort = Number(changes.flightsShort);
          
          if (changes.dietIndex !== undefined) {
            const diets = ["vegan", "vegetarian", "flexitarian", "average", "carnivore"];
            if (diets[changes.dietIndex]) {
              nextInputs.dietType = diets[changes.dietIndex];
            }
          }

          const newFootprint = calculateFootprint(nextInputs);

          return {
            ...prev,
            calculatorInputs: nextInputs,
            baseline: newFootprint.total
          };
        });

        setTimeout(() => {
          addSystemMessage(`📊 Simulation Applied: Your carbon inputs were updated. New baseline: ${state.baseline.toFixed(1)} t CO₂e/year.`);
        }, 1000);
      }
    }
  };

  // Offline Rules Processing Engine
  const processOfflineResponse = (userText) => {
    const text = userText.toLowerCase().trim();

    // 1. GREETING
    if (/^(hi|hello|hey|greetings|hola)/.test(text)) {
      return {
        reply: `Hello! I am your offline Eco-Coach. I can help you with:
- **Play Trivia Quiz**: Type "start quiz" to test your knowledge and earn XP!
- **Log an Action**: Tell me what you did, e.g. "I rode my bike" or "I had a meatless meal".
- **Footprint Review**: Ask "What is my footprint?" to get a detailed breakdown.
- **Simulate Changes**: Type "simulate 50km driving" or "simulate vegan diet" to test impacts.
`
      };
    }

    // 2. QUIZ TRIGGER
    if (text.includes("quiz") || text.includes("trivia") || text.includes("play")) {
      startQuiz();
      return {
        reply: "Initializing the Eco-Trivia Quiz! Prepare to test your climate knowledge. Let's start with the first question."
      };
    }

    // 3. FOOTPRINT REVIEW
    if (text.includes("footprint") || text.includes("baseline") || text.includes("report") || text.includes("stats") || text.includes("how am i doing")) {
      const breakdown = calculateFootprint(state.calculatorInputs);
      const savings = state.baseline * (state.goalPercent / 100);
      const target = state.baseline - savings;
      
      return {
        reply: `Here is your current carbon diagnostic report:
- **Baseline Carbon Footprint**: **${state.baseline.toFixed(1)} metric tons CO₂e/year**
- **Transportation**: ${breakdown.breakdown.transport.toFixed(1)} tons/year
- **Home Energy**: ${breakdown.breakdown.energy.toFixed(1)} tons/year
- **Diet & Waste**: ${breakdown.breakdown.diet.toFixed(1)} tons/year

🎯 **Reduction Target**: -${state.goalPercent}% (Target limit: ${target.toFixed(1)} tons/year). You want to prevent **${savings.toFixed(1)} tons/year**.
🌱 You are currently at **Level ${state.level}** with **${state.xp} XP**, maintaining a **${state.streak}-day streak**!
`
      };
    }

    // 4. HABITS LOGGING MATCHES
    const actionKeywords = [
      { id: "bike_short", keywords: ["bike", "bicycle", "cycle", "walk", "foot"] },
      { id: "public_transit", keywords: ["bus", "train", "metro", "subway", "transit"] },
      { id: "carpool", keywords: ["carpool", "share a ride", "rideshare"] },
      { id: "eco_driving", keywords: ["eco driving", "steady speed", "tire pressure"] },
      { id: "thermostat_tweak", keywords: ["thermostat", "lower temperature", "heating", "ac", "air conditioning"] },
      { id: "cold_wash", keywords: ["cold wash", "cold water", "laundry cold"] },
      { id: "air_dry", keywords: ["air dry", "line dry", "dryer", "rack dry"] },
      { id: "unplug_standby", keywords: ["vampire", "unplug", "standby", "charger"] },
      { id: "led_upgrade", keywords: ["led", "bulb", "lightbulb"] },
      { id: "meatless_day", keywords: ["meatless", "plant-based day", "no meat", "vegan day", "veggie day"] },
      { id: "prevent_food_waste", keywords: ["food waste", "leftover", "zero waste", "prevent waste"] },
      { id: "compost_waste", keywords: ["compost", "scraps", "organic waste"] },
      { id: "local_organic", keywords: ["local", "farmers market", "organic food"] },
      { id: "reusable_bottles", keywords: ["reusable", "bottle", "no plastic", "single use free"] }
    ];

    for (const item of actionKeywords) {
      if (item.keywords.some(kw => text.includes(kw))) {
        const actionRef = ECO_DATA.actions.find(a => a.id === item.id);
        if (actionRef) {
          // Check if one-time is already completed
          if (actionRef.type === 'one-time') {
            const alreadyCompleted = state.history.some(h => h.actionId === actionRef.id);
            if (alreadyCompleted) {
              return { reply: `You've already completed the one-time upgrade: **${actionRef.title}**! You cannot log this multiple times.` };
            }
          }

          // Trigger log
          onLogAction(actionRef);
          return {
            reply: `Awesome job! 🎉 I've successfully logged '**${actionRef.title}**' for you.\n\nThis saved **${actionRef.co2Saved.toFixed(1)} kg CO₂e** and awarded you **+${actionRef.xp} XP**!`
          };
        }
      }
    }

    // 5. SIMULATION INPUT CHANGES
    if (text.includes("simulate")) {
      let match;
      
      // Driving
      if ((match = text.match(/simulate(?:\s+weekly)?\s+driving\s+(\d+)/i)) || (match = text.match(/simulate\s+(\d+)\s*km/i))) {
        const val = parseInt(match[1]);
        const cleanReply = `Simulating weekly driving distance adjusted to **${val} km**. Let's apply this!`;
        return {
          reply: cleanReply,
          action: { type: "SIMULATE", changes: { driving: val } }
        };
      }
      
      // Electricity
      if ((match = text.match(/simulate(?:\s+monthly)?\s+electricity\s+(\d+)/i)) || (match = text.match(/simulate\s+(\d+)\s*kwh/i))) {
        const val = parseInt(match[1]);
        return {
          reply: `Simulating monthly electricity consumption adjusted to **${val} kWh**. Let's calculate the impact!`,
          action: { type: "SIMULATE", changes: { electricity: val } }
        };
      }

      // Flights
      if (match = text.match(/simulate\s+(\d+)\s*flight/i)) {
        const val = parseInt(match[1]);
        return {
          reply: `Simulating annual short-haul flight count adjusted to **${val} flights**.`,
          action: { type: "SIMULATE", changes: { flightsShort: val } }
        };
      }

      // Diets
      if (text.includes("vegan")) {
        return {
          reply: "Simulating shift to a **Vegan diet** (purely plant-based).",
          action: { type: "SIMULATE", changes: { dietIndex: 0 } }
        };
      } else if (text.includes("vegetarian")) {
        return {
          reply: "Simulating shift to a **Vegetarian diet**.",
          action: { type: "SIMULATE", changes: { dietIndex: 1 } }
        };
      } else if (text.includes("flexitarian") || text.includes("semi")) {
        return {
          reply: "Simulating shift to a **Flexitarian diet**.",
          action: { type: "SIMULATE", changes: { dietIndex: 2 } }
        };
      } else if (text.includes("average")) {
        return {
          reply: "Simulating shift to an **Average diet**.",
          action: { type: "SIMULATE", changes: { dietIndex: 3 } }
        };
      } else if (text.includes("meat-heavy") || text.includes("carnivore")) {
        return {
          reply: "Simulating shift to a **Meat-Heavy diet**.",
          action: { type: "SIMULATE", changes: { dietIndex: 4 } }
        };
      }

      return {
        reply: `Adjusting inputs in offline simulation:
Try typing:
- "simulate driving 50 km"
- "simulate electricity 200 kWh"
- "simulate vegan diet"`
      };
    }

    // 6. DEFAULT TIPS AND GENERAL HELP
    if (text.includes("tip") || text.includes("advice") || text.includes("fact") || text.includes("help")) {
      const tips = [
        "Unplugging electronics like TVs and chargers can save up to 10% on your home electric bill by eliminating standby power.",
        "Washing your clothes in cold water instead of hot saves about 90% of the energy consumed per washing machine cycle.",
        "Line-drying your clothes for just 6 months can prevent up to 150 kg of carbon emissions compared to using a tumble dryer.",
        "Reducing beef consumption in favor of chicken, pork, or beans has the highest carbon impact of any dietary adjustment.",
        "Ensuring your car tires are inflated to the proper pressure increases fuel efficiency by up to 3%, saving money and emissions."
      ];
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      return {
        reply: `💡 **Climate Tip of the Day:**\n\n${randomTip}\n\nAsk me to log a related action if you've done this today!`
      };
    }

    // 7. NO MATCH FALLBACK
    return {
      reply: `I'm running in offline mode. I can help you log sustainable habits, simulate lifestyle metrics, or play a trivia game.\n\nTry typing **"start quiz"**, **"what is my footprint"**, or **"I rode my bicycle today"**!`
    };
  };

  // Sending message handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    // Interrupt message sending if quiz is active to prevent disruption
    if (quizState.active) {
      addSystemMessage("⚠️ A trivia game is currently in progress. Please complete or cancel the quiz before chatting.");
      setInputText("");
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build request body with local parameters
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6) // Send last 6 messages for context
        .map(m => ({ role: m.role, text: m.text }));

      const res = await fetch(`${API_URL}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          history,
          userContext: {
            name: state.name || '',
            level: state.level,
            xp: state.xp,
            streak: state.streak,
            baseline: state.baseline,
            goalPercent: state.goalPercent,
            history: state.history,
            calculatorInputs: state.calculatorInputs,
            breakdown: calculateFootprint(state.calculatorInputs).breakdown
          },
          clientApiKey: clientApiKey.trim() || null
        })
      });

      if (!res.ok) {
        throw new Error("Server responded with error code");
      }

      const data = await res.json();

      if (data.apiKeyMissing) {
        // Run Offline Rules Parser Fallback
        const offlineRes = processOfflineResponse(userMessage.text);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          role: "assistant",
          text: offlineRes.reply
        }]);

        if (offlineRes.action) {
          executeAction(offlineRes.action);
        }
      } else {
        // Parse Gemini Reply
        const cleanReply = handleActionParsing(data.reply);
        setMessages(prev => [...prev, {
          id: Date.now() + Math.random(),
          role: "assistant",
          text: cleanReply
        }]);
      }

    } catch (err) {
      console.error("Chat request failed, using offline fallback:", err);
      const offlineRes = processOfflineResponse(userMessage.text);
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        role: "assistant",
        text: `${offlineRes.reply}\n\n*(Note: Running in offline fallback due to network or connection issues)*`
      }]);
      if (offlineRes.action) {
        executeAction(offlineRes.action);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Quiz Functions
  const startQuiz = () => {
    setQuizState({
      active: true,
      currentQuestionIndex: 0,
      score: 0,
      selectedOption: null,
      answered: false,
      earnedXp: 0
    });
    
    // Add assistant bubble introducing the quiz
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: "assistant",
      text: "🎮 **Let's play Eco-Trivia!** I'll present 6 questions. Each correct answer awards **+15 XP**. Good luck!"
    }]);
  };

  const handleSelectOption = (index) => {
    if (quizState.answered) return;
    setQuizState(prev => ({ ...prev, selectedOption: index }));
  };

  const submitAnswer = () => {
    if (quizState.selectedOption === null || quizState.answered) return;

    const currentQ = QUIZ_QUESTIONS[quizState.currentQuestionIndex];
    const isCorrect = quizState.selectedOption === currentQ.answerIndex;
    
    // Calculate new stats
    const xpReward = isCorrect ? currentQ.xpReward : 0;
    
    setQuizState(prev => ({
      ...prev,
      answered: true,
      score: prev.score + (isCorrect ? 1 : 0),
      earnedXp: prev.earnedXp + xpReward
    }));

    // Award XP instantly
    if (isCorrect) {
      updateState(prev => {
        let nextXp = prev.xp + xpReward;
        let nextLevel = prev.level;
        let nextXpTarget = nextLevel * 100;
        let leveledUp = false;
        
        while (nextXp >= nextXpTarget) {
          nextXp -= nextXpTarget;
          nextLevel++;
          nextXpTarget = nextLevel * 100;
          leveledUp = true;
        }

        // Add side-effect visual toast trigger
        return {
          ...prev,
          xp: nextXp,
          level: nextLevel
        };
      });
    }

    // Add assistant bubble summarizing result
    const chosenText = currentQ.options[quizState.selectedOption];
    const correctText = currentQ.options[currentQ.answerIndex];
    setMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      role: "assistant",
      text: isCorrect
        ? `✅ **Correct!** You chose: *${chosenText}*.\n\n${currentQ.explanation}\n\n**+${xpReward} XP** awarded!`
        : `❌ **Incorrect.** You chose: *${chosenText}*. The correct answer is: **${correctText}**.\n\n${currentQ.explanation}`
    }]);
  };

  const nextQuestion = () => {
    const nextIdx = quizState.currentQuestionIndex + 1;
    if (nextIdx < QUIZ_QUESTIONS.length) {
      setQuizState(prev => ({
        ...prev,
        currentQuestionIndex: nextIdx,
        selectedOption: null,
        answered: false
      }));
    } else {
      // Quiz complete!
      const totalQuestions = QUIZ_QUESTIONS.length;
      const pct = Math.round((quizState.score / totalQuestions) * 100);
      
      setMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        role: "assistant",
        text: `🏆 **Quiz Complete!**\n\nYou scored **${quizState.score}/${totalQuestions}** (${pct}%).\nYou earned a total of **+${quizState.earnedXp} XP**!\n\nKeep learning and tracking to step lightly on Earth!`
      }]);

      setQuizState(prev => ({
        ...prev,
        active: false
      }));
    }
  };

  const cancelQuiz = () => {
    setQuizState(prev => ({ ...prev, active: false }));
    addSystemMessage("Trivia Quiz aborted. Back to chat assistant.");
  };

  const currentQuestion = QUIZ_QUESTIONS[quizState.currentQuestionIndex];

  return (
    <section id="view-assistant" className="app-view">
      <div className="section-header-row">
        <div className="section-header">
          <h2>Smart AI Eco-Assistant</h2>
          <p>Chat with our AI Eco-Coach for carbon advice, log actions automatically, run simulations, or test your trivia knowledge.</p>
        </div>
        <button 
          className="btn btn-outline btn-small" 
          onClick={() => setShowKeyConfig(!showKeyConfig)}
          aria-expanded={showKeyConfig}
          id="assistant-settings-toggle"
        >
          <i className="fa-solid fa-key"></i> API Key Settings {showKeyConfig ? '▲' : '▼'}
        </button>
      </div>

      {/* API Key Panel */}
      {showKeyConfig && (
        <div className="key-config-panel glass-panel animate-slide-in">
          <h4>Configure Gemini AI API Connection</h4>
          <p>By default, Eco-Coach uses a robust, offline rules engine. Provide a Gemini API key to enable full natural language conversation, advanced contextual insights, and dynamic chat commands.</p>
          <form onSubmit={saveApiKey} style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
            <input 
              type="password" 
              placeholder="Paste Gemini API Key here (starts with AIza...)" 
              value={clientApiKey}
              onChange={(e) => setClientApiKey(e.target.value)}
              className="flex-grow"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
              required
            />
            <button type="submit" className="btn btn-primary">Save Key</button>
            {localStorage.getItem('ecostride_gemini_api_key') && (
              <button type="button" className="btn btn-danger" onClick={clearApiKey}>Remove Key</button>
            )}
          </form>
        </div>
      )}

      {/* Assistant Main Layout */}
      <div className="assistant-main-container glass-panel">
        
        {/* Chat Feed */}
        <div className="chat-messages-container">
          {messages.map((m) => (
            <div key={m.id} className={`chat-message-row ${m.role}`}>
              <div className="message-bubble-wrapper">
                {m.role === 'assistant' && (
                  <div className="message-icon-circle"><i className="fa-solid fa-seedling"></i></div>
                )}
                <div className="message-bubble">
                  {/* Custom Markdown formatting logic (bolding, lists, headers) */}
                  <div className="message-text">
                    {m.text.split('\n').map((line, idx) => {
                      // Check for headers
                      if (line.startsWith('###')) {
                        return <h5 key={idx} style={{ marginTop: '12px', marginBottom: '6px', color: 'var(--color-primary)' }}>{line.replace('###', '').trim()}</h5>;
                      }
                      if (line.startsWith('##')) {
                        return <h4 key={idx} style={{ marginTop: '12px', marginBottom: '6px', color: 'var(--color-primary)' }}>{line.replace('##', '').trim()}</h4>;
                      }

                      // Bold replacement
                      let segments = [line];
                      const boldRegex = /\*\*(.*?)\*\*/g;
                      let match;
                      
                      // Formatting lists
                      const isBullet = line.startsWith('- ');
                      let content = line;
                      if (isBullet) content = line.substring(2);

                      let element = content;
                      if (content.includes('**')) {
                        const parts = [];
                        let lastIndex = 0;
                        let innerMatch;
                        const localRegex = /\*\*(.*?)\*\*/g;
                        while ((innerMatch = localRegex.exec(content)) !== null) {
                          parts.push(content.substring(lastIndex, innerMatch.index));
                          parts.push(<strong key={innerMatch.index}>{innerMatch[1]}</strong>);
                          lastIndex = localRegex.lastIndex;
                        }
                        parts.push(content.substring(lastIndex));
                        element = parts;
                      }

                      if (isBullet) {
                        return <li key={idx} style={{ marginLeft: '20px', listStyleType: 'disc', marginVertical: '4px' }}>{element}</li>;
                      }
                      return <p key={idx} style={{ marginBottom: '8px', lineHeight: '1.4' }}>{element}</p>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="chat-message-row assistant">
              <div className="message-bubble-wrapper">
                <div className="message-icon-circle"><i className="fa-solid fa-spinner fa-spin"></i></div>
                <div className="message-bubble" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 18px' }}>
                  <div className="typing-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inline Trivia Question Panel */}
          {quizState.active && currentQuestion && (
            <div className="chat-message-row system quiz-active-row">
              <div className="quiz-card-panel glass-panel animate-pulse-glow">
                <div className="quiz-card-header">
                  <span>Question {quizState.currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}</span>
                  <span className="quiz-xp-potential">+{currentQuestion.xpReward} XP</span>
                </div>
                <h4>{currentQuestion.question}</h4>
                
                <div className="quiz-options-list">
                  {currentQuestion.options.map((option, index) => {
                    let btnClass = "";
                    if (quizState.selectedOption === index) {
                      btnClass = "selected";
                    }
                    if (quizState.answered) {
                      if (index === currentQuestion.answerIndex) {
                        btnClass = "correct";
                      } else if (quizState.selectedOption === index) {
                        btnClass = "incorrect";
                      } else {
                        btnClass = "disabled";
                      }
                    }

                    return (
                      <button
                        key={index}
                        className={`quiz-option-btn ${btnClass}`}
                        onClick={() => handleSelectOption(index)}
                        disabled={quizState.answered}
                      >
                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                        <span className="option-text">{option}</span>
                        {quizState.answered && index === currentQuestion.answerIndex && (
                          <i className="fa-solid fa-circle-check text-success icon-right"></i>
                        )}
                        {quizState.answered && quizState.selectedOption === index && index !== currentQuestion.answerIndex && (
                          <i className="fa-solid fa-circle-xmark text-danger icon-right"></i>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="quiz-actions-bar">
                  {!quizState.answered ? (
                    <>
                      <button className="btn btn-secondary btn-small" onClick={cancelQuiz}>Abort Quiz</button>
                      <button 
                        className="btn btn-success btn-small" 
                        onClick={submitAnswer} 
                        disabled={quizState.selectedOption === null}
                      >
                        Submit Answer
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="quiz-status-feedback">
                        {quizState.selectedOption === currentQuestion.answerIndex ? (
                          <span className="text-success"><i className="fa-solid fa-award"></i> Correct!</span>
                        ) : (
                          <span className="text-danger"><i className="fa-solid fa-circle-xmark"></i> Incorrect</span>
                        )}
                      </div>
                      <button className="btn btn-primary btn-small" onClick={nextQuestion}>
                        {quizState.currentQuestionIndex + 1 === QUIZ_QUESTIONS.length ? 'Finish Quiz' : 'Next Question'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="chat-input-bar">
          <input
            type="text"
            placeholder={quizState.active ? "Please complete the quiz question..." : "Ask Eco-Coach anything (e.g. 'How is my footprint?', 'I cycled to work')"}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={quizState.active || isLoading}
            className="chat-input"
          />
          <button 
            type="submit" 
            className="btn btn-primary chat-send-btn" 
            disabled={!inputText.trim() || quizState.active || isLoading}
            aria-label="Send message"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </form>

        {/* Suggestion Chips */}
        {!quizState.active && (
          <div className="chat-suggestion-chips">
            <button type="button" className="chip" onClick={() => { setInputText("How is my footprint?"); }}>📊 Check Footprint</button>
            <button type="button" className="chip" onClick={() => { setInputText("I rode my bicycle today"); }}>🚴 Log Cycling</button>
            <button type="button" className="chip" onClick={() => { setInputText("I had a meatless plant-based day"); }}>🥗 Log Meatless Meal</button>
            <button type="button" className="chip" onClick={() => { setInputText("Simulate driving 50 km"); }}>🚗 Simulate driving less</button>
            <button type="button" className="chip" onClick={() => { setInputText("Give me a climate tip"); }}>💡 Climate Tip</button>
            <button type="button" className="chip" onClick={() => { startQuiz(); }}>🎮 Start Trivia Quiz</button>
          </div>
        )}
      </div>
    </section>
  );
}
