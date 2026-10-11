/* ═══════════════════════════════════════════════════════════════
   teacher.js — Teacher Dashboard Logic
   Communicates with server.js over Socket.IO
   Fetches Quran text from AlQuran.cloud API (quran-uthmani)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Quran API ────────────────────────────────────────────────────
const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_EDITION  = 'quran-uthmani';

// ── Surah metadata (name + ayah count) ──────────────────────────
// Full list of 114 Surahs. Name in English transliteration + Arabic.
// ayahs sourced from standard Hafs mushaf count.
const SURAH_LIST = [
  {n:1,  a:"Al-Fatihah",   ar:"الفاتحة",    c:7},
  {n:2,  a:"Al-Baqarah",   ar:"البقرة",     c:286},
  {n:3,  a:"Al-Imran",     ar:"آل عمران",   c:200},
  {n:4,  a:"An-Nisa",      ar:"النساء",     c:176},
  {n:5,  a:"Al-Maidah",    ar:"المائدة",    c:120},
  {n:6,  a:"Al-Anam",      ar:"الأنعام",    c:165},
  {n:7,  a:"Al-Araf",      ar:"الأعراف",    c:206},
  {n:8,  a:"Al-Anfal",     ar:"الأنفال",    c:75},
  {n:9,  a:"At-Tawbah",    ar:"التوبة",     c:129},
  {n:10, a:"Yunus",        ar:"يونس",       c:109},
  {n:11, a:"Hud",          ar:"هود",        c:123},
  {n:12, a:"Yusuf",        ar:"يوسف",       c:111},
  {n:13, a:"Ar-Rad",       ar:"الرعد",      c:43},
  {n:14, a:"Ibrahim",      ar:"إبراهيم",    c:52},
  {n:15, a:"Al-Hijr",      ar:"الحجر",      c:99},
  {n:16, a:"An-Nahl",      ar:"النحل",      c:128},
  {n:17, a:"Al-Isra",      ar:"الإسراء",    c:111},
  {n:18, a:"Al-Kahf",      ar:"الكهف",      c:110},
  {n:19, a:"Maryam",       ar:"مريم",       c:98},
  {n:20, a:"Ta-Ha",        ar:"طه",         c:135},
  {n:21, a:"Al-Anbiya",    ar:"الأنبياء",   c:112},
  {n:22, a:"Al-Hajj",      ar:"الحج",       c:78},
  {n:23, a:"Al-Muminun",   ar:"المؤمنون",   c:118},
  {n:24, a:"An-Nur",       ar:"النور",      c:64},
  {n:25, a:"Al-Furqan",    ar:"الفرقان",    c:77},
  {n:26, a:"Ash-Shuara",   ar:"الشعراء",    c:227},
  {n:27, a:"An-Naml",      ar:"النمل",      c:93},
  {n:28, a:"Al-Qasas",     ar:"القصص",      c:88},
  {n:29, a:"Al-Ankabut",   ar:"العنكبوت",   c:69},
  {n:30, a:"Ar-Rum",       ar:"الروم",      c:60},
  {n:31, a:"Luqman",       ar:"لقمان",      c:34},
  {n:32, a:"As-Sajdah",    ar:"السجدة",     c:30},
  {n:33, a:"Al-Ahzab",     ar:"الأحزاب",    c:73},
  {n:34, a:"Saba",         ar:"سبأ",        c:54},
  {n:35, a:"Fatir",        ar:"فاطر",       c:45},
  {n:36, a:"Ya-Sin",       ar:"يس",         c:83},
  {n:37, a:"As-Saffat",    ar:"الصافات",    c:182},
  {n:38, a:"Sad",          ar:"ص",          c:88},
  {n:39, a:"Az-Zumar",     ar:"الزمر",      c:75},
  {n:40, a:"Ghafir",       ar:"غافر",       c:85},
  {n:41, a:"Fussilat",     ar:"فصلت",       c:54},
  {n:42, a:"Ash-Shura",    ar:"الشورى",     c:53},
  {n:43, a:"Az-Zukhruf",   ar:"الزخرف",     c:89},
  {n:44, a:"Ad-Dukhan",    ar:"الدخان",     c:59},
  {n:45, a:"Al-Jathiyah",  ar:"الجاثية",    c:37},
  {n:46, a:"Al-Ahqaf",     ar:"الأحقاف",    c:35},
  {n:47, a:"Muhammad",     ar:"محمد",       c:38},
  {n:48, a:"Al-Fath",      ar:"الفتح",      c:29},
  {n:49, a:"Al-Hujurat",   ar:"الحجرات",    c:18},
  {n:50, a:"Qaf",          ar:"ق",          c:45},
  {n:51, a:"Adh-Dhariyat", ar:"الذاريات",   c:60},
  {n:52, a:"At-Tur",       ar:"الطور",      c:49},
  {n:53, a:"An-Najm",      ar:"النجم",      c:62},
  {n:54, a:"Al-Qamar",     ar:"القمر",      c:55},
  {n:55, a:"Ar-Rahman",    ar:"الرحمن",     c:78},
  {n:56, a:"Al-Waqiah",    ar:"الواقعة",    c:96},
  {n:57, a:"Al-Hadid",     ar:"الحديد",     c:29},
  {n:58, a:"Al-Mujadila",  ar:"المجادلة",   c:22},
  {n:59, a:"Al-Hashr",     ar:"الحشر",      c:24},
  {n:60, a:"Al-Mumtahanah",ar:"الممتحنة",   c:13},
  {n:61, a:"As-Saf",       ar:"الصف",       c:14},
  {n:62, a:"Al-Jumuah",    ar:"الجمعة",     c:11},
  {n:63, a:"Al-Munafiqun", ar:"المنافقون",  c:11},
  {n:64, a:"At-Taghabun",  ar:"التغابن",    c:18},
  {n:65, a:"At-Talaq",     ar:"الطلاق",     c:12},
  {n:66, a:"At-Tahrim",    ar:"التحريم",    c:12},
  {n:67, a:"Al-Mulk",      ar:"الملك",      c:30},
  {n:68, a:"Al-Qalam",     ar:"القلم",      c:52},
  {n:69, a:"Al-Haqqah",    ar:"الحاقة",     c:52},
  {n:70, a:"Al-Maarij",    ar:"المعارج",    c:44},
  {n:71, a:"Nuh",          ar:"نوح",        c:28},
  {n:72, a:"Al-Jinn",      ar:"الجن",       c:28},
  {n:73, a:"Al-Muzzammil", ar:"المزمل",     c:20},
  {n:74, a:"Al-Muddathir", ar:"المدثر",     c:56},
  {n:75, a:"Al-Qiyamah",   ar:"القيامة",    c:40},
  {n:76, a:"Al-Insan",     ar:"الإنسان",    c:31},
  {n:77, a:"Al-Mursalat",  ar:"المرسلات",   c:50},
  {n:78, a:"An-Naba",      ar:"النبأ",      c:40},
  {n:79, a:"An-Naziat",    ar:"النازعات",   c:46},
  {n:80, a:"Abasa",        ar:"عبس",        c:42},
  {n:81, a:"At-Takwir",    ar:"التكوير",    c:29},
  {n:82, a:"Al-Infitar",   ar:"الانفطار",   c:19},
  {n:83, a:"Al-Mutaffifin",ar:"المطففين",   c:36},
  {n:84, a:"Al-Inshiqaq",  ar:"الانشقاق",   c:25},
  {n:85, a:"Al-Buruj",     ar:"البروج",     c:22},
  {n:86, a:"At-Tariq",     ar:"الطارق",     c:17},
  {n:87, a:"Al-Ala",       ar:"الأعلى",     c:19},
  {n:88, a:"Al-Ghashiyah", ar:"الغاشية",    c:26},
  {n:89, a:"Al-Fajr",      ar:"الفجر",      c:30},
  {n:90, a:"Al-Balad",     ar:"البلد",      c:20},
  {n:91, a:"Ash-Shams",    ar:"الشمس",      c:15},
  {n:92, a:"Al-Layl",      ar:"الليل",      c:21},
  {n:93, a:"Ad-Duha",      ar:"الضحى",      c:11},
  {n:94, a:"Ash-Sharh",    ar:"الشرح",      c:8},
  {n:95, a:"At-Tin",       ar:"التين",      c:8},
  {n:96, a:"Al-Alaq",      ar:"العلق",      c:19},
  {n:97, a:"Al-Qadr",      ar:"القدر",      c:5},
  {n:98, a:"Al-Bayyinah",  ar:"البينة",     c:8},
  {n:99, a:"Az-Zalzalah",  ar:"الزلزلة",    c:8},
  {n:100,a:"Al-Adiyat",    ar:"العاديات",   c:11},
  {n:101,a:"Al-Qariah",    ar:"القارعة",    c:11},
  {n:102,a:"At-Takathur",  ar:"التكاثر",    c:8},
  {n:103,a:"Al-Asr",       ar:"العصر",      c:3},
  {n:104,a:"Al-Humazah",   ar:"الهمزة",     c:9},
  {n:105,a:"Al-Fil",       ar:"الفيل",      c:5},
  {n:106,a:"Quraysh",      ar:"قريش",       c:4},
  {n:107,a:"Al-Maun",      ar:"الماعون",    c:7},
  {n:108,a:"Al-Kawthar",   ar:"الكوثر",     c:3},
  {n:109,a:"Al-Kafirun",   ar:"الكافرون",   c:6},
  {n:110,a:"An-Nasr",      ar:"النصر",      c:3},
  {n:111,a:"Al-Masad",     ar:"المسد",      c:5},
  {n:112,a:"Al-Ikhlas",    ar:"الإخلاص",    c:4},
  {n:113,a:"Al-Falaq",     ar:"الفلق",      c:5},
  {n:114,a:"An-Nas",       ar:"الناس",      c:6},
];

// ── State ────────────────────────────────────────────────────────
let socket          = null;
let authenticated   = false;
let lessonStatus    = 'idle';

// Local Quran data cache: surahCache[surahNumber] = [ {words:[...], number, text}, ... ]
const surahCache    = {};
let loadedSurahNum  = null;
let currentSurahNum = 1;
let currentAyahNum  = 1;
let currentWordIdx  = 0;

// ── DOM refs ─────────────────────────────────────────────────────
const loginPanel     = document.getElementById('login-panel');
const dashPanel      = document.getElementById('dashboard-panel');
const loginForm      = document.getElementById('login-form');
const passwordInput  = document.getElementById('password-input');
const loginError     = document.getElementById('login-error');
const btnLogout      = document.getElementById('btn-logout');
const connBadge      = document.getElementById('conn-badge');
const lessonBadge    = document.getElementById('lesson-status-badge');
const dashSurahName  = document.getElementById('dash-surah-name');
const dashAyahNum    = document.getElementById('dash-ayah-number');
const dashWordIdx    = document.getElementById('dash-word-index');
const dashAlert      = document.getElementById('dash-alert');
const surahSelect    = document.getElementById('surah-select');
const ayahSelect     = document.getElementById('ayah-select');
const btnLoad        = document.getElementById('btn-load');
const quranLoading   = document.getElementById('quran-loading');
const quranError     = document.getElementById('quran-error');
const quranTextArea  = document.getElementById('quran-text-area');
const quranCardLabel = document.getElementById('quran-card-label');
const currentWordEl  = document.getElementById('current-word-arabic');
const btnStart       = document.getElementById('btn-start');
const btnPause       = document.getElementById('btn-pause');
const btnResume      = document.getElementById('btn-resume');
const btnEnd         = document.getElementById('btn-end');
const btnPrevWord    = document.getElementById('btn-prev-word');
const btnNextWord    = document.getElementById('btn-next-word');
const btnPrevAyah    = document.getElementById('btn-prev-ayah');
const btnNextAyah    = document.getElementById('btn-next-ayah');

// ── Helpers ──────────────────────────────────────────────────────

function surahInfo(n) {
  return SURAH_LIST.find(s => s.n === n) || { n, a: `Surah ${n}`, ar: '', c: 0 };
}

function showAlert(msg, type = 'error') {
  dashAlert.textContent = msg;
  dashAlert.className   = `alert alert-${type}`;
  dashAlert.hidden      = false;
  setTimeout(() => { dashAlert.hidden = true; }, 6000);
}

function setConnBadge(connected) {
  connBadge.textContent = connected ? 'Connected' : 'Disconnected';
  connBadge.className   = `status-badge ${connected ? 'status-connected' : 'status-disconnected'}`;
}

function setLessonBadge(status) {
  const map = { idle:'Idle', active:'Active', paused:'Paused', ended:'Ended' };
  lessonBadge.textContent = map[status] || status;
  lessonBadge.className   = `status-badge status-${status}`;
}

function updateButtonStates(status) {
  lessonStatus = status;
  btnStart.disabled  =  (status === 'active' || status === 'paused');
  btnPause.disabled  =  (status !== 'active');
  btnResume.disabled =  (status !== 'paused');
  btnEnd.disabled    =  (status === 'idle' || status === 'ended');
  const navEnabled   =   status === 'active';
  btnPrevWord.disabled = !navEnabled;
  btnNextWord.disabled = !navEnabled;
  btnPrevAyah.disabled = !navEnabled;
  btnNextAyah.disabled = !navEnabled;
}

// ── Populate Surah dropdown ───────────────────────────────────────
function populateSurahSelect() {
  surahSelect.innerHTML = '';
  SURAH_LIST.forEach(s => {
    const opt = document.createElement('option');
    opt.value       = s.n;
    opt.textContent = `${s.n}. ${s.a}`;
    surahSelect.appendChild(opt);
  });
  surahSelect.value = '1';
  populateAyahSelect(1);
}

function populateAyahSelect(surahNum) {
  const info = surahInfo(surahNum);
  ayahSelect.innerHTML = '';
  for (let i = 1; i <= info.c; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Ayah ${i}`;
    ayahSelect.appendChild(opt);
  }
  ayahSelect.value = '1';
}

surahSelect.addEventListener('change', () => {
  populateAyahSelect(parseInt(surahSelect.value, 10));
});

// ── Fetch and render Quran text ───────────────────────────────────

/**
 * Tokenise Arabic ayah text into words.
 * Uses whitespace splitting while preserving all diacritics.
 * Verse markers (e.g. ۝) are kept as separate tokens.
 */
