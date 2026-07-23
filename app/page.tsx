"use client";

import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Headphones, AlertCircle, LockKeyhole, CheckCircle } from 'lucide-react';

const questions = [
  {
    id: 1,
    text: "When a project timeline suddenly collapses, your immediate physiological response is:",
    options: [
      { text: "Heart rate spikes; I immediately start firing off directives.", value: 3, type: "rusher" },
      { text: "I feel a weight in my chest and silently rewrite the entire plan myself.", value: 2, type: "fixer" },
      { text: "A sense of numbness; I avoid the Slack channels.", value: 1, type: "freezer" },
      { text: "I pause, breathe, and systematically assess the new constraints.", value: 0, type: "integrated" }
    ]
  },
  {
    id: 2,
    text: "How do you internally view the people on your team when under extreme stress?",
    options: [
      { text: "As obstacles slowing me down.", value: 3, type: "rusher" },
      { text: "As dependents who need me to save them.", value: 2, type: "fixer" },
      { text: "As threats demanding energy I don't have.", value: 1, type: "freezer" },
      { text: "As capable adults experiencing friction.", value: 0, type: "integrated" }
    ]
  },
  {
    id: 3,
    text: "Your relationship with your email inbox at 9:00 PM is best described as:",
    options: [
      { text: "Combative. I must hit inbox zero before I can rest.", value: 3, type: "rusher" },
      { text: "Anxious. I check it to ensure nothing caught fire.", value: 2, type: "fixer" },
      { text: "Avoidant. I literally cannot look at the app icon.", value: 1, type: "freezer" },
      { text: "Detached. Notifications are off.", value: 0, type: "integrated" }
    ]
  }
];

