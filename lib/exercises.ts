/**
 * SmartSpeak curriculum.
 *
 * SmartSpeak is a presentation coach for work. The product is a daily trainer of
 * short (~1 minute) guided reps built around the moments that actually decide a
 * meeting: reading out findings, walking a deck, pitching a strategy, defending
 * an implementation plan, giving a status update, and handling tough questions.
 *
 * Reps are organised into three skill paths:
 *   DELIVERY    — the technical craft: pace, deliberate pauses, vocal authority,
 *                 emphasis on the numbers, and zero filler.
 *   STRUCTURE   — leading with the point (BLUF), turning data into a "so what",
 *                 and making one idea land and stick.
 *   INFLUENCE   — persuading stakeholders, making a clear ask, and staying
 *                 composed and credible under questions.
 *
 * Each path is an ordered "path" of exercises. Exercises declare which
 * dimensions they train so the coach can weight feedback toward what the
 * presenter is actually practising.
 */

export type TrackId = 'delivery' | 'structure' | 'influence';

export type ExerciseType =
  | 'read' // read provided text aloud (great for pace / emphasis drills)
  | 'topic' // respond to a realistic work prompt
  | 'story'; // walk through a connected, multi-beat narrative

/** Dimensions the coach can score. Delivery ones come from audio analysis. */
export type Dimension =
  | 'pace'
  | 'pauses'
  | 'intonation'
  | 'energy'
  | 'fillers'
  | 'hook'
  | 'structure'
  | 'clarity'
  | 'concreteness';

export interface Track {
  id: TrackId;
  name: string;
  tagline: string;
  emoji: string;
  /** Tailwind gradient classes used for the track's path + accents. */
  gradient: string;
  accent: string; // hex, used for rings / charts
}

export interface Exercise {
  id: string;
  track: TrackId;
  order: number;
  level: number;
  title: string;
  emoji: string;
  /** One-line description shown on the path node. */
  summary: string;
  type: ExerciseType;
  /** The real work moment this rep rehearses (shown as a chip). */
  scenario: string;
  /** Target speaking time in seconds (the recommended length of the take). */
  targetSeconds: number;
  /** Step-by-step instructions shown before recording. */
  instructions: string[];
  /** Optional passage to read (type === 'read'). */
  readingText?: string;
  /** Optional prompt to respond to (type === 'topic' | 'story'). */
  prompt?: string;
  /** Dimensions this exercise trains, ordered by importance. */
  focus: Dimension[];
  /** Coaching tips surfaced before and after the take. */
  tips: string[];
  /** Base XP awarded for completing a take. */
  xp: number;
}

export const TRACKS: Record<TrackId, Track> = {
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    tagline: 'Pace, pauses & vocal authority',
    emoji: '🎙️',
    gradient: 'from-violet-500 to-indigo-600',
    accent: '#7c3aed',
  },
  structure: {
    id: 'structure',
    name: 'Structure',
    tagline: 'Lead with the point, make it land',
    emoji: '🧩',
    gradient: 'from-sky-500 to-blue-600',
    accent: '#2563eb',
  },
  influence: {
    id: 'influence',
    name: 'Influence & Q&A',
    tagline: 'Persuade and hold up under pressure',
    emoji: '🤝',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#10b981',
  },
};