function tokeniseArabic(text) {
  // Split on whitespace; filter empties
  return text.split(/\s+/).filter(t => t.length > 0);
}

/**
 * Render the loaded surah into quranTextArea.
 * Each word gets a span.quran-word with data-surah, data-ayah, data-word attributes.
 */
function renderSurah(surahNum) {
  const verses = surahCache[surahNum];
  if (!verses) return;

  const info = surahInfo(surahNum);
  quranCardLabel.textContent = `${info.n}. ${info.a} — ${info.ar}`;
  quranTextArea.innerHTML = '';

  verses.forEach(verse => {
    const ayahDiv = document.createElement('span');
    ayahDiv.className = 'quran-ayah';
    ayahDiv.setAttribute('data-ayah', verse.number);

    verse.words.forEach((wordText, idx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className      = 'quran-word';
      wordSpan.textContent    = wordText;
      wordSpan.dataset.surah  = surahNum;
      wordSpan.dataset.ayah   = verse.number;
      wordSpan.dataset.word   = idx + 1;  // 1-based
      ayahDiv.appendChild(wordSpan);
      ayahDiv.appendChild(document.createTextNode(' '));
    });

    // Verse marker
    const marker = document.createElement('span');
    marker.className   = 'quran-verse-marker';
    marker.textContent = `﴿${verse.number}﴾`;
    marker.setAttribute('aria-label', `End of ayah ${verse.number}`);
    ayahDiv.appendChild(marker);
    ayahDiv.appendChild(document.createTextNode('  '));

    quranTextArea.appendChild(ayahDiv);
  });
}

