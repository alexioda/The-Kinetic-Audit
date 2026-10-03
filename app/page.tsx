"use client";

import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Headphones, AlertCircle, LockKeyhole, CheckCircle, Gauge } from 'lucide-react';
import { assessment, FREQUENCY, computeResult } from '@/lib/blueprint';

/**
 * Kinetic Blueprint Diagnostic — LiveAdaptiv Ecosystem
 *
 * TWO INDEPENDENT AXES (this is the core of the redesign):
 *
 *   1. PATTERN  — which nervous-system response your system defaults to under
 *                 pressure. Read from the 10 archetype questions.
 *                 Rusher  = sympathetic overdrive (fight/flight / accelerate)
 *                 Fixer   = anxious over-functioning, mixed sympathetic/dorsal
 *                 Freezer = dorsal vagal shutdown / detachment
 *                 Sovereign = ventral vagal, metabolizing friction (regulated)
 *
 *   2. LOAD     — how much friction you're actually carrying. Read from 6
 *                 frequency-rated items informed by the same constructs the
 *                 MBI measures (emotional exhaustion + depersonalization).
 *
 * Previously LOAD was just the sum of the archetype values, so the tier was a
 * pure function of the archetype mix (every Fixer was "Friction", every Freezer
 * was "Inferno + crisis"). There was no way to express a mild vs. severe version
 * of the same pattern. Now the two are measured separately and reported
 * separately, which is what the intro promises.
 *
 * PHILOSOPHY: an archetype is a STATE OF ACTIVATION, not a fixed identity. Copy
 * is present-tense and framed as trainable ("your system currently defaults
 * to..."), never "you are a Freezer." This is the line between clinical honesty
 * and personality-quiz territory.
 *
 * Manuscript check (Metabolize_Revised):
 *   - Two-axis design is CORRECT. The book separates "which archetype dominates"
 *     from depletion/burnout, and treats Fixer/Freezer/Rusher as three co-equal
 *     defenses whose escalation ORDER is individual — not a fixed severity
 *     ranking. So load must NOT be derived from the archetype mix. (Resolved.)
 *   - The book defines NO tier names and NO score thresholds. It calls the
 *     diagnostic supplementary ("nothing in this book depends on them"). So the
 *     LOAD_TIERS numbers in lib/blueprint.ts are a product decision, not a book fact — set
 *     them to whatever converts/segments well for you.
 *
 * Still yours to wire up (infrastructure, not manuscript):
 *   - INFERNO_CHECKOUT_URL uses the raw lemonsqueezy domain; the Smoldering tier
 *     uses branded billing.liveadaptiv.com. Move it to the branded subdomain once
 *     you confirm the buy path resolves. Left working as-is so checkout isn't broken.
 *   - /audio/*.mp3 files must exist per pattern (rusher, fixer, freezer, mixed,
 *     return-to-baseline). Missing files hide the player gracefully. The
 *     regulated result is a STATE, not a fourth archetype — its track is a
 *     universal "return to baseline" briefing, not a "you are a Sovereign" reward.
 */

// ── Component ─────────────────────────────────────────────────────────────────

