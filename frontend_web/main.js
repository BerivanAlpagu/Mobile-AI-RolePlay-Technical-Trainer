import './style.css'

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const API_BASE = 'http://127.0.0.1:8000';

// ─── Toast Sistemi ────────────────────────────────────────────────────────────
const toastContainer = document.getElementById('toastContainer');

/**
 * Temaya uygun neon toast bildirimi gösterir.
 * @param {'info'|'warning'|'error'|'success'} type
 * @param {string} title
 * @param {string} message
 * @param {number} duration  ms cinsinden (0 = elle kapat)
 */
function showToast(type, title, message, duration = 5000) {
  const icons   = { info: '💡', warning: '⚠️', error: '❌', success: '✅' };
  const toast   = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] ?? '💡'}</span>
    <div class="toast-body">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" aria-label="Kapat">✕</button>
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

// ─── URL Doğrulama ────────────────────────────────────────────────────────────
/**
 * Girilen URL'in gerçek bir GitHub repo linki olup olmadığını kontrol eder.
 * Sadece profil sayfası (github.com/user) ise false döner.
 * Repo (github.com/user/repo) ise true döner.
 */
function validateGithubRepoUrl(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('github.com')) {
      return { valid: false, reason: 'not_github' };
    }
    // Yol: /kullanici/repo → en az 2 segment olmalı
    const segments = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
    if (segments.length < 2 || segments[1] === '') {
      return { valid: false, reason: 'profile_only', username: segments[0] };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'invalid_url' };
  }
}

// ─── DOM Referansları ─────────────────────────────────────────────────────────
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

// ─── Uygulama Durumu ──────────────────────────────────────────────────────────
let currentSessionId   = null;
let activeQuestion     = null;  // { text, difficulty }
let mediaRecorder      = null;
let audioChunks        = [];
let isRecording        = false;

// ─── YARDIMCI: Orb Durumu ─────────────────────────────────────────────────────
function setOrbState(state) {
  // state: 'idle' | 'thinking' | 'listening' | 'processing'
  glowingOrb.className = 'glowing-orb';
  if (state === 'thinking')  glowingOrb.classList.add('active');
  if (state === 'listening') glowingOrb.classList.add('speaking');
}

// ─── YARDIMCI: Skor Ring Rengi ────────────────────────────────────────────────
function applyScoreStyle(score) {
  const n = parseFloat(score);
  scoreRing.classList.remove('high', 'mid', 'low');
  if (n >= 7.5)      scoreRing.classList.add('high');
  else if (n >= 4.5) scoreRing.classList.add('mid');
  else               scoreRing.classList.add('low');
}

// ─── YARDIMCI: Soru Listesini Render Et ──────────────────────────────────────
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

    // Badge renk sınıfı
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
        <span class="accordion-count">${qs.length} soru</span>
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

    // Accordion toggle: tıklayınca aç, diğerlerini kapat
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

// ─── YARDIMCI: Soru Seç ──────────────────────────────────────────────────────
function selectQuestion(itemEl, difficulty, text) {
  // Önceki aktifi kaldır
  document.querySelectorAll('.question-item.active').forEach(el => el.classList.remove('active'));
  itemEl.classList.add('active');

  activeQuestion = { text, difficulty };

  // Hint adımlarını gizle
  if (hintSteps) hintSteps.style.display = 'none';

  // Orta alandaki soru kutusunu göster
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

  // Sağ paneli temizle
  evalCard.style.display = 'none';
  evalLoading.style.display = 'none';
  evalEmptyState.style.display = 'flex';
}

// ─── 1. REPO ANALİZİ ─────────────────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
  const url = repoInput.value.trim();

  // ── Boş alan ──
  if (!url) {
    showToast('warning', 'URL Girilmedi', 'Lütfen analiz etmek istediğiniz GitHub repo bağlantısını girin.');
    repoInput.focus();
    return;
  }

  // ── URL Doğrulama ──
  const check = validateGithubRepoUrl(url);
  if (!check.valid) {
    if (check.reason === 'profile_only') {
      showToast(
        'warning',
        'Profil Linki Girildi',
        `<strong>github.com/${check.username}</strong> bir kullanıcı profili. ` +
        'Lütfen belirli bir repo linki ekleyin:<br>' +
        `<code style="color:#00f0ff">github.com/${check.username}/repo-adı</code>`,
        7000
      );
    } else if (check.reason === 'not_github') {
      showToast('error', 'Geçersiz Platform', 'Yalnızca GitHub repo linkleri desteklenmektedir.');
    } else {
      showToast('error', 'Geçersiz URL', 'Lütfen geçerli bir GitHub repo URL\'si girin.');
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
      // Repo bulunamadı mı?
      const detail = err.detail || '';
      if (detail.toLowerCase().includes('not found') || detail.toLowerCase().includes('repository')) {
        showToast(
          'error',
          'Repo Bulunamadı',
          `<strong>${url}</strong> adresi erişilebilir değil.<br>Repo'nun public olduğundan emin olun.`,
          7000
        );
      } else {
        showToast('error', 'Sunucu Hatası', detail || 'Bilinmeyen bir hata oluştu.');
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
    showToast('success', 'Repo Bağlandı!', `${total} mülakat sorusu hazırlandı. Sol panelden bir soru seçin.`, 5000);

  } catch (e) {
    showToast('error', 'Bağlantı Hatası', 'Backend\'e ulaşılamıyor. Backend\'in çalıştığından emin olun.');
    setOrbState('idle');
    aiStatusText.textContent = 'Enter Repo to Begin';
    console.error(e);
  } finally {
    analyzeBtn.textContent = '⚡ Analyze Repo';
    analyzeBtn.disabled = false;
  }
});