async function loadSurah(surahNum, ayahNum) {
  quranLoading.hidden = false;
  quranError.hidden   = true;
  quranTextArea.innerHTML = '<p class="quran-placeholder">Loading…</p>';

  try {
    // Use cached data if available
    if (!surahCache[surahNum]) {
      const url  = `${QURAN_API_BASE}/surah/${surahNum}/${QURAN_EDITION}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const json = await resp.json();
      if (json.code !== 200 || !json.data || !json.data.ayahs) {
        throw new Error('Unexpected API response format.');
      }
      surahCache[surahNum] = json.data.ayahs.map(a => ({
        number: a.numberInSurah,
        text:   a.text,
        words:  tokeniseArabic(a.text),
      }));
    }

    loadedSurahNum  = surahNum;
    renderSurah(surahNum);

    // Scroll to the target ayah
    scrollToAyah(surahNum, ayahNum);

  } catch (err) {
    quranError.textContent = `Could not load Quran text: ${err.message}. Please check your internet connection and try again.`;
    quranError.hidden = false;
    quranTextArea.innerHTML = '';
  } finally {
    quranLoading.hidden = true;
  }
}

function scrollToAyah(surahNum, ayahNum) {
  const el = quranTextArea.querySelector(`[data-ayah="${ayahNum}"]`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Highlight word ────────────────────────────────────────────────
function highlightWord(surahNum, ayahNum, wordIdx) {
  // Remove any existing highlight
  quranTextArea.querySelectorAll('.current-word').forEach(el => {
    el.classList.remove('current-word');
  });
  currentWordEl.textContent = '—';

  if (!wordIdx || wordIdx < 1) return;

  const el = quranTextArea.querySelector(
    `.quran-word[data-surah="${surahNum}"][data-ayah="${ayahNum}"][data-word="${wordIdx}"]`
  );
  if (el) {
    el.classList.add('current-word');
    currentWordEl.textContent = el.textContent;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Sync with server state ────────────────────────────────────────
async function applyServerState(state) {
  const { status, surahNumber, ayahNumber, wordIndex } = state;

  currentSurahNum = surahNumber || 1;
  currentAyahNum  = ayahNumber  || 1;
  currentWordIdx  = wordIndex   || 0;

  const info = surahInfo(currentSurahNum);
  dashSurahName.textContent = `${info.n}. ${info.a}`;
  dashAyahNum.textContent   = currentAyahNum;
  dashWordIdx.textContent   = currentWordIdx || '—';

  setLessonBadge(status);
  updateButtonStates(status);

  // Load surah into display if different
  if (loadedSurahNum !== currentSurahNum) {
    surahSelect.value = currentSurahNum;
    populateAyahSelect(currentSurahNum);
    ayahSelect.value  = currentAyahNum;
    await loadSurah(currentSurahNum, currentAyahNum);
  }

  highlightWord(currentSurahNum, currentAyahNum, currentWordIdx);
}

// ── Socket.IO ─────────────────────────────────────────────────────
function initSocket() {
  socket = io({ transports: ['websocket', 'polling'] });

  socket.on('connect',    () => setConnBadge(true));
  socket.on('disconnect', () => setConnBadge(false));

  socket.on('server:state', (state) => {
    applyServerState(state);
  });

  socket.on('server:ack', (data) => {
    if (data.state) applyServerState(data.state);
  });

  socket.on('server:error', (data) => {
    showAlert(data.message || 'An error occurred.', 'error');
  });
}

// ── Auth flow ─────────────────────────────────────────────────────
async function checkAuthStatus() {
  try {
    const resp = await fetch('/api/auth/status');
    const data = await resp.json();
    if (data.authenticated) {
      showDashboard();
    }
  } catch (_) { /* server not ready yet */ }
}

function showDashboard() {
  authenticated       = true;
  loginPanel.hidden   = true;
  dashPanel.style.display = 'grid';
  btnLogout.style.display = 'inline-flex';
  populateSurahSelect();
  initSocket();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden   = true;
  const pw = passwordInput.value;
  const btn = document.getElementById('btn-login');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: pw }),
    });
    const data = await resp.json();
    if (data.ok) {
      passwordInput.value = '';
      showDashboard();
    } else {
      loginError.textContent = data.error || 'Login failed.';
      loginError.hidden      = false;
    }
  } catch (err) {
    loginError.textContent = 'Could not reach the server. Is it running?';
    loginError.hidden      = false;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
});

btnLogout.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

// ── Lesson controls ───────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  if (!socket) return;
  socket.emit('teacher:startLesson', {
    surahNumber: parseInt(surahSelect.value, 10) || 1,
    ayahNumber:  parseInt(ayahSelect.value,  10) || 1,
  });
});

btnPause.addEventListener('click', () => {
  if (!socket) return;
  socket.emit('teacher:pauseLesson');
});

btnResume.addEventListener('click', () => {
  if (!socket) return;
  socket.emit('teacher:resumeLesson');
});

btnEnd.addEventListener('click', () => {
  if (!socket) return;
  if (!confirm('End the lesson? Students will see the lesson-ended screen.')) return;
  socket.emit('teacher:endLesson');
});

// ── Load button ───────────────────────────────────────────────────
btnLoad.addEventListener('click', () => {
  const sn = parseInt(surahSelect.value, 10);
  const an = parseInt(ayahSelect.value,  10);
  currentSurahNum = sn;
  currentAyahNum  = an;
  loadSurah(sn, an);
});

// ── Word navigation ───────────────────────────────────────────────
function totalWordsForCurrentAyah() {
  const verses = surahCache[currentSurahNum];
  if (!verses) return 0;
  const verse = verses.find(v => v.number === currentAyahNum);
  return verse ? verse.words.length : 0;
}

function totalAyahsForCurrentSurah() {
  return surahInfo(currentSurahNum).c;
}

btnNextWord.addEventListener('click', () => {
  if (!socket) return;
  socket.emit('teacher:nextWord', {
    totalWords: totalWordsForCurrentAyah(),
    totalAyahs: totalAyahsForCurrentSurah(),
  });
});

btnPrevWord.addEventListener('click', () => {
  if (!socket) return;
  socket.emit('teacher:prevWord', {
    totalWords: totalWordsForCurrentAyah(),
  });
});

btnNextAyah.addEventListener('click', () => {
  if (!socket || lessonStatus !== 'active') return;
  const nextA = currentAyahNum + 1;
  if (nextA > totalAyahsForCurrentSurah()) {
    showAlert('Already at the last ayah of this Surah.', 'error');
    return;
  }
  socket.emit('teacher:setPosition', {
    surahNumber: currentSurahNum,
    ayahNumber:  nextA,
    wordIndex:   1,
  });
});

btnPrevAyah.addEventListener('click', () => {
  if (!socket || lessonStatus !== 'active') return;
  const prevA = currentAyahNum - 1;
  if (prevA < 1) {
    showAlert('Already at the first ayah.', 'error');
    return;
  }
  socket.emit('teacher:setPosition', {
    surahNumber: currentSurahNum,
    ayahNumber:  prevA,
    wordIndex:   1,
  });
});

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Only fire when not typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (!authenticated || lessonStatus !== 'active') return;
  if (e.key === 'ArrowRight') { e.preventDefault(); btnPrevWord.click(); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); btnNextWord.click(); }
  if (e.key === 'ArrowDown')  { e.preventDefault(); btnNextAyah.click(); }
  if (e.key === 'ArrowUp')    { e.preventDefault(); btnPrevAyah.click(); }
});

// ── Init ──────────────────────────────────────────────────────────
checkAuthStatus();