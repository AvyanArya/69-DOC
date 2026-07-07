// Conversation engine: a stateful roleplay opponent.
// Characters supply line packs + temperament; the engine tracks interest and
// patience, detects intent in the user's speech, and picks a reply with the
// character's objection style. Deterministic enough to coach against, varied
// enough to feel alive.

function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)]
}

const INTENTS = [
  { id: 'greeting', rx: /\b(hi|hey|hello|good (morning|afternoon|evening)|how are you|this is)\b/i },
  { id: 'question', rx: /\?|(\b(what|how|why|when|where|who|which|could you|would you|do you|are you|have you|tell me)\b)/i },
  { id: 'valueProp', rx: /\b(help|save|grow|increase|reduce|improve|results?|revenue|roi|value|benefit|solution|solve)\b/i },
  { id: 'price', rx: /\b(price|cost|pricing|discount|budget|dollar|per month|per year|fee|charge|\$\d)/i },
  { id: 'close', rx: /\b(book|schedule|calendar|meeting|demo|next step|sign|deal|move forward|get started|send (you|over) (the|a) (contract|agreement)|tuesday|thursday|monday|friday|tomorrow)\b/i },
  { id: 'empathy', rx: /\b(understand|hear you|makes sense|totally get|appreciate|fair|i see|sounds like|feel)\b/i },
  { id: 'social', rx: /\b(clients?|customers?|companies|teams? like|others? (in|like)|case study|worked with)\b/i },
  { id: 'mirror', rx: null }, // computed: repeats prospect's words
]

const FILLERS = /\b(um+|uh+|like|you know|basically|actually|literally|honestly|kind of|sort of|i mean)\b/gi

export function analyzeUtterance(text, lastAiLine = '') {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const fillers = (text.match(FILLERS) || []).length
  const intents = new Set()
  for (const { id, rx } of INTENTS) {
    if (rx && rx.test(text)) intents.add(id)
  }
  // Mirroring: reused ≥2 meaningful words from the prospect's last line
  if (lastAiLine) {
    const aiWords = new Set(lastAiLine.toLowerCase().match(/\b[a-z]{5,}\b/g) || [])
    const reused = (text.toLowerCase().match(/\b[a-z]{5,}\b/g) || []).filter((w) => aiWords.has(w))
    if (reused.length >= 2) intents.add('mirror')
  }
  const isQuestion = intents.has('question')
  const openQuestion = /\b(what|how|why|tell me|walk me)\b/i.test(text) && isQuestion
  return { words: words.length, fillers, intents, isQuestion, openQuestion }
}

