import { useState, useEffect, useCallback } from 'react';

export interface GameEvent {
  title: string;
  description: string;
  infImpact: number;
  unempImpact: number;
  type: 'shock' | 'boon';
  duration?: number;
  elapsed?: number;
  phase?: 'active' | 'lingering';
  lingeringElapsed?: number;
  lingeringDuration?: number;
  originalDescription?: string;
}

export interface TermMetrics {
  avgInflation: number;
  avgUnemployment: number;
  maxInflation: number;
  maxUnemployment: number;
  minInflation: number;
  minUnemployment: number;
  stabilityScore: number;
}

export interface GameState {
  quarter: number;
  year: number;
  inflation: number;
  unemployment: number;
  fundsRate: number;
  history: HistoryPoint[];
  isGameOver: boolean;
  message: string;
  activeEvent: GameEvent | null;
  activePolicyAlert: string[] | null; // Bullet points of the FOMC policy statement
  lastExecutedFundsRate: number;
  lastExecutedOMO: number;
  lastExecutedIOR: number;
  omoBalance: number; // in trillions
  interestOnReserves: number; // percentage
  termQuarters: number; // 1 to 16
  termNumber: number;
  termPerformance: number; // cumulative distance from targets
  termMetrics: TermMetrics;
  isReelectionPending: boolean;
  reelectionStatus?: 'passed' | 'failed';
  isProcessing: boolean;
}

export interface HistoryPoint {
  date: string;
  inflation: number;
  unemployment: number;
  fundsRate: number;
  event?: string;
}

const TARGET_INFLATION = 2.0;
const TARGET_UNEMPLOYMENT = 4.0;

const SURPRISE_EVENTS: GameEvent[] = [
  {
    title: "Global Pandemic",
    description: "A new virus outbreak has forced lockdowns. Spending has plummeted while supply chains are broken.",
    infImpact: 2.5,
    unempImpact: 3.0,
    type: 'shock'
  },
  {
    title: "Oil Supply Shock",
    description: "Geopolitical tensions have caused oil prices to double overnight. Energy costs are soaring.",
    infImpact: 3.5,
    unempImpact: 0.5,
    type: 'shock'
  },
  {
    title: "Tech Breakthrough",
    description: "A major AI breakthrough has significantly boosted national productivity.",
    infImpact: -1.5,
    unempImpact: -1.0,
    type: 'boon'
  },
  {
    title: "Financial Crisis",
    description: "A major bank failure has caused a credit crunch. Businesses are struggling to get loans.",
    infImpact: -2.0,
    unempImpact: 4.0,
    type: 'shock'
  },
  {
    title: "Trade War",
    description: "New tariffs on major imports have increased the cost of consumer goods.",
    infImpact: 1.5,
    unempImpact: 0.5,
    type: 'shock'
  },
  {
    title: "Hyper-Automation Wave",
    description: "Rapid adoption of AI and robotics has slashed production costs but displaced millions of service workers.",
    infImpact: -2.2,
    unempImpact: 3.8,
    type: 'shock'
  },
  {
    title: "Green Energy Revolution",
    description: "Breakthroughs in fusion energy have made electricity nearly free, triggering a massive industrial expansion.",
    infImpact: -2.0,
    unempImpact: -1.5,
    type: 'boon'
  },
  {
    title: "Geopolitical Escalation",
    description: "Regional conflicts have led to widespread sanctions and a breakdown in international cooperation.",
    infImpact: 3.2,
    unempImpact: 1.2,
    type: 'shock'
  }
];

