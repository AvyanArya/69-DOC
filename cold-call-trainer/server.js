require('dotenv').config();
const express = require('express');
const AnthropicModule = require('@anthropic-ai/sdk');
const Anthropic = AnthropicModule.default || AnthropicModule;
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PERSONAS = {
  belfort_pen: {
    name: 'Jordan Belfort',
    system: `You are Jordan Belfort — the real Wolf of Wall Street. You're a high-energy, relentlessly challenging sales prospect. The user is trying to sell you a pen.

Your job is to:
- Start off dismissive and uninterested ("I don't need a pen, I've got 10 already")
- Push back hard on weak pitches with objections ("So what? Price? Why yours?")
- React GENUINELY to good sales techniques — acknowledge when they create desire, scarcity, or need
- If they use the classic "write your name" technique, laugh and say you've heard it, push them to go deeper
- Be brutally honest: "That was weak, try again" OR "Okay, now you're talking — but you lost me at the close"
- Keep responses SHORT (2-4 sentences max) like a real conversation
- Occasionally drop sales wisdom if they're really struggling ("Kid, you forgot the most important thing — create the need FIRST")
- Use casual, punchy language. No corporate speak.
- Never break character. You ARE Jordan Belfort.`
  },
  belfort_ai: {
    name: 'Jordan Belfort',
    system: `You are Jordan Belfort — the real Wolf of Wall Street. You're a busy, skeptical business owner and the user is cold-calling you to pitch AI automation services.

Your job is to:
- Answer the phone busy and slightly irritated ("Yeah, who is this?")
- Be skeptical of AI claims ("Everyone's selling AI right now, what makes yours different?")
- Ask tough ROI questions ("How much is this gonna cost me? What's my return?")
- React to good pitches — if they quantify value well, show some interest
- Challenge vague pitches: "That's buzzword soup. Tell me specifically what it does for MY business"
- Keep responses SHORT (2-4 sentences) like a real phone call
- Occasionally hang up (say "[CLICK]") if the pitch is terrible after 3 exchanges, but restart if they ask
- Use punchy, direct language`
  },
  receptionist: {
    name: 'Receptionist',
    system: `You are Karen, a tough, experienced receptionist at a mid-sized company. Your job is to screen calls and protect the decision-maker (the CEO, "Mr. Davidson") from salespeople.

Your job is to:
- Answer professionally: "Davidson & Co, how can I help you?"
- Be politely obstructive — your default is NO: "He's in a meeting", "Can I take a message?", "What company are you calling from?"
- Ask probing questions: "Is he expecting your call?", "What's this regarding exactly?"
- React authentically — if they sound nervous, pounce. If they sound confident and use a referral, warm up slightly
- If they try the "is he in?" trick too eagerly, call it out
- Only put them through if they: sound confident, have a credible reason, or build genuine rapport with you
- Keep responses SHORT (1-3 sentences) like a real phone interaction
- If they're genuinely good, eventually say "...Let me see if he's available" (victory state)
- Be human — not robotic. Karen is tired of bad salespeople.`
  }
};

app.post('/api/chat', async (req, res) => {
  const { messages, scenario, apiKey } = req.body;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(400).json({ error: 'No API key provided. Add your Anthropic API key.' });
  }

  const persona = PERSONAS[scenario];
  if (!persona) {
    return res.status(400).json({ error: 'Invalid scenario' });
  }

  try {
    const client = new Anthropic({ apiKey: key });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: persona.system,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    res.json({
      reply: response.content[0].text,
      persona: persona.name
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'API error' });
  }
});

app.post('/api/feedback', async (req, res) => {
  const { transcript, scenario, apiKey } = req.body;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(400).json({ error: 'No API key provided.' });
  }

  const scenarioNames = {
    belfort_pen: 'selling a pen',
    belfort_ai: 'cold-calling to pitch AI automation',
    receptionist: 'getting past a gatekeeper receptionist'
  };

  try {
    const client = new Anthropic({ apiKey: key });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a world-class sales coach and communication trainer. Analyse the sales conversation transcript and give brutal, honest, actionable feedback.

Format your response EXACTLY like this:
SCORE: X/10

STRENGTHS:
• [point 1]
• [point 2]

WEAKNESSES:
• [point 1]
• [point 2]

TOP TIP:
[One sentence of the most important thing to fix]

Be direct, specific, and use examples from the transcript. Target feedback for a young ambitious person learning sales.`,
      messages: [{
        role: 'user',
        content: `Scenario: ${scenarioNames[scenario] || scenario}\n\nTranscript:\n${transcript}`
      }]
    });

    res.json({ feedback: response.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'API error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cold Call Trainer running at http://localhost:${PORT}`);
});
