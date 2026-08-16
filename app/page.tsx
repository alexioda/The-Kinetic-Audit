"use client";

import { useState, useEffect } from 'react';
import { Lock, ArrowLeft, Headphones, AlertCircle, LockKeyhole, CheckCircle, Gauge } from 'lucide-react';

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
 *     LOAD_TIERS numbers below are a product decision, not a book fact — set
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

// ── Product / routing config (edit these, not the logic below) ───────────────

const SMOLDERING_CHECKOUT_URL =
  "https://billing.liveadaptiv.com/checkout/buy/68001ac0-e86f-4135-846e-7cf66779a923";

const INFERNO_PRODUCT = "Burnout Rescue Workbook";
const INFERNO_CHECKOUT_URL =
  "https://liveadaptiv.lemonsqueezy.com/checkout/buy/aab07394-9db6-46d1-8972-60038742f1b7"; // TODO(alex): move to billing.liveadaptiv.com

// LOAD score runs 0–24 (6 items × 0–4). Tune to the manuscript's bands.
const LOAD_TIERS = {
  frictionMax: 8,   // 0–8   → Friction   (free)
  smolderingMax: 16 // 9–16  → Smoldering (paid) ; 17–24 → Inferno (crisis)
};

// ── Assessment ───────────────────────────────────────────────────────────────

type PatternType = 'rusher' | 'fixer' | 'freezer' | 'integrated';

type PatternQuestion = {
  kind: 'pattern';
  id: number;
  text: string;
  options: { text: string; type: PatternType }[];
};

type LoadQuestion = {
  kind: 'load';
  id: number;
  text: string;
};

type Question = PatternQuestion | LoadQuestion;

// Shared frequency scale for the load items (MBI-style, 5-point).
const FREQUENCY: { label: string; value: number }[] = [
  { label: "Never", value: 0 },
  { label: "Rarely", value: 1 },
  { label: "Sometimes", value: 2 },
  { label: "Often", value: 3 },
  { label: "Almost daily", value: 4 }
];

