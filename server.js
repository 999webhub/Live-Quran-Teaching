// ═══════════════════════════════════════════════════════════════
//  Live Quran Teaching — server.js
//  Express + Socket.IO backend
//  Quran text source: AlQuran.cloud API (api.alquran.cloud/v1)
//  Edition: quran-uthmani  (Uthmani Arabic script)
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── 1. Load environment ──────────────────────────────────────────
require('dotenv').config();

const REQUIRED_ENV = ['TEACHER_PASSWORD', 'SESSION_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    `\n[FATAL] Missing required environment variable(s): ${missing.join(', ')}\n` +
    `Copy .env.example to .env and fill in the values, then restart.\n`
  );
  process.exit(1);
}

const PORT           = process.env.PORT           || 3000;
const TEACHER_PASS   = process.env.TEACHER_PASSWORD;   // never logged
const SESSION_SECRET = process.env.SESSION_SECRET;
const IS_PROD        = process.env.NODE_ENV === 'production';

// ── 2. Imports ───────────────────────────────────────────────────
const path          = require('path');
const http          = require('http');
const express       = require('express');
const helmet        = require('helmet');
const cookieParser  = require('cookie-parser');
const session       = require('express-session');
const rateLimit     = require('express-rate-limit');
const { Server }    = require('socket.io');

// ── 3. App & HTTP server ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── 4. Security middleware ───────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'"],
        styleSrc:    ["'self'", "'unsafe-inline'"],          // inline styles for Arabic font
        fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
        connectSrc:  ["'self'", 'wss:', 'ws:'],
        imgSrc:      ["'self'", 'data:'],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ── 5. Session ───────────────────────────────────────────────────
const sessionMiddleware = session({
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  name:              'lqt.sid',
  cookie: {
    httpOnly:  true,
    sameSite:  'strict',
    secure:    IS_PROD,           // HTTPS only in production
    maxAge:    8 * 60 * 60 * 1000 // 8 hours
  }
});
app.use(sessionMiddleware);

// ── 6. Rate limiting ─────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,
  message:         { ok: false, error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── 7. Static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── 8. Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ── 9. Auth routes ───────────────────────────────────────────────
app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ ok: false, error: 'Password is required.' });
  }
  // Constant-time comparison would be ideal for long secrets;
  // for a single-teacher app this check is sufficient.
  if (password !== TEACHER_PASS) {
    return res.status(401).json({ ok: false, error: 'Incorrect password.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Session error.' });
    req.session.isTeacher = true;
    res.json({ ok: true });
  });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('lqt.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/status', (req, res) => {
  res.json({ authenticated: !!req.session.isTeacher });
});

// ── 10. Lesson state ─────────────────────────────────────────────
//
//  All indexes are 1-based to match Quran conventions:
//    surahNumber : 1–114
//    ayahNumber  : 1–(ayah count of surah)
//    wordIndex   : 1–(word count of ayah)  (0 = no word selected yet)
//
//  status : 'idle' | 'active' | 'paused' | 'ended'
//
const lessonState = {
  status:      'idle',
  surahNumber: 1,
  ayahNumber:  1,
  wordIndex:   0,
  revision:    0,
  updatedAt:   null,
};

function bumpRevision() {
  lessonState.revision += 1;
  lessonState.updatedAt = new Date().toISOString();
}

function publicState() {
  // Returns a safe copy — never includes auth data
  return { ...lessonState };
}

// ── 11. Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: false },
  pingTimeout:  20000,
  pingInterval: 10000,
});

// Share Express session with Socket.IO
io.engine.use(sessionMiddleware);

// ── Helper: is this socket an authenticated teacher? ─────────────
function isTeacher(socket) {
  const sess = socket.request.session;
  return !!(sess && sess.isTeacher === true);
}

// ── Validate a positive integer ──────────────────────────────────
function posInt(v, max) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 && n <= max;
}

