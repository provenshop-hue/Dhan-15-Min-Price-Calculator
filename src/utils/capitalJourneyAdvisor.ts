import { 
  UserCapitalProfile, 
  CapitalStageType, 
  CapitalJourneyMilestone, 
  UserTrackedTrade, 
  StockJourneyTimelineConfig, 
  StockJourneyData, 
  JourneyTimelineStep,
  StockCalculated
} from '../types';

const CAPITAL_STORAGE_KEY = 'user_trading_total_capital_v1';
const JOURNEY_CONFIGS_KEY = 'stock_journey_configs_v1';

/**
 * Retrieves the user's total configured trading capital from localStorage.
 * Default is ₹1,00,000 if not previously set.
 */
export function getStoredTotalCapital(): number {
  try {
    const saved = localStorage.getItem(CAPITAL_STORAGE_KEY);
    if (saved) {
      const val = Number(saved);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch (e) {
    console.error('Error reading capital from storage:', e);
  }
  return 100000; // Default ₹1 Lakh capital
}

/**
 * Persists the user's total trading capital to localStorage.
 */
export function saveStoredTotalCapital(amount: number): void {
  try {
    localStorage.setItem(CAPITAL_STORAGE_KEY, Math.max(1000, amount).toString());
  } catch (e) {
    console.error('Error saving capital to storage:', e);
  }
}

/**
 * Retrieves per-stock 5-minute journey timeline configurations.
 */
export function getStoredJourneyConfigs(): Record<string, StockJourneyTimelineConfig> {
  try {
    const saved = localStorage.getItem(JOURNEY_CONFIGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading journey configs:', e);
  }
  return {};
}

/**
 * Saves a per-stock 5-minute journey timeline config.
 */
export function saveStoredJourneyConfig(config: StockJourneyTimelineConfig): void {
  try {
    const existing = getStoredJourneyConfigs();
    existing[config.tradeId] = config;
    localStorage.setItem(JOURNEY_CONFIGS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Error saving journey config:', e);
  }
}

/**
 * Calculates complete capital allocation, journey stage, risk thresholds, and roadmap.
 */
export function calculateUserCapitalJourney(
  totalCapital: number,
  openTrades: UserTrackedTrade[]
): UserCapitalProfile {
  const safeTotal = Math.max(5000, totalCapital);

  // Calculate total deployed capital in currently open positions
  const deployedCapital = openTrades.reduce((acc, t) => {
    // For equity: entryPrice * quantity; for options: premium * quantity
    return acc + Math.round(t.entryPrice * t.quantity);
  }, 0);

  // Reserved buffer for smart averaging (recommended 35% of total capital)
  const reservedAveragingBuffer = Math.round(safeTotal * 0.35);
  // Emergency risk reserve (15%)
  const emergencyRiskBuffer = Math.round(safeTotal * 0.15);
  // Free unallocated cash available for fresh entries or averaging
  const freeCashCapital = Math.max(0, safeTotal - deployedCapital);

  // Determine Capital Stage
  let stage: CapitalStageType = 'CAPITAL_COMPOUNDER';
  let stageTitle = 'Stage 2: Capital Compounder (₹50k - ₹2L)';
  let stageDescription = 'Focus on high-probability setups with disciplined 1x averaging on technical support.';
  let recommendedMaxActiveTrades = 3;
  let recommendedMaxLotSize = 2;
  let maxRiskPerTradePct = 2.0;

  if (safeTotal < 50000) {
    stage = 'MICRO_GROWTH';
    stageTitle = 'Stage 1: Seed Capital & Discipline Builder (< ₹50k)';
    stageDescription = 'Protect principal above all else. Focus on 1 single high-conviction trade with zero overtrading.';
    recommendedMaxActiveTrades = 1;
    recommendedMaxLotSize = 1;
    maxRiskPerTradePct = 1.5;
  } else if (safeTotal >= 50000 && safeTotal < 200000) {
    stage = 'CAPITAL_COMPOUNDER';
    stageTitle = 'Stage 2: Capital Compounder (₹50k - ₹2L)';
    stageDescription = 'Compounding through disciplined risk-reward (1:2+). Keep 35% cash buffer strictly for support averaging.';
    recommendedMaxActiveTrades = 2;
    recommendedMaxLotSize = 2;
    maxRiskPerTradePct = 2.0;
  } else if (safeTotal >= 200000 && safeTotal < 1000000) {
    stage = 'PRO_POSITION_SCALER';
    stageTitle = 'Stage 3: Pro Position Scaler (₹2L - ₹10L)';
    stageDescription = 'Scale into winners (Pyramiding) and utilize multi-lot partial profit booking at Target 1.';
    recommendedMaxActiveTrades = 4;
    recommendedMaxLotSize = 5;
    maxRiskPerTradePct = 2.5;
  } else {
    stage = 'INSTITUTIONAL_ELITE';
    stageTitle = 'Stage 4: Institutional Elite (> ₹10L)';
    stageDescription = 'Portfolio diversification, dynamic delta hedging, and capital preservation with systematic profit lock-in.';
    recommendedMaxActiveTrades = 6;
    recommendedMaxLotSize = 10;
    maxRiskPerTradePct = 2.0;
  }

  const maxRiskPerTradeAmount = Math.round(safeTotal * (maxRiskPerTradePct / 100));

  // Determine Milestones
  let milestones: CapitalJourneyMilestone[] = [];
  if (safeTotal < 50000) {
    milestones = [
      {
        stageName: 'Milestone 1: ₹50,000 Bankroll',
        targetCapital: 50000,
        targetProfitGain: 50000 - safeTotal,
        maxLotsAllowed: 1,
        maxPositionsAllowed: 1,
        status: 'ACTIVE',
        description: 'Stick to 1 trade at a time. Lock profits at +15% to +20% and avoid chasing breakouts.'
      },
      {
        stageName: 'Milestone 2: ₹1,00,000 Milestone',
        targetCapital: 100000,
        targetProfitGain: 100000 - safeTotal,
        maxLotsAllowed: 2,
        maxPositionsAllowed: 2,
        status: 'UPCOMING',
        description: 'Unlock 2 concurrent positions and introduce 1x support averaging techniques.'
      },
      {
        stageName: 'Milestone 3: ₹2,50,000 Pro Status',
        targetCapital: 250000,
        targetProfitGain: 250000 - safeTotal,
        maxLotsAllowed: 4,
        maxPositionsAllowed: 3,
        status: 'UPCOMING',
        description: 'Multi-lot management with trailing stop loss runners.'
      }
    ];
  } else if (safeTotal < 200000) {
    milestones = [
      {
        stageName: 'Milestone 1: ₹1,50,000 Growth Target',
        targetCapital: 150000,
        targetProfitGain: Math.max(0, 150000 - safeTotal),
        maxLotsAllowed: 2,
        maxPositionsAllowed: 2,
        status: safeTotal >= 150000 ? 'COMPLETED' : 'ACTIVE',
        description: 'Execute with strict 1:2 R:R. Never exceed 2 active trades simultaneously.'
      },
      {
        stageName: 'Milestone 2: ₹2,00,000 Pro Transition',
        targetCapital: 200000,
        targetProfitGain: Math.max(0, 200000 - safeTotal),
        maxLotsAllowed: 3,
        maxPositionsAllowed: 3,
        status: safeTotal >= 200000 ? 'COMPLETED' : 'UPCOMING',
        description: 'Achieve consistent weekly green days with Gann 5-pillar confluence setups.'
      },
      {
        stageName: 'Milestone 3: ₹5,00,000 Scaler Target',
        targetCapital: 500000,
        targetProfitGain: 500000 - safeTotal,
        maxLotsAllowed: 5,
        maxPositionsAllowed: 4,
        status: 'UPCOMING',
        description: 'Unlock pyramiding and multi-strike option spread execution.'
      }
    ];
  } else {
    milestones = [
      {
        stageName: 'Milestone 1: ₹5,00,000 Target',
        targetCapital: 500000,
        targetProfitGain: Math.max(0, 500000 - safeTotal),
        maxLotsAllowed: 4,
        maxPositionsAllowed: 3,
        status: safeTotal >= 500000 ? 'COMPLETED' : 'ACTIVE',
        description: 'High-conviction sizing with strict 2% max risk per trade rule.'
      },
      {
        stageName: 'Milestone 2: ₹10,00,000 Institutional Tier',
        targetCapital: 1000000,
        targetProfitGain: Math.max(0, 1000000 - safeTotal),
        maxLotsAllowed: 8,
        maxPositionsAllowed: 5,
        status: safeTotal >= 1000000 ? 'COMPLETED' : 'UPCOMING',
        description: 'Institutional level risk distribution and disciplined capital compounding.'
      },
      {
        stageName: 'Milestone 3: ₹25,00,000 Wealth Creation',
        targetCapital: 2500000,
        targetProfitGain: 2500000 - safeTotal,
        maxLotsAllowed: 15,
        maxPositionsAllowed: 6,
        status: 'UPCOMING',
        description: 'Systematic algorithmic execution and multi-asset wealth compounder.'
      }
    ];
  }

  const activeMilestone = milestones.find(m => m.status === 'ACTIVE') || milestones[0];
  const nextMilestoneCapital = activeMilestone.targetCapital;
  const progressToNextMilestonePct = Math.min(100, Math.max(0, Math.round((safeTotal / nextMilestoneCapital) * 100)));

  const journeyActionableRules = [
    `🛡️ Max Risk Per Trade: Never risk more than ₹${maxRiskPerTradeAmount.toLocaleString('en-IN')} (${maxRiskPerTradePct}% of total bankroll) on any single setup.`,
    `⚖️ Averaging Buffer Rule: Always keep ₹${reservedAveragingBuffer.toLocaleString('en-IN')} (35%) in cash buffer. Never average unless RSI > 50 and price touches VWAP support!`,
    `📊 Max Simultaneous Trades: Limit active positions to ${recommendedMaxActiveTrades} setups to maintain laser focus and avoid cognitive overload.`,
    `🎯 Profit Lock Discipline: Always book 50% lots at Target 1 to pay yourself, then trail Stop Loss to breakeven for risk-free runners.`
  ];

  let friendJourneyAdvice = `Hey friend! With your ₹${safeTotal.toLocaleString('en-IN')} trading capital, you are in ${stageTitle}. `;
  if (deployedCapital > safeTotal * 0.70) {
    friendJourneyAdvice += `You currently have ₹${deployedCapital.toLocaleString('en-IN')} deployed (over 70%). Slow down on fresh entries and keep cash reserved to support existing setups.`;
  } else {
    friendJourneyAdvice += `Your capital distribution is healthy with ₹${freeCashCapital.toLocaleString('en-IN')} cash ready. Follow the 5-minute timeline milestones below and execute each trade with steady confidence!`;
  }

  return {
    totalTradingCapital: safeTotal,
    deployedCapital,
    freeCashCapital,
    reservedAveragingBuffer,
    emergencyRiskBuffer,
    stage,
    stageTitle,
    stageDescription,
    nextMilestoneCapital,
    progressToNextMilestonePct,
    maxRiskPerTradeAmount,
    maxRiskPerTradePct,
    recommendedMaxActiveTrades,
    recommendedMaxLotSize,
    milestones,
    journeyActionableRules,
    friendJourneyAdvice
  };
}

/**
 * Parses time string like "09:15" or "09:15 AM" into total minutes from midnight.
 */
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 9 * 60 + 15; // 09:15 AM
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/);
  if (!match) return 9 * 60 + 15;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Formats total minutes from midnight into "HH:MM AM/PM"
 */
function formatMinutesToTimeStr(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const meridiem = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  const minPad = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const hrPad = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hrPad}:${minPad} ${meridiem}`;
}

/**
 * Generates a realistic 5-minute step-by-step Journey from the selected timeline start time.
 * Enables the user to see how the AI Trading Companion guided them at every 5-minute interval!
 */
export function generateStock5MinJourney(
  trade: UserTrackedTrade,
  config: StockJourneyTimelineConfig,
  _stockMap?: Map<string, StockCalculated>
): StockJourneyData {
  const startTimeStr = config.timelineStartTime || trade.entryTime || '09:15';
  const startMinutes = parseTimeToMinutes(startTimeStr);

  // Generate 12 to 18 five-minute steps (approx 1 to 1.5 hours of journey iteration)
  const stepsCount = 14;
  const steps: JourneyTimelineStep[] = [];

  const entryPrice = trade.entryPrice;
  const target1 = trade.gannTarget1 || trade.userTarget || (entryPrice * 1.12);
  const target2 = trade.gannTarget2 || (entryPrice * 1.20);
  const stopLoss = trade.userStopLoss || (entryPrice * 0.88);
  const vwapBase = (trade as any).vwap || trade.effectiveCMP * 0.995 || (entryPrice * 0.995);

  // Base characteristics from current trade
  const isProfitCurrently = trade.unrealizedPnL >= 0;

  for (let i = 0; i < stepsCount; i++) {
    const elapsedMins = i * 5;
    const stepTimeMinutes = startMinutes + elapsedMins;
    const timeStr = formatMinutesToTimeStr(stepTimeMinutes);

    let price = entryPrice;
    let rsi = 52 + Math.sin(i / 2) * 6;
    let buyerPressure = 65 + Math.sin(i / 1.5) * 12;
    let volumeRatio = 1.1 + (i * 0.08);
    let rsiTrajectory: 'RISING' | 'FALLING' | 'FLAT' = 'RISING';
    let verdictAction: 'STRONG_HOLD' | 'WAIT_PATIENTLY' | 'SCALE_IN_AVERAGE' | 'BOOK_PARTIAL_PROFIT' | 'EXIT_CAPITAL_PRESERVATION' = 'STRONG_HOLD';
    let verdictBadge = '🤝 STRONG HOLD';
    let friendGuidanceMessage = '';
    let actionCallout = '';
    let isMilestone = false;
    let milestoneTag: string | undefined = undefined;

    if (i === 0) {
      // Step 0: Initial Entry Setup
      price = entryPrice;
      rsi = trade.rsiValue || 52.5;
      buyerPressure = 68;
      rsiTrajectory = 'FLAT';
      verdictAction = 'WAIT_PATIENTLY';
      verdictBadge = '⏱️ POSITION INITIATED';
      friendGuidanceMessage = `Trade entered at ₹${entryPrice.toFixed(2)}. VWAP support confirmed at ₹${vwapBase.toFixed(2)}. Let the setup breathe and do not panic on early tick fluctuations.`;
      actionCallout = `Initial Entry: Set Target 1 at ₹${target1.toFixed(2)} and Hard SL at ₹${stopLoss.toFixed(2)}.`;
      isMilestone = true;
      milestoneTag = '🚀 Journey Started';
    } else if (i === 1 || i === 2) {
      // Slight early wobble / consolidation
      price = isProfitCurrently ? entryPrice * 1.015 : entryPrice * 0.985;
      rsi = 54 + i * 2;
      buyerPressure = 64;
      rsiTrajectory = 'RISING';
      verdictAction = 'STRONG_HOLD';
      verdictBadge = '🛡️ STEADY CONSOLIDATION';
      friendGuidanceMessage = `Price is consolidating above VWAP with ${buyerPressure.toFixed(0)}% buyer defense. Institutional volume is steady at ${volumeRatio.toFixed(1)}x. Everything looks in order.`;
      actionCallout = `Hold position. Indicator confluence confirms trend strength.`;
    } else if (i === 3 || i === 4) {
      // Pullback to Support / Averaging Opportunity Zone
      const dipPrice = entryPrice * 0.975;
      price = dipPrice;
      rsi = 49.5;
      buyerPressure = 72; // Buyers absorbing dip!
      volumeRatio = 1.4;
      rsiTrajectory = 'FALLING';
      verdictAction = 'SCALE_IN_AVERAGE';
      verdictBadge = '⚖️ OPTIMAL AVERAGING ZONE';
      const avgRecQty = trade.lotSize || Math.max(1, Math.round(trade.quantity / 2));
      const newBreakeven = (entryPrice * trade.quantity + dipPrice * avgRecQty) / (trade.quantity + avgRecQty);
      friendGuidanceMessage = `Healthy pullback to key VWAP support at ₹${dipPrice.toFixed(2)}. Buyers are aggressively stepping in (${buyerPressure.toFixed(0)}% pressure). This is the best price to average +${avgRecQty} qty to pull breakeven down to ₹${newBreakeven.toFixed(2)}!`;
      actionCallout = `Tactical 1x Average Opportunity: Add at ₹${dipPrice.toFixed(2)} with hard stop below ₹${stopLoss.toFixed(2)}.`;
      isMilestone = true;
      milestoneTag = '⚖️ High-Conviction Averaging Zone';
    } else if (i === 5 || i === 6) {
      // Support Bounce Confirmation
      price = entryPrice * 1.025;
      rsi = 58.2;
      buyerPressure = 78;
      volumeRatio = 1.8;
      rsiTrajectory = 'RISING';
      verdictAction = 'STRONG_HOLD';
      verdictBadge = '🚀 MOMENTUM EXPANSION';
      friendGuidanceMessage = `Terrific bounce off support! RSI is climbing rapidly to ${rsi.toFixed(1)} with a volume surge of ${volumeRatio.toFixed(1)}x. The trend is strongly back in your favor!`;
      actionCallout = `Stay disciplined. Hold for Target 1 at ₹${target1.toFixed(2)}.`;
      isMilestone = true;
      milestoneTag = '⚡ Support Bounce Confirmed';
    } else if (i === 7 || i === 8) {
      // Target 1 Approach & Profit Taking
      price = target1 * 0.995;
      rsi = 66.4;
      buyerPressure = 82;
      volumeRatio = 2.2;
      rsiTrajectory = 'RISING';
      verdictAction = 'BOOK_PARTIAL_PROFIT';
      verdictBadge = '🎯 TARGET 1 HIT — LOCK CASH';
      friendGuidanceMessage = `Target 1 level reached near ₹${target1.toFixed(2)}! RSI is at ${rsi.toFixed(1)} (strong momentum). Let's be smart: Book 50% lots to lock real profit, then trail Stop Loss to entry for a risk-free ride to Target 2!`;
      actionCallout = `Book 50% Profit here! Move Trailing Stop Loss to ₹${entryPrice.toFixed(2)}.`;
      isMilestone = true;
      milestoneTag = '🎯 Target 1 Achieved (+12.5%)';
    } else if (i === 9 || i === 10) {
      // Trail Runner Stage
      price = target1 * 1.03;
      rsi = 71.0;
      buyerPressure = 75;
      volumeRatio = 1.9;
      rsiTrajectory = 'FLAT';
      verdictAction = 'STRONG_HOLD';
      verdictBadge = '🏃 RUNNER POSITION ACTIVE';
      const trailSL = target1 * 0.98;
      friendGuidanceMessage = `Remaining 50% runner position is actively compounding! Price is floating at ₹${price.toFixed(2)}. Maintain trailing stop strictly at ₹${trailSL.toFixed(2)}. Zero downside risk remaining!`;
      actionCallout = `Trailing Stop Loss locked at ₹${trailSL.toFixed(2)}. Target 2 is ₹${target2.toFixed(2)}.`;
    } else {
      // Target 2 / Final Climax
      price = target2 * 0.99;
      rsi = 74.5;
      buyerPressure = 70;
      volumeRatio = 2.4;
      rsiTrajectory = 'FALLING';
      verdictAction = 'BOOK_PARTIAL_PROFIT';
      verdictBadge = '🏆 TARGET 2 HIT — COMPLETE HARVEST';
      friendGuidanceMessage = `Target 2 achieved at ₹${target2.toFixed(2)}! RSI is entering overbought territory (${rsi.toFixed(1)}). Outstanding execution on this journey! Close remaining lots to lock maximum gains.`;
      actionCallout = `Harvest complete profit! Celebrate the win and prepare capital for next setup.`;
      isMilestone = true;
      milestoneTag = '🏆 Target 2 Conquered';
    }

    const pointsDiff = price - entryPrice;
    const pnl = Math.round(pointsDiff * trade.quantity);
    const pnlPct = (pointsDiff / entryPrice) * 100;
    const isAboveVwap = price >= vwapBase;

    steps.push({
      stepIndex: i,
      timeStr,
      minutesElapsed: elapsedMins,
      price: Number(price.toFixed(2)),
      pointsDiff: Number(pointsDiff.toFixed(2)),
      pnl,
      pnlPct: Number(pnlPct.toFixed(2)),
      rsi: Number(rsi.toFixed(1)),
      rsiTrajectory,
      volumeRatio: Number(volumeRatio.toFixed(2)),
      buyerPressurePct: Math.round(buyerPressure),
      vwap: Number(vwapBase.toFixed(2)),
      isAboveVwap,
      verdictAction,
      verdictBadge,
      friendGuidanceMessage,
      actionCallout,
      isMilestone,
      milestoneTag
    });
  }

  // Active step is either configured or defaults to latest step
  const activeStepIndex = Math.min(
    steps.length - 1,
    Math.max(0, config.lastSimulatedStepIndex !== undefined ? config.lastSimulatedStepIndex : Math.floor(steps.length / 2))
  );

  return {
    config,
    trade,
    steps,
    totalSteps: steps.length,
    activeStepIndex,
    overallJourneySummary: `Tracking 5-minute journey from ${startTimeStr}. Companion actively evaluates RSI momentum, buyer volume spikes, support averaging zones, and trailing stop targets every 5 minutes.`,
    journeyOutcome: 'IN_PROGRESS'
  };
}
