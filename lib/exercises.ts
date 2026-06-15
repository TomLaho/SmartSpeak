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
  /**
   * For topic/story exercises: 2 alternate framings that change the
   * audience, stakes, or tone. Used for deliberate-practice variability —
   * the presenter encounters a different version each rep.
   */
  variations?: string[];
}

export const TRACKS: Record<TrackId, Track> = {
  delivery: {
    id: 'delivery',
    name: 'Delivery',
    tagline: 'Pace, pauses & vocal authority',
    emoji: '🎙️',
    gradient: 'from-rose-500 to-orange-500',
    accent: '#FB7185',
  },
  structure: {
    id: 'structure',
    name: 'Structure',
    tagline: 'Lead with the point, make it land',
    emoji: '🧩',
    gradient: 'from-sky-500 to-cyan-600',
    accent: '#38BDF8',
  },
  influence: {
    id: 'influence',
    name: 'Influence & Q&A',
    tagline: 'Persuade and hold up under pressure',
    emoji: '🤝',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#34D399',
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
    variations: [
      'Now give the same update to a skeptical CFO who only cares about cost and timeline — zero fluff.',
      'Now deliver it to your team in 30 seconds — just the headline and the one risk.',
    ],
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
    variations: [
      'The meeting is running 15 minutes late and the room is distracted. Open it crisply and take control.',
      'Two senior leaders you have never met just joined the call. Welcome the room and set the agenda as if they are the only ones listening.',
    ],
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
    variations: [
      'The finding is bad news. Lead with it anyway — no softening, no preamble. Give the headline and your recommended response.',
      'You have 20 seconds in a lift with the CEO. State your finding and recommendation before the doors open.',
    ],
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
    variations: [
      'Present the same finding, but this time your audience is skeptical and has already seen the data. Skip the numbers — go straight to the implication and the action.',
      'You only have time for one sentence. State the finding AND the so-what in a single, punchy sentence.',
    ],
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
    variations: [
      'Now explain it to a smart 14-year-old — no assumptions, no shortcuts, one analogy.',
      'A board member challenges you mid-explanation: "Why does this matter to the business?" Answer that in 30 seconds, still no jargon.',
    ],
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
    variations: [
      'Walk the same three slides but you have just been told the audience already disagrees with your recommendation. Build the problem case longer before you land it.',
      'You are presenting remotely and the video has frozen. Narrate the same three-slide story as if it is pure audio — no "as you can see on the slide".',
    ],
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
    variations: [
      'The leader looks sceptical from the first word. Stay composed, keep it to 60 seconds, and do not over-explain.',
      'You are in a group setting and three other people are waiting to speak. Make your summary in 30 seconds and still land the ask.',
    ],
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
    variations: [
      'You were told no last time. Make the ask again — acknowledge the previous answer, explain what has changed, and re-ask clearly.',
      'You are asking for something that costs more than you initially estimated. Own the change and re-ask with a reason.',
    ],
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

  // ─────────────────── DELIVERY — level 3–4 ───────────────────
  {
    id: 'd6-vocal-variety',
    track: 'delivery',
    order: 6,
    level: 3,
    title: 'Vocal Texture',
    emoji: '🎚️',
    summary: 'Use pace, pitch, and volume shifts within a single 90-second story.',
    type: 'story',
    scenario: 'Presenting a decision',
    targetSeconds: 90,
    focus: ['intonation', 'energy', 'pauses'],
    prompt:
      'Tell me about a real work decision that turned out better or worse than expected. Open slowly and quietly, build energy as you get to the turning point, and land the lesson with authority.',
    instructions: [
      'Open at around 70% energy — calm and measured.',
      'As the stakes rise in the story, let your pace and volume rise naturally.',
      'Slow back down on the final lesson so it registers.',
    ],
    tips: [
      'Think of it like a film score: the music shifts to signal what to feel.',
      'The most memorable line is almost always the one you slow down on.',
    ],
    xp: 35,
    variations: [
      'Tell the same story but start at high energy and pull back as the lesson arrives — give the punchline in an almost-quiet voice.',
      'Now tell it as if you are briefing someone who needs to make the same decision next week. Shift the tone from narrative to advisory.',
    ],
  },
  {
    id: 'd7-cold-open',
    track: 'delivery',
    order: 7,
    level: 4,
    title: 'Cold Open',
    emoji: '⚡',
    summary: 'No setup — grab attention with your very first word.',
    type: 'topic',
    scenario: 'Opening a presentation',
    targetSeconds: 60,
    focus: ['hook', 'pace', 'energy'],
    prompt:
      'Open a presentation with maximum impact: no "Good morning", no "Today I want to talk about". Start with your sharpest statement, a confronting number, or a one-sentence story. Go.',
    instructions: [
      'Your first word must do work — not "So…" or "Thanks…".',
      'Keep the entire opening under 40 words. Hit hard, then pause.',
      'After the pause, give one sentence of context before moving on.',
    ],
    tips: [
      'Audiences decide in the first three seconds whether to trust the speaker.',
      'If you can imagine someone saying "wait, what?" in a good way — you are there.',
    ],
    xp: 40,
    variations: [
      'The opening line must include a specific number that challenges a widely-held assumption.',
      'Open with a single question that has no comfortable answer — then own the silence before you continue.',
    ],
  },
  {
    id: 'd8-under-pressure',
    track: 'delivery',
    order: 8,
    level: 4,
    title: 'Steady Under Fire',
    emoji: '🔥',
    summary: 'Maintain pace, zero fillers and full authority when challenged mid-sentence.',
    type: 'topic',
    scenario: 'Fielding a challenge',
    targetSeconds: 75,
    focus: ['fillers', 'pace', 'pauses', 'energy'],
    prompt:
      'Give a 60-second pitch on why a project you own should continue. Imagine you are interrupted mid-way with a hard challenge: "This is not working." Absorb it, pause, and finish the pitch stronger than you started.',
    instructions: [
      'Deliver the first half of your pitch at a confident, measured pace.',
      'When the challenge lands (around the 30-second mark), take one full silent breath.',
      'Continue from the same energy level — no apologising, no speeding up.',
    ],
    tips: [
      'Rushesng or going quiet after a challenge both signal doubt. Stillness signals strength.',
      'Pre-plan one comeback phrase: "That is worth addressing — and here is why I am still confident."',
    ],
    xp: 40,
  },

  // ─────────────────── STRUCTURE — level 3–4 ───────────────────
  {
    id: 's6-data-story',
    track: 'structure',
    order: 6,
    level: 3,
    title: 'Numbers That Stick',
    emoji: '📈',
    summary: 'Wrap three data points into one memorable storyline.',
    type: 'topic',
    scenario: 'Findings readout',
    targetSeconds: 90,
    focus: ['concreteness', 'structure', 'clarity'],
    prompt:
      'You have three numbers from a recent project or report. Build a 90-second story where each number leads to the next, and the three together prove one clear point.',
    instructions: [
      'State your point first in one sentence — the three numbers are evidence for it, not the story itself.',
      'Sequence: number 1 → what it means → number 2 → how it connects → number 3 → so what.',
      'End with a one-sentence takeaway the audience can repeat to someone else.',
    ],
    tips: [
      'Three data points with a shared theme feel like a pattern. Four feel like a list.',
      'Say the number, then slow down — give the audience half a second to register it.',
    ],
    xp: 40,
    variations: [
      'Now present the same three numbers but one of them is bad news. Own it in the middle, then land the final number with confidence.',
      'Your audience challenges the source of your first number. Acknowledge it calmly and re-build the story around the two remaining data points.',
    ],
  },
  {
    id: 's7-reframe',
    track: 'structure',
    order: 7,
    level: 3,
    title: 'The Reframe',
    emoji: '🔄',
    summary: 'Turn a setback or constraint into a forward-looking case.',
    type: 'topic',
    scenario: 'Managing up',
    targetSeconds: 75,
    focus: ['hook', 'structure', 'clarity'],
    prompt:
      'Something on your project went wrong, or a constraint has been imposed. Describe the problem in one sentence, then reframe it: what opportunity or clarity does this create? Land on a proposed next step.',
    instructions: [
      'Name the setback clearly and briefly — do not minimise it.',
      'Pivot explicitly: "Here is what this tells us…" or "This actually clarifies our path because…".',
      'Close on the next step, not on the problem.',
    ],
    tips: [
      'Reframing is not spin — it is genuine problem-solving stated out loud.',
      'The stronger the problem in sentence one, the more powerful the pivot feels.',
    ],
    xp: 40,
  },
  {
    id: 's8-exec-narrative',
    track: 'structure',
    order: 8,
    level: 4,
    title: 'The Exec Narrative',
    emoji: '🏛️',
    summary: 'Stitch situation, complication, resolution into one fluent 90-second narrative.',
    type: 'story',
    scenario: 'Board or exec update',
    targetSeconds: 90,
    focus: ['structure', 'concreteness', 'hook', 'clarity'],
    prompt:
      'Walk leadership through a project or initiative using the SCR frame: the Situation as they know it, the Complication that changed things, and your Resolution. Make it flow as one cohesive story.',
    instructions: [
      'Situation: one or two sentences on stable context — what was true before.',
      'Complication: the single event or finding that made the situation unstable.',
      'Resolution: your recommended response, with one concrete next step.',
    ],
    tips: [
      'The complication is the pivot. Give it a full sentence and a beat of silence.',
      'Executives do not want a history lesson. The situation beat should be the shortest.',
    ],
    xp: 45,
    variations: [
      'Tell the same SCR story but the resolution is not yet decided. End instead on the two options and the one decision you need.',
      'Compress it to 40 seconds — one sentence per beat. What survives the cut?',
    ],
  },

  // ─────────────────── INFLUENCE — level 3–4 ───────────────────
  {
    id: 'i6-stakeholder-map',
    track: 'influence',
    order: 6,
    level: 3,
    title: 'Read the Room',
    emoji: '🎭',
    summary: 'Adjust your pitch for a mixed audience with competing priorities.',
    type: 'topic',
    scenario: 'Cross-functional pitch',
    targetSeconds: 90,
    focus: ['clarity', 'structure', 'energy', 'hook'],
    prompt:
      'You are pitching a change to a room that includes a finance lead who cares about cost, an engineering lead who cares about complexity, and a commercial lead who cares about revenue. Deliver a 90-second pitch that gives each one a reason to say yes.',
    instructions: [
      'Open with the shared benefit — the one thing all three care about.',
      'Give each stakeholder their hook in one sentence: cost, simplicity, revenue.',
      'End on one unified call to action that works for all three.',
    ],
    tips: [
      'People say yes to their reason, not your reason. Build the pitch around them.',
      'You do not need to name each stakeholder — just let each angle land naturally.',
    ],
    xp: 40,
    variations: [
      'Now the finance lead is hostile from the start. Address their concern head-on in your second sentence, then continue for the room.',
      'You only have 45 seconds — the meeting overran. Compress to one hook per stakeholder and a tight ask.',
    ],
  },
  {
    id: 'i7-negotiate',
    track: 'influence',
    order: 7,
    level: 3,
    title: 'Hold Your Ground',
    emoji: '⚖️',
    summary: 'Defend your position without becoming defensive.',
    type: 'topic',
    scenario: 'Negotiation or pushback',
    targetSeconds: 75,
    focus: ['pauses', 'clarity', 'energy', 'structure'],
    prompt:
      'Someone senior pushes back on your recommendation: "I do not think this is the right call." Acknowledge their view, hold your position with evidence, and propose a path that moves things forward.',
    instructions: [
      'Acknowledge the concern genuinely — one sentence, no "but" immediately after.',
      'State your position again, clearly, with one piece of supporting evidence.',
      'Propose a concrete next step that breaks the impasse.',
    ],
    tips: [
      '"I hear that — and here is what the data says" holds ground without triggering defensiveness.',
      'The goal is not to win the argument. It is to keep the conversation moving toward a decision.',
    ],
    xp: 40,
  },
  {
    id: 'i8-close',
    track: 'influence',
    order: 8,
    level: 4,
    title: 'Close the Room',
    emoji: '🎯',
    summary: 'Drive the room to a decision — no drifting, no "let us take this offline".',
    type: 'topic',
    scenario: 'Closing a decision meeting',
    targetSeconds: 75,
    focus: ['hook', 'clarity', 'energy', 'concreteness'],
    prompt:
      'The meeting is nearly over and no decision has been made. You have 60 seconds. Summarise the options, make a clear recommendation, and ask for the decision now — not at the next meeting.',
    instructions: [
      'Open by naming the decision on the table in one sentence.',
      'State your recommendation clearly — no hedging.',
      'Ask for the decision directly: "Can we align on this today?" or "I need a yes or a no by end of this call."',
    ],
    tips: [
      'Meetings drift because nobody closes them. Your job is to end ambiguity.',
      'Name the cost of not deciding: "Every week without a decision costs us X."',
    ],
    xp: 45,
    variations: [
      'The room is leaning toward deferring. Make the cost of delay concrete and ask for commitment again — calmly, not desperately.',
      'Two people in the room disagree. Acknowledge both, state your tiebreaker rationale, and still close.',
    ],
  },
];

export const exercisesByTrack = (track: TrackId): Exercise[] =>
  EXERCISES.filter((e) => e.track === track).sort((a, b) => a.order - b.order);

// ─────────────────────────── Learning Modules ────────────────────────────

export type ModuleId =
  | 'command-presence'
  | 'confident-voice'
  | 'cut-through'
  | 'great-explainer'
  | 'storyteller'
  | 'persuader'
  | 'grace-under-fire'
  | 'the-closer';

export interface LearningModule {
  id: ModuleId;
  order: number;
  name: string;
  blurb: string;
  emoji: string;
  gradient: string;
  accent: string;
  exerciseIds: string[];
}

export const MODULES: LearningModule[] = [
  {
    id: 'command-presence',
    order: 1,
    name: 'Command Presence',
    blurb: 'Own the room the moment you open your mouth — steady pace, deliberate pauses, pure authority.',
    emoji: '🎙️',
    gradient: 'from-rose-500 to-orange-500',
    accent: '#FB7185',
    exerciseIds: ['d1-pace', 'd2-pause', 'd5-presence'],
  },
  {
    id: 'confident-voice',
    order: 2,
    name: 'The Confident Voice',
    blurb: 'Trade nerves for control — no fillers, no monotone, just a voice people lean in to hear.',
    emoji: '🎚️',
    gradient: 'from-amber-500 to-orange-600',
    accent: '#FBBF24',
    exerciseIds: ['d3-fillers', 'd4-emphasis', 'd6-vocal-variety'],
  },
  {
    id: 'cut-through',
    order: 3,
    name: 'Cut Through the Noise',
    blurb: 'Say the one thing that matters first — and watch a busy room actually listen.',
    emoji: '✂️',
    gradient: 'from-sky-500 to-cyan-600',
    accent: '#38BDF8',
    exerciseIds: ['s1-bluf', 'i1-execsummary', 's5-onebigidea'],
  },
  {
    id: 'great-explainer',
    order: 4,
    name: 'The Great Explainer',
    blurb: "Make the complex feel simple, so smart people finally get it on the first pass.",
    emoji: '💡',
    gradient: 'from-violet-500 to-purple-600',
    accent: '#A78BFA',
    exerciseIds: ['s2-finding', 's3-simple', 's6-data-story'],
  },
  {
    id: 'storyteller',
    order: 5,
    name: 'The Storyteller',
    blurb: 'Turn facts into a story that carries the room from the first line to the last.',
    emoji: '📖',
    gradient: 'from-fuchsia-500 to-pink-600',
    accent: '#E879F9',
    exerciseIds: ['s4-deck', 's7-reframe', 's8-exec-narrative'],
  },
  {
    id: 'persuader',
    order: 6,
    name: 'The Persuader',
    blurb: 'Ask for what you need and bring people with you — clearly, and without apology.',
    emoji: '🤝',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#34D399',
    exerciseIds: ['i2-ask', 'i4-plan', 'i5-buyin'],
  },
  {
    id: 'grace-under-fire',
    order: 7,
    name: 'Grace Under Fire',
    blurb: 'Stay calm, composed and credible when the hard questions come.',
    emoji: '🔥',
    gradient: 'from-red-500 to-rose-600',
    accent: '#F87171',
    exerciseIds: ['i3-toughq', 'i7-negotiate', 'd8-under-pressure'],
  },
  {
    id: 'the-closer',
    order: 8,
    name: 'The Closer',
    blurb: "Read the room and drive it to a decision — no drifting, no 'let’s take it offline'.",
    emoji: '🎯',
    gradient: 'from-indigo-500 to-blue-600',
    accent: '#818CF8',
    exerciseIds: ['i6-stakeholder-map', 'i8-close', 'd7-cold-open'],
  },
];

export const getModule = (id: string): LearningModule | undefined =>
  MODULES.find((m) => m.id === id);

export const exercisesByModule = (id: ModuleId): Exercise[] => {
  const mod = MODULES.find((m) => m.id === id);
  if (!mod) return [];
  return mod.exerciseIds
    .map((eid) => EXERCISES.find((e) => e.id === eid))
    .filter((e): e is Exercise => e !== undefined);
};

/** Stable id for the free-play "Open Mic" exercise — never added to EXERCISES. */
export const FREE_PLAY_ID = 'free-play';

/** Free-play exercise object. Not in EXERCISES so it never surfaces in curriculum lists. */
export const FREE_PLAY: Exercise = {
  id: FREE_PLAY_ID,
  track: 'delivery', // placeholder — not used since it's not in EXERCISES
  order: 999,
  level: 1,
  title: 'Open Mic',
  emoji: '🎤',
  summary: 'Practice anything — your own speech, pitch or presentation. No script, no rules.',
  type: 'topic',
  scenario: 'Your own material',
  targetSeconds: 120,
  instructions: [
    'Pick anything you want to rehearse — a real presentation, a pitch, or just freestyle.',
    "There's no prompt and no script. Speak for as long as you like.",
    "We'll analyse your delivery and give you the full breakdown.",
  ],
  focus: ['pace', 'pauses', 'intonation', 'energy', 'fillers', 'clarity', 'structure', 'concreteness'],
  tips: [
    'This is your space — use it for something real you need to nail.',
    'Treat it like the real thing: stand up, commit, and go.',
  ],
  xp: 30,
};

export const getExercise = (id: string): Exercise | undefined => {
  if (id === FREE_PLAY_ID) return FREE_PLAY;
  return EXERCISES.find((e) => e.id === id);
};

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

// ─────────────────────── Benchmarks ───────────────────────

export interface Benchmark {
  dimension: Dimension;
  label: string;
  /** Human-readable target range, e.g. "130–160 wpm". */
  target: string;
  /** One short sentence explaining why this target matters. */
  rationale: string;
}

export const BENCHMARKS: Record<Dimension, Benchmark> = {
  pace: {
    dimension: 'pace',
    label: 'Pace',
    target: '130–160 wpm',
    rationale: 'Slow enough that each point lands before the next one arrives.',
  },
  pauses: {
    dimension: 'pauses',
    label: 'Pauses',
    target: '6–12 pauses/min',
    rationale: 'Silence makes key points feel deliberate rather than accidental.',
  },
  intonation: {
    dimension: 'intonation',
    label: 'Intonation',
    target: '2.5–6 semitones of pitch movement',
    rationale: 'Variation carries meaning; monotone reads as nerves.',
  },
  energy: {
    dimension: 'energy',
    label: 'Energy',
    target: '8+ dB dynamic range',
    rationale: 'Varying loudness holds attention and signals what matters.',
  },
  fillers: {
    dimension: 'fillers',
    label: 'Filler words',
    target: 'Under 2 per minute',
    rationale: 'The executive standard — every filler leaks credibility.',
  },
  hook: {
    dimension: 'hook',
    label: 'Opening',
    target: 'Point stated in the first sentence',
    rationale: 'Busy rooms decide in 15 seconds whether to lean in.',
  },
  structure: {
    dimension: 'structure',
    label: 'Structure',
    target: 'Clear signposts + a turning point',
    rationale: 'An easy-to-follow thread keeps the audience with you.',
  },
  clarity: {
    dimension: 'clarity',
    label: 'Clarity',
    target: '~10–18 words per sentence, plain words',
    rationale: 'One idea at a time makes complex work feel simple.',
  },
  concreteness: {
    dimension: 'concreteness',
    label: 'Specifics',
    target: 'Numbers, names, examples — few vague words',
    rationale: 'Specifics make claims credible; generalities make them forgettable.',
  },
};

// ──────────────────── Variation helper ────────────────────

/**
 * Returns which prompt the presenter should see on this attempt:
 *   attempt 0 → base prompt
 *   attempt 1 → variations[0]
 *   attempt 2 → variations[1]
 *   … then cycles
 * Returns undefined for exercises without variations or with a base prompt only.
 */
export function pickVariation(exercise: Exercise, attemptCount: number): string | undefined {
  const { variations, prompt } = exercise;
  if (!variations || variations.length === 0) return undefined;
  const cycle = [...(prompt ? [prompt] : []), ...variations];
  if (cycle.length === 0) return undefined;
  return cycle[attemptCount % cycle.length];
}