export const EVENT_STORIES: { [key: string]: { active: { title: string, description: string }[], lingering: { title: string, description: string }[] } } = {
  "Global Pandemic": {
    active: [
      {
        title: "Global Pandemic Declared",
        description: "A new virus outbreak has forced lockdowns. Spending has plummeted while supply chains are broken."
      },
      {
        title: "Pandemic Lockdown Extended",
        description: "As second-wave infection numbers rise, containment restrictions persist. Businesses adapt to remote-first models amid immense uncertainty."
      },
      {
        title: "Supply Bottlenecks Peak",
        description: "Global shipping channels remain severely congested. Raw material shortages bite as manufacturing runs at half capacity."
      },
      {
        title: "Vaccination Campaign Commences",
        description: "Mass immunizations start globally. However, distribution backlogs mean economic operations remain highly localized and guarded."
      }
    ],
    lingering: [
      {
        title: "Post-Pandemic Re-Opening Boom",
        description: "All lockdown orders are lifted nationwide. A flood of pent-up demand returns to service sectors, but structural scars remain."
      },
      {
        title: "Lingering Pandemic Aftershocks",
        description: "Economists study the permanent shifts in hybrid-work productivity while global ocean freight rates finally fall to base rates."
      }
    ]
  },
  "Oil Supply Shock": {
    active: [
      {
        title: "Oil Supply Shock Triggered",
        description: "Geopolitical tensions have caused oil prices to double overnight. Energy costs are soaring."
      },
      {
        title: "Strategic Energy Reserves Opened",
        description: "The administration authorizes releasing millions of barrels of crude reserves, but global crude supply remains extremely tight."
      },
      {
        title: "Industrial Fuel Bills Soar",
        description: "Logistics, aviation, and thermal manufacturing sectors absorb massive surcharges. Voluntary conservation efforts begin to trend."
      }
    ],
    lingering: [
      {
        title: "Crude Commodity Price Stability",
        description: "Brent and WTI crude settle as trading corridors adapt to newer regional networks, alleviating broad logistics pain points."
      }
    ]
  },
  "Tech Breakthrough": {
    active: [
      {
        title: "Tech Breakthrough",
        description: "A major AI breakthrough has significantly boosted national productivity."
      },
      {
        title: "Commercial AI Adoption Wave",
        description: "Companies across all sectors accelerate software automation deployments, driving up high-tech capital expenditures."
      }
    ],
    lingering: [
      {
        title: "Productivity Gains Solidified",
        description: "New Federal Reserve data confirms that the AI efficiency dividend is suppressing structural inflation without increasing layoffs."
      }
    ]
  },
  "Financial Crisis": {
    active: [
      {
        title: "Financial Crisis Declared",
        description: "A major bank failure has caused a credit crunch. Businesses are struggling to get loans."
      },
      {
        title: "Liquidity Backstop Operations",
        description: "Central banks launch Emergency Credit programs to buffer deposits. While interbank lending resumes, commercial lending guidelines remain frozen."
      },
      {
        title: "Debt Fire-Sales & Retrenchment",
        description: "Overleveraged middle-market firms face rigorous refinancing hurdles. Credit spreads widen as buyers bid defensively."
      },
      {
        title: "Banking Solvency Stabilization",
        description: "Capital restructuring terms resolve outstanding bad debt. Fears of systemic cascade panic fully dissipate."
      }
    ],
    lingering: [
      {
        title: "Post-Crisis Regulatory Drafts",
        description: "Congressional leaders draft strict tier-1 equity baseline hikes to cushion future commercial defaults."
      },
      {
        title: "SME Credit Access Slowly Unlocks",
        description: "Commercial lenders cautiously lower interest spreads, initiating a slow but visible rebound in capital investments."
      }
    ]
  },
  "Trade War": {
    active: [
      {
        title: "Trade War Tariffs Imposed",
        description: "New tariffs on major imports have increased the cost of consumer goods."
      },
      {
        title: "Sweeping Retail Counter-Tariffs",
        description: "Major trading partners impose retaliatory levies on agricultural and high-tech domestic exports, squeezing corporate profit outlooks."
      },
      {
        title: "Supply Chain Re-Routing",
        description: "Multi-nationals accelerate the costly relocation of critical assembly plants out of tariff-heavy jurisdictions."
      },
      {
        title: "Bilateral Tariff Stalemate",
        description: "Import tariffs settle into the baseline cost index. Retail pricing peaks but begins holding steady as alternatives emerge."
      }
    ],
    lingering: [
      {
        title: "Bilateral Trade Negotiations Re-open",
        description: "Trade block diplomats meet for bilateral mitigation talks, raising markets' hopes for structural tariff reductions."
      }
    ]
  },
  "Hyper-Automation Wave": {
    active: [
      {
        title: "Hyper-Automation Wave",
        description: "Rapid adoption of AI and robotics has slashed production costs but displaced millions of service workers."
      },
      {
        title: "Automation Displacements Peak",
        description: "Unemployment figures tick upward as administrative, design, and customer-service divisions undergo deep labor restructuring."
      },
      {
        title: "Corporate Margin Surges",
        description: "Sectors deploying robotic systems see profit margins swell to historic heights, triggering sharp capital re-allocations."
      }
    ],
    lingering: [
      {
        title: "Federal Retraining Initiative",
        description: "National retraining grants facilitate the transition of displaced service workers into technical oversight and logistical fields."
      },
      {
        title: "Low-Cost Automated Services Stable",
        description: "Productivity gains solidify. Prices of high-automation service sectors establish a permanent, low-cost baseline."
      }
    ]
  },
  "Green Energy Revolution": {
    active: [
      {
        title: "Green Energy Revolution",
        description: "Breakthroughs in fusion energy have made electricity nearly free, triggering a massive industrial expansion."
      },
      {
        title: "Heavy Energy Re-Tooling Boom",
        description: "High-intensity smelting, manufacturing, and transport grids rush to migrate to primary electrification networks."
      },
      {
        title: "Smart Fusion Grids Active",
        description: "The first large-scale commercial fusion reactors feed baseline power grids, bypassing older fossil-fuel peaking plants."
      }
    ],
    lingering: [
      {
        title: "Energy Deflation Era",
        description: "Energy-related inflation factors drift toward zero, providing a powerful, permanent cushion for general corporate overhead."
      }
    ]
  },
  "Geopolitical Escalation": {
    active: [
      {
        title: "Geopolitical Escalation (War)",
        description: "Regional conflicts have led to widespread sanctions and a breakdown in international cooperation."
      },
      {
        title: "Maritime Shipping Channels Disrupted",
        description: "Deep sea lanes are declared risk-zones. Global freight insurance rates surge tenfold, choking core raw-material flows."
      },
      {
        title: "Sanction Barriers Tightened",
        description: "Embargoes on crucial rare gases and metals force domestic manufacturers to purchase expensive domestic substitutes."
      },
      {
        title: "War of Economic Sanctions Peaks",
        description: "Tensions create deep structural cracks in continental trade loops as regional defense investments spike widely."
      },
      {
        title: "Diplomatic Breakouts & De-escalation",
        description: "International envoys host preliminary talks, establishing broad ocean-corridor safety guarantees to normalize ship transits."
      }
    ],
    lingering: [
      {
        title: "Geostrategic Posturing Relents",
        description: "Active conflict zones freeze under truce parameters, allowing core shipping lines to resume cargo runs."
      },
      {
        title: "Supply-Chain Re-normalization",
        description: "Primary marine insurance returns to standard bands, closing a long chapter of geostrategic trade headwinds."
      }
    ]
  }
};