// ── 12. Socket event handling ────────────────────────────────────
//
//  EVENT CONTRACT
//  ┌──────────────────────────┬──────────┬──────────┐
//  │ Event name               │ Sender   │ Receiver │
//  ├──────────────────────────┼──────────┼──────────┤
//  │ client:getState          │ anyone   │ server   │
//  │ server:state             │ server   │ anyone   │
//  │ teacher:startLesson      │ teacher  │ server   │
//  │ teacher:pauseLesson      │ teacher  │ server   │
//  │ teacher:resumeLesson     │ teacher  │ server   │
//  │ teacher:endLesson        │ teacher  │ server   │
//  │ teacher:setPosition      │ teacher  │ server   │
//  │ teacher:nextWord         │ teacher  │ server   │
//  │ teacher:prevWord         │ teacher  │ server   │
//  │ server:error             │ server   │ sender   │
//  │ server:ack               │ server   │ teacher  │
//  └──────────────────────────┴──────────┴──────────┘
//
io.on('connection', (socket) => {
  // Send current state immediately on connect
  socket.emit('server:state', publicState());

  // ── Request current state ──────────────────────────────────────
  socket.on('client:getState', () => {
    socket.emit('server:state', publicState());
  });

  // ── Guard helper ──────────────────────────────────────────────
  function requireTeacher(cb) {
    if (!isTeacher(socket)) {
      socket.emit('server:error', { code: 'UNAUTHORIZED', message: 'Teacher authentication required.' });
      return;
    }
    cb();
  }

  function ack(cb) {
    // Returns a function that emits ack/error then broadcasts state
    return (errMsg) => {
      if (errMsg) {
        socket.emit('server:error', { code: 'INVALID', message: errMsg });
      } else {
        socket.emit('server:ack', { ok: true, state: publicState() });
        io.emit('server:state', publicState());    // broadcast to all
      }
    };
  }

  // ── Start lesson ───────────────────────────────────────────────
  socket.on('teacher:startLesson', (payload) => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status === 'active') return done('Lesson is already active.');
      const sn = parseInt(payload?.surahNumber, 10) || lessonState.surahNumber;
      const an = parseInt(payload?.ayahNumber,  10) || lessonState.ayahNumber;
      if (!posInt(sn, 114))       return done('Invalid Surah number (1–114).');
      if (!posInt(an, 6236))      return done('Invalid Ayah number.');
      lessonState.status      = 'active';
      lessonState.surahNumber = sn;
      lessonState.ayahNumber  = an;
      lessonState.wordIndex   = 1;
      bumpRevision();
      done();
    });
  });

  // ── Pause lesson ───────────────────────────────────────────────
  socket.on('teacher:pauseLesson', () => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status !== 'active') return done('Lesson is not active.');
      lessonState.status = 'paused';
      bumpRevision();
      done();
    });
  });

  // ── Resume lesson ──────────────────────────────────────────────
  socket.on('teacher:resumeLesson', () => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status !== 'paused') return done('Lesson is not paused.');
      lessonState.status = 'active';
      bumpRevision();
      done();
    });
  });

  // ── End lesson ─────────────────────────────────────────────────
  socket.on('teacher:endLesson', () => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status === 'idle' || lessonState.status === 'ended')
        return done('No active lesson to end.');
      lessonState.status    = 'ended';
      lessonState.wordIndex = 0;
      bumpRevision();
      done();
    });
  });

  // ── Set absolute position ──────────────────────────────────────
  // payload: { surahNumber, ayahNumber, wordIndex }
  socket.on('teacher:setPosition', (payload) => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status !== 'active') return done('Start the lesson first.');
      const sn = parseInt(payload?.surahNumber, 10);
      const an = parseInt(payload?.ayahNumber,  10);
      const wi = parseInt(payload?.wordIndex,   10);
      if (!posInt(sn, 114))  return done('Invalid Surah number (1–114).');
      if (!posInt(an, 6236)) return done('Invalid Ayah number.');
      if (isNaN(wi) || wi < 1) return done('Word index must be ≥ 1.');
      lessonState.surahNumber = sn;
      lessonState.ayahNumber  = an;
      lessonState.wordIndex   = wi;
      bumpRevision();
      done();
    });
  });

  // ── Next word ──────────────────────────────────────────────────
  // payload: { totalWords, totalAyahs } — client supplies ayah word count
  socket.on('teacher:nextWord', (payload) => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status !== 'active') return done('Start the lesson first.');
      const totalWords = parseInt(payload?.totalWords, 10);
      const totalAyahs = parseInt(payload?.totalAyahs, 10);
      if (!Number.isFinite(totalWords) || totalWords < 1)
        return done('totalWords must be provided by the client.');
      const nextW = lessonState.wordIndex + 1;
      if (nextW <= totalWords) {
        lessonState.wordIndex = nextW;
      } else {
        // advance to next ayah
        const nextA = lessonState.ayahNumber + 1;
        if (Number.isFinite(totalAyahs) && nextA > totalAyahs)
          return done('Already at the last ayah of this Surah.');
        lessonState.ayahNumber  = nextA;
        lessonState.wordIndex   = 1;
      }
      bumpRevision();
      done();
    });
  });

  // ── Prev word ──────────────────────────────────────────────────
  socket.on('teacher:prevWord', (payload) => {
    requireTeacher(() => {
      const done = ack();
      if (lessonState.status !== 'active') return done('Start the lesson first.');
      const prevW = lessonState.wordIndex - 1;
      if (prevW >= 1) {
        lessonState.wordIndex = prevW;
      } else {
        const prevA = lessonState.ayahNumber - 1;
        if (prevA < 1) return done('Already at the first ayah.');
        // We move back but don't know word count of prev ayah —
        // set wordIndex to 1; teacher can adjust with setPosition
        lessonState.ayahNumber = prevA;
        lessonState.wordIndex  = 1;
      }
      bumpRevision();
      done();
    });
  });

  // ── Malformed event guard ──────────────────────────────────────
  socket.onAny((eventName) => {
    // Silently ignore unknown events — don't crash
  });
});

// ── 13. Start server ─────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🕌  Live Quran Teaching server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/health`);
  console.log(`   Mode:    ${IS_PROD ? 'production' : 'development'}\n`);
});

// ── 14. Graceful shutdown ─────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully…`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));