export default function KineticDiagnostic() {
  const [view, setView] = useState<'intro' | 'quiz' | 'processing' | 'results'>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  // Each entry is the selected option index for that question (or null).
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(assessment.length).fill(null));
  const [resultData, setResultData] = useState<any>(null);
  const [isGated, setIsGated] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedEmail, setCapturedEmail] = useState("");
  const [leadCaptureFailed, setLeadCaptureFailed] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('kineticState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only restore in-progress quizzes. Completed runs clear their own state
        // at the processing step, so a reload on the results screen no longer
        // dumps the user back onto the final question. Also guard against a
        // shape mismatch from a previously-shipped version of this assessment
        // (different question count) — a stale save from before this update
        // would otherwise misalign answers to the wrong questions.
        //
        // `currentIndex > 0` alone would drop a saved answer to question 1:
        // selecting an option there saves state while currentIndex is still 0,
        // so a reload before advancing lost that answer. Checking for any
        // non-null answer catches that case too.
        const hasProgress =
          Array.isArray(parsed.answers) && parsed.answers.some((a: unknown) => a !== null);
        if (
          Array.isArray(parsed.answers) &&
          parsed.answers.length === assessment.length &&
          typeof parsed.currentIndex === 'number' &&
          parsed.currentIndex >= 0 &&
          parsed.currentIndex < assessment.length &&
          hasProgress
        ) {
          setCurrentIndex(parsed.currentIndex);
          setAnswers(parsed.answers);
          setView('quiz');
        } else {
          localStorage.removeItem('kineticState');
        }
      } catch (err) {
        console.error('Failed to restore saved quiz state:', err);
        localStorage.removeItem('kineticState');
      }
    }
  }, []);

  const saveState = (idx: number, ans: (number | null)[]) => {
    localStorage.setItem('kineticState', JSON.stringify({ currentIndex: idx, answers: ans }));
  };

  const handleSelect = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = idx;
    setAnswers(newAnswers);
    saveState(currentIndex, newAnswers);
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      saveState(newIndex, answers);
    }
  };

  const calculateResults = (finalAnswers: (number | null)[]) => {
    setResultData(computeResult(finalAnswers));
  };

  const handleNext = () => {
    if (currentIndex < assessment.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      saveState(nextIndex, answers);
    } else {
      // Finished. Clear in-progress state so a reload here starts clean rather
      // than restoring onto the final question.
      localStorage.removeItem('kineticState');
      setView('processing');
      calculateResults(answers);
      setTimeout(() => setView('results'), 2000);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLeadCaptureFailed(false);

    const formData = new FormData(e.target as HTMLFormElement);
    const userEmail = formData.get('email') as string;

    try {
      const res = await fetch('/api/capture-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          b_name: formData.get('b_name'),
          // The server scores these itself and writes the email from its own
          // copy of the result, so nothing else from this page is sent.
          answers
        })
      });

      if (!res.ok) {
        console.error('capture-lead returned non-OK status:', res.status, await res.text().catch(() => ''));
        setLeadCaptureFailed(true);
      }
    } catch (err) {
      console.error('capture-lead request failed:', err);
      setLeadCaptureFailed(true);
    } finally {
      // Let the user through to their results regardless — never block someone
      // from their own result over a backend hiccup.
      setCapturedEmail(userEmail);
      setIsGated(false);
      setIsSubmitting(false);
    }
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (view === 'intro') {
    return (
      <div className="w-full text-center space-y-6">
        <div className="flex justify-center gap-3 mb-6 opacity-70">
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase border border-stone-800 px-2 py-1 rounded">Polyvagal-Informed</span>
          <span className="text-[10px] font-bold tracking-widest text-stone-400 uppercase border border-stone-800 px-2 py-1 rounded">No Third-Party Sharing</span>
        </div>
        <p className="text-gold-500 tracking-[0.2em] text-xs font-bold uppercase">LiveAdaptiv Ecosystem</p>
        <h1 className="text-4xl md:text-5xl font-serif italic text-stone-50 leading-tight">The Kinetic Blueprint<br/>Diagnostic.</h1>
        <p className="text-stone-400 max-w-md mx-auto text-sm leading-relaxed">Two readings in one: how your nervous system defaults under pressure, and how much friction you're actually carrying. Answer honestly — don't overthink it.</p>
        <button onClick={() => setView('quiz')} className="mt-8 px-8 py-3 bg-stone-50 text-stone-950 font-bold rounded-lg hover:bg-gold-400 transition-colors">Begin Assessment</button>
        <p className="text-stone-600 text-xs mt-4 flex items-center justify-center gap-2"><Lock className="w-3 h-3" /> Private and secure. Progress saves automatically.</p>
        <p className="text-stone-500 text-[10px] max-w-md mx-auto mt-6">
          The load reading is informed by the same constructs the Maslach Burnout Inventory measures — emotional exhaustion and depersonalization. It maps workplace friction, not a clinical diagnosis.
        </p>
      </div>
    );
  }

  // ── Processing ──────────────────────────────────────────────────────────────
  if (view === 'processing') {
    return (
      <div className="w-full text-center space-y-6 animate-pulse">
        <div className="w-16 h-16 border-2 border-stone-800 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
        <h2 className="text-2xl font-serif italic text-stone-50">Mapping your Kinetic Blueprint...</h2>
        <p className="text-stone-500 text-sm">Reading your default pattern and your friction load.</p>
      </div>
    );
  }

  // ── Quiz ────────────────────────────────────────────────────────────────────
  if (view === 'quiz') {
    const q = assessment[currentIndex];
    const progress = Math.round(((currentIndex + 1) / assessment.length) * 100);
    const selected = answers[currentIndex];
    const hasAnswer = selected !== null;
    const optionLabels = q.kind === 'pattern' ? q.options.map(o => o.text) : FREQUENCY.map(f => f.label);

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

        {q.kind === 'load' && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">How often is this true lately?</p>
        )}
        <h2 className="text-2xl font-serif italic text-stone-50 mb-6">{q.text}</h2>

        <div className="space-y-3 mb-8" role="radiogroup">
          {optionLabels.map((label, idx) => {
            const isSelected = selected === idx;
            return (
              <button
                key={idx}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-4 border rounded-xl flex items-center justify-between transition-all duration-200 group ${isSelected ? 'border-gold-500 bg-gold-500/5 text-gold-500' : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-600 hover:text-stone-200'}`}
              >
                <span className="text-sm">{label}</span>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-gold-500' : 'border-stone-600 group-hover:border-stone-400'}`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-gold-500"></div>}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-stone-800">
          <button onClick={handleBack} className={`text-sm text-stone-400 hover:text-stone-200 flex items-center gap-2 ${currentIndex === 0 ? 'invisible' : ''}`}><ArrowLeft className="w-4 h-4" /> Back</button>
          <button onClick={handleNext} disabled={!hasAnswer} className={`px-6 py-2 rounded-lg font-semibold transition-colors ${hasAnswer ? 'bg-stone-50 text-stone-950 hover:bg-gold-400' : 'bg-stone-800 text-stone-500 cursor-not-allowed'}`}>
            {currentIndex === assessment.length - 1 ? 'See Results' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  const loadPct = Math.round((resultData.loadScore / resultData.loadMax) * 100);

  return (
    <div className="w-full flex-col">
      <div className={`p-8 rounded-2xl mb-8 text-center border ${resultData.tierInfo.class}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">Your Current Default Under Pressure</p>
        <h2 className="text-4xl font-serif italic text-white mb-4">{resultData.primaryType}</h2>
        <p className="text-stone-300 text-sm mb-4 max-w-md mx-auto">{resultData.desc}</p>
        <p className="text-stone-500 text-xs italic mb-6 max-w-md mx-auto">This is a state, not a sentence. The goal isn't to erase the pattern — it's to shorten your Return Rate: how fast you catch it firing and step back.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900/50 rounded-lg border border-stone-800">
          <Gauge className="w-4 h-4 text-stone-400" />
          <span className="text-xs text-stone-400">Metabolic Load:</span>
          <span className={`text-sm font-bold tracking-wider uppercase ${resultData.tierInfo.color}`}>{resultData.tierInfo.name}</span>
          <span className="text-xs text-stone-500">({resultData.loadScore}/{resultData.loadMax})</span>
        </div>
        <div className="mt-3 h-1 w-40 mx-auto bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold-600 to-rose-500" style={{ width: `${loadPct}%` }}></div>
        </div>
      </div>

      {!audioFailed && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-gold-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-stone-300">LiveAdaptiv Audio Briefing</p>
              <p className="text-[10px] text-stone-500">A short breakdown of your current state</p>
            </div>
          </div>
          <audio controls className="w-full h-10 rounded" onError={() => setAudioFailed(true)}>
            <source src={resultData.audioSrc} type="audio/mpeg" />
          </audio>
        </div>
      )}

      {resultData.tierInfo.crisis && (
        <div className="mb-8 p-6 border border-rose-900/50 bg-rose-950/20 rounded-xl">
          <h3 className="text-rose-500 font-serif italic text-xl mb-2 flex items-center gap-2"><AlertCircle className="w-5 h-5" /> A moment of pause.</h3>
          <p className="text-stone-400 text-sm leading-relaxed mb-3">Your load reading sits in the highest band — the friction you're carrying is significant. The protocols below are built for immediate, acute triage. When you're ready, there's a precise system to help you stabilize.</p>
          <p className="text-stone-500 text-xs leading-relaxed border-t border-rose-900/30 pt-3">
            This tool measures workplace friction, not mental-health crisis. If you are in crisis or having thoughts of harming yourself, please contact the 988 Suicide &amp; Crisis Lifeline (call or text 988) or go to your nearest emergency room.
          </p>
        </div>
      )}

      {isGated ? (
        <div className="bg-stone-900 border border-stone-800 p-8 rounded-xl text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-950/90 pointer-events-none"></div>
          <div className="relative z-10">
            <LockKeyhole className="w-6 h-6 text-gold-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Your Recovery Protocols Are Ready</h3>
            <p className="text-stone-400 text-sm mb-6">Enter your email to open your tailored recovery systems, pattern analysis, and next step.</p>
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
              <input type="email" name="email" required placeholder="Enter your best email" className="flex-grow px-4 py-3 rounded-lg bg-stone-950 border border-stone-700 text-white text-sm focus:outline-none focus:border-gold-500" />
              <input type="text" name="b_name" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
              <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-gold-600 hover:bg-gold-500 text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap disabled:opacity-50">
                {isSubmitting ? 'Securing...' : 'Show My Protocols'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-6 animate-in fade-in duration-1000">
          {leadCaptureFailed && (
            <p className="text-[11px] text-stone-500 italic mb-4">
              We couldn't confirm your email saved on our end — your results below are unaffected, but you may not receive the follow-up materials. Reach out directly if that matters to you.
            </p>
          )}
          <h3 className="text-2xl font-serif italic border-b border-stone-800 pb-2 mb-6">Your Kinetic Protocols</h3>
          <ul className="space-y-4 text-sm text-stone-300">
            <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-gold-500 shrink-0" /> <span><strong>Protocol 1 — Ground.</strong> When you feel the pull of your default, press both feet flat to the floor for 60 seconds and name three things you can see.</span></li>
            <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-gold-500 shrink-0" /> <span><strong>Protocol 2 — Audit your yes.</strong> Say no to any new non-essential request for the next 48 hours. Protect the bandwidth before you rebuild it.</span></li>
            <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-gold-500 shrink-0" /> <span><strong>Protocol 3 — Your pattern.</strong> {resultData.patternProtocol}</span></li>
          </ul>
          <div className="mt-8 p-6 bg-stone-50 rounded-xl text-stone-950 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Your Next Step</p>
            <h4 className="text-2xl font-serif italic mb-3">{resultData.tierInfo.cta}</h4>
            <p className="text-sm text-stone-600 mb-6">{resultData.tierInfo.ctaDesc}</p>

            <a
              href={resultData.tierInfo.isFree
                ? resultData.tierInfo.checkoutUrl
                : `${resultData.tierInfo.checkoutUrl}?checkout[email]=${encodeURIComponent(capturedEmail)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-stone-950 text-white font-bold rounded-lg hover:bg-stone-800 transition"
            >
              {resultData.tierInfo.isFree ? "Launch Now" : "Access System Now"}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