export const getImpactMultiplier = (event: GameEvent): number => {
  if (event.phase === 'lingering') return 0.0;
  const elapsed = event.elapsed || 1;
  const duration = event.duration || 1;
  if (duration <= 1) return 1.0;
  return Math.max(0.15, 1.0 - (elapsed - 1) * (0.85 / (duration - 1))); // decays down to 0.15
};

export const initializeEventLifecycle = (event: GameEvent): GameEvent => {
  let duration = 3;
  let lingeringDuration = 1;
  
  if (event.title.includes("Pandemic")) {
    duration = 4;
    lingeringDuration = 2;
  } else if (event.title.includes("Financial")) {
    duration = 4;
    lingeringDuration = 2;
  } else if (event.title.includes("Geopolitical")) {
    duration = 5;
    lingeringDuration = 2;
  } else if (event.title.includes("Oil")) {
    duration = 3;
    lingeringDuration = 1;
  } else if (event.title.includes("Trade")) {
    duration = 4;
    lingeringDuration = 1;
  } else if (event.title.includes("Tech")) {
    duration = 2;
    lingeringDuration = 1;
  } else if (event.title.includes("Green")) {
    duration = 3;
    lingeringDuration = 1;
  } else if (event.title.includes("Automation")) {
    duration = 3;
    lingeringDuration = 2;
  }
  
  return {
    ...event,
    duration,
    elapsed: 1,
    phase: 'active',
    lingeringElapsed: 0,
    lingeringDuration,
    originalDescription: event.description
  };
};

