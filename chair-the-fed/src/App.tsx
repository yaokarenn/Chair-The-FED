import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  Info,
  ChevronUp,
  ChevronDown,
  DollarSign,
  Users,
  Activity,
  Zap,
  ShieldAlert,
  Repeat,
  Building2,
  Flame,
  Sun,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  Database,
  Layers,
  Music,
  Tv,
  X,
  Volume2,
  VolumeX,
  Cpu
} from 'lucide-react';
import { useFedGame, MONTHS, getImpactMultiplier } from './gameLogic';
import { audioEngine } from './audioEngine';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Subtle Sound Effects Utility using Web Audio API
const playSound = (frequency: number, type: OscillatorType = 'sine', duration: number = 0.1, volume: number = 0.1) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
    
    // Close context after sound finished to free resources
    setTimeout(() => {
      audioContext.close();
    }, duration * 1000 + 100);
  } catch (e) {
    // Fail silently if audio is blocked or restricted
  }
};

const playTick = () => playSound(800, 'sine', 0.04, 0.02);
const playAdvance = () => playSound(440, 'triangle', 0.12, 0.08);

function CustomXAxisTick(props: any) {
  const { x, y, payload } = props;

  // 1. Filter out placeholder points
  if (!payload.value || payload.value.startsWith('P-')) return null;

  // 2. Clean the string (handle actual data, "FUTURE:", and "PAST:" data)
  const isFuture = payload.value.startsWith('FUTURE:');
  const isPast = payload.value.startsWith('PAST:');
  const rawValue = payload.value.replace('FUTURE:', '').replace('PAST:', '');
  const parts = rawValue.split(' '); // Expected: ["Jan", "(Q1)", "2022"]
  
  // We need to find the Year (last part) and the Month/Quarter info
  const year = parts[parts.length - 1];
  const monthInfo = parts.slice(0, parts.length - 1).join(' '); // e.g., "Jan (Q1)"

  // 3. Define the strict quarterly months we want to show
  const monthMap: Record<string, string> = {
    "Jan (Q1)": "Q1 (Jan)",
    "Apr (Q2)": "Q2 (Apr)",
    "Jul (Q3)": "Q3 (Jul)",
    "Oct (Q4)": "Q4 (Oct)"
  };

  if (!monthMap[monthInfo]) return null;

  const formattedLabel = monthMap[monthInfo];

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="#000000"
        style={{ 
          fontSize: '10px', 
          fontWeight: (isFuture || isPast) ? 500 : 700, 
          opacity: (isFuture || isPast) ? 0.3 : 0.6 
        }}
      >
        {/* Line 1: Quarter and Month */}
        <tspan x="0" dy="1.2em">{formattedLabel}</tspan>
        {/* Line 2: Year (Centered below) */}
        <tspan x="0" dy="1.4em">{year}</tspan>
      </text>
    </g>
  );
}

const PeriodBubble = (props: any) => {
  const { viewBox, value, fill } = props;
  if (!viewBox) return null;
  const { x, y, height } = viewBox;
  
  // Center vertically in the chart area
  const centerY = y + height / 2;
  
  return (
    <g transform={`translate(${x},${centerY})`}>
      <defs>
        <filter id="bubbleShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
          <feOffset dx="0" dy="1" result="offsetblur" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Masking rect to hide lines behind */}
      <rect
        x={-50}
        y={-16}
        width={100}
        height={32}
        rx={16}
        fill="white"
        filter="url(#bubbleShadow)"
      />
      {/* Tinted background rect */}
      <rect
        x={-50}
        y={-16}
        width={100}
        height={32}
        rx={16}
        fill={fill}
        fillOpacity={0.1}
        stroke={fill}
        strokeWidth={2}
      />
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="middle"
        fill={fill}
        style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {value}
      </text>
    </g>
  );
};