const patternQuestions: PatternQuestion[] = [
  {
    kind: 'pattern',
    id: 1,
    text: "When a project timeline suddenly collapses, your immediate physiological response is:",
    options: [
      { text: "My face stays still and my voice stays level — nobody watching would know anything shifted.", type: "freezer" },
      { text: "Heart rate spikes; I immediately start firing off directives.", type: "rusher" },
      { text: "I feel a weight in my chest and silently rewrite the entire plan myself.", type: "fixer" },
      { text: "I pause, breathe, and systematically assess the new constraints.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 2,
    text: "How do you internally view the people on your team when under extreme pressure?",
    options: [
      { text: "As people to keep at a distance until the pressure passes.", type: "freezer" },
      { text: "As obstacles slowing me down.", type: "rusher" },
      { text: "As dependents who need me to save them.", type: "fixer" },
      { text: "As capable adults experiencing friction.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 3,
    text: "Your relationship with your email inbox at 9:00 PM is best described as:",
    options: [
      { text: "Sealed off. I've shut the door on it, though it's still humming in the background.", type: "freezer" },
      { text: "Combative. I must hit inbox zero before I can rest.", type: "rusher" },
      { text: "Anxious. I check it to make sure nothing caught fire.", type: "fixer" },
      { text: "Detached. Notifications are off.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 4,
    text: "When facing a systemic bottleneck, your default operational mode shifts to:",
    options: [
      { text: "Holding a calm, unreadable exterior while I quietly wait it out.", type: "freezer" },
      { text: "Overriding the system with sheer force and velocity.", type: "rusher" },
      { text: "Absorbing the workload to make sure it gets done correctly.", type: "fixer" },
      { text: "Identifying the root constraint and adjusting the workflow.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 5,
    text: "How does your body physically carry extended periods of friction?",
    options: [
      { text: "Outward stillness over a clenched, braced interior — the calm is holding something down.", type: "freezer" },
      { text: "Jaw clenching, shallow breathing, and restless energy.", type: "rusher" },
      { text: "Shoulder tension, headaches, and chronic fatigue.", type: "fixer" },
      { text: "I catch early tension and metabolize it through movement.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 6,
    text: "When someone on your team makes a critical error, your internal narrative is:",
    options: [
      { text: "'Reveal nothing. Stay level. Don't let them see this land.'", type: "freezer" },
      { text: "'I don't have time for this; I'll push it through myself.'", type: "rusher" },
      { text: "'I should have watched them closer; I'll fix this for them.'", type: "fixer" },
      { text: "'This is a system gap; how do we build a better guardrail?'", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 7,
    text: "Your approach to establishing and holding professional boundaries is:",
    options: [
      { text: "Rigid and isolating. I build walls to keep demands out.", type: "freezer" },
      { text: "Non-existent. Boundaries slow down progress.", type: "rusher" },
      { text: "Guilt-ridden. I say 'yes' to protect others from friction.", type: "fixer" },
      { text: "Clear and communicated. I protect my baseline bandwidth.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 8,
    text: "With a completely open Sunday afternoon, you are most likely to:",
    options: [
      { text: "Retreat somewhere quiet and unreachable, where no one needs anything from me.", type: "freezer" },
      { text: "Pace the house or get a head start on Monday's tasks.", type: "rusher" },
      { text: "Spend it on favors, errands, or emotional labor for others.", type: "fixer" },
      { text: "Choose deliberate recovery — hobbies, movement, active rest.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 9,
    text: "When conflict arises in a meeting, your autonomic response pulls you to:",
    options: [
      { text: "Go quiet and unreadable, waiting for it to pass.", type: "freezer" },
      { text: "Dominate the conversation and force a resolution.", type: "rusher" },
      { text: "Mediate hard to make everyone comfortable again.", type: "fixer" },
      { text: "Hold space for the friction without absorbing the anxiety.", type: "integrated" }
    ]
  },
  {
    kind: 'pattern',
    id: 10,
    text: "How do you view your own capacity for output?",
    options: [
      { text: "Steady on the surface. I hold it together by sealing off what I'm carrying.", type: "freezer" },
      { text: "Infinite, as long as I keep my momentum high.", type: "rusher" },
      { text: "Tied to my worth; I have to be useful to be valuable.", type: "fixer" },
      { text: "Finite and cyclical. It needs systems to stay sustainable.", type: "integrated" }
    ]
  }
];

// Frequency-rated LOAD items. These measure severity independently of pattern —
// tapping emotional exhaustion + depersonalization, the two constructs named in
// the intro. Ordered from lower to higher signal.
const loadQuestions: LoadQuestion[] = [
  { kind: 'load', id: 11, text: "I wake up already depleted, before the day has started." },
  { kind: 'load', id: 12, text: "I feel emotionally drained by my work." },
  { kind: 'load', id: 13, text: "Small requests land like heavy ones." },
  { kind: 'load', id: 14, text: "By the end of the day I have nothing left to give." },
  { kind: 'load', id: 15, text: "I've grown more detached or cynical about the people I work with." },
  { kind: 'load', id: 16, text: "I've stopped caring whether the work gets done well." }
];

const assessment: Question[] = [...patternQuestions, ...loadQuestions];

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
    // ── Axis 1: PATTERN ──────────────────────────────────────────────────────
    const types: Record<PatternType, number> = { rusher: 0, fixer: 0, freezer: 0, integrated: 0 };
    // ── Axis 2: LOAD ─────────────────────────────────────────────────────────
    let loadScore = 0;

    finalAnswers.forEach((optIdx, i) => {
      if (optIdx == null) return;
      const q = assessment[i];
      if (q.kind === 'pattern') {
        const t = q.options[optIdx]?.type;
        if (t) types[t]++;
      } else {
        loadScore += FREQUENCY[optIdx]?.value ?? 0;
      }
    });

    // --- Resolve the pattern (which default dominates under pressure) ---
    const maxOverall = Math.max(types.rusher, types.fixer, types.freezer, types.integrated);

    let primaryType = "A Regulated Baseline";
    let desc = "Under pressure, you're currently metabolizing friction rather than being run by it. This isn't a fourth type — it's a state, the one all three patterns return to. Sovereignty isn't never leaving it; it's how fast you come back.";
    let audioSrc = "/audio/return-to-baseline.mp3";
    let patternProtocol =
      "Maintenance protocol. Keep one daily recovery anchor non-negotiable — the practice that holds this is the practice you'll drop first when load climbs. The three defaults are mapped in full in Metabolize.";
    let dominant: PatternType | null = null;
    let isMixed = false;

    if (maxOverall > 0 && types.integrated < maxOverall) {
      const tied: PatternType[] = [];
      if (types.rusher === maxOverall) tied.push("rusher");
      if (types.fixer === maxOverall) tied.push("fixer");
      if (types.freezer === maxOverall) tied.push("freezer");

      if (tied.length > 1) {
        isMixed = true;
        const label = tied.map(cap).join(" / ");
        primaryType = `Mixed Default: ${label}`;
        desc = `Right now your default shifts between ${joinWithAnd(tied.map(cap), "and")} depending on the load. That fluidity is information, not a flaw — it tells you which state to catch first.`;
        audioSrc = "/audio/mixed.mp3";
        patternProtocol =
          "Orienting protocol. Slowly turn your head left and right, letting your eyes drift across the room without fixing on anything, for 30 seconds. This re-engages the social-engagement system and can interrupt both the freeze and the fight/flight loop.";
      } else {
        dominant = tied[0];
        if (dominant === "freezer") {
          primaryType = "The Freezer";
          desc = "Under pressure, your system currently contains — the exterior composes itself, the voice stays level, while the activation stays locked inside. It reads as grace under pressure. It is also expensive, and it is trainable.";
          audioSrc = "/audio/freezer.mp3";
          patternProtocol =
            "Activation protocol. Stand up and take 10 slow steps, feeling each foot fully land. Freeze is exited through gentle movement, not through more thinking.";
        } else if (dominant === "rusher") {
          primaryType = "The Rusher";
          desc = "Under pressure, your system currently accelerates — sympathetic activation, pushing through by force and speed. A state your body has learned, not a trait you're stuck with.";
          audioSrc = "/audio/rusher.mp3";
          patternProtocol =
            "Deceleration protocol. Make your exhale longer than your inhale — in for four, out for six — for six breaths. The long exhale is the one lever that talks directly to the brake.";
        } else if (dominant === "fixer") {
          primaryType = "The Fixer";
          desc = "Under pressure, you currently over-function — absorbing the system's anxiety and carrying what isn't yours. A learned pattern, not an identity.";
          audioSrc = "/audio/fixer.mp3";
          patternProtocol =
            "Boundary protocol. Before you take on the next thing, ask one question out loud: 'Whose problem is this to solve?' Name the owner before you pick it up.";
        }
      }
    } else if (maxOverall > 0 && types.integrated === maxOverall) {
      // Regulated is (tied for) highest. This is NOT a fourth archetype — it is
      // a state. But we still surface the pattern they LEAN toward under heavier
      // load, pulled from their actual answers: either a survival pattern tied at
      // the top (emerging), or the highest-scoring one below it (quiet lean).
      primaryType = "A Regulated Baseline";
      audioSrc = "/audio/return-to-baseline.mp3";

      const emerging: PatternType[] = [];
      if (types.rusher === maxOverall) emerging.push("rusher");
      if (types.fixer === maxOverall) emerging.push("fixer");
      if (types.freezer === maxOverall) emerging.push("freezer");

      const leanMax = Math.max(types.rusher, types.fixer, types.freezer);
      const lean: PatternType[] = [];
      if (leanMax > 0) {
        if (types.rusher === leanMax) lean.push("rusher");
        if (types.fixer === leanMax) lean.push("fixer");
        if (types.freezer === leanMax) lean.push("freezer");
      }

      if (emerging.length > 0) {
        desc = `You're largely regulated under pressure — no pattern is running the show. There's an emerging ${joinWithAnd(emerging.map(cap), "and")} lean worth catching before it becomes the default. That's the one to watch, not to fix.`;
        patternProtocol =
          `Watch protocol. Your lean is ${emerging.map(cap).join(" / ")}. Learn its earliest physical signal — noticing it IS the Return Rate. The pattern is mapped in full in Metabolize.`;
      } else if (lean.length > 0) {
        desc = `You're regulated right now — no survival pattern is running the show. If anything tips you under heavier load, it leans toward ${joinWithAnd(lean.map(cap), "or")}. Worth knowing before it gets loud.`;
        patternProtocol =
          `Watch protocol. Your quiet lean is ${lean.map(cap).join(" / ")}. You don't need to fix it — just learn its early signal so your Return Rate stays fast. It's mapped in full in Metabolize.`;
      } else {
        desc = "You're regulated right now, and no single pattern surfaced. The three defaults — Rusher, Fixer, Freezer — are the terrain, not a verdict. Knowing all three is what keeps your Return Rate fast.";
        patternProtocol =
          "Map protocol. Read the three defaults — Rusher, Fixer, Freezer — as states, not types. Metabolize walks all three, and the Return Rate that keeps you here.";
      }
    }

    // --- Resolve the load tier (severity) — driven ONLY by the load score ---
    let tierInfo: any;
    if (loadScore <= LOAD_TIERS.frictionMax) {
      tierInfo = {
        name: "Friction",
        class: "border-teal-500 bg-gradient-to-br from-[#0f2a20] to-[#0c0a09]",
        color: "text-teal-600",
        cta: "Sovereign Command Center",
        ctaDesc: "A free daily protocol to metabolize friction before it compounds.",
        checkoutUrl: "https://sovereign.liveadaptiv.com",
        isFree: true,
        crisis: false
      };
    } else if (loadScore <= LOAD_TIERS.smolderingMax) {
      tierInfo = {
        name: "Smoldering",
        class: "border-gold-500 bg-gradient-to-br from-[#2a1f0d] to-[#0c0a09]",
        color: "text-gold-600",
        cta: "Adaptiv App",
        ctaDesc: "Track your states, catch energy leaks, and adjust your defaults daily.",
        checkoutUrl: SMOLDERING_CHECKOUT_URL,
        isFree: false,
        crisis: false
      };
    } else {
      tierInfo = {
        name: "Inferno",
        class: "border-rose-500 bg-gradient-to-br from-[#2a0d0d] to-[#0c0a09]",
        color: "text-rose-600",
        cta: INFERNO_PRODUCT,
        ctaDesc: "A structured, immediate triage system to halt the spiral.",
        checkoutUrl: INFERNO_CHECKOUT_URL,
        isFree: false,
        crisis: true
      };
    }

    setResultData({
      primaryType,
      desc,
      tierInfo,
      audioSrc,
      isMixed,
      dominant,
      loadScore,
      loadMax: loadQuestions.length * 4,
      patternProtocol
    });
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
          pattern: resultData.primaryType,
          loadScore: resultData.loadScore,
          tier: resultData.tierInfo.name
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

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Grammatical list join ("Rusher", "Rusher and Fixer", "Rusher, Fixer, and
// Freezer") — up to three pattern names can tie, and plain .join(conjunction)
// reads as "Rusher and Fixer and Freezer" once all three do.
function joinWithAnd(items: string[], conjunction: string): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return items.join(` ${conjunction} `);
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}
