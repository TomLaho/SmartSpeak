# Lessons

## 10/09/2026 — Don't proxy quality with a metric that isn't quality

**What happened.** To stop bad speeches scoring well I capped the overall score by
take duration against `exercise.targetSeconds` (<40% → 55, <70% → 72). Tom then
recorded a take that said everything the prompt asked, at 144 wpm, scoring Pace 87 /
Voice 100 / Fluency 97 — and got 55. His words: "it's ok to have a speech that's not
long if the content is there."

**Why it was wrong.** Duration is a proxy for effort, not for quality. I picked it
because it was easy to measure and it fixed the one example in front of me (16s of a
45s target). It over-fires on exactly the behaviour the product should reward: saying
what needs saying and stopping. A cap that overrides three strong measured dimensions
is also incoherent on screen — the user reads 87/100/97 and a headline of 55 and
concludes the app is broken, which is the correct conclusion.

**The rule.** Before adding a penalty, ask what it is a proxy FOR, then ask whether
the thing itself is measurable. Here the real signal is *substance* — are there
words, do they amount to a response — and word count against an expected length
measures it directly. Never let an unmeasured proxy override measured dimensions.

**Second rule, from the same exchange.** When the user asks for something to be
"harsher", get the scale defined before touching the curve: what does 0 look like,
what does 100 look like. I tuned coefficients against one anecdote instead of
building the rubric first, so the second attempt was as arbitrary as the first.