export const updateEventStory = (event: GameEvent): GameEvent => {
  if (!event || !event.phase) return event;
  
  const lookupKey = Object.keys(EVENT_STORIES).find(k => 
    event.title.includes(k) || 
    (event.originalDescription && event.originalDescription.includes(k))
  );
  if (!lookupKey) return event;
  
  const story = EVENT_STORIES[lookupKey];
  if (!story) return event;
  
  let newTitle = event.title;
  let newDescription = event.description;
  
  if (event.phase === 'active') {
    const list = story.active;
    const index = Math.min((event.elapsed || 1) - 1, list.length - 1);
    const step = list[index];
    if (step) {
      newTitle = step.title;
      newDescription = step.description;
    }
  } else if (event.phase === 'lingering') {
    const list = story.lingering;
    const index = Math.min((event.lingeringElapsed || 1) - 1, list.length - 1);
    const step = list[index];
    if (step) {
      newTitle = step.title;
      newDescription = step.description;
    }
  }
  
  return {
    ...event,
    title: newTitle,
    description: newDescription
  };
};

const roundToHundredth = (num: number) => Math.round(num * 100) / 100;
const roundToTenth = (num: number) => Math.round(num * 10) / 10;
const roundToQuarter = (num: number) => Math.round(num * 4) / 4;

const calculateIdealPolicy = (inflation: number, unemployment: number) => {
  const inflationGap = inflation - TARGET_INFLATION;
  const unemploymentGap = unemployment - TARGET_UNEMPLOYMENT;
  
  // Aggressive Taylor Rule: Target = Neutral + 2.0 * InfGap - 1.5 * UnempGap
  let idealRate = 4.0 + (inflationGap * 2.0) - (unemploymentGap * 1.5);
  
  // OMO Balance: Neutral is 7.5T.
  let idealOMO = 7.5 - (inflationGap * 0.8) + (unemploymentGap * 1.2);
  
  // IOR: Follows the funds rate.
  let idealIOR = idealRate;

  return {
    fundsRate: Math.max(0, Math.min(10, roundToQuarter(idealRate))),
    omoBalance: Math.max(4, Math.min(12, roundToHundredth(idealOMO))),
    interestOnReserves: Math.max(0, Math.min(10, roundToQuarter(idealIOR))),
  };
};

export const MONTHS = [
  "Jan (Q1)", "Feb", "Mar",
  "Apr (Q2)", "May", "Jun",
  "Jul (Q3)", "Aug", "Sep",
  "Oct (Q4)", "Nov", "Dec"
];

function generateInitialHistory(startInf: number, startUnemp: number): HistoryPoint[] {
  const history: HistoryPoint[] = [];
  let currentInf = 2.0 + (Math.random() - 0.5) * 1.5;
  let currentUnemp = 4.0 + (Math.random() - 0.5) * 1.0;
  const baseYear = 2020;
  
  // Generate 24 actual data points (2 years of monthly data: 2020-2021)
  for (let i = 0; i < 24; i++) {
    const monthIdx = i % 12;
    const year = baseYear + Math.floor(i / 12);
    
    // Monthly sway based on user request:
    // Inflation: ~0.1% to 0.2% per month
    // Unemployment: ~0.1 to 0.2 percentage points per month
    currentInf += (Math.random() - 0.5) * 0.4; // Range of 0.4 gives +/- 0.2 max change
    currentUnemp += (Math.random() - 0.5) * 0.3; // Range of 0.3 gives +/- 0.15 max change
    
    history.push({
      date: `${MONTHS[monthIdx]} ${year}`,
      unemployment: roundToHundredth(Math.max(2.0, currentUnemp)),
      inflation: roundToHundredth(Math.max(0.1, currentInf)),
      fundsRate: roundToHundredth(5.00 + (Math.random() * 0.5))
    });
  }

  // Add the starting Q1 2022 points (Jan, Feb, Mar)
  const lastPoint = history[history.length - 1];
  for (let i = 0; i < 3; i++) {
    const progress = (i + 1) / 3;
    history.push({
      date: `${MONTHS[i]} 2022`,
      unemployment: roundToHundredth(lastPoint.unemployment + (startUnemp - lastPoint.unemployment) * progress),
      inflation: roundToHundredth(lastPoint.inflation + (startInf - lastPoint.inflation) * progress),
      fundsRate: 5.00
    });
  }

  // Pad to 40 total slots
  const lastActual = history[history.length - 1];
  const parts = lastActual.date.split(' ');
  const lastMonthName = parts[0];
  const lastYearVal = parseInt(parts[parts.length - 1]);
  let lastMonthIdx = MONTHS.findIndex(m => m.startsWith(lastMonthName));

  for (let i = 1; i <= 40 - history.length; i++) {
    let nextMonthIdx = (lastMonthIdx + i) % 12;
    let nextYearVal = lastYearVal + Math.floor((lastMonthIdx + i) / 12);
    
    history.push({
      date: `${MONTHS[nextMonthIdx]} ${nextYearVal}`,
      inflation: undefined as any,
      unemployment: undefined as any,
      fundsRate: undefined as any
    });
  }

  return history;
}

