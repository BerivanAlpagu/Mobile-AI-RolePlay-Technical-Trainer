import './style.css'

// ─── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000';

// ─── Toast System ────────────────────────────────────────────────────────────
const toastContainer = document.getElementById('toastContainer');

/**
 * Shows a neon toast notification according to the theme.
 * @param {'info'|'warning'|'error'|'success'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration  in ms (0 = close manually)
 */
function showToast(type, title, message, duration = 5000) {
  const iconSvg = {
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${iconSvg[type] ?? iconSvg.info}</span>
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const close = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  toastContainer.appendChild(toast);

  if (duration > 0) setTimeout(close, duration);
  return toast;
}

// ─── URL Validation ────────────────────────────────────────────────────────────
/**
 * Checks if the entered URL is a genuine GitHub repo link.
 * Returns false if it's just a profile page (github.com/user).
 * Returns true if it's a repository (github.com/user/repo).
 */
function validateGithubRepoUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('github.com')) {
      return { valid: false, reason: 'not_github' };
    }
    // Path: /user/repo → must have at least 2 segments
    const segments = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (segments.length < 2 || segments[1] === '') {
      return { valid: false, reason: 'profile_only', username: segments[0] };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'invalid_url' };
  }
}

// ─── DOM References ─────────────────────────────────────────────────────────
const repoInput            = document.getElementById('repoUrl');
const analyzeBtn           = document.getElementById('analyzeBtn');
const statusBox            = document.getElementById('statusBox');
const statusMsg            = document.getElementById('statusMsg');
const sessionIdTxt         = document.getElementById('sessionIdTxt');

const glowingOrb           = document.getElementById('glowingOrb');
const aiStatusText         = document.getElementById('aiStatusText');

const voiceInputMode       = document.getElementById('voiceInputMode');
const textInputMode        = document.getElementById('textInputMode');
const recordBtn            = document.getElementById('recordBtn');
const audioVisualizer      = document.getElementById('audioVisualizer');
const switchToTextBtn      = document.getElementById('switchToTextBtn');

const textAnswerInput      = document.getElementById('textAnswerInput');
const switchToVoiceBtn     = document.getElementById('switchToVoiceBtn');
const submitTextBtn        = document.getElementById('submitTextBtn');

const questionListContainer = document.getElementById('questionListContainer');
const questionList          = document.getElementById('questionList');

const currentQuestionBox   = document.getElementById('currentQuestionBox');
const currentQuestionText  = document.getElementById('currentQuestionText');
const questionBadge        = document.getElementById('questionBadge');
const listenBtn            = document.getElementById('listenBtn');
const hintSteps            = document.getElementById('hintSteps');

const evalCard             = document.getElementById('evalCard');
const evalEmptyState       = document.getElementById('evalEmptyState');
const evalLoading          = document.getElementById('evalLoading');
const evalScore            = document.getElementById('evalScore');
const scoreRing            = document.getElementById('scoreRing');
const evalTranscript       = document.getElementById('evalTranscript');
const evalFeedback         = document.getElementById('evalFeedback');
const evalMissing          = document.getElementById('evalMissing');
const evalRoadmap          = document.getElementById('evalRoadmap');

// ─── Application State ──────────────────────────────────────────────────────────
let currentSessionId   = null;
let activeQuestion     = null;  // { text, difficulty }
let mediaRecorder      = null;
let audioChunks        = [];
let isRecording        = false;

// ─── HELPER: Orb State ─────────────────────────────────────────────────────
function setOrbState(state) {
  // state: 'idle' | 'thinking' | 'listening' | 'processing'
  glowingOrb.className = 'glowing-orb';
  if (state === 'thinking')  glowingOrb.classList.add('active');
  if (state === 'listening') glowingOrb.classList.add('speaking');
}

// ─── HELPER: Score Ring Color ────────────────────────────────────────────────
function applyScoreStyle(score) {
  const n = parseFloat(score);
  scoreRing.classList.remove('high', 'mid', 'low');
  if (n >= 7.5)      scoreRing.classList.add('high');
  else if (n >= 4.5) scoreRing.classList.add('mid');
  else               scoreRing.classList.add('low');
}

// ─── HELPER: Render Question List ──────────────────────────────────────
const DIFFICULTY_ORDER = [
  'general_super_easy', 'general_easy', 'general_medium', 'general_hard',
  'repo_easy', 'repo_medium', 'repo_hard'
];

