// lib/blueprint.ts — the Kinetic Blueprint assessment and its scoring.
// ─────────────────────────────────────────────────────────────
// Shared by the quiz (app/page.tsx) and the lead endpoint
// (app/api/capture-lead/route.ts). The endpoint scores the raw answers
// itself and emails only text built here, so a request can't choose what
// gets sent from send.liveadaptiv.com. See the comment at the top of
// app/page.tsx for the design of the two axes.
// ─────────────────────────────────────────────────────────────

// ── Product / routing config (edit these, not the logic below) ───────────────

export const SMOLDERING_CHECKOUT_URL =
  "https://billing.liveadaptiv.com/checkout/buy/68001ac0-e86f-4135-846e-7cf66779a923";

export const INFERNO_PRODUCT = "Burnout Rescue Workbook";
export const INFERNO_CHECKOUT_URL =
  "https://liveadaptiv.lemonsqueezy.com/checkout/buy/aab07394-9db6-46d1-8972-60038742f1b7"; // TODO(alex): move to billing.liveadaptiv.com

// LOAD score runs 0–24 (6 items × 0–4). Tune to the manuscript's bands.
export const LOAD_TIERS = {
  frictionMax: 8,   // 0–8   → Friction   (free)
  smolderingMax: 16 // 9–16  → Smoldering (paid) ; 17–24 → Inferno (crisis)
};

// ── Assessment ───────────────────────────────────────────────────────────────

export type PatternType = 'rusher' | 'fixer' | 'freezer' | 'integrated';

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

export type Question = PatternQuestion | LoadQuestion;

// Shared frequency scale for the load items (MBI-style, 5-point).
export const FREQUENCY: { label: string; value: number }[] = [
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
export const loadQuestions: LoadQuestion[] = [
  { kind: 'load', id: 11, text: "I wake up already depleted, before the day has started." },
  { kind: 'load', id: 12, text: "I feel emotionally drained by my work." },
  { kind: 'load', id: 13, text: "Small requests land like heavy ones." },
  { kind: 'load', id: 14, text: "By the end of the day I have nothing left to give." },
  { kind: 'load', id: 15, text: "I've grown more detached or cynical about the people I work with." },
  { kind: 'load', id: 16, text: "I've stopped caring whether the work gets done well." }
];

export const assessment: Question[] = [...patternQuestions, ...loadQuestions];

export type TierInfo = {
  name: 'Friction' | 'Smoldering' | 'Inferno';
  class: string;
  color: string;
  cta: string;
  ctaDesc: string;
  checkoutUrl: string;
  isFree: boolean;
  crisis: boolean;
};

export type BlueprintResult = {
  primaryType: string;
  desc: string;
  tierInfo: TierInfo;
  audioSrc: string;
  isMixed: boolean;
  dominant: PatternType | null;
  loadScore: number;
  loadMax: number;
  patternProtocol: string;
};

// True when `answers` is one in-range option index per question.
export function isCompleteAnswerSet(answers: unknown): answers is number[] {
  if (!Array.isArray(answers) || answers.length !== assessment.length) return false;
  return answers.every((a, i) => {
    const q = assessment[i];
    const max = q.kind === 'pattern' ? q.options.length : FREQUENCY.length;
    return Number.isInteger(a) && a >= 0 && a < max;
  });
}

export function computeResult(finalAnswers: (number | null)[]): BlueprintResult {
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
  let tierInfo: TierInfo;
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

  return {
    primaryType,
    desc,
    tierInfo,
    audioSrc,
    isMixed,
    dominant,
    loadScore,
    loadMax: loadQuestions.length * 4,
    patternProtocol
  };
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Grammatical list join ("Rusher", "Rusher and Fixer", "Rusher, Fixer, and
// Freezer") — up to three pattern names can tie, and plain .join(conjunction)
// reads as "Rusher and Fixer and Freezer" once all three do.
export function joinWithAnd(items: string[], conjunction: string): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return items.join(` ${conjunction} `);
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}
