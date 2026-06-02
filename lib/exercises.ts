/**
 * SmartSpeak curriculum.
 *
 * The product is a Duolingo-style daily trainer: short (~3-5 minute) guided
 * exercises split across two skill tracks — DELIVERY (the technical craft of
 * pace, pauses, intonation, projection) and STORYTELLING (hooks, structure,
 * clarity, making ideas captivating and easy to follow).
 *
 * Each track is an ordered "path" of exercises. Exercises declare which
 * dimensions they focus on so the coach can weight feedback toward what the
 * learner is actually practising.
 */

export type TrackId = 'delivery' | 'storytelling';

export type ExerciseType =
  | 'read' // read provided text aloud (great for pace / intonation drills)
  | 'topic' // respond to an impromptu prompt
  | 'story'; // tell a structured story

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
    tagline: 'Pace, pauses, intonation & presence',
    emoji: '🎙️',
    gradient: 'from-violet-500 to-indigo-600',
    accent: '#7c3aed',
  },
  storytelling: {
    id: 'storytelling',
    name: 'Storytelling',
    tagline: 'Hook, structure & make it land',
    emoji: '✨',
    gradient: 'from-sky-500 to-blue-600',
    accent: '#2563eb',
  },
};

export const EXERCISES: Exercise[] = [
  // ─────────────────────────── DELIVERY ───────────────────────────
  {
    id: 'd1-pace',
    track: 'delivery',
    order: 1,
    level: 1,
    title: 'Find Your Pace',
    emoji: '🏃',
    summary: 'Read at a steady, confident ~140 words/min.',
    type: 'read',
    targetSeconds: 60,
    focus: ['pace', 'pauses'],
    readingText:
      'Great speakers are rarely the fastest talkers in the room. They move at a pace the audience can follow, giving each idea a moment to land. Read this passage out loud as if you were explaining it to a friend across the table. Not too fast, not too slow — just clear, calm, and deliberate. Notice how a steady rhythm makes you sound more sure of yourself, even before you say anything remarkable.',
    instructions: [
      'Read the passage aloud at a relaxed, conversational pace.',
      'Aim for roughly 130–160 words per minute — about this paragraph in ~25 seconds.',
      "Don't rush the ending. Let the last sentence breathe.",
    ],
    tips: ['Imagine one real person listening.', 'Slowing down by 10% almost always sounds better on playback.'],
    xp: 20,
  },
  {
    id: 'd2-pause',
    track: 'delivery',
    order: 2,
    level: 1,
    title: 'The Power of the Pause',
    emoji: '⏸️',
    summary: 'Use deliberate silence to add weight to your words.',
    type: 'read',
    targetSeconds: 60,
    focus: ['pauses', 'pace'],
    readingText:
      'Here is the secret. [pause] The pause is not empty space. [pause] It is the moment your idea actually lands. When you stop talking, the audience leans in. Silence says: this part matters. So the next time you make an important point, resist the urge to fill the gap. Say the line. [pause] Then stop. [pause] And let it breathe.',
    instructions: [
      'Read aloud and take a real, full second of silence everywhere it says [pause].',
      'Do not say the word "pause" — just stop, count one-one-thousand, and continue.',
      'Feel how uncomfortable (and powerful) a real pause is.',
    ],
    tips: ['A pause feels twice as long to you as it does to your audience.', 'Pause before your key point, not just after.'],
    xp: 20,
  },
  {
    id: 'd3-fillers',
    track: 'delivery',
    order: 3,
    level: 2,
    title: 'Kill the Filler',
    emoji: '🚫',
    summary: 'Speak for 60s on a topic with zero "um" or "uh".',
    type: 'topic',
    targetSeconds: 60,
    focus: ['fillers', 'pauses', 'pace'],
    prompt: 'Describe your morning routine, step by step.',
    instructions: [
      'Speak for about a minute on the prompt.',
      'Every time you would say "um", "uh", "like", or "you know" — pause silently instead.',
      'A clean silence always beats a filler word.',
    ],
    tips: ['Fillers are a fear of silence. Replace them with a breath.', 'Slowing down gives your brain time to find the next word.'],
    xp: 25,
  },
  {
    id: 'd4-intonation',
    track: 'delivery',
    order: 4,
    level: 2,
    title: 'Vocal Variety',
    emoji: '🎵',
    summary: 'Beat the monotone — ride the melody of your voice.',
    type: 'read',
    targetSeconds: 60,
    focus: ['intonation', 'energy', 'pace'],
    readingText:
      "I could not believe it. We had been working for six months, and finally — finally — it worked. At first nothing happened. Then the screen lit up, the numbers climbed, and the whole room went completely silent. And then everyone started cheering at once. It was, without a doubt, the best moment of the entire year.",
    instructions: [
      'Read this like you are telling an exciting story to a friend.',
      'Let your pitch rise with surprise and fall on the resolutions.',
      'Exaggerate the melody — it will feel like too much and sound just right.',
    ],
    tips: ['Monotone reads as boredom or nerves, even when you feel neither.', 'Smile on the upbeats — it lifts your pitch automatically.'],
    xp: 25,
  },
  {
    id: 'd5-emphasis',
    track: 'delivery',
    order: 5,
    level: 3,
    title: 'Project & Emphasize',
    emoji: '💥',
    summary: 'Drive energy into the words that carry your meaning.',
    type: 'topic',
    targetSeconds: 75,
    focus: ['energy', 'intonation', 'pace', 'pauses'],
    prompt: 'Convince me to try your favourite hobby — make it sound irresistible.',
    instructions: [
      'Pitch your hobby with real enthusiasm and volume.',
      'Hit the one or two words in each sentence that matter most.',
      'Vary your energy: build to peaks, then pull back.',
    ],
    tips: ['Energy is contagious — and so is flatness.', 'Stand up if you can. Your voice follows your body.'],
    xp: 30,
  },

  // ───────────────────────── STORYTELLING ─────────────────────────
  {
    id: 's1-hook',
    track: 'storytelling',
    order: 1,
    level: 1,
    title: 'Hook in 10 Seconds',
    emoji: '🪝',
    summary: 'Open so people cannot look away.',
    type: 'topic',
    targetSeconds: 45,
    focus: ['hook', 'concreteness', 'clarity'],
    prompt: 'Tell me about the last thing that genuinely surprised you — but start with the most gripping sentence you can.',
    instructions: [
      'Spend your first sentence earning attention: a question, a bold claim, or a vivid scene.',
      'No throat-clearing ("So, today I want to talk about…"). Drop us straight in.',
      'Then tell the rest in under a minute.',
    ],
    tips: ['Start in the middle of the action, not the background.', 'A specific detail hooks harder than a general statement.'],
    xp: 25,
  },
  {
    id: 's2-simple',
    track: 'storytelling',
    order: 2,
    level: 1,
    title: 'Explain It Simply',
    emoji: '🧒',
    summary: 'Explain something complex so a 10-year-old gets it.',
    type: 'topic',
    targetSeconds: 75,
    focus: ['clarity', 'concreteness', 'structure'],
    prompt: 'Explain how something you understand well actually works (your job, a hobby, a concept) — as if to a curious 10-year-old.',
    instructions: [
      'Use plain words. Trade jargon for everyday language.',
      'Lean on a comparison or analogy to something familiar.',
      'Short sentences. One idea at a time.',
    ],
    tips: ['If you need a fancy word, follow it immediately with "which just means…".', 'Concrete examples beat abstract definitions every time.'],
    xp: 30,
  },
  {
    id: 's3-arc',
    track: 'storytelling',
    order: 3,
    level: 2,
    title: 'The Story Arc',
    emoji: '🎢',
    summary: 'Setup → tension → resolution, in 90 seconds.',
    type: 'story',
    targetSeconds: 90,
    focus: ['structure', 'hook', 'concreteness', 'clarity'],
    prompt: 'Tell a true story about a time something went wrong and what you learned.',
    instructions: [
      'Set the scene quickly: who, where, what was at stake.',
      'Build the tension — what was the problem or turning point?',
      'Land the resolution and the one thing it taught you.',
    ],
    tips: ['Every good story has a moment where it could have gone either way.', 'End on the meaning, not just the events.'],
    xp: 35,
  },
  {
    id: 's4-concrete',
    track: 'storytelling',
    order: 4,
    level: 2,
    title: 'Make It Concrete',
    emoji: '🔍',
    summary: 'Swap vague abstractions for vivid specifics.',
    type: 'topic',
    targetSeconds: 60,
    focus: ['concreteness', 'clarity', 'hook'],
    prompt: 'Describe a place that matters to you — make me see, hear, and feel it.',
    instructions: [
      'Avoid vague words like "nice", "good", "stuff", "things".',
      'Use specific names, numbers, sounds, colours, and textures.',
      'Show one tiny detail instead of telling the whole picture.',
    ],
    tips: ['"A battered red bike" beats "a bike".', 'Specific is memorable. Generic is forgettable.'],
    xp: 30,
  },
  {
    id: 's5-onebigidea',
    track: 'storytelling',
    order: 5,
    level: 3,
    title: 'The One Big Idea',
    emoji: '🎯',
    summary: 'Say a lot by making one point land hard.',
    type: 'topic',
    targetSeconds: 90,
    focus: ['structure', 'clarity', 'concreteness', 'hook'],
    prompt: 'Pick something you believe and have 90 seconds to convince me. State your one big idea, support it, repeat it.',
    instructions: [
      'Open by stating your single core message in one clear sentence.',
      'Give one story or example that proves it.',
      'Close by repeating the core message in slightly different words.',
    ],
    tips: ['If you make three points, people remember none. Make one.', 'Repetition of the core idea is what survives after you stop talking.'],
    xp: 40,
  },
];

export const exercisesByTrack = (track: TrackId): Exercise[] =>
  EXERCISES.filter((e) => e.track === track).sort((a, b) => a.order - b.order);

export const getExercise = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);

export const DIMENSION_LABELS: Record<Dimension, string> = {
  pace: 'Pace',
  pauses: 'Pauses',
  intonation: 'Intonation',
  energy: 'Energy',
  fillers: 'Filler words',
  hook: 'Hook',
  structure: 'Structure',
  clarity: 'Clarity',
  concreteness: 'Concreteness',
};

/** Daily XP target for the "5 minutes a day" habit loop. */
export const DAILY_GOAL_XP = 30;