const getInitialState = (): GameState => {
  const startInf = 2.5 + (Math.random() - 0.5) * 1.0;
  const startUnemp = 4.5 + (Math.random() - 0.5) * 1.0;
  const history = generateInitialHistory(startInf, startUnemp);
  
  return {
    quarter: 1,
    year: 2022,
    inflation: roundToHundredth(startInf),
    unemployment: roundToHundredth(startUnemp),
    fundsRate: 5.00,
    history: history,
    isGameOver: false,
    message: "Welcome, Mr. Chairman. Your first term begins in January 2022. The President and Senate will review your performance in 4 years.",
    activeEvent: null,
    activePolicyAlert: null,
    lastExecutedFundsRate: 5.00,
    lastExecutedOMO: 8.00,
    lastExecutedIOR: 5.00,
    omoBalance: 8.00,
    interestOnReserves: 5.00,
    termQuarters: 1,
    termNumber: 1,
    termPerformance: 0,
    termMetrics: {
      avgInflation: startInf,
      avgUnemployment: startUnemp,
      maxInflation: startInf,
      maxUnemployment: startUnemp,
      minInflation: startInf,
      minUnemployment: startUnemp,
      stabilityScore: 100
    },
    isReelectionPending: false,
    isProcessing: false,
  };
};

export function useFedGame() {
  const [state, setState] = useState<GameState>(getInitialState());

  const nextQuarter = useCallback((isAutopilot = false) => {
    setState(prev => {
      if (prev.isGameOver || prev.isProcessing) return prev;
      
      const policyAlerts: string[] = [];
      
      // Calculate FFR Change Alert
      const ffrDiff = prev.fundsRate - prev.lastExecutedFundsRate;
      if (ffrDiff > 0) {
        const bps = Math.round(ffrDiff * 100);
        policyAlerts.push(`FOMC raises Federal Funds Rate by +${bps} bps to ${prev.fundsRate.toFixed(2)}% to curb inflationary pressure.`);
      } else if (ffrDiff < 0) {
        const bps = Math.round(Math.abs(ffrDiff) * 100);
        policyAlerts.push(`FOMC cuts Federal Funds Rate by -${bps} bps to ${prev.fundsRate.toFixed(2)}% to stimulate consumer and business spending.`);
      } else {
        policyAlerts.push(`FOMC maintains the benchmark Federal Funds Rate target steady at ${prev.fundsRate.toFixed(2)}%.`);
      }

      // Calculate IOR Change Alert
      const iorDiff = prev.interestOnReserves - prev.lastExecutedIOR;
      if (iorDiff > 0) {
        policyAlerts.push(`FED increases Interest on Reserves (IOR) to ${prev.interestOnReserves.toFixed(2)}% to discourage excessive commercial lending.`);
      } else if (iorDiff < 0) {
        policyAlerts.push(`FED lowers Interest on Reserves (IOR) to ${prev.interestOnReserves.toFixed(2)}% to incentivize commercial bank lending.`);
      } else {
        policyAlerts.push(`Interest on Reserves (IOR) remains unchanged at ${prev.interestOnReserves.toFixed(2)}%.`);
      }

      // Calculate OMO Change Alert
      const omoDiff = prev.omoBalance - prev.lastExecutedOMO;
      if (omoDiff > 0) {
        const diff = Math.abs(omoDiff).toFixed(2);
        policyAlerts.push(`FED conducts Quantitative Easing, purchasing $${diff}T of Treasuries to inject systemic liquidity.`);
      } else if (omoDiff < 0) {
        const diff = Math.abs(omoDiff).toFixed(2);
        policyAlerts.push(`FED conducts Quantitative Tightening, shrinking its balance sheet holdings by $${diff}T.`);
      } else {
        policyAlerts.push(`Open Market Operations are steady with holdings maintained at $${prev.omoBalance.toFixed(2)}T.`);
      }

      const currentEvent = prev.activeEvent;

      // Economic Simulation Logic
      const tonedDownOmoImpact = (prev.omoBalance - 7.5) * 0.02; // Reduced from 0.05
      const tonedDownIorImpact = (prev.interestOnReserves - 4.0) * -0.02; // Reduced from -0.06
      
      let inflationChange = 
        (prev.fundsRate - 4.0) * -0.05 + // Toned down from -0.15 (1/3rd of the original impact)
        tonedDownOmoImpact + 
        tonedDownIorImpact + 
        (Math.random() - 0.5) * 0.10;   // Slightly reduced random noise for stability

      if (currentEvent) {
        const mult = getImpactMultiplier(currentEvent);
        inflationChange += currentEvent.infImpact * mult;
      } else {
        inflationChange = Math.max(-0.8, Math.min(0.8, inflationChange));
      }
      const newInflation = Math.max(0.1, prev.inflation + inflationChange);

      const omoUnempImpact = (prev.omoBalance - 7.5) * -0.08;
      const iorUnempImpact = (prev.interestOnReserves - 4.0) * 0.09;

      let unemploymentChange = (prev.fundsRate - 4.0) * 0.18 + omoUnempImpact + iorUnempImpact + (Math.random() - 0.5) * 0.15;
      if (currentEvent) {
        const mult = getImpactMultiplier(currentEvent);
        unemploymentChange += currentEvent.unempImpact * mult;
      } else {
        unemploymentChange = Math.max(-0.6, Math.min(0.6, unemploymentChange));
      }
      const newUnemployment = Math.max(2.0, prev.unemployment + unemploymentChange);

      let newQuarter = prev.quarter + 1;
      let newYear = prev.year;
      if (newQuarter > 4) {
        newQuarter = 1;
        newYear += 1;
      }

      // Update the event lifecycle
      let updatedActiveEvent: GameEvent | null = null;
      if (prev.activeEvent) {
        const curr = prev.activeEvent;
        // If it does not have lifecycle properties, initialize them
        const activeLifecycle = curr.phase ? curr : initializeEventLifecycle(curr);
        
        if (activeLifecycle.phase === 'active') {
          const nextElapsed = (activeLifecycle.elapsed || 1) + 1;
          const totalDuration = activeLifecycle.duration || 1;
          if (nextElapsed > totalDuration) {
            updatedActiveEvent = {
              ...activeLifecycle,
              phase: 'lingering',
              lingeringElapsed: 1,
              elapsed: nextElapsed
            };
          } else {
            updatedActiveEvent = {
              ...activeLifecycle,
              elapsed: nextElapsed
            };
          }
        } else if (activeLifecycle.phase === 'lingering') {
          const nextLingeringElapsed = (activeLifecycle.lingeringElapsed || 1) + 1;
          const totalLingeringDuration = activeLifecycle.lingeringDuration || 1;
          if (nextLingeringElapsed > totalLingeringDuration) {
            updatedActiveEvent = null;
          } else {
            updatedActiveEvent = {
              ...activeLifecycle,
              lingeringElapsed: nextLingeringElapsed
            };
          }
        }
        
        if (updatedActiveEvent) {
          updatedActiveEvent = updateEventStory(updatedActiveEvent);
        }
      }
      
      // If there is no ongoing event and we are entering Q1, trigger a new event
      if (!updatedActiveEvent && newQuarter === 1) {
        const baseEvent = SURPRISE_EVENTS[Math.floor(Math.random() * SURPRISE_EVENTS.length)];
        updatedActiveEvent = initializeEventLifecycle(baseEvent);
        updatedActiveEvent = updateEventStory(updatedActiveEvent);
      }

      const actualHistory = prev.history.filter(h => h.inflation !== undefined);
      const lastPoint = actualHistory[actualHistory.length - 1];
      const newPoints: HistoryPoint[] = [];
      const startMonthIdx = (newQuarter - 1) * 3;
      
      for (let i = 0; i < 3; i++) {
        const monthIdx = startMonthIdx + i;
        const monthName = MONTHS[monthIdx];
        const progress = (i + 1) / 3;
        const unempNoise = i === 2 ? 0 : (Math.random() - 0.5) * 0.15; 
        const infNoise = i === 2 ? 0 : (Math.random() - 0.5) * 0.15;

        newPoints.push({
          date: `${monthName} ${newYear}`,
          unemployment: roundToHundredth(lastPoint.unemployment + (newUnemployment - lastPoint.unemployment) * progress + unempNoise),
          inflation: roundToHundredth(lastPoint.inflation + (newInflation - lastPoint.inflation) * progress + infNoise),
          fundsRate: roundToHundredth(prev.fundsRate),
          event: (i === 0 && updatedActiveEvent && updatedActiveEvent.elapsed === 1 && updatedActiveEvent.phase === 'active') ? updatedActiveEvent.title : undefined
         });
      }

      // Store current parameters for the timeouts closure
      const prevFundsRate = prev.fundsRate;
      const prevOmoBalance = prev.omoBalance;
      const prevInterestOnReserves = prev.interestOnReserves;

      // Instead of updating immediately, we use intervals
      // We'll queue the updates
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          setState(s => {
            const currentActual = s.history.filter(h => h.inflation !== undefined);
            const updatedActual = [...currentActual, newPoints[i]];
            
            let newHistory: HistoryPoint[];
            if (updatedActual.length >= 40) {
              newHistory = updatedActual.slice(-40);
            } else {
              newHistory = [...updatedActual];
              const lastActual = updatedActual[updatedActual.length - 1];
              const parts = lastActual.date.split(' ');
              const lastMonthName = parts[0];
              const lastYearVal = parseInt(parts[parts.length - 1]);
              let lastMonthIdx = MONTHS.findIndex(m => m.startsWith(lastMonthName));

              for (let k = 1; k <= 40 - updatedActual.length; k++) {
                let nextMonthIdx = (lastMonthIdx + k) % 12;
                let nextYearVal = lastYearVal + Math.floor((lastMonthIdx + k) / 12);
                
                newHistory.push({
                  date: `${MONTHS[nextMonthIdx]} ${nextYearVal}`,
                  inflation: undefined as any,
                  unemployment: undefined as any,
                  fundsRate: undefined as any
                });
              }
            }

            return { ...s, history: newHistory };
          });
        }, (i + 1) * 1600); // 1.6s offset
      }

      // Final update after 5.0 seconds (matching the last month addition)
      setTimeout(() => {
        setState(s => {
          // Re-calculate performance and reelection logic in the final state
          const infDiff = Math.abs(newInflation - TARGET_INFLATION);
          const unempDiff = Math.abs(newUnemployment - TARGET_UNEMPLOYMENT);
          const currentPerformance = infDiff + unempDiff;
          const newTermPerformance = s.termPerformance + currentPerformance;
          const newTermQuarters = s.termQuarters + 1;

          const newTermMetrics: TermMetrics = {
            avgInflation: (s.termMetrics.avgInflation * (newTermQuarters - 1) + newInflation) / newTermQuarters,
            avgUnemployment: (s.termMetrics.avgUnemployment * (newTermQuarters - 1) + newUnemployment) / newTermQuarters,
            maxInflation: Math.max(s.termMetrics.maxInflation, newInflation),
            maxUnemployment: Math.max(s.termMetrics.maxUnemployment, newUnemployment),
            minInflation: Math.min(s.termMetrics.minInflation, newInflation),
            minUnemployment: Math.min(s.termMetrics.minUnemployment, newUnemployment),
            stabilityScore: Math.max(0, 100 - (newTermPerformance / newTermQuarters) * 20)
          };

          let isGameOver = false;
          let isReelectionPending = false;
          let reelectionStatus: 'passed' | 'failed' | undefined = undefined;
          let message = "";
          let finalTermNumber = s.termNumber;
          let finalTermQuarters = newTermQuarters;
          let finalTermPerformance = newTermPerformance;
          let finalTermMetrics = newTermMetrics;

          if (newTermQuarters > 16) {
            const avgPerformance = newTermPerformance / 16;
            if (isAutopilot || avgPerformance < 2.5) {
              isReelectionPending = true;
              reelectionStatus = 'passed';
              finalTermNumber = s.termNumber + 1;
              finalTermQuarters = 1;
              finalTermPerformance = 0;
              finalTermMetrics = {
                avgInflation: newInflation,
                avgUnemployment: newUnemployment,
                maxInflation: newInflation,
                maxUnemployment: newUnemployment,
                minInflation: newInflation,
                minUnemployment: newUnemployment,
                stabilityScore: 100
              };
              message = `Term ${s.termNumber} Complete. Your stability score was ${newTermMetrics.stabilityScore.toFixed(0)}%. The President and Senate have re-appointed you for another 4-year term!`;
            } else {
              isGameOver = true;
              reelectionStatus = 'failed';
              message = `Term ${s.termNumber} Complete. Your stability score was ${newTermMetrics.stabilityScore.toFixed(0)}%. The economy is in poor shape. The Senate has refused to confirm your re-appointment. You are dismissed.`;
            }
          } else {
            if (infDiff < 0.5 && unempDiff < 0.5) {
              message = "Excellent stability. The markets are calm.";
            } else if (newInflation > 4.0) {
              message = "Inflation is dangerously high! The public is suffering.";
            } else if (newUnemployment > 7.0) {
              message = "Unemployment is reaching critical levels. Action is needed.";
            } else if (newInflation > 3.0) {
              message = "Inflation is heating up. Consider raising rates.";
            } else if (newUnemployment > 5.5) {
              message = "Unemployment is rising. The economy needs a boost.";
            } else {
              message = "Steady as she goes.";
            }
          }

          return {
            ...s,
            isProcessing: false,
            quarter: newQuarter,
            year: newYear,
            inflation: roundToHundredth(newInflation),
            unemployment: roundToHundredth(newUnemployment),
            message,
            activeEvent: updatedActiveEvent,
            lastExecutedFundsRate: prevFundsRate,
            lastExecutedOMO: prevOmoBalance,
            lastExecutedIOR: prevInterestOnReserves,
            termQuarters: finalTermQuarters,
            termNumber: finalTermNumber,
            termPerformance: finalTermPerformance,
            termMetrics: finalTermMetrics,
            isReelectionPending,
            reelectionStatus,
            isGameOver
          };
        });
      }, 5000);

      // Start processing and show alerts immediately
      return { 
        ...prev, 
        isProcessing: true,
        isReelectionPending: false,
        activePolicyAlert: policyAlerts 
      };
    });
  }, []);

  const setRate = (rate: number) => {
    setState(prev => ({ ...prev, fundsRate: roundToQuarter(rate) }));
  };

  const setOMO = (balance: number) => {
    setState(prev => ({ ...prev, omoBalance: balance }));
  };

  const setIOR = (rate: number) => {
    setState(prev => ({ ...prev, interestOnReserves: roundToQuarter(rate) }));
  };

  const clearEvent = () => {
    setState(prev => ({ ...prev, activeEvent: null }));
  };

  const resetGame = () => {
    setState(getInitialState());
  };

  const getIdealPolicy = useCallback(() => {
    return calculateIdealPolicy(state.inflation, state.unemployment);
  }, [state.inflation, state.unemployment]);

  return { state, nextQuarter, setRate, setOMO, setIOR, clearEvent, resetGame, getIdealPolicy };
}