export function createConversation({ character, challenge, scenario }) {
  const state = {
    phase: 'opening',            // opening → discovery → objection → closing → done
    interest: 22,                // 0–100, win zone above ~72
    patience: character.temperament.patience, // 0–100, hangup at 0
    objectionsRaised: 0,
    objectionsSurvived: 0,
    turns: 0,
    lastAiLine: '',
    outcome: null,               // 'closed' | 'hangup' | 'ended'
    log: [],                     // coaching events with timestamps
  }

  const lines = character.lines
  const t = character.temperament

  function coachTip(analysis) {
    if (analysis.fillers >= 3) return 'Cut the filler words — pause instead.'
    if (analysis.words > 70) return 'You’re monologuing. Land the point, then ask.'
    if (state.interest < 30 && state.turns > 2) return 'They’re losing interest — ask about THEIR problem.'
    if (!analysis.isQuestion && state.phase === 'discovery') return 'Ask an open-ended question.'
    if (state.phase === 'objection' && !analysis.intents.has('empathy')) return 'Acknowledge the objection before answering it.'
    if (analysis.intents.has('mirror')) return 'Nice mirror. Now go one level deeper.'
    if (state.interest > 62 && state.phase !== 'closing') return 'They’re warm — ask for the meeting.'
    if (analysis.words < 6) return 'Give them more — expand with a reason.'
    return pick(['Slow your pace.', 'Mirror their last sentence.', 'Label their emotion: "Sounds like…"', 'Lower your tone at the end of sentences.'])
  }

  function scoreMove(analysis) {
    let d = 0
    if (analysis.openQuestion) d += 9
    else if (analysis.isQuestion) d += 5
    if (analysis.intents.has('empathy')) d += 7
    if (analysis.intents.has('mirror')) d += 6
    if (analysis.intents.has('valueProp')) d += 4
    if (analysis.intents.has('social')) d += 5
    if (analysis.fillers >= 3) d -= 6
    if (analysis.words > 80) d -= 8
    if (analysis.words < 4) d -= 5
    if (analysis.intents.has('price') && state.phase === 'opening') d -= 7
    if (analysis.intents.has('close') && state.interest < 45) d -= 6
    if (analysis.intents.has('close') && state.interest >= 60) d += 8
    return d
  }

  function advancePhase(analysis) {
    if (state.phase === 'opening' && state.turns >= 1) state.phase = 'discovery'
    if (state.phase === 'discovery' && (state.turns >= 3 || analysis.intents.has('price'))) state.phase = 'objection'
    if (state.phase === 'objection' && state.objectionsSurvived >= t.objectionCount) state.phase = 'closing'
  }

  function reply(userText) {
    state.turns += 1
    const analysis = analyzeUtterance(userText, state.lastAiLine)
    const delta = scoreMove(analysis)
    state.interest = Math.max(0, Math.min(100, state.interest + delta))
    state.patience = Math.max(0, Math.min(100, state.patience + (delta >= 0 ? 2 : delta)))

    state.log.push({
      turn: state.turns, delta,
      good: delta >= 6 ? describeGood(analysis) : null,
      mistake: delta <= -4 ? describeMistake(analysis, state) : null,
    })

    advancePhase(analysis)

    // Hangup: patience exhausted, or opener flopped hard with an impatient character
    if (state.patience <= 0 || (state.turns >= 5 && state.interest <= 8)) {
      state.outcome = 'hangup'
      const line = pick(lines.hangup)
      state.lastAiLine = line
      return { text: line, emotion: 'angry', done: true, outcome: 'hangup', coach: null }
    }

    // Win: closing phase + close attempt + enough interest
    if (analysis.intents.has('close') && state.interest >= 72) {
      state.outcome = 'closed'
      const line = pick(lines.win)
      state.lastAiLine = line
      return { text: line, emotion: 'warm', done: true, outcome: 'closed', coach: null }
    }

    let text, emotion
    if (state.phase === 'objection' || (state.phase === 'closing' && state.interest < 72 && analysis.intents.has('close'))) {
      state.objectionsRaised += 1
      if (delta >= 4) state.objectionsSurvived += 1
      text = pick(lines.objections)
      emotion = state.interest < 35 ? 'irritated' : 'skeptical'
    } else if (state.interest >= 62) {
      text = pick(lines.hooked)
      emotion = 'curious'
    } else if (state.interest <= 25) {
      text = pick(lines.cold)
      emotion = t.style === 'aggressive' ? 'irritated' : 'flat'
    } else {
      text = pick(lines.neutral)
      emotion = 'neutral'
    }
    if (scenario && state.turns === 2 && lines.scenarioHint) {
      text = lines.scenarioHint.replace('{topic}', scenario.topic || 'this')
    }
    state.lastAiLine = text
    return { text, emotion, done: false, outcome: null, coach: coachTip(analysis), analysis }
  }

  function opener() {
    const line = character.role === 'caller' ? pick(lines.openerInbound || lines.openers) : pick(lines.openers)
    state.lastAiLine = line
    return { text: line, emotion: 'neutral' }
  }

  function endedByUser() {
    if (!state.outcome) state.outcome = 'ended'
  }

  return { state, reply, opener, endedByUser }
}

function describeGood(a) {
  if (a.openQuestion) return 'Open-ended question — pulled them into the conversation.'
  if (a.intents.has('mirror')) return 'Mirrored their language back. Instant rapport.'
  if (a.intents.has('empathy')) return 'Acknowledged their position before pushing forward.'
  if (a.intents.has('social')) return 'Used social proof at the right moment.'
  if (a.intents.has('close')) return 'Asked for the close with confidence.'
  return 'Strong value framing.'
}

function describeMistake(a, state) {
  if (a.fillers >= 3) return `${a.fillers} filler words in one answer — kills authority.`
  if (a.words > 80) return 'Monologued for too long and lost their attention.'
  if (a.intents.has('price') && state.phase === 'opening') return 'Brought up price before establishing value.'
  if (a.intents.has('close') && state.interest < 45) return 'Went for the close before earning it.'
  if (a.words < 4) return 'Answer was too thin — gave them nothing to engage with.'
  return 'Passive response — surrendered control of the conversation.'
}
