/* ═══════════════════════════════════════════════════════════════
   student.js — Student Reader Logic
   Read-only. Connects to server.js over Socket.IO.
   Fetches Quran text from AlQuran.cloud API (quran-uthmani).
   Students cannot send any lesson-control events.
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const QURAN_API_BASE = 'https://api.alquran.cloud/v1';
const QURAN_EDITION  = 'quran-uthmani';

// ── Surah name map (same as teacher.js) ──────────────────────────
const SURAH_NAMES = {
  1:'Al-Fatihah',2:'Al-Baqarah',3:'Al-Imran',4:'An-Nisa',5:'Al-Maidah',
  6:'Al-Anam',7:'Al-Araf',8:'Al-Anfal',9:'At-Tawbah',10:'Yunus',
  11:'Hud',12:'Yusuf',13:'Ar-Rad',14:'Ibrahim',15:'Al-Hijr',
  16:'An-Nahl',17:'Al-Isra',18:'Al-Kahf',19:'Maryam',20:'Ta-Ha',
  21:'Al-Anbiya',22:'Al-Hajj',23:'Al-Muminun',24:'An-Nur',25:'Al-Furqan',
  26:'Ash-Shuara',27:'An-Naml',28:'Al-Qasas',29:'Al-Ankabut',30:'Ar-Rum',
  31:'Luqman',32:'As-Sajdah',33:'Al-Ahzab',34:'Saba',35:'Fatir',
  36:'Ya-Sin',37:'As-Saffat',38:'Sad',39:'Az-Zumar',40:'Ghafir',
  41:'Fussilat',42:'Ash-Shura',43:'Az-Zukhruf',44:'Ad-Dukhan',45:'Al-Jathiyah',
  46:'Al-Ahqaf',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurat',50:'Qaf',
  51:'Adh-Dhariyat',52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rahman',
  56:'Al-Waqiah',57:'Al-Hadid',58:'Al-Mujadila',59:'Al-Hashr',60:'Al-Mumtahanah',
  61:'As-Saf',62:'Al-Jumuah',63:'Al-Munafiqun',64:'At-Taghabun',65:'At-Talaq',
  66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',69:'Al-Haqqah',70:'Al-Maarij',
  71:'Nuh',72:'Al-Jinn',73:'Al-Muzzammil',74:'Al-Muddathir',75:'Al-Qiyamah',
  76:'Al-Insan',77:'Al-Mursalat',78:'An-Naba',79:'An-Naziat',80:'Abasa',
  81:'At-Takwir',82:'Al-Infitar',83:'Al-Mutaffifin',84:'Al-Inshiqaq',85:'Al-Buruj',
  86:'At-Tariq',87:'Al-Ala',88:'Al-Ghashiyah',89:'Al-Fajr',90:'Al-Balad',
  91:'Ash-Shams',92:'Al-Layl',93:'Ad-Duha',94:'Ash-Sharh',95:'At-Tin',
  96:'Al-Alaq',97:'Al-Qadr',98:'Al-Bayyinah',99:'Az-Zalzalah',100:'Al-Adiyat',
  101:'Al-Qariah',102:'At-Takathur',103:'Al-Asr',104:'Al-Humazah',105:'Al-Fil',
  106:'Quraysh',107:'Al-Maun',108:'Al-Kawthar',109:'Al-Kafirun',110:'An-Nasr',
  111:'Al-Masad',112:'Al-Ikhlas',113:'Al-Falaq',114:'An-Nas',
};

// ── State ────────────────────────────────────────────────────────
const surahCache = {};
let lastRevision  = -1;
let displayedSurah = null;
let displayedAyah  = null;

// ── DOM refs ─────────────────────────────────────────────────────
const connBadge    = document.getElementById('s-conn-badge');
const lessonStatus = document.getElementById('s-lesson-status');
const surahName    = document.getElementById('s-surah-name');
const ayahNumber   = document.getElementById('s-ayah-number');
const sWaiting     = document.getElementById('s-waiting');
const sPaused      = document.getElementById('s-paused');
const sEnded       = document.getElementById('s-ended');
const sQuranWrap   = document.getElementById('s-quran-wrap');
const sLoading     = document.getElementById('s-loading');
const sError       = document.getElementById('s-error');
const sQuranText   = document.getElementById('s-quran-text');

// ── Helpers ──────────────────────────────────────────────────────
function setConnBadge(connected) {
  connBadge.textContent = connected ? 'Connected' : 'Reconnecting…';
  connBadge.className   = `status-badge ${connected ? 'status-connected' : 'status-disconnected'}`;
}

function setLessonBadge(status) {
  const map = { idle:'Waiting', active:'Live', paused:'Paused', ended:'Ended' };
  lessonStatus.textContent = map[status] || status;
  lessonStatus.className   = `status-badge status-${status}`;
}

function showScreen(name) {
  sWaiting.hidden   = (name !== 'waiting');
  sPaused.hidden    = (name !== 'paused');
  sEnded.hidden     = (name !== 'ended');
  sQuranWrap.hidden = (name !== 'quran');
}

// ── Quran text tokeniser (matches teacher.js logic exactly) ──────
function tokeniseArabic(text) {
  return text.split(/\s+/).filter(t => t.length > 0);
}

// ── Fetch surah ───────────────────────────────────────────────────
async function fetchSurah(surahNum) {
  if (surahCache[surahNum]) return surahCache[surahNum];
  const url  = `${QURAN_API_BASE}/surah/${surahNum}/${QURAN_EDITION}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`API ${resp.status}`);
  const json = await resp.json();
  if (json.code !== 200 || !json.data?.ayahs)
    throw new Error('Unexpected API response.');
  surahCache[surahNum] = json.data.ayahs.map(a => ({
    number: a.numberInSurah,
    words:  tokeniseArabic(a.text),
  }));
  return surahCache[surahNum];
}

// ── Render a single ayah ──────────────────────────────────────────
function renderAyah(verses, ayahNum, wordIdx) {
  sQuranText.innerHTML = '';

  const verse = verses.find(v => v.number === ayahNum);
  if (!verse) {
    sQuranText.innerHTML = '<p style="text-align:center;color:#888">Ayah not found.</p>';
    return;
  }

  // Context: show previous ayah if exists (greyed)
  const prevVerse = verses.find(v => v.number === ayahNum - 1);
  if (prevVerse) {
    appendAyahSpan(prevVerse, 0, true);
  }

  // Current ayah
  appendAyahSpan(verse, wordIdx, false);

  // Next ayah context
  const nextVerse = verses.find(v => v.number === ayahNum + 1);
  if (nextVerse) {
    appendAyahSpan(nextVerse, 0, true);
  }

  // Scroll active word into view
  const activeEl = sQuranText.querySelector('.current-word');
  if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function appendAyahSpan(verse, activeWordIdx, muted) {
  const ayahSpan = document.createElement('span');
  ayahSpan.className = 'quran-ayah';
  if (muted) ayahSpan.style.opacity = '0.35';

  verse.words.forEach((wordText, idx) => {
    const wordSpan = document.createElement('span');
    wordSpan.className   = 'quran-word';
    wordSpan.textContent = wordText;
    if (!muted && (idx + 1) === activeWordIdx) {
      wordSpan.classList.add('current-word');
    }
    ayahSpan.appendChild(wordSpan);
    ayahSpan.appendChild(document.createTextNode(' '));
  });

  // Verse end marker
  const marker = document.createElement('span');
  marker.className   = 'quran-verse-marker';
  marker.textContent = `﴿${verse.number}﴾`;
  marker.setAttribute('aria-label', `End of ayah ${verse.number}`);
  ayahSpan.appendChild(marker);
  ayahSpan.appendChild(document.createTextNode('  '));

  sQuranText.appendChild(ayahSpan);
}

// ── Apply server state ────────────────────────────────────────────
async function applyState(state) {
  // Ignore duplicate / out-of-order revisions
  if (state.revision <= lastRevision) return;
  lastRevision = state.revision;

  const { status, surahNumber, ayahNumber: an, wordIndex } = state;

  surahName.textContent = surahNumber
    ? `${surahNumber}. ${SURAH_NAMES[surahNumber] || 'Surah ' + surahNumber}`
    : '—';
  ayahNumber.textContent = an || '—';
  setLessonBadge(status);

  if (status === 'idle') {
    showScreen('waiting');
    return;
  }
  if (status === 'paused') {
    showScreen('paused');
    return;
  }
  if (status === 'ended') {
    showScreen('ended');
    return;
  }

  // status === 'active'
  showScreen('quran');
  sError.hidden = true;

  try {
    // Load / use cache
    if (displayedSurah !== surahNumber) {
      sLoading.hidden = false;
      sQuranText.innerHTML = '';
    }

    const verses = await fetchSurah(surahNumber);
    sLoading.hidden = true;
    displayedSurah  = surahNumber;
    displayedAyah   = an;
    renderAyah(verses, an, wordIndex);
  } catch (err) {
    sLoading.hidden      = true;
    sError.textContent   = `Could not load Quran text: ${err.message}. Please check your connection.`;
    sError.hidden        = false;
  }
}

// ── Socket.IO ─────────────────────────────────────────────────────
const socket = io({ transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  setConnBadge(true);
  socket.emit('client:getState');   // request latest state on reconnect
});

socket.on('disconnect', () => {
  setConnBadge(false);
});

socket.on('server:state', (state) => {
  applyState(state);
});

// Students NEVER emit any lesson-control events.
// This file contains no teacher:* emit calls whatsoever.