const DIFFICULTY_LABELS = {
  general_super_easy: 'General - Super Easy',
  general_easy: 'General - Easy',
  general_medium: 'General - Medium',
  general_hard: 'General - Hard',
  repo_easy: 'Repo Specific - Easy',
  repo_medium: 'Repo Specific - Medium',
  repo_hard: 'Repo Specific - Hard',
};

function renderQuestionList(questions) {
  questionList.innerHTML = '';

  DIFFICULTY_ORDER.forEach(level => {
    const qs = questions[level];
    if (!qs || qs.length === 0) return;

    // ── Accordion Section ──
    const section = document.createElement('div');
    section.className = 'accordion-section';
    section.dataset.level = level;

    // Badge color mapping
    const badgeColors = {
      general_super_easy: '#00ff88',
      general_easy: '#00f0ff',
      general_medium: '#ffc800',
      general_hard: '#ff2a46',
      repo_easy: '#00ff88',
      repo_medium: '#ffc800',
      repo_hard: '#ff2a46',
    };
    const color = badgeColors[level] || '#fff';

    // Header
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `
      <div class="accordion-header-left">
        <span class="q-badge" style="color: ${color}; border-color: ${color}">${DIFFICULTY_LABELS[level]}</span>
        <span class="accordion-count">${qs.length} qs</span>
      </div>
      <span class="accordion-chevron">▼</span>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'accordion-body';

    qs.forEach(qText => {
      const item = document.createElement('div');
      item.className = 'question-item';
      item.dataset.difficulty = level;
      item.dataset.text = qText;
      item.textContent = qText;
      item.addEventListener('click', () => selectQuestion(item, level, qText));
      body.appendChild(item);
    });

    // Accordion toggle: open on click, close others
    header.addEventListener('click', () => {
      const isOpen = section.classList.contains('open');
      // Diğer tüm section'ları kapat
      document.querySelectorAll('.accordion-section.open').forEach(s => s.classList.remove('open'));
      // Bu section'u toggle et
      if (!isOpen) section.classList.add('open');
    });

    section.appendChild(header);
    section.appendChild(body);
    questionList.appendChild(section);
  });
}

// ─── HELPER: Select Question ──────────────────────────────────────────────────────
function selectQuestion(itemEl, difficulty, text) {
  // Remove previous active state
  document.querySelectorAll('.question-item.active').forEach(el => el.classList.remove('active'));
  itemEl.classList.add('active');

  activeQuestion = { text, difficulty };

  // Hide hint steps
  if (hintSteps) hintSteps.style.display = 'none';

  // Show active question box in center panel
  questionBadge.textContent = DIFFICULTY_LABELS[difficulty];
  questionBadge.className = `question-badge`;
  const badgeColors = {
    general_super_easy: '#00ff88',
    general_easy: '#00f0ff',
    general_medium: '#ffc800',
    general_hard: '#ff2a46',
    repo_easy: '#00ff88',
    repo_medium: '#ffc800',
    repo_hard: '#ff2a46',
  };
  const color = badgeColors[difficulty] || '#fff';
  questionBadge.style.color = color;
  questionBadge.style.borderColor = color;
  questionBadge.style.background = `${color}1A`; // 1A is ~10% opacity in hex
  currentQuestionText.textContent = text;
  currentQuestionBox.style.display = 'block';

  // Reset inputs
  textAnswerInput.value = '';
  voiceInputMode.style.display = 'flex';
  textInputMode.style.display = 'none';

  aiStatusText.textContent = 'Ready — press record or type your answer.';
  recordBtn.disabled = false;
  switchToTextBtn.disabled = false;
  setOrbState('idle');

  // Clear right panel
  evalCard.style.display = 'none';
  evalLoading.style.display = 'none';
  evalEmptyState.style.display = 'flex';
}

// ─── 1. REPOSITORY ANALYSIS ─────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const url = repoInput.value.trim();

  // ── Empty field check ──
  if (!url) {
    showToast('warning', 'No URL Entered', 'Please paste a GitHub repository link to analyze.');
    repoInput.focus();
    return;
  }

  // ── URL Validation ──
  const check = validateGithubRepoUrl(url);
  if (!check.valid) {
    if (check.reason === 'profile_only') {
      showToast(
        'warning',
        'Profile URL Detected',
        `<strong>github.com/${check.username}</strong> is a user profile, not a repository. ` +
        'Please enter a specific repo link:<br>' +
        `<code style="color:#00f0ff">github.com/${check.username}/repo-name</code>`,
        7000
      );
    } else if (check.reason === 'not_github') {
      showToast('error', 'Invalid Platform', 'Only GitHub repository links are supported.');
    } else {
      showToast('error', 'Invalid URL', 'Please enter a valid GitHub repository URL.');
    }
    repoInput.focus();
    return;
  }

  analyzeBtn.textContent = 'Analyzing...';
  analyzeBtn.disabled = true;
  setOrbState('thinking');
  aiStatusText.textContent = 'Cloning & scanning the codebase...';
  questionListContainer.style.display = 'none';
  currentQuestionBox.style.display = 'none';
  recordBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: url }),
    });

    if (!res.ok) {
      const err = await res.json();
      // Repository not found?
      const detail = err.detail || '';
      if (detail.toLowerCase().includes('not found') || detail.toLowerCase().includes('repository')) {
        showToast(
          'error',
          'Repository Not Found',
          `<strong>${url}</strong> is not accessible.<br>Make sure the repository is public.`,
          7000
        );
      } else {
        showToast('error', 'Server Error', detail || 'An unknown error occurred.');
      }
      setOrbState('idle');
      aiStatusText.textContent = 'Enter Repo to Begin';
      return;
    }

    const data = await res.json();
    currentSessionId = data.session_id;
    sessionIdTxt.textContent = currentSessionId.slice(0, 8) + '…';

    statusBox.style.display = 'block';
    const total = Object.values(data.questions).flat().length;
    statusMsg.textContent = `${total} questions generated from your repo!`;

    renderQuestionList(data.questions);
    questionListContainer.style.display = 'flex';

    setOrbState('idle');
    aiStatusText.textContent = 'Select a question from the left panel.';
    showToast('success', 'Repository Connected!', `${total} interview questions generated. Select a question from the left panel.`, 5000);

  } catch (e) {
    showToast('error', 'Connection Error', 'Cannot reach the backend. Make sure the server is running.');
    setOrbState('idle');
    aiStatusText.textContent = 'Enter Repo to Begin';
    console.error(e);
  } finally {
    analyzeBtn.innerHTML = `<span class="btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span> Analyze Repo`;
    analyzeBtn.disabled = false;
  }
});