export const EXERCISES: Exercise[] = [
  // ─────────────────────────── DELIVERY ───────────────────────────
  {
    id: 'd1-pace',
    track: 'delivery',
    order: 1,
    level: 1,
    title: 'Boardroom Pace',
    emoji: '🏃',
    summary: 'Present at a steady, confident ~140 words/min.',
    type: 'read',
    scenario: 'Opening a presentation',
    targetSeconds: 60,
    focus: ['pace', 'pauses'],
    readingText:
      'Thanks everyone for making the time. In the next ten minutes I want to walk you through what we found, what it means for the roadmap, and the one decision I need from this group today. I will keep it tight, leave room for questions, and flag clearly where I am confident and where we are still learning. Let us start with the headline, and then I will show you the evidence behind it.',
    instructions: [
      'Read the passage aloud as if you were opening a real meeting.',
      'Aim for roughly 130–160 words per minute — about this passage in ~30 seconds.',
      "Don't rush the last line. Let the final sentence settle before you'd move to the next slide.",
    ],
    tips: ['Pick one person to present to, not the whole room.', 'Slowing down by 10% almost always reads as more senior on playback.'],
    xp: 20,
  },
  {
    id: 'd2-pause',
    track: 'delivery',
    order: 2,
    level: 1,
    title: 'The Power Pause',
    emoji: '⏸️',
    summary: 'Use deliberate silence before your key number and your ask.',
    type: 'read',
    scenario: 'Landing a key point',
    targetSeconds: 55,
    focus: ['pauses', 'pace'],
    readingText:
      'Here is the number that matters. [pause] Revenue from the new segment grew forty percent quarter over quarter. [pause] That is not a blip — it is the trend we bet on a year ago. So here is what I am asking for. [pause] Move two engineers onto this team for the next quarter, and let us double down while the window is open.',
    instructions: [
      'Read aloud and take a real, full second of silence everywhere it says [pause].',
      'Do not say the word "pause" — just stop, count one-one-thousand, and continue.',
      'Notice how the silence makes the number and the ask feel deliberate, not nervous.',
    ],
    tips: ['A pause feels twice as long to you as it does to the room.', 'Pause before your key point, not just after it.'],
    xp: 20,
  },
  {
    id: 'd3-fillers',
    track: 'delivery',
    order: 3,
    level: 2,
    title: 'Cut the Filler',
    emoji: '🚫',
    summary: 'Give a 60s status update with zero "um", "uh" or "like".',
    type: 'topic',
    scenario: 'Status update',
    targetSeconds: 60,
    focus: ['fillers', 'pauses', 'pace'],
    prompt: 'Give a quick status update on a project you are working on: where it stands, what is on track, and what is at risk.',
    instructions: [
      'Speak for about a minute as if updating your team in a standup.',
      'Every time you would say "um", "uh", "like", "so", or "you know" — pause silently instead.',
      'A clean silence always sounds more in-control than a filler word.',
    ],
    tips: ['Fillers are a fear of silence. Replace each one with a breath.', 'Slowing down gives your brain time to find the next word.'],
    xp: 25,
  },
  {
    id: 'd4-emphasis',
    track: 'delivery',
    order: 4,
    level: 2,
    title: 'Land the Number',
    emoji: '🎵',
    summary: 'Beat the monotone — put weight on the metrics that matter.',
    type: 'read',
    scenario: 'Presenting results',
    targetSeconds: 55,
    focus: ['intonation', 'energy', 'pace'],
    readingText:
      'The results are in, and they are better than we expected. Sign-ups are up sixty percent. Support tickets are down by a third. And — this is the one I care about most — customers who tried the new flow were twice as likely to come back the next week. Three numbers, one story: the change is working, and it is working faster than we planned.',
    instructions: [
      'Read this like you are genuinely pleased to share good results.',
      'Lift your pitch and slow down on each number — let "sixty percent", "a third", and "twice" stand out.',
      'Drop your voice on the closing line so it lands with authority.',
    ],
    tips: ['Monotone reads as boredom or nerves, even when you feel neither.', 'Say the number ~20% slower than the words around it and it will sound important.'],
    xp: 25,
  },
  {
    id: 'd5-presence',
    track: 'delivery',
    order: 5,
    level: 3,
    title: 'Command the Room',
    emoji: '💥',
    summary: 'Open a meeting with calm energy and presence.',
    type: 'topic',
    scenario: 'Kicking off a meeting',
    targetSeconds: 70,
    focus: ['energy', 'intonation', 'pauses', 'pace'],
    prompt: 'Kick off a meeting you actually run or attend. Welcome the room, set the agenda in one breath, and say why it matters today.',
    instructions: [
      'Start with a warm, confident greeting — then a beat of silence.',
      'State the purpose and the agenda crisply: "Today we will cover X, decide Y, and leave with Z."',
      'Vary your energy — warm on the welcome, firm on the purpose.',
    ],
    tips: ['Energy is contagious in a room — and so is flatness.', 'Stand up if you can. Your voice and presence follow your posture.'],
    xp: 30,
  },

  // ─────────────────────────── STRUCTURE ───────────────────────────
  {
    id: 's1-bluf',
    track: 'structure',
    order: 1,
    level: 1,
    title: 'Lead With the Headline',
    emoji: '🗞️',
    summary: 'Answer first: state the finding and recommendation up front.',
    type: 'topic',
    scenario: 'Discussing findings',
    targetSeconds: 45,
    focus: ['hook', 'clarity', 'structure'],
    prompt:
      'You have just finished a piece of analysis. In your first two sentences, give the single most important finding and what you recommend we do — before any background or methodology.',
    instructions: [
      'Open with the bottom line: "The headline is… and I recommend we…".',
      'No throat-clearing ("So, the way we approached this was…"). The conclusion comes first.',
      'Only after the headline, give one sentence of the why.',
    ],
    tips: ['Busy audiences decide in the first 15 seconds whether to lean in.', 'If they had to leave after one sentence, what is the one thing they must hear?'],
    xp: 25,
  },
  {
    id: 's2-finding',
    track: 'structure',
    order: 2,
    level: 1,
    title: 'Present a Finding',
    emoji: '📊',
    summary: 'Turn one data point into data → insight → so-what.',
    type: 'topic',
    scenario: 'Findings readout',
    targetSeconds: 70,
    focus: ['structure', 'concreteness', 'clarity'],
    prompt:
      'Walk me through one finding from recent work in three beats: what the data showed, what it means, and what we should do about it.',
    instructions: [
      'Beat 1 — the data: one specific number or observation.',
      'Beat 2 — the insight: what it actually means (the "so what").',
      'Beat 3 — the action: what you recommend because of it.',
    ],
    tips: ['A number with no "so what" is trivia. Always land the implication.', 'Name the one metric that matters most and build around it.'],
    xp: 30,
  },
  {
    id: 's3-simple',
    track: 'structure',
    order: 3,
    level: 2,
    title: 'Explain It Simply',
    emoji: '🧠',
    summary: 'Explain something technical to a non-expert stakeholder.',
    type: 'topic',
    scenario: 'Briefing a stakeholder',
    targetSeconds: 75,
    focus: ['clarity', 'concreteness', 'structure'],
    prompt:
      'Explain a technical or specialised part of your work to a senior stakeholder who is smart but not an expert. No jargon.',
    instructions: [
      'Use plain words. Trade every acronym and bit of jargon for everyday language.',
      'Lean on one analogy or comparison to something they already understand.',
      'Short sentences. One idea at a time.',
    ],
    tips: ['If you must use a technical term, follow it instantly with "which just means…".', 'A concrete example beats a precise definition every time.'],
    xp: 30,
  },
  {
    id: 's4-deck',
    track: 'structure',
    order: 4,
    level: 2,
    title: 'Walk the Deck',
    emoji: '🖥️',
    summary: 'Narrate three slides as one connected story — no reading.',
    type: 'story',
    scenario: 'Deck walkthrough',
    targetSeconds: 90,
    focus: ['structure', 'hook', 'clarity', 'concreteness'],
    prompt:
      'Imagine three slides: (1) the problem, (2) your recommendation, (3) the impact. Talk me through them as one connected story — the way you would present, not read, a deck.',
    instructions: [
      'Open on the problem so the recommendation feels needed.',
      'Use transitions to connect the slides ("which is why…", "so we should…", "and that means…").',
      'Finish on the impact — the change your recommendation creates.',
    ],
    tips: ['Slides are your backdrop, not your script — talk to the room, not the screen.', 'Each slide should earn the next one. If it does not advance the story, cut it.'],
    xp: 35,
  },
  {
    id: 's5-onebigidea',
    track: 'structure',
    order: 5,
    level: 3,
    title: 'The One Big Idea',
    emoji: '🎯',
    summary: 'Make one strategic point land hard and stick.',
    type: 'topic',
    scenario: 'Pitching a strategy',
    targetSeconds: 90,
    focus: ['structure', 'clarity', 'concreteness', 'hook'],
    prompt:
      'You have 90 seconds with leadership to land one strategic idea. State it in one clear sentence, prove it with a single example, then repeat it in different words.',
    instructions: [
      'Open by stating your single core message in one sentence.',
      'Give one story, number, or example that proves it.',
      'Close by restating the core message — slightly reworded so it sticks.',
    ],
    tips: ['Make three points and people remember none. Make one and they repeat it for you.', 'The sentence they quote in the hallway afterwards is the one you should rehearse.'],
    xp: 40,
  },

  // ─────────────────────────── INFLUENCE ───────────────────────────
  {
    id: 'i1-execsummary',
    track: 'influence',
    order: 1,
    level: 1,
    title: 'The 60-Second Summary',
    emoji: '⏱️',
    summary: 'Summarise a whole project for a busy executive.',
    type: 'topic',
    scenario: 'Executive summary',
    targetSeconds: 60,
    focus: ['structure', 'clarity', 'concreteness'],
    prompt:
      'A senior leader stops you in the hallway: "Give me the 60-second version." Summarise the situation, your recommendation, and the one thing you need from them.',
    instructions: [
      'Situation in one or two sentences — where things stand.',
      'Recommendation — what you think we should do, stated plainly.',
      'The ask — the single decision or support you need, and by when.',
    ],
    tips: ['Executives buy the recommendation, not the journey. Lead with it.', 'End on the ask so they know exactly what to do next.'],
    xp: 30,
  },
  {
    id: 'i2-ask',
    track: 'influence',
    order: 2,
    level: 1,
    title: 'Make the Ask',
    emoji: '🙋',
    summary: 'Ask for budget, headcount, or a decision — clearly.',
    type: 'topic',
    scenario: 'Asking for resources',
    targetSeconds: 60,
    focus: ['clarity', 'concreteness', 'energy'],
    prompt:
      'Ask for what your project actually needs — budget, a hire, or a decision. Be specific about what you need, why it matters, and by when.',
    instructions: [
      'Name the ask in one direct sentence — no hedging or apologising.',
      'Tie it to the outcome it unlocks and the cost of waiting.',
      'Give a clear deadline so the ask cannot quietly stall.',
    ],
    tips: ['"It would be great to maybe get some help" gets nothing. Ask for the specific thing.', 'Confidence in the ask signals confidence in the plan.'],
    xp: 30,
  },
  {
    id: 'i3-toughq',
    track: 'influence',
    order: 3,
    level: 2,
    title: 'Handle the Tough Question',
    emoji: '🛡️',
    summary: 'Stay composed and answer-first under pressure.',
    type: 'topic',
    scenario: 'Q&A under pressure',
    targetSeconds: 60,
    focus: ['clarity', 'structure', 'pauses', 'concreteness'],
    prompt:
      'A stakeholder challenges you: "Why should we believe this will actually work?" Take a breath, answer directly first, acknowledge the concern, and back it up with evidence.',
    instructions: [
      'Pause for a full second before you answer — composure reads as credibility.',
      'Lead with a direct answer, then say "and the reason I am confident is…".',
      'Acknowledge the concern honestly; do not get defensive or over-explain.',
    ],
    tips: ['A one-second pause before answering makes you look thoughtful, not stumped.', 'Answer the question they asked first; add nuance second.'],
    xp: 35,
  },
  {
    id: 'i4-plan',
    track: 'influence',
    order: 4,
    level: 2,
    title: 'Defend the Plan',
    emoji: '🗂️',
    summary: 'Walk an implementation plan: ships-first, milestones, risk.',
    type: 'story',
    scenario: 'Implementation plan',
    targetSeconds: 90,
    focus: ['structure', 'concreteness', 'clarity'],
    prompt:
      'Present your implementation plan: what ships first, the two or three key milestones, and the single biggest risk and how you will manage it.',
    instructions: [
      'Start with what ships first and why that is the right first step.',
      'Name the milestones with rough timing — make it feel real and sequenced.',
      'Surface the biggest risk yourself, then your mitigation. Owning it builds trust.',
    ],
    tips: ['Naming your own risk disarms the person about to raise it.', 'Specific milestones with dates sound like a plan; vague phases sound like a wish.'],
    xp: 35,
  },
  {
    id: 'i5-buyin',
    track: 'influence',
    order: 5,
    level: 3,
    title: 'Bring Them With You',
    emoji: '🤝',
    summary: 'Win over a skeptical team and end on a call to action.',
    type: 'topic',
    scenario: 'Driving buy-in',
    targetSeconds: 90,
    focus: ['hook', 'structure', 'energy', 'clarity'],
    prompt:
      'Convince a skeptical team to get behind a change. Name the objection out loud, answer it head-on, and finish with a clear call to action.',
    instructions: [
      'Open by naming the elephant in the room — the objection they are already thinking.',
      'Answer it directly, then make the case for the change with one concrete benefit.',
      'End on a specific call to action: what you want them to do, starting when.',
    ],
    tips: ['Saying the objection out loud first earns the right to be heard.', 'People commit to a clear next step, not a vague "let us align".'],
    xp: 40,
  },
];

export const exercisesByTrack = (track: TrackId): Exercise[] =>
  EXERCISES.filter((e) => e.track === track).sort((a, b) => a.order - b.order);

export const getExercise = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);

/**
 * The next exercise the presenter should do: the first one they have not yet
 * attempted, in path order. Falls back to the very first exercise. Powers the
 * "Continue" / "Today's focus" card on the home screen.
 */
export const nextExercise = (attempted: (id: string) => boolean): Exercise => {
  return EXERCISES.find((e) => !attempted(e.id)) ?? EXERCISES[0];
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  pace: 'Pace',
  pauses: 'Pauses',
  intonation: 'Intonation',
  energy: 'Energy',
  fillers: 'Filler words',
  hook: 'Opening',
  structure: 'Structure',
  clarity: 'Clarity',
  concreteness: 'Specifics',
};

/** Daily XP target for the "one rep a day" habit loop. */
export const DAILY_GOAL_XP = 30;