export default function KineticDiagnostic() {
  const [view, setView] = useState<'intro' | 'quiz' | 'processing' | 'results'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>(new Array(questions.length).fill(null));
  const [resultData, setResultData] = useState<any>(null);
  const [isGated, setIsGated] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedEmail, setCapturedEmail] = useState("");

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('kineticState');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCurrentIndex(parsed.currentIndex);
      setAnswers(parsed.answers);
      if (parsed.currentIndex > 0 && parsed.currentIndex < questions.length) {
        setView('quiz');
      }
    }
  }, []);

  const saveState = (idx: number, ans: any[]) => {
    localStorage.setItem('kineticState', JSON.stringify({ currentIndex: idx, answers: ans }));
  };

  const handleSelect = (idx: number, opt: any) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = { index: idx, value: opt.value, type: opt.type };
    setAnswers(newAnswers);
    saveState(currentIndex, newAnswers);
  };

  const calculateResults = () => {
    let totalScore = 0;
    let types = { rusher: 0, fixer: 0, freezer: 0 };
    
    answers.forEach(a => {
      totalScore += a.value;
      if(types[a.type as keyof typeof types] !== undefined) types[a.type as keyof typeof types]++;
    });

    let primaryType = "The Integrated";
    let desc = "You exhibit balanced kinetic responses.";
    let audioSrc = "/audio/integrated.mp3";

    if (types.rusher >= types.fixer && types.rusher >= types.freezer && types.rusher > 0) {
      primaryType = "The Rusher"; desc = "Your default response to friction is aggressive acceleration."; audioSrc = "/audio/rusher.mp3";
    } else if (types.fixer >= types.freezer && types.fixer > 0) {
      primaryType = "The Fixer"; desc = "Your default response is to absorb the system's anxiety and over-function."; audioSrc = "/audio/fixer.mp3";
    } else if (types.freezer > 0) {
      primaryType = "The Freezer"; desc = "Your nervous system pulls the emergency brake, leading to detachment."; audioSrc = "/audio/freezer.mp3";
    }

    let tierInfo = {};
    if (totalScore <= 3) {
      tierInfo = { 
        name: "Friction", 
        class: "border-teal-500 bg-gradient-to-br from-[#0f2a20] to-[#0c0a09]", 
        color: "text-teal-600", 
        cta: "Sovereign Command Center", 
        ctaDesc: "Optimize your baseline systems before they break.", 
        checkoutUrl: "https://billing.liveadaptiv.com/checkout/buy/sovereign-command-id", // <-- Replace with real link
        crisis: false 
      };
    } else if (totalScore <= 6) {
      tierInfo = { 
        name: "Smoldering", 
        class: "border-gold-500 bg-gradient-to-br from-[#2a1f0d] to-[#0c0a09]", 
        color: "text-gold-600", 
        cta: "Adaptiv App", 
        ctaDesc: "Track habits, detect energy leaks, and adjust behaviors daily.", 
        checkoutUrl: "https://billing.liveadaptiv.com/checkout/buy/adaptiv-app-id", // <-- Replace with real link
        crisis: false 
      };
    } else {
      tierInfo = { 
        name: "Inferno", 
        class: "border-rose-500 bg-gradient-to-br from-[#2a0d0d] to-[#0c0a09]", 
        color: "text-rose-600", 
        cta: "Burnout Rescue Workbook", 
        ctaDesc: "The structured, immediate triage system to halt the spiral.", 
        checkoutUrl: "https://billing.liveadaptiv.com/checkout/buy/burnout-rescue-id", // <-- Replace with real link
        crisis: true 
      };
    }

    setResultData({ primaryType, desc, tierInfo, audioSrc });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      saveState(currentIndex + 1, answers);
    } else {
      setView('processing');
      calculateResults();
      setTimeout(() => setView('results'), 2000);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const userEmail = formData.get('email') as string;
    
    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          b_name: formData.get('b_name'),
          archetype: resultData.primaryType,
          tier: resultData.tierInfo.name
        })
      });
      
      if (res.ok) {
        setCapturedEmail(userEmail);
        setIsGated(false);
        localStorage.removeItem('kineticState');
      } else {
        // Even if ConvertKit fails temporarily, we want to let the user through so they don't get stuck
        setCapturedEmail(userEmail);
        setIsGated(false);
      }
    } catch (err) {
      console.error(err);
      // Fallback open the gate so UX isn't broken
      setCapturedEmail(userEmail);
      setIsGated(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'intro') {
    return (
      <div className="w-full text-center space-y-6">
        <div className="flex justify-center gap-3 mb-6 opacity-70">
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase border border-stone-800 px-2 py-1 rounded">Polyvagal Frameworks</span>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase border border-stone-800 px-2 py-1 rounded">0% Data Sharing</span>
        </div>
        <p className="text-gold-500 tracking-[0.2em] text-xs font-bold uppercase">LiveAdaptiv Ecosystem</p>
        <h1 className="text-4xl md:text-5xl font-serif italic text-stone-50 leading-tight">The Kinetic Blueprint<br/>Diagnostic.</h1>
        <p className="text-stone-400 max-w-md mx-auto text-sm leading-relaxed">Identify your default response under pressure, measure your autonomic load, and map your precise path to systemic recovery. Do not overthink your answers.</p>
        <button onClick={() => setView('quiz')} className="mt-8 px-8 py-3 bg-stone-50 text-stone-950 font-bold rounded-lg hover:bg-gold-400 transition-colors">Begin Assessment</button>
        <p className="text-stone-600 text-xs mt-4 flex items-center justify-center gap-2"><Lock className="w-3 h-3" /> Private & secure. Progress saves automatically.</p>
      </div>
    );
  }

  if (view === 'processing') {
    return (
      <div className="w-full text-center space-y-6 animate-pulse">
        <div className="w-16 h-16 border-2 border-stone-800 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
        <h2 className="text-2xl font-serif italic text-stone-50">Mapping your Kinetic Blueprint...</h2>
        <p className="text-stone-500 text-sm">Analyzing stress load, archetypal defaults, and recovery pathways.</p>
      </div>
    );
  }

  if (view === 'quiz') {
    const q = questions[currentIndex];
    const progress = Math.round((currentIndex / questions.length) * 100);
    const hasAnswer = answers[currentIndex] !== null;

    return (
      <div className="w-full flex-col">
        <div className="mb-8">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{progress}% Complete</span>
            <button onClick={() => { localStorage.removeItem('kineticState'); location.reload(); }} className="text-[10px] text-stone-600 hover:text-stone-400 underline">Reset</button>
          </div>
          <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <h2 className="text-2xl font-serif italic text-stone-50 mb-6">{q.text}</h2>
        
        <div className="space-y-3 mb-8" role="radiogroup">
          {q.options.map((opt, idx) => {
            const isSelected = answers[currentIndex]?.index === idx;
            return (
              <button 
                key={idx}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(idx, opt)}
                className={`w-full text-left p-4 border rounded-xl flex items-center justify-between transition-all duration-200 group ${isSelected ? 'border-gold-500 bg-gold-500/5 text-gold-500' : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-200'}`}
              >
                <span className="text-sm">{opt.text}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-gold-500' : 'border-stone-600 group-hover:border-stone-400'}`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-gold-500"></div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-stone-800">
          <button onClick={() => setCurrentIndex(c => c - 1)} className={`text-sm text-stone-400 hover:text-stone-200 flex items-center gap-2 ${currentIndex === 0 ? 'invisible' : ''}`}><ArrowLeft className="w-4 h-4" /> Back</button>
          <button onClick={handleNext} disabled={!hasAnswer} className={`px-6 py-2 rounded-lg font-semibold transition-colors ${hasAnswer ? 'bg-stone-50 text-stone-950 hover:bg-gold-400' : 'bg-stone-800 text-stone-500 cursor-not-allowed'}`}>Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-col">
      <div className={`p-8 rounded-2xl mb-8 text-center border ${resultData.tierInfo.class}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Primary Archetype</p>
        <h2 className="text-4xl font-serif italic text-white mb-4">{resultData.primaryType}</h2>
        <p className="text-stone-300 text-sm mb-6 max-w-md mx-auto">{resultData.desc}</p>
        <div className="inline-block px-4 py-2 bg-stone-900/50 rounded-lg border border-stone-800">
          <span className="text-xs text-stone-400 mr-2">Metabolic Load Level:</span>
          <span className={`text-sm font-bold tracking-wider uppercase ${resultData.tierInfo.color}`}>{resultData.tierInfo.name}</span>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-gold-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-300">Audio Debrief</p>
            <p className="text-[10px] text-stone-500">Listen to Alex's analysis of your archetype</p>
          </div>
        </div>
        <audio controls className="w-full h-10 rounded">
          <source src={resultData.audioSrc} type="audio/mpeg" />
        </audio>
      </div>

      {resultData.tierInfo.crisis && (
        <div className="mb-8 p-6 border border-rose-900/50 bg-rose-950/20 rounded-xl">
          <h3 className="text-rose-500 font-serif italic text-xl mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> A moment of pause.</h3>
          <p className="text-stone-400 text-sm leading-relaxed">Your results indicate a critical friction load. You are running on zero reserves. The protocols unlocked below are designed for immediate, acute triage. When you are ready, we have identified a precise system to help you stabilize.</p>
        </div>
      )}

      {isGated ? (
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-950/90 pointer-events-none"></div>
          <div className="relative z-10">
            <LockKeyhole className="w-6 h-6 text-gold-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Unlock Your Action Protocols</h3>
            <p className="text-stone-400 text-sm mb-6">Enter your email to reveal your tailored recovery systems, shadow analysis, and next steps.</p>
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input type="email" name="email" required placeholder="Enter your best email" className="flex-grow px-4 py-3 rounded-lg bg-stone-950 border border-stone-700 text-white text-sm focus:outline-none focus:border-gold-500" />
              <input type="text" name="b_name" style={{ display: 'none' }} tabIndex={-1} />
              <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap disabled:opacity-50">
                {isSubmitting ? 'Securing...' : 'Reveal Protocols'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-6 animate-in fade-in duration-1000">
          <h3 className="text-2xl font-serif italic border-b border-stone-800 pb-2 mb-6">Your Kinetic Protocols</h3>
          <ul className="space-y-4 text-sm text-stone-300">
            <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-gold-500 shrink-0" /> <span><strong>Protocol 1:</strong> Immediate physical grounding. Press feet flat against floor for 60 seconds when overwhelmed.</span></li>
            <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-gold-500 shrink-0" /> <span><strong>Protocol 2:</strong> Audit your "yes". Say no to any new request for the next 48 hours.</span></li>
          </ul>
          <div className="mt-8 p-6 bg-stone-50 rounded-xl text-stone-950 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Your Next Step</p>
            <h4 className="text-2xl font-serif italic mb-3">{resultData.tierInfo.cta}</h4>
            <p className="text-sm text-stone-600 mb-6">{resultData.tierInfo.ctaDesc}</p>
            
            <a 
              href={`${resultData.tierInfo.checkoutUrl}?checkout[email]=${encodeURIComponent(capturedEmail)}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-stone-950 text-white font-bold rounded-lg hover:bg-stone-800 transition"
            >
              Access System Now
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
