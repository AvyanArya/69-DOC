/* ====== STATE ====== */
let currentScenario = null;
let conversationHistory = [];
let isThinking = false;
let recognition = null;
let timerInterval = null;
let timerSeconds = 300;
let timerRunning = false;

const SCENARIO_META = {
  belfort_pen: {
    avatar: '🐺',
    name: 'Jordan Belfort',
    opener: "Alright, you've got 30 seconds. I've got a meeting in ten minutes. Make it worth my time — what do you want?"
  },
  belfort_ai: {
    avatar: '📱',
    name: 'Jordan Belfort',
    opener: "Yeah? Who is this? How did you get this number? This better be good, I'm about to jump on a call..."
  },
  receptionist: {
    avatar: '📞',
    name: 'Karen (Receptionist)',
    opener: "Good afternoon, Davidson & Co, how can I help you?"
  }
};

/* ====== INIT ====== */
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
  setupApiModal();
  setupChatArena();
  setupFeedbackModal();
  switchTab('jaw');
  autoResizeTextarea();
});

/* ====== API KEY ====== */
function loadApiKey() {
  const key = localStorage.getItem('wolfmode_api_key');
  if (key) {
    document.getElementById('apiKeyInput').value = key;
  }
}

function setupApiModal() {
  const modal = document.getElementById('apiModal');
  document.getElementById('apiBtn').onclick = () => modal.classList.add('active');
  document.getElementById('modalClose').onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };

  document.getElementById('saveApiKey').onclick = () => {
    const key = document.getElementById('apiKeyInput').value.trim();
    if (!key) { showToast('Enter a valid API key', 'error'); return; }
    localStorage.setItem('wolfmode_api_key', key);
    modal.classList.remove('active');
    showToast('API key saved!', 'success');
  };
}

function getApiKey() {
  return localStorage.getItem('wolfmode_api_key') || '';
}

/* ====== SCENARIO / CHAT ARENA ====== */
function openScenario(scenario) {
  currentScenario = scenario;
  conversationHistory = [];
  const meta = SCENARIO_META[scenario];

  document.getElementById('personaAvatar').textContent = meta.avatar;
  document.getElementById('personaName').textContent = meta.name;
  document.getElementById('introAvatar').textContent = meta.avatar;
  document.getElementById('introText').textContent = '';

  const arena = document.getElementById('chatArena');
  arena.classList.add('active');
  document.body.style.overflow = 'hidden';

  const messages = document.getElementById('chatMessages');
  messages.innerHTML = `
    <div class="chat-intro" id="chatIntro">
      <div class="intro-avatar">${meta.avatar}</div>
      <p class="intro-text" id="introText"></p>
    </div>
  `;

  setTimeout(() => {
    appendMessage('ai', meta.opener, meta.avatar);
    conversationHistory.push({ role: 'assistant', content: meta.opener });
    const intro = document.getElementById('chatIntro');
    if (intro) intro.style.display = 'none';
  }, 400);

  document.getElementById('chatInput').focus();
}

function setupChatArena() {
  document.getElementById('closeArena').onclick = closeArena;
  document.getElementById('resetBtn').onclick = () => openScenario(currentScenario);
  document.getElementById('sendBtn').onclick = sendMessage;
  document.getElementById('feedbackBtn').onclick = getFeedback;

  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  setupMic();
}

function closeArena() {
  document.getElementById('chatArena').classList.remove('active');
  document.body.style.overflow = '';
}

async function sendMessage() {
  if (isThinking) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  autoResizeTextarea();

  appendMessage('user', text, '👤');
  conversationHistory.push({ role: 'user', content: text });

  isThinking = true;
  document.getElementById('sendBtn').disabled = true;

  const typingId = appendTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        scenario: currentScenario,
        apiKey: getApiKey()
      })
    });

    const data = await res.json();
    removeTyping(typingId);

    if (data.error) {
      appendMessage('ai', `⚠️ ${data.error}`, SCENARIO_META[currentScenario].avatar);
      if (data.error.includes('API key')) {
        setTimeout(() => document.getElementById('apiModal').classList.add('active'), 500);
      }
    } else {
      appendMessage('ai', data.reply, SCENARIO_META[currentScenario].avatar);
      conversationHistory.push({ role: 'assistant', content: data.reply });
    }
  } catch (err) {
    removeTyping(typingId);
    appendMessage('ai', '⚠️ Connection error. Check the server is running.', SCENARIO_META[currentScenario].avatar);
  }

  isThinking = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('chatInput').focus();
}

