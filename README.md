# 🕌 Live Quran Teaching Website

A real-time, teacher-controlled Quran reading tool.

The teacher uses a laptop dashboard to underline the current word  
being recited. Students follow the authentic Arabic Quran text  
on their phone browsers in real time, via Socket.IO.

**Audio** is handled entirely by WhatsApp (or any VoIP call).  
**This website does not touch your microphone or camera.**

---

## Quran Text Source

| Item     | Value |
|----------|-------|
| API      | [AlQuran.cloud](https://alquran.cloud) — `https://api.alquran.cloud/v1` |
| Edition  | `quran-uthmani` (Uthmani Arabic script, standard Hafs reading) |
| Licence  | Free public API — see [alquran.cloud](https://alquran.cloud) for attribution terms |
| Notes    | No API key required. Text is fetched at runtime and cached per session. |

---

## Technology Stack

| Layer     | Technology |
|-----------|-----------|
| Runtime   | Node.js LTS (≥ 18) |
| HTTP      | Express 4 |
| Real-time | Socket.IO 4 |
| Session   | express-session + HTTP-only cookies |
| Security  | Helmet, express-rate-limit |
| Config    | dotenv |
| Frontend  | HTML5, CSS3, Vanilla JS |

---

## Windows Installation — Step by Step

### 1. Install Node.js

Download the **LTS** installer from <https://nodejs.org/>  
Run the installer, accept all defaults.  
Open **PowerShell** and verify:

```powershell
node --version   # should print v18.x.x or higher
npm --version
```

### 2. Open the project folder

```powershell
cd C:\path\to\live-quran-teaching
```

### 3. Install dependencies

```powershell
npm install
```

### 4. Create your `.env` file

```powershell
Copy-Item .env.example .env
```

Open `.env` in Notepad (or VS Code) and set:

```
PORT=3000
TEACHER_PASSWORD=My.Quran@786
SESSION_SECRET=change_this_to_a_long_random_string_before_going_live
NODE_ENV=development
```

> **For production**: use a strong, unique password and a long random `SESSION_SECRET`.  
> Never commit `.env` to Git.

### 5. Start the server

```powershell
npm start
```

You should see:

```
🕌  Live Quran Teaching server running
   Local:   http://localhost:3000
   Health:  http://localhost:3000/health
```

### 6. Open the website

| Page            | URL |
|-----------------|-----|
| Homepage        | http://localhost:3000 |
| Teacher Dashboard | http://localhost:3000/teacher.html |
| Student Reader  | http://localhost:3000/student.html |

### 7. Log in as teacher

1. Open `http://localhost:3000/teacher.html`.
2. Enter your password (the value of `TEACHER_PASSWORD` in `.env`).
3. Click **Sign In**.

### 8. Open the student page

On a second device, or in a second browser tab, open:

```
http://localhost:3000/student.html
```

---

## Running a Lesson

1. Open **WhatsApp** and start your group call / voice note as usual.
2. Students join WhatsApp on their phones.
3. On your laptop, open the **Teacher Dashboard**.
4. Select the **Surah** and **Ayah**, click **Load**, then click **▶ Start Lesson**.
5. As you recite, press:
   - **Next Word ▶** (or `←` arrow key) to advance the underline.
   - **◀ Prev Word** (or `→` arrow key) to go back.
   - **Next Ayah / Prev Ayah** (or `↓`/`↑` keys) to jump ayahs.
6. Students see the underlined word update in real time on their phones.
7. Click **■ End Lesson** when finished.

> Keyboard shortcuts work when the dashboard is focused and a lesson is active:  
> `← →` = prev/next word · `↑ ↓` = prev/next ayah

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing required environment variable` | Copy `.env.example` to `.env` and fill in values |
| `EADDRINUSE: port 3000` | Another process uses port 3000. Change `PORT` in `.env` |
| Login rejected with correct password | Check there are no extra spaces in `.env`; restart server |
| Quran text not loading | Check internet connection; API is free but requires outbound HTTPS |
| Students see "Waiting" even after Start | Check both devices are connected to the same server URL |
| Arabic text direction wrong | Ensure you are using a modern browser (Chrome ≥ 90, Safari ≥ 14) |

---

## Deployment

### Recommended hosts (support Node.js + WebSockets)

- [Railway](https://railway.app) — easy git-push deployment
- [Render](https://render.com) — free tier available
- [Fly.io](https://fly.io) — global edge nodes
- [Heroku](https://heroku.com) — classic PaaS

> **⚠️ GitHub Pages cannot host this application.**  
> GitHub Pages only serves static files. This app requires a running Node.js process for Socket.IO and server-side sessions.

### Deployment checklist

- [ ] Set `NODE_ENV=production` in your hosting environment variables.
- [ ] Set `TEACHER_PASSWORD` to a strong, unique password (≥ 16 characters, mixed case + symbols).
- [ ] Set `SESSION_SECRET` to a long random string (≥ 32 characters).
- [ ] Set `PORT` if your host requires a specific value (most inject it automatically).
- [ ] Enable HTTPS on the hosting platform (usually automatic).
- [ ] Confirm WebSocket connections work (most modern hosts support them by default).
- [ ] Note: this app uses **in-memory session storage**. If you run multiple instances, sessions will not be shared. Use a single-instance deployment or add a session store (e.g., `connect-redis`) for multi-instance setups.

### Railway example

```bash
# 1. Push your repo (without .env) to GitHub
# 2. Connect Railway to that repo
# 3. Set environment variables in the Railway dashboard:
#    PORT, TEACHER_PASSWORD, SESSION_SECRET, NODE_ENV=production
# 4. Railway auto-detects npm start
# 5. Your app gets a public HTTPS URL automatically
```

### Share the student URL

After deployment, give students the URL:

```
https://your-app-name.railway.app/student.html
```

They open it in their phone browser while joining your WhatsApp call.

---

## Security Notes

- The teacher password is **never** sent to students or logged.
- Sessions use HTTP-only, SameSite=Strict cookies (Secure flag in production).
- Login attempts are rate-limited to 10 per 15 minutes per IP.
- Students cannot emit any lesson-control Socket.IO events.
- Server validates all events from any client before acting.
- No microphone or camera permission is ever requested.

---

## Implemented Features

- [x] Real-time word highlighting via Socket.IO
- [x] Teacher authentication (server-side, session cookies)
- [x] Lesson lifecycle: start / pause / resume / end
- [x] Surah and Ayah navigation (all 114 Surahs)
- [x] Next / prev word navigation
- [x] Next / prev ayah navigation
- [x] Word boundary enforcement
- [x] Ayah boundary enforcement
- [x] Newly connected students receive current state
- [x] Reconnection state restoration
- [x] Quran text from AlQuran.cloud (Uthmani edition)
- [x] Arabic RTL rendering with diacritics preserved
- [x] Per-session Surah caching (no repeated API calls)
- [x] Keyboard shortcuts for teachers
- [x] Responsive design (mobile student, desktop teacher)
- [x] Login rate limiting
- [x] Helmet security headers
- [x] Health check endpoint (`/health`)
- [x] Graceful shutdown

## Future Improvements

- [ ] Word-level API data (avoids whitespace tokenisation)
- [ ] Multiple teacher accounts
- [ ] Student access codes / private sessions
- [ ] Lesson history and bookmarks
- [ ] Teacher-adjustable font size pushed to students
- [ ] Optional automatic recitation alignment (requires a separately authorised audio processing pipeline — a distinct future development phase)
- [ ] Redis session store for multi-instance deployment
- [ ] Attendance tracking