export default function App() {
  const { state, nextQuarter, setRate, setOMO, setIOR, clearEvent, resetGame, getIdealPolicy } = useFedGame();
  const { isProcessing } = state;
  const [tourStep, setTourStep] = React.useState<number | null>(null);
  const [hasStarted, setHasStarted] = React.useState(false);
  const [showPeriods, setShowPeriods] = React.useState(true);
  const [showAdvisor, setShowAdvisor] = React.useState(false);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [musicVolume, setMusicVolume] = React.useState(0);
  const [isAutopilotEnabled, setIsAutopilotEnabled] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutopilotEnabled && !isProcessing && !state.isGameOver && hasStarted) {
      if (state.isReelectionPending) {
        timer = setTimeout(() => {
          handleNextQuarter();
        }, 2000); // 2 second delay on reelection screen to let user read the message
      } else {
        timer = setTimeout(() => {
          const ideal = getIdealPolicy();
          setRate(ideal.fundsRate);
          setOMO(ideal.omoBalance);
          setIOR(ideal.interestOnReserves);
          
          nextQuarter(true);
          playAdvance();
        }, 1500); // 1.5 second delay
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAutopilotEnabled, isProcessing, state.isGameOver, state.isReelectionPending, hasStarted, getIdealPolicy, setRate, setOMO, setIOR, nextQuarter]);

  React.useEffect(() => {
    if (state.isGameOver && isAutopilotEnabled) {
      setIsAutopilotEnabled(false);
    }
  }, [state.isGameOver, isAutopilotEnabled]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMusicVolume(val);
    audioEngine.setVolume(val / 100);
  };

  const toggleMute = () => {
    if (musicVolume > 0) {
      setMusicVolume(0);
      audioEngine.setVolume(0);
    } else {
      setMusicVolume(40);
      audioEngine.setVolume(0.40);
    }
  };

  const adjustRate = (delta: number) => {
    const newRate = Math.max(0, Math.min(10, state.fundsRate + delta));
    setRate(Math.round(newRate * 100) / 100);
    playTick();
  };

  const adjustOMO = (delta: number) => {
    const newBalance = Math.max(4, Math.min(12, state.omoBalance + delta));
    setOMO(Math.round(newBalance * 100) / 100);
    playTick();
  };

  const adjustIOR = (delta: number) => {
    const newRate = Math.max(0, Math.min(10, state.interestOnReserves + delta));
    setIOR(Math.round(newRate * 100) / 100);
    playTick();
  };

  const handleNextQuarter = () => {
    nextQuarter(isAutopilotEnabled);
    playAdvance();
  };

  const applyIdealPolicy = () => {
    const ideal = getIdealPolicy();
    setRate(ideal.fundsRate);
    setOMO(ideal.omoBalance);
    setIOR(ideal.interestOnReserves);
  };

  const getEconomicState = (unemp: number, inf: number) => {
    if (inf > 5.0 && unemp > 7.0) return { label: "stagflation", color: "#9333ea", bg: "bg-purple-100", icon: <AlertCircle size={14} /> };
    if (inf > 4.0 && unemp < 4.0) return { label: "overheating", color: "#ef4444", bg: "bg-red-100", icon: <Flame size={14} /> };
    if (inf < 2.0 && unemp > 6.5) return { label: "recession", color: "#2563eb", bg: "bg-blue-100", icon: <TrendingDown size={14} /> };
    if (inf >= 1.5 && inf <= 2.5 && unemp >= 4.0 && unemp <= 5.0) return { label: "goldilocks", color: "#f59e0b", bg: "bg-amber-100", icon: <TrendingUp size={14} /> };
    return null;
  };

  const getAdvisorTip = (unemp: number, inf: number) => {
    // Stagflation: High Inf (>5%) and High Unemp (>7%)
    if (inf > 5.0 && unemp > 7.0) {
      return {
        title: "Stagflation Alert",
        tip: "You're facing the 'worst of both worlds'. Prioritize stabilizing inflation first to regain credibility, but be wary of further job losses.",
        rationale: `With inflation at ${inf.toFixed(1)}% and unemployment at ${unemp.toFixed(1)}%, the economy is suffering from both high prices and low growth.`,
        risk: "High inflation expectations could become entrenched.",
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-100"
      };
    }
    // Overheating: High Inf (>4%) and Low Unemp (<4%)
    if (inf > 4.0 && unemp < 4.0) {
      return {
        title: "Economy Overheating",
        tip: "Demand is outstripping supply. Consider raising the Federal Funds Rate and Quantitative Tightening to cool down the economy.",
        rationale: `Inflation has climbed to ${inf.toFixed(1)}% while unemployment is very low at ${unemp.toFixed(1)}%, suggesting the economy is running beyond its sustainable capacity.`,
        risk: "Persistent high inflation eroding purchasing power.",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-100"
      };
    }
    // Recession: High Unemp (>6.5%) and Low Inf (<2%)
    if (inf < 2.0 && unemp > 6.5) {
      return {
        title: "Recession Warning",
        tip: "Economic activity is shrinking. Lowering interest rates and Quantitative Easing can help stimulate growth and hiring.",
        rationale: `Unemployment has reached ${unemp.toFixed(1)}% and inflation is low at ${inf.toFixed(1)}%, indicating a significant slowdown in economic activity.`,
        risk: "Deflationary spiral and long-term unemployment.",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-100"
      };
    }
    // Goldilocks: Inf ~2% and Unemp ~4.5%
    if (inf >= 1.5 && inf <= 2.5 && unemp >= 4.0 && unemp <= 5.0) {
      return {
        title: "Goldilocks State",
        tip: "The economy is performing ideally. Maintain a neutral policy stance and monitor for any emerging sector-specific bubbles.",
        rationale: `Inflation is stable at ${inf.toFixed(1)}% and unemployment is at a healthy ${unemp.toFixed(1)}%, which aligns perfectly with the dual mandate.`,
        risk: "Complacency during periods of stability.",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-100"
      };
    }
    // Default / Transition
    return {
      title: "Market Transition",
      tip: "The economy is between major states. Small, data-dependent adjustments are recommended to keep metrics moving toward targets.",
      rationale: `Inflation is ${inf.toFixed(1)}% and unemployment is ${unemp.toFixed(1)}%. These levels don't yet trigger a major state alert but require careful monitoring.`,
      risk: "Policy lag might hide the true direction of the trend.",
      color: "text-zinc-600",
      bg: "bg-zinc-50",
      border: "border-zinc-200"
    };
  };

  const advisorTip = getAdvisorTip(state.unemployment, state.inflation);

  const chartData = React.useMemo(() => {
    const actualPoints = state.history.filter(p => p.inflation !== undefined);
    if (actualPoints.length === 0) return [];

    // Anchor to the officially completed state quarter/year to avoid month-to-month jitter/jumping!
    const lastCompletedMonthIdx = (state.quarter - 1) * 3 + 2; // e.g. Q1 is March (index 2)
    const absoluteEndIdx = (state.year - 2022) * 12 + lastCompletedMonthIdx;
    
    // We want 5 quarters (15 months). 
    // Anchor to the start of the current quarter and show 2 quarters before and 2 after (plus current).
    // Specifically, user wants 3 past (including current) and 2 future, giving 5 labels in total.
    const currentQuarterStartAbsIdx = Math.floor(absoluteEndIdx / 3) * 3;
    const graphStartAbsIdx = currentQuarterStartAbsIdx - 6;
    const totalMonthsToShow = 15;

    // Fast lookup for actual data
    const actualMap = new Map();
    actualPoints.forEach(p => {
      const pParts = p.date.split(' ');
      const pMonth = pParts[0];
      const pYear = pParts[pParts.length - 1];
      actualMap.set(`${pMonth}-${pYear}`, p);
    });

    const data = [];
    for (let i = 0; i < totalMonthsToShow; i++) {
        const absIdx = graphStartAbsIdx + i;
        const year = 2022 + Math.floor(absIdx / 12);
        let monthIdx = absIdx % 12;
        if (monthIdx < 0) monthIdx += 12;
        
        const monthNameWithQ = MONTHS[monthIdx];
        const monthBaseName = monthNameWithQ.split(' ')[0];
        const key = `${monthBaseName}-${year}`;
        
        const actual = actualMap.get(key);
        
        if (actual) {
            data.push(actual);
        } else if (absIdx < absoluteEndIdx) {
            data.push({
                date: `PAST:${monthNameWithQ} ${year}`,
                isPlaceholder: true,
                inflation: undefined,
                unemployment: undefined
            });
        } else {
            data.push({
                date: `FUTURE:${monthNameWithQ} ${year}`,
                isFuture: true,
                inflation: undefined,
                unemployment: undefined
            });
        }
    }
    
    return data;
  }, [state.history, state.quarter, state.year]);

  const quarterlyLabels = React.useMemo(() => {
    const rawLabels: { date: string; label: string; color: string }[] = [];
    
    // Process only real data for labels
    chartData.forEach((point, i) => {
      // @ts-ignore - added types to point in chartData
      if (point.isFuture || point.isPlaceholder || i % 3 !== 1) return;
      
      const stateInfo = getEconomicState(point.unemployment!, point.inflation!);
      if (stateInfo) {
        rawLabels.push({
          date: point.date,
          label: stateInfo.label,
          color: stateInfo.color
        });
      }
    });

    // Merge consecutive identical labels
    const merged: { xMid: string; label: string; color: string }[] = [];
    if (rawLabels.length === 0) return merged;

    let currentGroup = [rawLabels[0]];
    for (let i = 1; i < rawLabels.length; i++) {
      if (rawLabels[i].label === currentGroup[0].label) {
        currentGroup.push(rawLabels[i]);
      } else {
        const midPoint = currentGroup[Math.floor(currentGroup.length / 2)];
        merged.push({
          xMid: midPoint.date,
          label: midPoint.label,
          color: midPoint.color
        });
        currentGroup = [rawLabels[i]];
      }
    }
    const midPoint = currentGroup[Math.floor(currentGroup.length / 2)];
    merged.push({
      xMid: midPoint.date,
      label: midPoint.label,
      color: midPoint.color
    });

    return merged;
  }, [chartData]);

  const quarterlyGridLines = React.useMemo(() => {
    return chartData.map((point) => {
      const rawVal = point.date.replace('FUTURE:', '').replace('PAST:', '');
      const isFuture = !!point.isFuture || point.date.startsWith('FUTURE:');
      
      const isQuarterStart = 
        rawVal.startsWith("Jan (Q1)") || 
        rawVal.startsWith("Apr (Q2)") || 
        rawVal.startsWith("Jul (Q3)") || 
        rawVal.startsWith("Oct (Q4)");
        
      if (!isQuarterStart) return null;
      
      return {
        x: point.date,
        isFuture,
      };
    }).filter((line): line is { x: string; isFuture: boolean } => line !== null);
  }, [chartData]);

  const startTour = () => {
    setTourStep(0);
    setHasStarted(true);
  };
  
  const nextTourStep = () => {
    if (tourStep !== null && tourStep < tourSteps.length - 1) {
      setTourStep(tourStep + 1);
    } else {
      setTourStep(null);
    }
  };

  const prevTourStep = () => {
    if (tourStep !== null && tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  };

  const closeTour = () => setTourStep(null);

  // Waiting sounds or background chords during processing
  React.useEffect(() => {
    if (isProcessing) {
      // Play a beautiful, soft ascending chime arpeggio
      audioEngine.playNote(261.63, 'sine', 1.2, 0.04); // C
      const n1 = setTimeout(() => audioEngine.playNote(329.63, 'sine', 1.2, 0.04), 200); // E
      const n2 = setTimeout(() => audioEngine.playNote(392.00, 'sine', 1.4, 0.04), 400); // G
      const n3 = setTimeout(() => audioEngine.playNote(523.25, 'sine', 1.6, 0.04), 600); // C5

      // Staggered ambient lo-fi synthesizer notes
      const t1 = setTimeout(() => audioEngine.playNote(587.33, 'triangle', 2.0, 0.03), 1600);
      const t2 = setTimeout(() => audioEngine.playNote(659.25, 'triangle', 2.0, 0.03), 3200);
      return () => {
        clearTimeout(n1);
        clearTimeout(n2);
        clearTimeout(n3);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isProcessing]);

  const handleSkipAndStart = () => {
    setHasStarted(true);
    setTourStep(null);
  };

  const tourSteps = [
    {
      title: "Welcome to CHAIR THE FED",
      content: "You've been appointed as the new Chair of the Federal Reserve. Your mission: maintain economic stability.",
      target: "header",
      position: "center"
    },
    {
      title: "Dual Mandate",
      content: "Price stability and maximum sustainable employment. Keep Inflation near 2.0% and Unemployment near 4.0%.",
      target: "metrics",
      position: "bottom-right"
    },
    {
      title: "Federal Funds Rate",
      content: "This is the primary benchmark interest rate at which banks charge each other to borrow money overnight. Raise it to cool inflation, or lower it to fight unemployment.",
      target: "funds-rate",
      position: "bottom-right"
    },
    {
      title: "Interest on Reserves (IOR)",
      content: "The interest rate the Fed pays banks on their reserve balances. Raising IOR encourages banks to keep more reserves parked, cooling credit expansion and commercial lending.",
      target: "ior",
      position: "bottom-right"
    },
    {
      title: "Open Market Operations (OMO)",
      content: "Buy or sell government securities to adjust the size of the Fed's balance sheet. Buying (QE) injects liquidity, while selling (QT) removes it.",
      target: "omo",
      position: "bottom-right"
    },
    {
      title: "Surprise Situations",
      content: "The economy is unpredictable. External shocks or boons will appear at the start of every year (Q1). You must react to these shifting conditions.",
      target: "event",
      position: "bottom-right"
    },
    {
      title: "Historical Context",
      content: "Watch the trends. Policy changes take time to manifest in the data. Use the chart to track your progress over time.",
      target: "chart",
      position: "top-right"
    },
    {
      title: "Term Re-election",
      content: "You serve 4-year terms (16 quarters). At the end of each term, the President and Senate review your average performance. Keep the economy stable to get re-elected!",
      target: "score",
      position: "bottom-right"
    },
    {
      title: "Current Date",
      content: "The simulation advances quarter by quarter (Q1-Q4). Each quarter represents 3 months. Your first term starts in 2022.",
      target: "date",
      position: "bottom-right"
    },
    {
      title: "Restart Simulation",
      content: "If things get out of hand, you can always reset the simulation and start your term over from 2022.",
      target: "restart",
      position: "bottom-right"
    },
    {
      title: "Execute & Advance",
      content: "Once you've set your policy tools, click here to advance to the next quarter and see the impact of your decisions.",
      target: "execute",
      position: "bottom-right"
    },
    {
      title: "Economic Advisor Tips",
      content: "The advisor suggests potential policy adjustments and highlights key risks to help you make informed decisions.",
      target: "advisor-tip",
      position: "bottom-right"
    }
  ];

  React.useEffect(() => {
    if (tourStep === 11) {
      document.getElementById('advisor-tip')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tourStep]);

  const getTourPositionClasses = (step: number) => {
    const pos = tourSteps[step]?.position || "bottom-right";
    switch (pos) {
      case "center": return "items-center justify-center";
      case "top-right": return "items-start justify-center md:justify-end md:pt-40 md:pr-20";
      case "bottom-right": return "items-end justify-center md:justify-end md:pb-20 md:pr-20";
      case "bottom-left": return "items-end justify-center md:justify-start md:pb-20 md:pl-20";
      default: return "items-center justify-center";
    }
  };

  const getInflationColor = (v: number) => {
    const diff = Math.abs(v - 2.0);
    const base = { text: 'text-blue-600', bg: 'bg-blue-50/70', border: 'border-blue-200/50' };
    
    if (diff <= 0.2) return { ...base, badge: 'bg-emerald-105/95 text-emerald-800 border border-emerald-250/30' };
    if (diff <= 0.5) return { ...base, text: 'text-blue-500', badge: 'bg-emerald-105/70 text-emerald-700 border border-emerald-105/40' };
    if (diff <= 1.0) return { ...base, badge: 'bg-amber-105 text-amber-700 border border-amber-250/30' };
    return { ...base, badge: 'bg-red-105 text-red-600 border border-red-255/30' };
  };

  const getUnemploymentColor = (v: number) => {
    const diff = Math.abs(v - 4.0);
    const base = { text: 'text-red-610', bg: 'bg-red-50/70', border: 'border-red-200/50' };
    
    if (diff <= 0.3) return { ...base, badge: 'bg-emerald-105/95 text-emerald-800 border border-emerald-250/30' };
    if (diff <= 0.8) return { ...base, text: 'text-red-500', badge: 'bg-emerald-105/70 text-emerald-700 border border-emerald-105/40' };
    if (diff <= 1.5) return { ...base, badge: 'bg-amber-105 text-amber-700 border border-amber-250/30' };
    return { ...base, badge: 'bg-red-105 text-red-600 border border-red-255/30' };
  };

  const infColors = getInflationColor(state.inflation);
  const unempColors = getUnemploymentColor(state.unemployment);

  return (
    <div className="viewport-container min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-[#F5F5F0] text-[#141414] font-sans selection:bg-black selection:text-white flex flex-col">
      {/* Tour Overlay */}
      <AnimatePresence>
        {tourStep !== null && tourStep < tourSteps.length && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("fixed inset-0 z-[300] pointer-events-none flex p-8 transition-all duration-500", getTourPositionClasses(tourStep))}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl space-y-8 border border-black/5 pointer-events-auto"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-[13px] uppercase tracking-[0.2em] font-bold opacity-30">Step {tourStep + 1} of {tourSteps.length}</p>
                  <div className="p-2 bg-zinc-50 rounded-full opacity-30">
                    <Info size={20} />
                  </div>
                </div>
                <h3 className="text-4xl font-bold tracking-tighter">{tourSteps[tourStep].title}</h3>
                <p className="text-zinc-500 text-lg leading-relaxed">{tourSteps[tourStep].content}</p>
              </div>
              <div className="flex gap-4 pt-4">
                {tourStep === 0 ? (
                  <button 
                    onClick={closeTour}
                    className="flex-1 py-4 border border-black/10 rounded-2xl font-bold uppercase tracking-widest text-[13px] hover:bg-zinc-50 transition-all active:scale-95"
                  >
                    Skip
                  </button>
                ) : (
                  <button 
                    onClick={prevTourStep}
                    className="flex-1 py-4 border border-black/10 rounded-2xl font-bold uppercase tracking-widest text-[13px] hover:bg-zinc-50 transition-all active:scale-95"
                  >
                    Back
                  </button>
                )}
                <button 
                  onClick={nextTourStep}
                  className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-[13px] hover:bg-zinc-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                >
                  {tourStep === tourSteps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial Welcome Dialog */}
      <AnimatePresence>
        {!hasStarted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-lg w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white mx-auto mb-4">
                <Activity size={40} />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-bold tracking-tighter uppercase">Chair The Fed</h2>
                <p className="text-zinc-500 text-xl">Welcome, Mr. Chairman. Would you like a tour of your command center before we begin?</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={startTour}
                  className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-base hover:bg-zinc-800 transition-all"
                >
                  Take the Tour
                </button>
                <button 
                  onClick={handleSkipAndStart}
                  className="w-full py-5 border border-black/10 rounded-2xl font-bold uppercase tracking-widest text-base hover:bg-zinc-50 transition-all"
                >
                  Skip and Start
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-lg w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 mx-auto mb-4">
                <RotateCcw size={40} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter uppercase">Reset Game?</h2>
                <p className="text-zinc-500 text-xl">Are you sure you want to reset the game? All your progress in the current term will be lost.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-5 border border-black/10 rounded-2xl font-bold uppercase tracking-widest text-base hover:bg-zinc-50 transition-all"
                >
                  No
                </button>
                <button 
                  onClick={() => {
                    resetGame();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-base hover:bg-zinc-800 transition-all shadow-xl shadow-black/10"
                >
                  Yes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-black/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-1.5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white">
              <Activity size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase leading-none">Chair The Fed</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-semibold leading-none mt-0.5">Economic Command Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
            <div className="flex items-center gap-2 px-2.5 py-1.5 border bg-white border-black/10 rounded-lg select-none shadow-sm">
              <button 
                onClick={toggleMute}
                className="hover:bg-zinc-100 p-0.5 rounded transition-all outline-none flex items-center justify-center flex-shrink-0"
                title="Toggle Mute"
              >
                {musicVolume === 0 ? (
                  <VolumeX size={13} className="text-zinc-400" />
                ) : (
                  <Volume2 size={13} className="text-purple-600 animate-pulse" />
                )}
              </button>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={musicVolume} 
                onChange={handleVolumeChange} 
                className="w-14 sm:w-20 cursor-pointer rounded-lg focus:outline-none focus:ring-0"
                style={{ accentColor: '#9333ea', height: '4px' }}
              />
              <span className="text-[9px] font-bold font-mono text-zinc-500 w-[24px] text-right select-none">
                {musicVolume}%
              </span>
            </div>
            <button 
              onClick={() => setShowAdvisor(!showAdvisor)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg transition-all text-[11px] font-bold uppercase tracking-widest outline-none",
                showAdvisor 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100/15" 
                  : "bg-white text-zinc-600 border-black/10 hover:bg-black/5"
              )}
            >
              <ShieldAlert size={13} className={showAdvisor ? "animate-pulse" : ""} />
              <span className="hidden sm:inline">{showAdvisor ? "Advisor: On" : "Advisor: Off"}</span>
            </button>
            <button 
              onClick={() => setShowResetConfirm(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 border border-black/10 rounded-lg hover:bg-black/5 transition-colors text-[11px] font-bold uppercase tracking-widest",
                tourStep === 9 && "relative z-[210] bg-white shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/40"
              )}
            >
              <RotateCcw size={13} />
              Restart
            </button>
            <div id="date" className={cn("text-right", tourStep === 8 && "relative z-[210] bg-white p-1 rounded-lg shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/40")}>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold leading-none">Current Date</p>
              <p className="text-lg font-mono font-bold leading-none mt-0.5">Q{state.quarter} {state.year}</p>
            </div>
            <div id="score" className={cn("text-right", tourStep === 7 && "relative z-[210] bg-white p-1 rounded-lg shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/40")}>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold leading-none">Term {state.termNumber}</p>
              <p className="text-lg font-mono font-bold leading-none mt-0.5">
                {state.termQuarters}/16 <span className="text-[10px] opacity-30 font-bold uppercase tracking-widest">Qtrs</span>
              </p>
            </div>
          </div>
        </div>
      </header>
      




      <main className="viewport-main max-w-7xl w-full mx-auto px-4 md:px-6 py-2.5 space-y-2.5 flex-1 flex flex-col min-h-0 justify-between lg:overflow-hidden">
        {/* Top Metrics Row */}
        <div 
          id="metrics" 
          className={cn(
            "grid gap-2.5 flex-shrink-0 transition-all duration-300", 
            showAdvisor 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" 
              : "grid-cols-1 sm:grid-cols-3",
            tourStep === 1 && "relative z-[210] bg-purple-50/30 p-1 rounded-[24px] shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/40"
          )}
        >
          <MetricCard 
            label="Unemployment" 
            value={state.unemployment} 
            target={4.0} 
            unit="%" 
            icon={<Users className={unempColors.text} size={16} />}
            description="Target: 4.0%"
            tooltipContent="The percentage of the labor force that is jobless and actively looking for work. The Fed targets 4.0% for maximum sustainable employment."
            colors={unempColors}
            isProcessing={isProcessing}
          />
          <MetricCard 
            label="Inflation" 
            value={state.inflation} 
            target={2.0} 
            unit="%" 
            icon={<TrendingUp className={infColors.text} size={16} />}
            description="Target: 2.0%"
            tooltipContent="The rate at which the general level of prices for goods and services is rising. The Fed targets 2.0% for price stability."
            colors={infColors}
            isProcessing={isProcessing}
          />

          {/* Dedicated News TV for Surprise Events */}
          <NewsTVCard 
            activeEvent={state.activeEvent} 
            clearEvent={clearEvent} 
            isProcessing={isProcessing}
            tourStep={tourStep}
          />

          {/* Economic Advisor Tip section */}
          <AnimatePresence mode="popLayout">
            {showAdvisor && (
              <motion.div
                key="advisor-top-card"
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="h-full min-h-0"
              >
                <AdvisorCard 
                  advisorTip={advisorTip} 
                  tourStep={tourStep} 
                  showAdvisor={showAdvisor} 
                  setShowAdvisor={setShowAdvisor} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 flex-1 min-h-0">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 lg:h-fit lg:overflow-y-visible lg:min-h-0 space-y-2 lg:space-y-2 xl:space-y-2.5 pr-1">


            {/* Unified Monetary Policy Instruments Panel */}
            <div className="bg-white rounded-[14px] border border-black/5 shadow-sm overflow-hidden divide-y divide-black/5">
              <div className="py-1.5 px-3 bg-[#FCFCFA] border-b border-black/5">
                <p className="text-[9px] uppercase tracking-widest font-black opacity-50">Monetary Policy Instruments</p>
              </div>

              {/* 2. Federal Funds Rate Control (FFR) */}
              <div id="funds-rate" className={cn("p-3 lg:p-2.5 xl:p-3 space-y-2 lg:space-y-1.5 xl:space-y-2 transition-all duration-300", tourStep === 2 && "relative z-[210] bg-purple-500/5 ring-4 ring-purple-500/40")}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold leading-none">Federal Funds Rate</p>
                      <InfoTooltip 
                        title="Federal Funds Rate" 
                        content="The interest rate at which banks lend to each other overnight. Raising it cools the economy (fights inflation); lowering it stimulates growth (fights unemployment)."
                      />
                    </div>
                    <h2 className="text-xl lg:text-lg xl:text-xl font-mono font-bold tracking-tighter leading-none mt-0.5">{state.fundsRate.toFixed(2)}%</h2>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] uppercase tracking-widest opacity-40 font-bold">Stance:</span>
                      <span className="text-[9.5px] font-bold text-zinc-700">{state.fundsRate > 4.0 ? 'Contractionary' : state.fundsRate < 4.0 ? 'Expansionary' : 'Neutral'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => adjustRate(0.25)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => adjustRate(-0.25)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold opacity-45">
                    <span>Dovish</span>
                    <span>Hawkish</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.25" 
                    value={state.fundsRate}
                    onChange={(e) => {
                      setRate(Math.round(parseFloat(e.target.value) * 100) / 100);
                      playTick();
                    }}
                    disabled={state.isGameOver || isProcessing}
                    className="w-full h-1 bg-black/5 rounded appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 3. Interest on Reserves (IOR) Control */}
              <div id="ior" className={cn("p-3 lg:p-2.5 xl:p-3 space-y-2 lg:space-y-1.5 xl:space-y-2 transition-all duration-300", tourStep === 3 && "relative z-[210] bg-purple-500/5 ring-4 ring-purple-500/40")}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold leading-none">Interest on Reserves (IOR)</p>
                      <InfoTooltip 
                        title="Interest on Reserves" 
                        content="The rate paid to banks for holding funds at the Fed. Raising it encourages banks to keep money 'parked', cooling the economy."
                      />
                    </div>
                    <h4 className="text-xl lg:text-lg xl:text-xl font-mono font-bold tracking-tighter leading-none mt-0.5">{state.interestOnReserves.toFixed(2)}%</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] uppercase tracking-widest opacity-40 font-bold">Incentive:</span>
                      <span className="text-[9.5px] font-bold text-zinc-700">{state.interestOnReserves > 4.0 ? 'Contractionary' : state.interestOnReserves < 4.0 ? 'Expansionary' : 'Neutral'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => adjustIOR(0.25)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => adjustIOR(-0.25)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold opacity-45">
                    <span>Lend</span>
                    <span>Hold</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.25" 
                    value={state.interestOnReserves}
                    onChange={(e) => {
                      setIOR(Math.round(parseFloat(e.target.value) * 100) / 100);
                      playTick();
                    }}
                    disabled={state.isGameOver || isProcessing}
                    className="w-full h-1 bg-black/5 rounded appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 4. Open Market Operations (OMO) Control */}
              <div id="omo" className={cn("p-3 lg:p-2.5 xl:p-3 space-y-2 lg:space-y-1.5 xl:space-y-2 transition-all duration-300", tourStep === 4 && "relative z-[210] bg-purple-500/5 ring-4 ring-purple-500/40")}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold leading-none">Open Market Operations (OMO)</p>
                      <InfoTooltip 
                        title="Open Market Operations" 
                        content="Buying or selling government bonds. Buying (QE) injects cash into the system (stimulus), while selling (QT) removes it (tightening)."
                      />
                    </div>
                    <h4 className="text-xl lg:text-lg xl:text-xl font-mono font-bold tracking-tighter leading-none mt-0.5">${state.omoBalance.toFixed(2)}T</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-[8.5px] uppercase tracking-widest opacity-40 font-bold">Balance Sheet:</span>
                      <span className="text-[9.5px] font-bold text-zinc-700">{state.omoBalance > 7.5 ? 'Expansionary' : state.omoBalance < 7.5 ? 'Contractionary' : 'Neutral'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => adjustOMO(0.1)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button 
                      onClick={() => adjustOMO(-0.1)}
                      disabled={state.isGameOver || isProcessing}
                      className="p-1 bg-black text-white rounded hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase tracking-widest font-bold opacity-45">
                    <span>Sell (QT)</span>
                    <span>Buy (QE)</span>
                  </div>
                  <input 
                    type="range" 
                    min="4" 
                    max="12" 
                    step="0.1" 
                    value={state.omoBalance}
                    onChange={(e) => {
                      setOMO(Math.round(parseFloat(e.target.value) * 100) / 100);
                      playTick();
                    }}
                    disabled={state.isGameOver || isProcessing}
                    className="w-full h-1 bg-black/5 rounded appearance-none cursor-pointer accent-black disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* 5. Action: Execute Policy & Autopilot */}
            <div id="execute" className={cn(
              "bg-white rounded-[14px] p-2.5 lg:p-2 xl:p-2.5 border border-black/5 shadow-sm space-y-1.5 lg:space-y-1 xl:space-y-1.5",
              tourStep === 10 && "relative z-[210] shadow-2xl shadow-purple-500/20 ring-4 ring-purple-500/40"
            )}>
              <button 
                onClick={handleNextQuarter}
                disabled={state.isGameOver || isProcessing}
                className={cn(
                  "w-full py-2 lg:py-1.5 xl:py-2 rounded-lg font-bold uppercase tracking-widest text-[11px] lg:text-[10px] xl:text-[11px] flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50",
                  isProcessing ? "bg-zinc-100 text-zinc-400 cursor-wait shadow-none" : "bg-black text-white hover:bg-zinc-800 hover:scale-[1.01] active:scale-[0.99] shadow-black/5"
                )}
              >
                {isProcessing ? (
                  <>
                    <Repeat className="animate-spin" size={14} />
                    Simulating Market Reaction...
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    Execute Policy & Advance
                  </>
                )}
              </button>
              
              <div className="grid grid-cols-2 gap-1.5 lg:gap-1 xl:gap-1.5">
                <button 
                  id="ideal-policy-button"
                  onClick={applyIdealPolicy}
                  disabled={state.isGameOver || isProcessing}
                  className="py-1.5 lg:py-1 xl:py-1.5 bg-purple-600/10 text-purple-700 hover:bg-purple-600/20 rounded-lg font-bold uppercase tracking-widest text-[9px] lg:text-[8px] xl:text-[9px] transition-all active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  <Scale size={11} />
                  Show Ideal Policy
                </button>

                <button 
                  id="autopilot-play-button"
                  onClick={() => setIsAutopilotEnabled(!isAutopilotEnabled)}
                  disabled={state.isGameOver}
                  className={cn(
                    "py-1.5 lg:py-1 xl:py-1.5 rounded-lg font-bold uppercase tracking-widest text-[9px] lg:text-[8px] xl:text-[9px] transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 border",
                    isAutopilotEnabled 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                      : "bg-zinc-50 text-zinc-700 border-zinc-200/60 hover:bg-zinc-100"
                  )}
                >
                  <Cpu size={11} className={isAutopilotEnabled ? "animate-pulse text-emerald-600" : "text-zinc-500"} />
                  {isAutopilotEnabled ? "On" : "Autopilot"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Visualization */}
          <div className="lg:col-span-8 lg:h-full lg:min-h-0 flex flex-col space-y-4">
            <div id="chart" className={cn(
              "bg-white rounded-2xl p-4 border border-black/5 shadow-sm flex-1 min-h-0 flex flex-col relative overflow-hidden",
              tourStep === 6 && "relative z-[210] shadow-2xl shadow-purple-500/20 ring-4 ring-purple-500/40"
            )}>
              {/* Simulation Progress Guard */}
              <AnimatePresence>
                {isProcessing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-0 top-0 h-1 bg-zinc-100 z-10"
                  >
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 5, ease: "linear" }}
                      className="h-full bg-black"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Economic History Chart</h3>
                  <p className="text-[12px] opacity-50">Recent Economic Performance</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] uppercase tracking-widest font-bold opacity-40">Show Periods</span>
                  <button 
                    onClick={() => setShowPeriods(!showPeriods)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      showPeriods ? "bg-purple-500" : "bg-zinc-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      showPeriods ? "left-6" : "left-1"
                    )} />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-[200px] md:min-h-[220px] lg:h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000a" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={<CustomXAxisTick />}
                      interval={0}
                      height={50}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 600, opacity: 0.5}}
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      itemSorter={(item) => (item.dataKey === 'unemployment' ? -1 : 1)}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                    />

                    {/* Quarterly Vertical Grid Lines */}
                    {quarterlyGridLines.map((line, idx) => (
                      <ReferenceLine 
                        key={`q-grid-${idx}`}
                        x={line.x}
                        stroke={line.isFuture ? "rgba(0, 0, 0, 0.06)" : "rgba(0, 0, 0, 0.18)"}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                      />
                    ))}

                    <Line 
                      type="monotone" 
                      dataKey="unemployment" 
                      name="Unemployment"
                      stroke="#ef4444" 
                      strokeWidth={3} 
                      dot={{ r: 2, fill: '#ef4444', strokeWidth: 1, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                      animationDuration={isProcessing ? 5000 : 1000}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inflation" 
                      name="Inflation"
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 2, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }}
                      activeDot={{ r: 5 }}
                      animationDuration={isProcessing ? 5000 : 1000}
                    />

                    {/* Reference Lines and Labels rendered last to be on top */}
                    <ReferenceLine y={4.0} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Target Unemp', fontSize: 8, fill: '#ef4444' }} />
                    <ReferenceLine y={2} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'right', value: 'Target Inf', fontSize: 8, fill: '#3b82f6' }} />
                    
                    {showPeriods && quarterlyLabels.map((q, idx) => (
                      <ReferenceLine 
                        key={idx}
                        x={q.xMid}
                        stroke="transparent"
                        isFront={true}
                        label={<PeriodBubble fill={q.color} value={q.label} />}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Re-election Modal */}
      <AnimatePresence>
        {state.isReelectionPending && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-md w-full text-center space-y-8 shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto">
                <ShieldAlert size={40} />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Term Confirmed</h2>
                <p className="text-zinc-500 leading-relaxed">{state.message}</p>
              </div>

              <div className="bg-emerald-50 rounded-3xl p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 mb-1">Next Term</p>
                <p className="text-5xl font-mono font-bold text-emerald-700">{state.termNumber}</p>
              </div>

              <button 
                onClick={handleNextQuarter}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
              >
                Continue to Next Term
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {state.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-12 max-w-md w-full text-center space-y-8"
            >
              <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white mx-auto">
                <AlertCircle size={40} />
              </div>
              
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Term Ended</h2>
                <p className="text-zinc-500 leading-relaxed">{state.message}</p>
              </div>

              <div className="bg-red-50 rounded-3xl p-6">
                <p className="text-[12px] uppercase tracking-widest font-bold text-red-600 mb-1">Terms Served</p>
                <p className="text-5xl font-mono font-bold text-red-700">{state.termNumber}</p>
              </div>

              <button 
                onClick={resetGame}
                className="w-full py-5 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all"
              >
                <RotateCcw size={18} />
                Try Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto px-4 py-2 mt-2">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-black/5">
          <div className="flex items-center gap-2 opacity-40">
             <Info size={14} />
             <p className="text-[11px] font-medium italic">Policy decisions have a 1-2 quarter lag in this simulation.</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-black opacity-30">© 2024 Federal Reserve Simulation Lab</p>
        </div>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, target, unit, icon, description, tooltipContent, colors, isProcessing }: { 
  label: string, 
  value: number, 
  target: number, 
  unit: string, 
  icon: React.ReactNode,
  description: string,
  tooltipContent?: string,
  colors: { text: string, bg: string, border: string, badge: string },
  isProcessing?: boolean
}) {
  const safeValue = value ?? 0;
  const precision = label === "Inflation" || label === "Unemployment" ? 1 : 2;
  const diff = safeValue - target;

  return (
    <div className={cn(
      "bg-white rounded-[12px] py-1.5 px-4 border transition-all duration-500 shadow-sm",
      colors.bg,
      colors.border,
      isProcessing && "animate-pulse ring-2 ring-black/5"
    )}>
      <div className="flex justify-between items-center mb-1">
        <div className="p-1.5 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm">
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 mb-0">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-40 font-bold">{label}</p>
            {tooltipContent && <InfoTooltip title={label} content={tooltipContent} />}
          </div>
          <p className="text-3xl font-mono font-bold tracking-tighter leading-none">{safeValue.toFixed(precision)}{unit}</p>
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-black/5">
        <p className="text-[11px] font-bold opacity-40 uppercase tracking-[0.15em]">{description}</p>
        <div className={cn(
          "px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase tracking-wider shadow-sm",
          colors.badge
        )}>
          {diff > 0 ? `+${diff.toFixed(precision)}` : diff.toFixed(precision)}
        </div>
      </div>
    </div>
  );
}

const InfoTooltip = ({ title, content }: { title: string; content: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-black/5 rounded-full transition-colors flex items-center justify-center"
      >
        <Info size={12} className="opacity-40" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-[190]" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute top-full right-0 mt-3 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-black/5 z-[200] text-left"
            >
              <h4 className="text-[13px] font-bold uppercase tracking-widest mb-1 text-black">{title}</h4>
              <p className="text-[14px] text-zinc-500 leading-relaxed font-medium">{content}</p>
              <div className="absolute bottom-full right-2 border-8 border-transparent border-b-white" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

function NewsTVCard({ activeEvent, clearEvent, isProcessing, tourStep }: { 
  activeEvent: any, 
  clearEvent: () => void, 
  isProcessing?: boolean,
  tourStep: number | null
}) {
  const isShock = activeEvent?.type === 'shock';
  const isLingering = activeEvent?.phase === 'lingering';

  const colors = activeEvent 
    ? (isLingering 
        ? { bg: "bg-purple-50/50 border-purple-500/10 text-purple-900 border-purple-100", text: "text-purple-600", badge: "bg-purple-500 text-white" }
        : (isShock 
            ? { bg: "bg-red-50/70 border-red-500/20 text-red-900 border-red-200", text: "text-red-600", badge: "bg-red-500 text-white" } 
            : { bg: "bg-emerald-50/70 border-emerald-500/20 text-emerald-900 border-emerald-200", text: "text-emerald-600", badge: "bg-emerald-500 text-white" }))
    : { bg: "bg-white border-black/5 text-zinc-900", text: "text-zinc-500", badge: "bg-zinc-100 text-zinc-600" };

  // Calculate current decayed impacts to display
  const mult = activeEvent ? getImpactMultiplier(activeEvent) : 0;
  const currentInfImpact = activeEvent ? (activeEvent.infImpact * mult) : 0;
  const currentUnempImpact = activeEvent ? (activeEvent.unempImpact * mult) : 0;

  return (
    <div 
      id="event"
      className={cn(
        "rounded-[12px] py-2 px-4 border transition-all duration-500 shadow-sm flex flex-col justify-between h-full relative overflow-hidden",
        colors.bg,
        activeEvent ? "border-current/30 ring-2 ring-amber-500/10" : "border-black/5",
        isProcessing && "animate-pulse",
        tourStep === 5 && "relative z-[210] shadow-2xl shadow-purple-500/30 ring-4 ring-purple-500/50 bg-purple-500/5"
      )}
    >
      {/* Mini Scanlines styling */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.012] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.2)_50%)] bg-[size:100%_3px]" />
      
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded bg-white/80 backdrop-blur-sm shadow-xs flex-shrink-0">
            <Tv size={12} className={cn(colors.text, activeEvent && "animate-pulse")} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold leading-none">News Broadcast</p>
            {activeEvent ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-[7px] uppercase font-bold tracking-wider px-1 py-0.2 rounded-sm inline-block text-white leading-none",
                  isLingering ? "bg-purple-600" : (isShock ? "bg-red-600" : "bg-emerald-600")
                )}>
                  {isLingering ? "Story Aftermath" : (isShock ? "Ongoing Shock" : "Ongoing Boon")}
                </span>
                {activeEvent.phase === 'active' && activeEvent.duration && (
                  <span className="text-[7.5px] font-bold font-mono text-zinc-500 bg-white/75 px-1 py-0.2 rounded border border-black/5 leading-none">
                    Q{activeEvent.elapsed}/{activeEvent.duration}
                  </span>
                )}
                {isLingering && (
                  <span className="text-[7.5px] font-bold font-mono text-purple-600 bg-purple-100/80 px-1 py-0.2 rounded border border-purple-200/50 leading-none animate-pulse">
                    Lingering
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase text-emerald-700 font-mono tracking-widest">Live</span>
              </div>
            )}
          </div>
        </div>

        {activeEvent && (
          <button 
            onClick={clearEvent}
            className="px-2 py-0.5 bg-black text-white hover:bg-zinc-800 rounded font-black uppercase text-[8px] tracking-widest transition-all shadow-xs"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-[35px] text-left">
        {activeEvent ? (
          <div>
            <h4 className="font-bold text-[12px] tracking-tight leading-tight line-clamp-1">{activeEvent.title}</h4>
            <p className="text-[10px] line-clamp-2 leading-tight mt-0.5 text-zinc-700 font-medium">{activeEvent.description}</p>
          </div>
        ) : (
          <p className="text-[10px] opacity-45 italic leading-tight">
            "Steady microeconomic conditions. No major supply-chain disruptions reported."
          </p>
        )}
      </div>

      <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-black/5 text-[9px]">
        <span className="font-mono uppercase tracking-[0.1em] opacity-40 font-bold">Indicator Feed</span>
        {activeEvent ? (
          <div className="flex gap-2 font-mono font-bold">
            {isLingering ? (
              <span className="text-purple-600 animate-pulse font-semibold text-[8px]">[STABILIZING AFTERMATH]</span>
            ) : (
              <>
                <span className={currentInfImpact > 0 ? "text-red-600" : (currentInfImpact < 0 ? "text-emerald-700" : "text-zinc-500")}>
                  INF: {currentInfImpact > 0 ? '+' : ''}{currentInfImpact.toFixed(2)}%
                </span>
                <span className={currentUnempImpact > 0 ? "text-red-600" : (currentUnempImpact < 0 ? "text-emerald-700" : "text-zinc-500")}>
                  UNEMP: {currentUnempImpact > 0 ? '+' : ''}{currentUnempImpact.toFixed(2)}%
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="font-mono text-zinc-400 font-semibold text-[8px]">[SYSTEM STABLE]</span>
        )}
      </div>
    </div>
  );
}

function AdvisorCard({ advisorTip, tourStep, showAdvisor, setShowAdvisor }: {
  advisorTip: any,
  tourStep: number | null,
  showAdvisor: boolean,
  setShowAdvisor: (v: boolean) => void
}) {
  return (
    <div className={cn(
      "rounded-[12px] py-2 px-4 border transition-all duration-500 shadow-sm flex flex-col justify-between h-full bg-zinc-50 border-black/5 relative text-left",
      advisorTip.bg,
      advisorTip.border,
      tourStep === 11 && "relative z-[210] shadow-2xl shadow-purple-500/20 ring-4 ring-purple-500/40"
    )}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={cn("p-1 rounded bg-white shadow-xs flex-shrink-0", advisorTip.color)}>
            <ShieldAlert size={12} />
          </div>
          <div className="truncate">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold leading-none">FOMC Advisor</p>
            <h4 className={cn("text-[8px] font-bold uppercase tracking-wider mt-0.5", advisorTip.color)}>
              {advisorTip.title}
            </h4>
          </div>
        </div>
        <button
          onClick={() => setShowAdvisor(false)}
          className="text-zinc-300 hover:text-zinc-650 transition-colors flex-shrink-0 p-0.5 rounded-full hover:bg-black/5"
          title="Minimize Advisor"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-[35px]">
        <p className="text-[10px] leading-tight text-zinc-800 font-semibold italic">
          "{advisorTip.tip}"
        </p>
      </div>

      <div className="pt-1.5 mt-1 border-t border-black/5 grid grid-cols-2 gap-2 text-[9px] leading-tight flex-shrink-0">
        <div className="min-w-0">
          <span className="font-bold uppercase tracking-[0.1em] opacity-40 text-[7px] block font-mono">Rationale</span>
          <span className="text-zinc-650 truncate block max-w-full font-medium" title={advisorTip.rationale}>{advisorTip.rationale}</span>
        </div>
        <div className="min-w-0">
          <span className="font-bold uppercase tracking-[0.1em] opacity-40 text-[7px] block font-mono">Key Risk</span>
          <span className="text-zinc-500 italic truncate block max-w-full font-medium" title={advisorTip.risk}>"{advisorTip.risk}"</span>
        </div>
      </div>
    </div>
  );
}