// ─── 2. LISTEN (TTS) ──────────────────────────────────────────────────────
listenBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;
  listenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Loading...`;
  listenBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE}/listen_question?text=${encodeURIComponent(activeQuestion.text)}`);
    if (!res.ok) throw new Error('TTS failed');
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  } catch (e) {
    console.error('TTS error:', e);
  } finally {
    listenBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Listen`;
    listenBtn.disabled = false;
  }
});

// ─── 3. RECORD AUDIO (MediaRecorder) ────────────────────────────────────────────
recordBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;

  if (!isRecording) {
    // ── Start Recording ──
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start();

      isRecording = true;
      recordBtn.classList.add('recording');
      recordBtn.innerHTML = `<span class="record-btn-icon"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="18" height="18"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></span> Stop Answering`;
      aiStatusText.textContent = 'Listening carefully...';
      setOrbState('listening');
      audioVisualizer.style.display = 'flex';
    } catch (err) {
      aiStatusText.textContent = 'Microphone access denied!';
      console.error(err);
    }
  } else {
    // ── Stop Recording ──
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = `<span class="record-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></span> Start Answering`;
    recordBtn.disabled = true;
    audioVisualizer.style.display = 'none';
    setOrbState('thinking');
    aiStatusText.textContent = 'Uploading to AI Engine...';

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      // Close mic stream
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  }
});

// ─── Toggles (Voice <-> Text) ────────────────────────────────────────────────
switchToTextBtn.addEventListener('click', () => {
  voiceInputMode.style.display = 'none';
  textInputMode.style.display = 'flex';
  aiStatusText.textContent = 'Type your answer...';
  textAnswerInput.focus();
});

switchToVoiceBtn.addEventListener('click', () => {
  textInputMode.style.display = 'none';
  voiceInputMode.style.display = 'flex';
  aiStatusText.textContent = 'Ready to listen...';
});