// ─── 2. SESİ DİNLE (TTS) ──────────────────────────────────────────────────────
listenBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;
  listenBtn.textContent = '🔊 ...';
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
    listenBtn.textContent = '🔊 Listen';
    listenBtn.disabled = false;
  }
});

// ─── 3. SES KAYDI (MediaRecorder) ────────────────────────────────────────────
recordBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;

  if (!isRecording) {
    // ── Kaydı Başlat ──
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
      recordBtn.textContent = '⏹ Stop Answering';
      aiStatusText.textContent = 'Listening carefully...';
      setOrbState('listening');
      audioVisualizer.style.display = 'flex';
    } catch (err) {
      aiStatusText.textContent = 'Microphone access denied!';
      console.error(err);
    }
  } else {
    // ── Kaydı Durdur ──
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🎤 Start Answering';
    recordBtn.disabled = true;
    audioVisualizer.style.display = 'none';
    setOrbState('thinking');
    aiStatusText.textContent = 'Uploading to AI Engine...';

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      // Mikrofon akışını kapat
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

// ─── 4A. TEXT SUBMIT → API'YE GÖNDER ─────────────────────────────────────────
submitTextBtn.addEventListener('click', async () => {
  if (!activeQuestion) return;
  const answer = textAnswerInput.value.trim();
  if (!answer) {
    showToast('warning', 'Boş Cevap', 'Lütfen kodunuzu veya açıklamanızı yazın.');
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
    showToast('success', 'Değerlendirme Tamam', 'Cevabınız incelendi.');

  } catch (e) {
    showToast('error', 'Değerlendirme Hatası', 'Cevap analiz edilirken bir hata oluştu.');
    evalLoading.style.display = 'none';
    evalEmptyState.style.display = 'flex';
    console.error(e);
  } finally {
    setOrbState('idle');
    aiStatusText.textContent = 'Feedback ready. Pick next question.';
    submitTextBtn.disabled = false;
  }
});

// ─── 4B. VOICE RECORDING STOPPED → API'YE GÖNDER ─────────────────────────────
async function handleRecordingStop() {
  const mimeType = getSupportedMimeType();
  const audioBlob = new Blob(audioChunks, { type: mimeType });

  // Sağ paneli → loading state'e al
  evalCard.style.display = 'none';
  evalEmptyState.style.display = 'none';
  evalLoading.style.display = 'flex';

  try {
    const formData = new FormData();
    // Backend webm ya da ogg alabilir; pydub dönüştürür
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
    showToast('error', 'Değerlendirme Hatası', 'Ses analiz edilirken bir hata oluştu. Lütfen tekrar deneyin.');
    evalLoading.style.display = 'none';
    evalEmptyState.style.display = 'flex';
    console.error(e);
  } finally {
    setOrbState('idle');
    aiStatusText.textContent = 'Feedback ready. Pick next question.';
    recordBtn.disabled = false;
  }
}

// ─── 5. DEĞERLENDİRMEYİ RENDER ET ───────────────────────────────────────────
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

// ─── YARDIMCI: Tarayıcı Destekli MIME Tipi ───────────────────────────────────
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

// ─── UX: Tıkla ve Büyüt (Expand Panel) ──────────────────────────────────────
const appContainer = document.querySelector('.app-container');
const rightPanel = document.querySelector('.right-panel');

rightPanel.addEventListener('click', (e) => {
  // Sadece sonuçlar varken ve evalLoading kapalıyken tıklandığında büyüsün
  if (evalCard.style.display === 'block') {
    appContainer.classList.toggle('eval-expanded');
  }
});