function appendMessage(role, text, avatar) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `
    <div class="msg-avatar">${avatar}</div>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function appendTyping() {
  const container = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = id;
  div.innerHTML = `
    <div class="msg-avatar">${SCENARIO_META[currentScenario]?.avatar || '🐺'}</div>
    <div class="msg-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/* ====== FEEDBACK ====== */
async function getFeedback() {
  if (conversationHistory.length < 2) {
    showToast('Have a conversation first!', 'error');
    return;
  }

  const modal = document.getElementById('feedbackModal');
  const loading = document.getElementById('feedbackLoading');
  const content = document.getElementById('feedbackContent');

  modal.classList.add('active');
  loading.style.display = 'flex';
  content.classList.remove('show');

  const transcript = conversationHistory
    .map(m => `${m.role === 'user' ? 'YOU' : 'AI'}: ${m.content}`)
    .join('\n\n');

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, scenario: currentScenario, apiKey: getApiKey() })
    });

    const data = await res.json();
    loading.style.display = 'none';

    if (data.error) {
      content.innerHTML = `<p style="color:var(--red)">${escapeHtml(data.error)}</p>`;
    } else {
      content.innerHTML = parseFeedback(data.feedback);
    }
    content.classList.add('show');
  } catch (err) {
    loading.style.display = 'none';
    content.innerHTML = '<p style="color:var(--red)">Connection error.</p>';
    content.classList.add('show');
  }
}

function parseFeedback(text) {
  const scoreMatch = text.match(/SCORE:\s*(\d+)\/10/);
  const score = scoreMatch ? scoreMatch[1] : '?';

  const strengthsMatch = text.match(/STRENGTHS:([\s\S]*?)(?=WEAKNESSES:|TOP TIP:|$)/i);
  const weaknessesMatch = text.match(/WEAKNESSES:([\s\S]*?)(?=TOP TIP:|STRENGTHS:|$)/i);
  const tipMatch = text.match(/TOP TIP:\s*([\s\S]*?)$/i);

  const parsePoints = (block) => {
    if (!block) return [];
    return block.trim().split('\n')
      .map(l => l.replace(/^[•\-\*]\s*/, '').trim())
      .filter(l => l.length > 0);
  };

  const strengths = parsePoints(strengthsMatch?.[1]);
  const weaknesses = parsePoints(weaknessesMatch?.[1]);
  const tip = tipMatch?.[1]?.trim() || '';

  let html = `
    <div class="feedback-score">
      <div class="score-label">Session Score</div>
      <div class="score-value">${score}<span style="font-size:32px;opacity:0.5">/10</span></div>
    </div>
  `;

  if (strengths.length) {
    html += `<div class="feedback-section strengths">
      <h4>✅ What you did well</h4>
      <ul>${strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
    </div>`;
  }

  if (weaknesses.length) {
    html += `<div class="feedback-section weaknesses">
      <h4>⚠️ What needs work</h4>
      <ul>${weaknesses.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
    </div>`;
  }

  if (tip) {
    html += `<div class="feedback-section">
      <h4>💡 Top Tip</h4>
      <div class="feedback-tip">${escapeHtml(tip)}</div>
    </div>`;
  }

  return html;
}

function setupFeedbackModal() {
  const modal = document.getElementById('feedbackModal');
  document.getElementById('feedbackClose').onclick = () => modal.classList.remove('active');
  modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

/* ====== MIC / SPEECH RECOGNITION ====== */
function setupMic() {
  const micBtn = document.getElementById('micBtn');
  const micStatus = document.getElementById('micStatus');

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    micBtn.title = 'Speech recognition not supported in this browser';
    micBtn.style.opacity = '0.4';
    micBtn.style.cursor = 'not-allowed';
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-GB';

  let isRecording = false;

  micBtn.onclick = () => {
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micStatus.textContent = '🔴 Listening...';
  };

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    document.getElementById('chatInput').value = transcript;
    autoResizeTextarea();
  };

  recognition.onend = () => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micStatus.textContent = '';
  };

  recognition.onerror = (e) => {
    isRecording = false;
    micBtn.classList.remove('recording');
    micStatus.textContent = e.error === 'not-allowed' ? '🚫 Microphone access denied' : '';
  };
}