// ─── 4A. TEXT SUBMIT → SEND TO API ─────────────────────────────────────────
submitTextBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;
  const answer = textAnswerInput.value.trim();
  if (!answer) {
    showToast('warning', 'Empty Answer', 'Please write your code or explanation before submitting.');
    return;
  }

  submitTextBtn.disabled = true;
  setOrbState('thinking');
  aiStatusText.textContent = 'Analyzing your answer...';
  
  evalCard.style.display = 'none';
  evalEmptyState.style.display = 'none';
  evalLoading.style.display = 'flex';

  try {
    const res = await fetch(`${API_BASE}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: currentSessionId,
        question: activeQuestion.text,
        answer: answer
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Evaluation API error');
    }

    const data = await res.json();
    renderEvaluation(data.evaluation);
    showToast('success', 'Evaluation Complete', 'Your answer has been analyzed.');

  } catch (e) {
    showToast('error', 'Evaluation Failed', 'An error occurred while analyzing your answer.');
    evalLoading.style.display = 'none';
    evalEmptyState.style.display = 'flex';
    console.error(e);
  } finally {
    setOrbState('idle');
    aiStatusText.textContent = 'Feedback ready. Pick next question.';
    submitTextBtn.disabled = false;
  }
});

// ─── 4B. VOICE RECORDING STOPPED → SEND TO API ─────────────────────────────
async function handleRecordingStop() {
  const mimeType = getSupportedMimeType();
  const audioBlob = new Blob(audioChunks, { type: mimeType });

  // Right panel → loading state
  evalCard.style.display = 'none';
  evalEmptyState.style.display = 'none';
  evalLoading.style.display = 'flex';

  try {
    const formData = new FormData();
    // Backend can take webm or ogg; pydub converts
    const ext = mimeType.includes('webm') ? 'webm' : 'ogg';
    formData.append('file', audioBlob, `answer.${ext}`);

    const url = `${API_BASE}/evaluate_voice?session_id=${encodeURIComponent(currentSessionId)}&question=${encodeURIComponent(activeQuestion.text)}`;

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Evaluation API error');
    }

    const data = await res.json();
    // data → { evaluation: { transcript, overall_score, detailed_feedback, missing_points, learning_roadmap } }
    renderEvaluation(data.evaluation);

  } catch (e) {
    showToast('error', 'Evaluation Failed', 'Could not analyze voice recording. Please try again.');
    evalLoading.style.display = 'none';
    evalEmptyState.style.display = 'flex';
    console.error(e);
  } finally {
    setOrbState('idle');
    aiStatusText.textContent = 'Feedback ready. Pick next question.';
    recordBtn.disabled = false;
  }
}

// ─── 5. RENDER EVALUATION ───────────────────────────────────────────────────────────
function renderEvaluation(ev) {
  const score = ev.overall_score ?? ev.score ?? '—';
  evalScore.textContent = score;
  applyScoreStyle(score);

  evalTranscript.innerHTML = ev.transcript ? marked.parse(ev.transcript) : '<p>No transcript available.</p>';
  evalFeedback.innerHTML   = ev.detailed_feedback ? marked.parse(ev.detailed_feedback) : '<p>—</p>';
  
  if (Array.isArray(ev.missing_points)) {
    const mdList = ev.missing_points.map(m => `- ${m}`).join('\n');
    evalMissing.innerHTML = marked.parse(mdList);
  } else {
    evalMissing.innerHTML = ev.missing_points ? marked.parse(ev.missing_points) : '<p>—</p>';
  }

  if (Array.isArray(ev.learning_roadmap)) {
    const mdList = ev.learning_roadmap.map(r => `- ${r}`).join('\n');
    evalRoadmap.innerHTML = marked.parse(mdList);
  } else {
    evalRoadmap.innerHTML = ev.learning_roadmap ? marked.parse(ev.learning_roadmap) : '<p>—</p>';
  }

  evalLoading.style.display   = 'none';
  evalEmptyState.style.display = 'none';
  evalCard.style.display       = 'block';
}

// ─── HELPER: Browser Supported MIME Type ───────────────────────────────────
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// ─── UX: Click to Expand (Evaluation Panel) ──────────────────────────────────────
const appContainer = document.querySelector('.app-container');
const rightPanel = document.querySelector('.right-panel');

rightPanel.addEventListener('click', (e) => {
  // Only expand if results are present and not loading
  if (evalCard.style.display === 'block') {
    appContainer.classList.toggle('eval-expanded');
  }
});