/* ====== ARTICULATION TABS ====== */
function switchTab(tab) {
  document.querySelectorAll('.drill-tab').forEach(t => t.classList.remove('active'));
  const tabs = document.querySelectorAll('.drill-tab');
  const tabMap = ['jaw', 'twisters', 'diction', 'warmup'];
  const idx = tabMap.indexOf(tab);
  if (idx >= 0 && tabs[idx]) tabs[idx].classList.add('active');

  const data = ARTICULATION_DATA[tab];
  if (!data) return;

  const container = document.getElementById('drillContent');

  if (tab === 'warmup') {
    container.innerHTML = renderWarmup(data);
    setupTimer();
  } else {
    container.innerHTML = renderDrills(data);
  }
}

function renderDrills(data) {
  const items = data.items.map((item, i) => `
    <div class="drill-item">
      <div class="drill-number">Drill ${String(i + 1).padStart(2, '0')}</div>
      <div class="drill-text">"${escapeHtml(item.text)}"</div>
      <div class="drill-desc">${escapeHtml(item.desc)}</div>
    </div>
  `).join('');

  return `
    <div class="drill-intro">
      <div class="drill-intro-icon">${data.intro.icon}</div>
      <div>
        <h3>${escapeHtml(data.intro.title)}</h3>
        <p>${escapeHtml(data.intro.desc)}</p>
      </div>
    </div>
    <div class="drill-grid">${items}</div>
  `;
}

function renderWarmup(data) {
  const exercises = data.exercises.map(ex => `
    <div class="exercise-card">
      <div class="exercise-title">
        ${escapeHtml(ex.title)}
        <span class="exercise-tag">${escapeHtml(ex.tag)}</span>
      </div>
      <ol class="exercise-steps">
        ${ex.steps.map((s, i) => `
          <li>
            <div class="step-num">${i + 1}</div>
            <span>${escapeHtml(s)}</span>
          </li>
        `).join('')}
      </ol>
    </div>
  `).join('');

  return `
    <div class="drill-intro">
      <div class="drill-intro-icon">${data.intro.icon}</div>
      <div>
        <h3>${escapeHtml(data.intro.title)}</h3>
        <p>${escapeHtml(data.intro.desc)}</p>
      </div>
    </div>
    ${exercises}
    <div class="timer-drill">
      <div class="timer-display" id="timerDisplay">5:00</div>
      <div class="timer-controls">
        <button class="timer-btn primary" id="timerStart" onclick="toggleTimer()">Start Warmup</button>
        <button class="timer-btn" onclick="resetTimer()">Reset</button>
      </div>
    </div>
  `;
}

function setupTimer() {
  timerSeconds = 300;
  timerRunning = false;
  if (timerInterval) clearInterval(timerInterval);
}

function toggleTimer() {
  const btn = document.getElementById('timerStart');
  if (!btn) return;
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    btn.textContent = 'Resume';
  } else {
    timerRunning = true;
    btn.textContent = 'Pause';
    timerInterval = setInterval(() => {
      timerSeconds--;
      updateTimerDisplay();
      if (timerSeconds <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        btn.textContent = 'Done!';
        showToast('Warmup complete! You\'re ready to close.', 'success');
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerSeconds = 300;
  updateTimerDisplay();
  const btn = document.getElementById('timerStart');
  if (btn) btn.textContent = 'Start Warmup';
}

function updateTimerDisplay() {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  el.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

/* ====== UTILS ====== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function autoResizeTextarea() {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

document.getElementById('chatInput')?.addEventListener('input', autoResizeTextarea);

let toastTimeout;
function showToast(message, type = 'success') {
  let toast = document.getElementById('globalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.className = `toast ${type}`;
  requestAnimationFrame(() => toast.classList.add('show'));
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}
